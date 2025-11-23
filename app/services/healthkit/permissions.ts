import {
  requestAuthorization,
  isHealthDataAvailable,
  type ObjectTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { useSessionStore } from '../../state/sessionStore';

const MENSTRUAL_FLOW_TYPE = 'HKCategoryTypeIdentifierMenstrualFlow' as ObjectTypeIdentifier;
const cycleReadTypes: readonly ObjectTypeIdentifier[] = [MENSTRUAL_FLOW_TYPE];

export const requestCyclePermissions = async (): Promise<boolean> => {
  const setHealthPermissions = useSessionStore.getState().setHealthPermissions;
  if (!isHealthDataAvailable()) {
    setHealthPermissions({ granted: false, lastPromptedAt: new Date().toISOString() });
    return false;
  }

  try {
    const granted = await requestAuthorization([], cycleReadTypes);
    setHealthPermissions({ granted, lastPromptedAt: new Date().toISOString() });
    return granted;
  } catch (error) {
    setHealthPermissions({ granted: false, lastPromptedAt: new Date().toISOString() });
    throw error;
  }
};
