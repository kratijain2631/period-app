import {
  healthkitClient,
  HEALTH_UPDATE_FREQUENCY_IMMEDIATE,
  MENSTRUAL_FLOW_IDENTIFIER,
  type HealthChangeArgs,
} from './healthkitClient';
import { syncHealthData } from './syncHealthData';

// HealthKit background delivery: register an observer on menstrual-flow data and
// ask iOS to relaunch the app when it changes. This is Apple's native mechanism
// for reacting to health data in the background — far more reliable/timely than
// the periodic `expo-background-fetch` task (which iOS throttles heavily). When
// woken, we run a background sync, which posts any new phase transition to the
// feed and fires a local notification (see syncHealthData).
//
// Observing only menstrual flow (the driver of phase changes) keeps wake-ups
// focused. All calls are guarded so a build without the background-delivery API
// simply falls back to foreground + the background-fetch task.

let subscription: unknown = null;
let enabled = false;

export const registerHealthBackgroundDelivery = async (): Promise<void> => {
  if (enabled) {
    return;
  }
  const { enableBackgroundDelivery, subscribeToChanges } = healthkitClient;
  if (!enableBackgroundDelivery || !subscribeToChanges) {
    console.warn('[cycle-sync] HealthKit background delivery unavailable in this build');
    return;
  }
  enabled = true;
  try {
    subscription = subscribeToChanges(MENSTRUAL_FLOW_IDENTIFIER, (args: HealthChangeArgs) => {
      if (args?.errorMessage) {
        console.warn('[cycle-sync] HealthKit change error', args.errorMessage);
        return;
      }
      syncHealthData({ trigger: 'background' }).catch((error) =>
        console.warn('[cycle-sync] Background-delivery sync failed', error),
      );
    });
    await enableBackgroundDelivery(MENSTRUAL_FLOW_IDENTIFIER, HEALTH_UPDATE_FREQUENCY_IMMEDIATE);
  } catch (error) {
    console.warn('[cycle-sync] Failed to enable HealthKit background delivery', error);
    enabled = false;
  }
};

export const unregisterHealthBackgroundDelivery = async (): Promise<void> => {
  if (!enabled) {
    return;
  }
  enabled = false;
  try {
    (subscription as { remove?: () => void } | null)?.remove?.();
  } catch {
    // ignore teardown errors
  }
  subscription = null;
  try {
    await healthkitClient.disableBackgroundDelivery?.(MENSTRUAL_FLOW_IDENTIFIER);
  } catch (error) {
    console.warn('[cycle-sync] Failed to disable HealthKit background delivery', error);
  }
};
