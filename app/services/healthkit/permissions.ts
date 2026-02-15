import {
  AuthorizationStatus,
  cycleReadTypes,
  healthkitClient,
  MENSTRUAL_FLOW_IDENTIFIER,
} from './healthkitClient';
import { useSessionStore } from '../../state/sessionStore';

export type PermissionResult = { granted: boolean; error?: string };

export const checkCyclePermissions = async (): Promise<PermissionResult> => {
  const setHealthPermissions = useSessionStore.getState().setHealthPermissions;
  if (!healthkitClient.isHealthDataAvailable()) {
    setHealthPermissions({ granted: false });
    return { granted: false, error: 'Health data unavailable on this device.' };
  }

  try {
    const status = await healthkitClient.authorizationStatusFor(MENSTRUAL_FLOW_IDENTIFIER);
    const granted = status === AuthorizationStatus.sharingAuthorized;
    setHealthPermissions({ granted });
    return { granted };
  } catch (error) {
    console.error('[permissions] Failed to check Health status', error);
    setHealthPermissions({ granted: false });
    return { granted: false, error: 'Unable to verify Health permissions.' };
  }
};

export const requestCyclePermissions = async (): Promise<PermissionResult> => {
  const setHealthPermissions = useSessionStore.getState().setHealthPermissions;
  const lastPromptedAt = new Date().toISOString();

  if (!healthkitClient.isHealthDataAvailable()) {
    setHealthPermissions({ granted: false, lastPromptedAt });
    return { granted: false, error: 'Health data unavailable on this device.' };
  }

  try {
    const granted = await healthkitClient.requestAuthorization([], cycleReadTypes);
    // Confirm the system recorded the authorization; occasionally returns notDetermined briefly.
    const status = await healthkitClient.authorizationStatusFor(MENSTRUAL_FLOW_IDENTIFIER);
    const authorized = granted || status === AuthorizationStatus.sharingAuthorized;
    setHealthPermissions({ granted: authorized, lastPromptedAt });
    if (!authorized) {
      console.log('[permissions] requestAuthorization returned', granted, 'status', status);
      return {
        granted: false,
        error: 'Health access was not granted. Please enable cycle data in Health settings.',
      };
    }
    return { granted: true };
  } catch (error) {
    console.error('[permissions] Request failed', error);
    setHealthPermissions({ granted: false, lastPromptedAt });
    return { granted: false, error: 'Something went wrong requesting permissions.' };
  }
};

export const ensureCyclePermissions = async (): Promise<PermissionResult> => {
  const checked = await checkCyclePermissions();
  if (checked.granted) {
    return checked;
  }
  const requested = await requestCyclePermissions();
  if (requested.granted) {
    return requested;
  }
  // Retry a status check in case HealthKit lags on updating the auth status
  return checkCyclePermissions();
};
