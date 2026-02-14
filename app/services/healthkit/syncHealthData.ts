import { DeviceEventEmitter } from 'react-native';
import {
  AuthorizationStatus,
  healthkitClient,
  MENSTRUAL_FLOW_IDENTIFIER,
  type MenstrualSample,
} from './healthkitClient';
import { CycleSnapshot, deriveSnapshot, normalizeFlowSamples } from '../../../packages/domain/cycles/models';
import { useSessionStore } from '../../state/sessionStore';
import {
  clearCycleSnapshots,
  getLatestCycleSnapshot,
  upsertCycleSnapshot,
} from '../../storage/sqlite/cycleSnapshotStore';
import { upsertCycleEvents, upsertCycleSnapshotRemote } from '../supabase/cycleEvents';
import { fetchCurrentAutoPostSettings } from '../supabase/users';
import {
  DEFAULT_AUTO_POST_SETTINGS,
  selectAutoPostedPeriodSamples,
} from './autoPostSettings';

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000; // 90 days to capture longer histories
const QUERY_LIMIT = 400;
export const CYCLE_SNAPSHOT_UPDATED = 'companion/snapshotUpdated';

export type SyncTrigger = 'manual' | 'foreground' | 'background';

const notify = (snapshot: CycleSnapshot | null) => {
  DeviceEventEmitter.emit(CYCLE_SNAPSHOT_UPDATED, snapshot);
};

export const clearCycleSnapshot = async () => {
  await clearCycleSnapshots();
  notify(null);
};

export const syncHealthData = async ({
  trigger = 'manual',
}: { trigger?: SyncTrigger } = {}): Promise<CycleSnapshot | null> => {
  const { permissions, session } = useSessionStore.getState();
  if (!session) {
    console.log('[cycle-sync] Skip: no session');
    return null;
  }
  if (!permissions.granted) {
    console.log('[cycle-sync] Skip: permissions not granted');
    return null;
  }

  const status = await healthkitClient.authorizationStatusFor(MENSTRUAL_FLOW_IDENTIFIER);
  console.log('[cycle-sync] authorizationStatus', status);

  const now = new Date();
  const startDate = new Date(now.getTime() - LOOKBACK_MS);

  try {
    const rawSamples = await healthkitClient.queryCategorySamples(MENSTRUAL_FLOW_IDENTIFIER, {
      filter: { startDate, endDate: now },
      limit: QUERY_LIMIT,
      ascending: false,
    });

    // De-dupe by id to avoid duplicates across successive queries
    const seen = new Set<string>();
    const samples = normalizeFlowSamples(rawSamples as readonly MenstrualSample[]).filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    const previousSnapshot = await getLatestCycleSnapshot(session.userId);
    const snapshot = deriveSnapshot(samples, now.toISOString());
    const previousPhase = previousSnapshot?.snapshot.currentPhase ?? null;
    const phaseChanged = previousPhase && previousPhase !== snapshot.currentPhase;

    await upsertCycleSnapshot(session.userId, snapshot);
    try {
      let autoPostSettings = useSessionStore.getState().autoPostSettings ?? DEFAULT_AUTO_POST_SETTINGS;
      try {
        const remoteSettings = await fetchCurrentAutoPostSettings();
        if (remoteSettings) {
          autoPostSettings = remoteSettings;
          useSessionStore.getState().setAutoPostSettings(remoteSettings);
        }
      } catch (error) {
        console.warn('[cycle-sync] Failed to load remote auto-post settings; using local settings', error);
      }
      const autoPostedSamples = selectAutoPostedPeriodSamples(samples, autoPostSettings);
      await upsertCycleSnapshotRemote(session.userId, snapshot);
      const events = autoPostedSamples.map((sample) => ({
        user_id: session.userId,
        event_type: 'menstrual_flow',
        phase: snapshot.currentPhase,
        symptoms: sample.metadata ?? null,
        starts_at: sample.startDate,
      }));
      if (phaseChanged && autoPostSettings.postPhaseTransitions) {
        events.push({
          user_id: session.userId,
          event_type: 'phase_transition',
          phase: snapshot.currentPhase,
          symptoms: null,
          starts_at: snapshot.syncedAt,
        });
      }
      await upsertCycleEvents(events);
    } catch (error) {
      console.warn('[cycle-sync] Supabase sync failed', error);
    }
    notify(snapshot);
    console.log(
      `[cycle-sync] Completed (${trigger}) with ${samples.length} samples from ${startDate.toISOString()} to ${now.toISOString()}`,
    );
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cycle-sync] Failed', message);
    if (message.toLowerCase().includes('not authorized')) {
      useSessionStore.getState().setHealthPermissions({ granted: false });
    }
    return null;
  }
};
