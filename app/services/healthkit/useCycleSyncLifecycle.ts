import { AppState, AppStateStatus } from 'react-native';
import { useEffect } from 'react';
import { registerCompanionBackgroundSync, unregisterCompanionBackgroundSync } from './backgroundSync';
import {
  registerHealthBackgroundDelivery,
  unregisterHealthBackgroundDelivery,
} from './backgroundDelivery';
import { clearCycleSnapshot, syncHealthData } from './syncHealthData';
import { useSessionStore } from '../../state/sessionStore';

export const useCycleSyncLifecycle = () => {
  const permissionsGranted = useSessionStore((state) => state.permissions.granted);
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    if (!session || !permissionsGranted) {
      clearCycleSnapshot().catch((error) =>
        console.error('[cycle-sync] Failed to clear snapshot', error),
      );
      unregisterCompanionBackgroundSync().catch((error) =>
        console.error('[cycle-sync] Failed to unregister background task', error),
      );
      unregisterHealthBackgroundDelivery().catch((error) =>
        console.error('[cycle-sync] Failed to unregister background delivery', error),
      );
      return;
    }

    // Do not re-check immediately after grant to avoid false negatives; syncHealthData will set false if revoked.

    syncHealthData({ trigger: 'manual' });
    registerCompanionBackgroundSync().catch((error) =>
      console.error('[cycle-sync] Failed to register background task', error),
    );
    // HealthKit background delivery — iOS relaunches the app on cycle-data
    // changes, so phase transitions post (and notify) even while the app is closed.
    registerHealthBackgroundDelivery().catch((error) =>
      console.error('[cycle-sync] Failed to register background delivery', error),
    );

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        syncHealthData({ trigger: 'foreground' });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [permissionsGranted, session]);
};
