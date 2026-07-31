import * as HealthKit from '@kingstinct/react-native-healthkit';
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
export const OVULATION_TEST_IDENTIFIER: CategoryTypeIdentifier = 'HKCategoryTypeIdentifierOvulationTestResult';
export const PROGESTERONE_TEST_IDENTIFIER: CategoryTypeIdentifier =
  'HKCategoryTypeIdentifierProgesteroneTestResult';
export const CERVICAL_MUCUS_IDENTIFIER: CategoryTypeIdentifier = 'HKCategoryTypeIdentifierCervicalMucusQuality';
export const BASAL_BODY_TEMPERATURE_IDENTIFIER: ObjectTypeIdentifier =
  'HKQuantityTypeIdentifierBasalBodyTemperature';

export const cycleReadTypes: readonly ObjectTypeIdentifier[] = [
  MENSTRUAL_FLOW_IDENTIFIER,
  OVULATION_TEST_IDENTIFIER,
  PROGESTERONE_TEST_IDENTIFIER,
  CERVICAL_MUCUS_IDENTIFIER,
  BASAL_BODY_TEMPERATURE_IDENTIFIER,
];

export type MenstrualSample = CategorySampleTyped<typeof MENSTRUAL_FLOW_IDENTIFIER>;

type QueryQuantitySamplesFn = (
  identifier: ObjectTypeIdentifier,
  options: {
    filter: { startDate: Date; endDate: Date };
    limit?: number;
    ascending?: boolean;
  },
) => Promise<unknown[]>;

const queryQuantitySamples = (
  HealthKit as unknown as { queryQuantitySamples?: QueryQuantitySamplesFn }
).queryQuantitySamples;

// HealthKit background delivery + observer-query APIs. Accessed defensively off
// the namespace (rather than named imports) so a library-version mismatch
// degrades to "no background delivery" instead of a build break.
export type HealthChangeArgs = { typeIdentifier: string; errorMessage?: string };
type EnableBackgroundDeliveryFn = (
  type: ObjectTypeIdentifier,
  updateFrequency: number,
) => Promise<boolean>;
type DisableBackgroundDeliveryFn = (type: ObjectTypeIdentifier) => Promise<boolean>;
type SubscribeToChangesFn = (
  type: ObjectTypeIdentifier,
  callback: (args: HealthChangeArgs) => void,
) => unknown;

const hk = HealthKit as unknown as {
  enableBackgroundDelivery?: EnableBackgroundDeliveryFn;
  disableBackgroundDelivery?: DisableBackgroundDeliveryFn;
  subscribeToChanges?: SubscribeToChangesFn;
  UpdateFrequency?: Record<string, number>;
};

// UpdateFrequency.Immediate (iOS clamps category-type delivery to ≥ hourly).
export const HEALTH_UPDATE_FREQUENCY_IMMEDIATE = hk.UpdateFrequency?.Immediate ?? 1;

export const healthkitClient = {
  isHealthDataAvailable,
  requestAuthorization,
  queryCategorySamples,
  queryQuantitySamples,
  authorizationStatusFor,
  enableBackgroundDelivery: hk.enableBackgroundDelivery,
  disableBackgroundDelivery: hk.disableBackgroundDelivery,
  subscribeToChanges: hk.subscribeToChanges,
};

export { AuthorizationStatus, CategoryValueMenstrualFlow };
