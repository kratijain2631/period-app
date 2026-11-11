/**
 * Dev-only fake Apple Health source for test personas.
 *
 * When enabled (see `isFakeHealthEnabled`), `healthkitClient` returns the signed-in
 * test persona's generated cycle history instead of calling HealthKit, so the
 * simulator exercises the real sync → derive → upload path with realistic data.
 * It never runs in release builds.
 */
import {
  generatePersonaHealthData,
  getPersona,
  personaFromEmail,
  type Persona,
  type PersonaHealthData,
} from '../../../packages/domain/testing/personas';
import type { CycleSignalKind } from '../../../packages/domain/cycles/models';

const MENSTRUAL_FLOW = 'HKCategoryTypeIdentifierMenstrualFlow';
const SIGNAL_KIND_BY_IDENTIFIER: Record<string, CycleSignalKind> = {
  HKCategoryTypeIdentifierOvulationTestResult: 'ovulation_test',
  HKCategoryTypeIdentifierProgesteroneTestResult: 'progesterone_test',
  HKCategoryTypeIdentifierCervicalMucusQuality: 'cervical_mucus',
  HKQuantityTypeIdentifierBasalBodyTemperature: 'basal_body_temperature',
};

/**
 * True only in a dev build with `EXPO_PUBLIC_FAKE_HEALTH=true`. The `isDev` gate is
 * what keeps this out of TestFlight/App Store builds, where `__DEV__` is false.
 */
export const isFakeHealthEnabled = (
  isDev: boolean = typeof __DEV__ !== 'undefined' && __DEV__,
  flag: string | undefined = process.env.EXPO_PUBLIC_FAKE_HEALTH,
) => isDev === true && flag === 'true';

type QueryOptions = {
  filter?: { startDate?: Date; endDate?: Date };
  limit?: number;
  ascending?: boolean;
};

type SampleLike = { startDate: Date };

export type FakeHealthDeps = {
  /** Resolves the signed-in user's email (used to pick the persona). */
  getSignedInEmail: () => Promise<string | null | undefined>;
  /** Optional fixed persona key that overrides the signed-in email. */
  personaOverride?: string;
  now?: () => Date;
};

const filterAndSort = <T extends SampleLike>(samples: readonly T[], options: QueryOptions = {}): T[] => {
  const start = options.filter?.startDate?.getTime() ?? Number.NEGATIVE_INFINITY;
  const end = options.filter?.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const ascending = options.ascending ?? false;
  const filtered = samples
    .filter((s) => s.startDate.getTime() >= start && s.startDate.getTime() <= end)
    .sort((a, b) =>
      ascending
        ? a.startDate.getTime() - b.startDate.getTime()
        : b.startDate.getTime() - a.startDate.getTime(),
    );
  return typeof options.limit === 'number' && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
};

export const createFakeHealthClient = (deps: FakeHealthDeps) => {
  const resolvePersona = async (): Promise<Persona | undefined> => {
    if (deps.personaOverride) {
      const forced = getPersona(deps.personaOverride);
      if (!forced) console.warn(`[fake-health] Unknown persona override "${deps.personaOverride}"`);
      return forced;
    }
    const email = await deps.getSignedInEmail();
    return personaFromEmail(email);
  };

  const loadData = async (): Promise<PersonaHealthData | null> => {
    const persona = await resolvePersona();
    if (!persona) {
      // Fail the query rather than return "no samples": an empty result would let
      // the sync overwrite a real account's cycle snapshot with an empty one.
      throw new Error('[fake-health] Signed-in account is not a test persona; refusing to serve Health data.');
    }
    return generatePersonaHealthData(persona, deps.now?.() ?? new Date());
  };

  // Mirrors the real client's shape and the HealthKit enum values the app checks.
  // 2 = AuthorizationStatus.sharingAuthorized.
  const SHARING_AUTHORIZED = 2;

  return {
    isHealthDataAvailable: () => true,
    requestAuthorization: async (..._args: unknown[]) => true,
    authorizationStatusFor: (..._args: unknown[]) => SHARING_AUTHORIZED,
    queryCategorySamples: async (identifier: string, options?: QueryOptions) => {
      const data = await loadData();
      if (!data) return [];
      if (identifier === MENSTRUAL_FLOW) return filterAndSort(data.flow, options);
      const kind = SIGNAL_KIND_BY_IDENTIFIER[identifier];
      return kind ? filterAndSort(data.signals[kind], options) : [];
    },
    queryQuantitySamples: async (identifier: string, options?: QueryOptions) => {
      const data = await loadData();
      const kind = SIGNAL_KIND_BY_IDENTIFIER[identifier];
      if (!data || !kind) return [];
      return filterAndSort(data.signals[kind], options);
    },
    // No background delivery in fake mode; callers already treat these as optional.
    enableBackgroundDelivery: undefined,
    disableBackgroundDelivery: undefined,
    subscribeToChanges: undefined,
  };
};
