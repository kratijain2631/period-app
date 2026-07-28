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

// Register the task handler at module load (top-level scope). Expo requires
// `defineTask` to run in the global scope on every app start — including when
// iOS relaunches the app headlessly to run the background task (this task uses
// startOnBoot / !stopOnTerminate). Defining it only inside the register call
// (which runs from a React hook after mount) means the handler may be missing
// when the OS invokes the task, which is a known source of instability/crashes.
defineBackgroundTask();

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
