import Healthkit, { HKCategoryTypeIdentifier } from '@kingstinct/react-native-healthkit';
import type { HealthkitReadAuthorization } from '@kingstinct/react-native-healthkit/lib/typescript/src/native-types';
import { useSessionStore } from '../../state/sessionStore';

const cycleReadTypes: readonly HealthkitReadAuthorization[] = [
  HKCategoryTypeIdentifier.menstrualFlow as HealthkitReadAuthorization,
];

export const requestCyclePermissions = async (): Promise<boolean> => {
  const setHealthPermissions = useSessionStore.getState().setHealthPermissions;
  const isAvailable = await Healthkit.isHealthDataAvailable();
  if (!isAvailable) {
    setHealthPermissions({ granted: false, lastPromptedAt: new Date().toISOString() });
    return false;
  }

  try {
    const granted = await Healthkit.requestAuthorization(cycleReadTypes, []);
    setHealthPermissions({ granted, lastPromptedAt: new Date().toISOString() });
    return granted;
  } catch (error) {
    setHealthPermissions({ granted: false, lastPromptedAt: new Date().toISOString() });
    throw error;
  }
};
