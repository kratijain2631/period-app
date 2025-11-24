import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncHealthData } from './syncHealthData';

export const CYCLE_SYNC_TASK = 'CYCLE_COMPANION_BACKGROUND_SYNC';

const defineBackgroundTask = () => {
  try {
    TaskManager.defineTask(CYCLE_SYNC_TASK, async () => {
      try {
        const result = await syncHealthData({ trigger: 'background' });
        if (result) {
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('[cycle-sync] Background task failed', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Task') || error.message.includes('already defined'))
    ) {
      return;
    }
    throw error;
  }
};

export const registerCompanionBackgroundSync = async () => {
  defineBackgroundTask();
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

export const unregisterCompanionBackgroundSync = async () => {
  const existing = await TaskManager.isTaskRegisteredAsync(CYCLE_SYNC_TASK);
  if (!existing) {
    return;
  }
  await BackgroundFetch.unregisterTaskAsync(CYCLE_SYNC_TASK);
};
