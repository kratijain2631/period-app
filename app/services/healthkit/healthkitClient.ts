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
import { createFakeHealthClient, isFakeHealthEnabled } from './fakeHealthClient';

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

const realHealthkitClient = {
  isHealthDataAvailable,
  requestAuthorization,
  queryCategorySamples,
  queryQuantitySamples,
  authorizationStatusFor,
  enableBackgroundDelivery: hk.enableBackgroundDelivery,
  disableBackgroundDelivery: hk.disableBackgroundDelivery,
  subscribeToChanges: hk.subscribeToChanges,
};

// Dev-only: with EXPO_PUBLIC_FAKE_HEALTH=true in a __DEV__ build, serve the signed-in
// test persona's generated cycle history instead of HealthKit (see
// docs/TEST_ACCOUNTS.md). Release builds always use the real client.
const createDevFakeClient = () => {
  console.log('[fake-health] Using generated test-persona Health data (dev only).');
  return createFakeHealthClient({
    personaOverride: process.env.EXPO_PUBLIC_FAKE_HEALTH_PERSONA || undefined,
    getSignedInEmail: async () => {
      const { supabase } = require('../supabase/client') as typeof import('../supabase/client');
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.email ?? null;
    },
  }) as unknown as typeof realHealthkitClient;
};

export const healthkitClient: typeof realHealthkitClient = isFakeHealthEnabled()
  ? createDevFakeClient()
  : realHealthkitClient;

export { AuthorizationStatus, CategoryValueMenstrualFlow };
