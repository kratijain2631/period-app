import { DeviceEventEmitter } from 'react-native';
import { useSyncExternalStore } from 'react';
import {
  AuthorizationStatus,
  healthkitClient,
  MENSTRUAL_FLOW_IDENTIFIER,
  type MenstrualSample,
} from './healthkitClient';
import { CycleSnapshot, deriveSnapshot, normalizeFlowSamples } from '../../../packages/domain/cycles/models';
import { useSessionStore } from '../../state/sessionStore';

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000; // 90 days to capture longer histories
const QUERY_LIMIT = 400;
export const CYCLE_SNAPSHOT_UPDATED = 'companion/snapshotUpdated';

export type SyncTrigger = 'manual' | 'foreground' | 'background';

let latestSnapshot: CycleSnapshot | null = null;
const listeners = new Set<() => void>();

const notify = (snapshot: CycleSnapshot | null) => {
  latestSnapshot = snapshot;
  DeviceEventEmitter.emit(CYCLE_SNAPSHOT_UPDATED, snapshot);
  listeners.forEach((listener) => listener());
};

export const subscribeToCycleSnapshot = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearCycleSnapshot = () => notify(null);

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
    const snapshot = deriveSnapshot(samples, now.toISOString());

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

export const useCycleSnapshot = () =>
  useSyncExternalStore(subscribeToCycleSnapshot, () => latestSnapshot, () => latestSnapshot);
