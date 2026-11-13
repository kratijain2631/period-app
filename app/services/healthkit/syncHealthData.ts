import { readCycleSyncEnabled, saveCycleSyncEnabled } from '../supabase/cyclePrivacy';
import { DeviceEventEmitter } from 'react-native';
import {
  BASAL_BODY_TEMPERATURE_IDENTIFIER,
  CERVICAL_MUCUS_IDENTIFIER,
  healthkitClient,
  MENSTRUAL_FLOW_IDENTIFIER,
  OVULATION_TEST_IDENTIFIER,
  PROGESTERONE_TEST_IDENTIFIER,
  type MenstrualSample,
} from './healthkitClient';
import {
  deriveSnapshot,
  normalizeFlowSamples,
  normalizeSignalSamples,
} from '../../../packages/domain/cycles/models';
import type {
  CycleSignalKind,
  CycleSnapshot,
  RawSignalSample,
} from '../../../packages/domain/cycles/models';
import { useSessionStore } from '../../state/sessionStore';
import {
  clearCycleSnapshots,
  getLatestCycleSnapshot,
  upsertCycleSnapshot,
} from '../../storage/sqlite/cycleSnapshotStore';
import {
  remoteSnapshotHasSamples,
  upsertCycleEvents,
  upsertCycleSnapshotRemote,
} from '../supabase/cycleEvents';
import { fetchCurrentAutoPostSettings } from '../supabase/users';
import {
  DEFAULT_AUTO_POST_SETTINGS,
  selectAutoPostedPeriodSamples,
} from './autoPostSettings';
import {
  schedulePhaseChangeNotification,
  scheduleUpcomingPhaseReminder,
} from '../notifications/localCycleNotifications';

const LOOKBACK_MS = 180 * 24 * 60 * 60 * 1000; // 180 days to personalize cycle-length estimates
const QUERY_LIMIT = 400;
export const CYCLE_SNAPSHOT_UPDATED = 'companion/snapshotUpdated';

const SIGNAL_QUERY_CONFIG: Array<{
  kind: CycleSignalKind;
  identifier: string;
  type: 'category' | 'quantity';
}> = [
  { kind: 'ovulation_test', identifier: OVULATION_TEST_IDENTIFIER, type: 'category' },
  { kind: 'progesterone_test', identifier: PROGESTERONE_TEST_IDENTIFIER, type: 'category' },
  { kind: 'cervical_mucus', identifier: CERVICAL_MUCUS_IDENTIFIER, type: 'category' },
  { kind: 'basal_body_temperature', identifier: BASAL_BODY_TEMPERATURE_IDENTIFIER, type: 'quantity' },
];

type QuantitySampleLike = {
  uuid?: string | null;
  startDate: Date;
  endDate: Date;
  value?: number;
  quantity?: {
    value?: number;
    doubleValue?: (unit: string) => number;
    doubleValueForUnit?: (unit: string) => number;
  };
  metadata?: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const extractQuantityValue = (sample: QuantitySampleLike): number | null => {
  if (typeof sample.value === 'number' && Number.isFinite(sample.value)) {
    return sample.value;
  }

  const quantityRecord = asRecord(sample.quantity);
  if (!quantityRecord) {
    return null;
  }

  const literal = quantityRecord.value;
  if (typeof literal === 'number' && Number.isFinite(literal)) {
    return literal;
  }

  const queryFns = [quantityRecord.doubleValue, quantityRecord.doubleValueForUnit];
  for (const fn of queryFns) {
    if (typeof fn !== 'function') {
      continue;
    }
    for (const unit of ['degC', 'celsius', '']) {
      try {
        const parsed = (fn as (unit: string) => number)(unit);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore invalid unit requests and try the next candidate.
      }
    }
  }

  return null;
};

const fetchSignalSamples = async ({
  startDate,
  now,
}: {
  startDate: Date;
  now: Date;
}) => {
  const signalGroups = await Promise.all(
    SIGNAL_QUERY_CONFIG.map(async (query) => {
      try {
        if (query.type === 'category') {
          const raw = await healthkitClient.queryCategorySamples(query.identifier as never, {
            filter: { startDate, endDate: now },
            limit: QUERY_LIMIT,
            ascending: false,
          });
          return normalizeSignalSamples(raw as readonly RawSignalSample[], query.kind);
        }

        if (!healthkitClient.queryQuantitySamples) {
          return [];
        }

        const raw = await healthkitClient.queryQuantitySamples(query.identifier as never, {
          filter: { startDate, endDate: now },
          limit: QUERY_LIMIT,
          ascending: false,
        });
        const normalizedRaw = (raw as readonly QuantitySampleLike[]).map(
          (sample): RawSignalSample => ({
            uuid: sample.uuid ?? null,
            startDate: sample.startDate,
            endDate: sample.endDate,
            value: extractQuantityValue(sample),
            metadata: sample.metadata,
          }),
        );
        return normalizeSignalSamples(normalizedRaw, query.kind);
      } catch (error) {
        console.warn(`[cycle-sync] Optional signal query failed for ${query.identifier}`, error);
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  return signalGroups.flat().filter((sample) => {
    const dedupeKey = `${sample.kind}:${sample.id}`;
    if (seen.has(dedupeKey)) {
      return false;
    }
    seen.add(dedupeKey);
    return true;
  });
};

export type SyncTrigger = 'manual' | 'foreground' | 'background';

const notify = (snapshot: CycleSnapshot | null) => {
  DeviceEventEmitter.emit(CYCLE_SNAPSHOT_UPDATED, snapshot);
};

export const clearCycleSnapshot = async (userId?: string) => {
  await clearCycleSnapshots(userId);
  notify(null);
};

// Drain any local write or reminder already underway before confirming erasure.
const syncs = new Map<string, Promise<CycleSnapshot | null>>();
const withdrawing = new Set<string>();

async function clearHealthOnDevice(userId: string) {
  await clearCycleSnapshot(userId);
  if (useSessionStore.getState().session?.userId === userId) {
    await scheduleUpcomingPhaseReminder(null, null);
    useSessionStore.getState().setHealthPermissions({ granted: false });
  }
}

export async function eraseSyncedCycleData(userId: string) {
  withdrawing.add(userId);
  try {
    await saveCycleSyncEnabled(userId, false);
    await syncs.get(userId)?.catch(() => {});
    await clearHealthOnDevice(userId);
  } finally {
    withdrawing.delete(userId);
  }
}

export function syncHealthData({ trigger = 'manual' }: { trigger?: SyncTrigger } = {}): Promise<CycleSnapshot | null> {
  const { session, permissions, hasSeenCompanionIntro } = useSessionStore.getState();
  const userId = session?.userId;
  if (!userId || !permissions.granted || !hasSeenCompanionIntro || withdrawing.has(userId)) return Promise.resolve(null);
  const running = syncs.get(userId);
  if (running) return running;
  const request = runHealthSync(session, trigger).finally(() => syncs.delete(userId));
  syncs.set(userId, request);
  return request;
}

const runHealthSync = async (session: import('../../state/sessionStore').Session, trigger: SyncTrigger): Promise<CycleSnapshot | null> => {
  const userId = session.userId;
  const active = () => useSessionStore.getState().session?.userId === userId && !withdrawing.has(userId);
  try {
    const enabled = await readCycleSyncEnabled();
    if (!active()) return null;
    if (!enabled) {
      await clearHealthOnDevice(userId);
      return null;
    }
  } catch {
    // Keep the offline view. Defer importing more Health data until consent can be read.
    return null;
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - LOOKBACK_MS);

  try {
    const rawSamples = await healthkitClient.queryCategorySamples(MENSTRUAL_FLOW_IDENTIFIER, {
      filter: { startDate, endDate: now },
      limit: QUERY_LIMIT,
      ascending: false,
    });
    const signalSamples = await fetchSignalSamples({ startDate, now });

    // De-dupe by id to avoid duplicates across successive queries
    const seen = new Set<string>();
    const samples = normalizeFlowSamples(rawSamples as readonly MenstrualSample[]).filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    if (!active()) return null;
    const previousSnapshot = await getLatestCycleSnapshot(session.userId);
    const snapshot = deriveSnapshot(samples, now.toISOString(), signalSamples);
    const previousPhase = previousSnapshot?.snapshot.currentPhase ?? null;
    const phaseChanged = previousPhase && previousPhase !== snapshot.currentPhase;

    if (!active()) return null;
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
      // Only auto-post period events that occur on/after account creation — a
      // fresh account must not flood the feed with backdated cycle history.
      if (!active()) return null;
      const accountCreatedAtMs = session.createdAt ? new Date(session.createdAt).getTime() : null;
      const autoPostedSamples = selectAutoPostedPeriodSamples(
        samples,
        autoPostSettings,
        accountCreatedAtMs,
      );
      // A sync that reads no samples (new phone, Health access off — iOS doesn't
      // say which) must not replace real history that friends see with an
      // "Unknown" snapshot. A first snapshot is still written for new users. If
      // the check fails, keep what's there.
      const keepRemoteSnapshot =
        samples.length === 0 &&
        (await remoteSnapshotHasSamples(session.userId).catch((error) => {
          console.warn('[cycle-sync] Could not check the shared snapshot; leaving it unchanged', error);
          return true;
        }));
      if (keepRemoteSnapshot) {
        console.log('[cycle-sync] No Health samples read; keeping the existing shared snapshot');
      } else {
        await upsertCycleSnapshotRemote(session.userId, snapshot);
      }
      const phaseMetadata = {
        phase_source: snapshot.phaseSource ?? 'unknown',
        cycle_length_days: snapshot.cycleLengthDays ?? null,
        luteal_length_days: snapshot.lutealLengthDays ?? null,
      };
      const events = autoPostedSamples.map((sample) => ({
        user_id: session.userId,
        event_type: 'menstrual_flow',
        // A flow sample *is* menstruation by definition — always label it
        // 'menstruation', not the current derived phase. Tagging it with
        // snapshot.currentPhase (e.g. 'follicular', when today is past the flow
        // days) mislabeled period posts as "Follicular phase" in the feed and,
        // with multiple logged days, showed the same phase repeated. See BUGS.md.
        phase: 'menstruation',
        symptoms: {
          ...(asRecord(sample.metadata) ?? {}),
          ...phaseMetadata,
        },
        starts_at: sample.startDate,
      }));
      // Losing an estimate (e.g. no period for 60 days) isn't news to post.
      if (phaseChanged && snapshot.currentPhase !== 'unknown' && autoPostSettings.postPhaseTransitions) {
        events.push({
          user_id: session.userId,
          event_type: 'phase_transition',
          phase: snapshot.currentPhase,
          symptoms: phaseMetadata,
          // Date the post at the estimated real transition, not app-open time
          // (falls back to now when the boundary is unknown).
          starts_at: snapshot.currentPhaseStart ?? snapshot.syncedAt,
        });
        // When the transition is detected in the background (iOS woke us via
        // HealthKit background delivery), also nudge the user with a local
        // notification — foreground syncs skip it since they're already looking.
        if (trigger === 'background') {
          await schedulePhaseChangeNotification(snapshot.currentPhase).catch(() => {});
        }
      }
      await upsertCycleEvents(events);
    } catch (error) {
      console.warn('[cycle-sync] Supabase sync failed', error);
    }
    if (!active()) return null;
    notify(snapshot);
    // Keep the predicted "your phase is changing, open to share" reminder current.
    await scheduleUpcomingPhaseReminder(snapshot.nextPhaseStart, snapshot.nextPhase).catch(() => {});
    console.log(
      `[cycle-sync] Completed (${trigger}) with ${samples.length} flow samples and ${signalSamples.length} signal samples from ${startDate.toISOString()} to ${now.toISOString()}`,
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
