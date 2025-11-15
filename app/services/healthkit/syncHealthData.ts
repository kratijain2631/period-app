import Healthkit, {
  HKAuthorizationStatus,
  HKCategoryTypeIdentifier,
  HKCategoryValueMenstrualFlow,
} from '@kingstinct/react-native-healthkit';
import type { HKCategorySample } from '@kingstinct/react-native-healthkit/lib/typescript/src/types';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useSyncExternalStore } from 'react';
import { useSessionStore } from '../../state/sessionStore';

export const CYCLE_SYNC_TASK = 'cycle-sync-task';
const LOOKBACK_DAYS = 90;

type MenstrualSample = HKCategorySample<HKCategoryTypeIdentifier.menstrualFlow>;

export type CycleSample = {
  id: string;
  flowValue: HKCategoryValueMenstrualFlow;
  startDate: string;
  endDate: string;
  metadata?: Record<string, unknown>;
};

export type CycleSnapshot = {
  syncedAt: string;
  samples: CycleSample[];
};

let latestSnapshot: CycleSnapshot | null = null;
const listeners = new Set<() => void>();
let taskDefined = false;

const notify = (snapshot: CycleSnapshot | null) => {
  latestSnapshot = snapshot;
  listeners.forEach((listener) => listener());
};

export const subscribeToCycleSnapshot = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const normalizeSamples = (rawSamples: readonly MenstrualSample[]): CycleSample[] =>
  rawSamples.map((sample) => ({
    id: sample.uuid ?? `${sample.startDate}-${sample.endDate}`,
    startDate: sample.startDate.toISOString(),
    endDate: sample.endDate.toISOString(),
    flowValue: sample.value,
    metadata: sample.metadata ?? {},
  }));

const ensureBackgroundTask = () => {
  if (taskDefined) {
    return;
  }
  try {
    TaskManager.defineTask(CYCLE_SYNC_TASK, async () => {
      try {
        const result = await syncHealthData({ source: 'background' });
        if (result) {
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('Cycle sync background task failed', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    taskDefined = true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Task') || error.message.includes('already defined'))
    ) {
      taskDefined = true;
      return;
    }
    throw error;
  }
};

const ensureBackgroundFetchRegistered = async () => {
  ensureBackgroundTask();
  const existing = await TaskManager.isTaskRegisteredAsync(CYCLE_SYNC_TASK);
  if (existing) {
    return;
  }
  await BackgroundFetch.registerTaskAsync(CYCLE_SYNC_TASK, {
    minimumInterval: 30 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

export type SyncSource = 'foreground' | 'background';

const hasPermissions = async () => {
  const status = await Healthkit.authorizationStatusFor(HKCategoryTypeIdentifier.menstrualFlow);
  return status === HKAuthorizationStatus.sharingAuthorized;
};

export const syncHealthData = async ({
  source = 'foreground',
}: { source?: SyncSource } = {}): Promise<CycleSnapshot | null> => {
  const permissions = useSessionStore.getState().permissions;
  if (!permissions.granted) {
    return null;
  }

  const isAuthorized = await hasPermissions();
  if (!isAuthorized) {
    return null;
  }

  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    const rawSamples = await Healthkit.queryCategorySamples(
      HKCategoryTypeIdentifier.menstrualFlow,
      {
        from,
        to: now,
        limit: 50,
        ascending: false,
      },
    );

    const samples = normalizeSamples(rawSamples as readonly MenstrualSample[]);
    const snapshot: CycleSnapshot = {
      syncedAt: new Date().toISOString(),
      samples,
    };

    notify(snapshot);
    console.log(`[cycle-sync] Completed (${source}) with ${samples.length} samples`);
    return snapshot;
  } catch (error) {
    console.error('[cycle-sync] Failed', error);
    return null;
  }
};

export const useCycleSnapshot = () =>
  useSyncExternalStore(subscribeToCycleSnapshot, () => latestSnapshot, () => latestSnapshot);

export const useCycleSyncLifecycle = () => {
  const permissionsGranted = useSessionStore((state) => state.permissions.granted);

  useEffect(() => {
    if (!permissionsGranted) {
      notify(null);
      TaskManager.isTaskRegisteredAsync(CYCLE_SYNC_TASK)
        .then((isRegistered) => {
          if (isRegistered) {
            return BackgroundFetch.unregisterTaskAsync(CYCLE_SYNC_TASK);
          }
          return undefined;
        })
        .catch((error) => console.error('[cycle-sync] Failed to unregister background task', error));
      return;
    }

    syncHealthData({ source: 'foreground' });
    ensureBackgroundFetchRegistered().catch((error) =>
      console.error('[cycle-sync] Failed to register background task', error),
    );

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        syncHealthData({ source: 'foreground' });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [permissionsGranted]);
};
