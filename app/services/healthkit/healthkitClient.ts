import {
  AuthorizationStatus,
  CategoryValueMenstrualFlow,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
  authorizationStatusFor,
  type CategoryTypeIdentifier,
  type ObjectTypeIdentifier,
  type CategorySampleTyped,
} from '@kingstinct/react-native-healthkit';

export const MENSTRUAL_FLOW_IDENTIFIER: CategoryTypeIdentifier = 'HKCategoryTypeIdentifierMenstrualFlow';
export const cycleReadTypes: readonly ObjectTypeIdentifier[] = [MENSTRUAL_FLOW_IDENTIFIER];

export type MenstrualSample = CategorySampleTyped<typeof MENSTRUAL_FLOW_IDENTIFIER>;

export const healthkitClient = {
  isHealthDataAvailable,
  requestAuthorization,
  queryCategorySamples,
  authorizationStatusFor,
};

export { AuthorizationStatus, CategoryValueMenstrualFlow };
