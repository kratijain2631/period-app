jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => {
  const emit = jest.fn();
  return {
    DeviceEventEmitter: {
      emit,
    },
    __mocks: {
      emit,
    },
  };
});

jest.mock('../healthkitClient', () => {
  const queryCategorySamples = jest.fn();
  const queryQuantitySamples = jest.fn();
  const authorizationStatusFor = jest.fn();
  return {
    AuthorizationStatus: {
      sharingAuthorized: 2,
    },
    MENSTRUAL_FLOW_IDENTIFIER: 'HKCategoryTypeIdentifierMenstrualFlow',
    OVULATION_TEST_IDENTIFIER: 'HKCategoryTypeIdentifierOvulationTestResult',
    PROGESTERONE_TEST_IDENTIFIER: 'HKCategoryTypeIdentifierProgesteroneTestResult',
    CERVICAL_MUCUS_IDENTIFIER: 'HKCategoryTypeIdentifierCervicalMucusQuality',
    BASAL_BODY_TEMPERATURE_IDENTIFIER: 'HKQuantityTypeIdentifierBasalBodyTemperature',
    healthkitClient: {
      queryCategorySamples,
      queryQuantitySamples,
      authorizationStatusFor,
    },
    __mocks: {
      queryCategorySamples,
      queryQuantitySamples,
      authorizationStatusFor,
    },
  };
});

const mockSetAutoPostSettings = jest.fn();
const mockSetHealthPermissions = jest.fn();
jest.mock('../../../state/sessionStore', () => {
  const getState = jest.fn();
  const useSessionStore = Object.assign(jest.fn(), {
    getState,
  });
  return {
    useSessionStore,
    __mockGetState: getState,
  };
});

jest.mock('../../../storage/sqlite/cycleSnapshotStore', () => {
  const clearCycleSnapshots = jest.fn();
  const getLatestCycleSnapshot = jest.fn();
  const upsertCycleSnapshot = jest.fn();
  return {
    clearCycleSnapshots,
    getLatestCycleSnapshot,
    upsertCycleSnapshot,
    __mocks: {
      clearCycleSnapshots,
      getLatestCycleSnapshot,
      upsertCycleSnapshot,
    },
  };
});

jest.mock('../../supabase/cycleEvents', () => {
  const upsertCycleEvents = jest.fn();
  const upsertCycleSnapshotRemote = jest.fn();
  return {
    upsertCycleEvents,
    upsertCycleSnapshotRemote,
    __mocks: {
      upsertCycleEvents,
      upsertCycleSnapshotRemote,
    },
  };
});

jest.mock('../../supabase/users', () => {
  const fetchCurrentAutoPostSettings = jest.fn();
  return {
    fetchCurrentAutoPostSettings,
    __mocks: {
      fetchCurrentAutoPostSettings,
    },
  };
});

jest.mock('../autoPostSettings', () => {
  const selectAutoPostedPeriodSamples = jest.fn();
  return {
    DEFAULT_AUTO_POST_SETTINGS: {
      postPeriodDays: true,
      postOnlyPeriodStart: false,
      postPhaseTransitions: true,
    },
    selectAutoPostedPeriodSamples,
    __mocks: {
      selectAutoPostedPeriodSamples,
    },
  };
});

import { syncHealthData } from '../syncHealthData';
const { __mocks: reactNativeMocks } = jest.requireMock('react-native') as {
  __mocks: {
    emit: jest.Mock;
  };
};
const { __mocks: healthkitMocks } = jest.requireMock('../healthkitClient') as {
  __mocks: {
    queryCategorySamples: jest.Mock;
    queryQuantitySamples: jest.Mock;
    authorizationStatusFor: jest.Mock;
  };
};
const { __mockGetState: mockGetState } = jest.requireMock('../../../state/sessionStore') as {
  __mockGetState: jest.Mock;
};
const { __mocks: storeMocks } = jest.requireMock('../../../storage/sqlite/cycleSnapshotStore') as {
  __mocks: {
    clearCycleSnapshots: jest.Mock;
    getLatestCycleSnapshot: jest.Mock;
    upsertCycleSnapshot: jest.Mock;
  };
};
const { __mocks: cycleEventMocks } = jest.requireMock('../../supabase/cycleEvents') as {
  __mocks: {
    upsertCycleEvents: jest.Mock;
    upsertCycleSnapshotRemote: jest.Mock;
  };
};
const { __mocks: usersMocks } = jest.requireMock('../../supabase/users') as {
  __mocks: {
    fetchCurrentAutoPostSettings: jest.Mock;
  };
};
const { __mocks: autoPostMocks } = jest.requireMock('../autoPostSettings') as {
  __mocks: {
    selectAutoPostedPeriodSamples: jest.Mock;
  };
};
const mockQueryCategorySamples = healthkitMocks.queryCategorySamples;
const mockQueryQuantitySamples = healthkitMocks.queryQuantitySamples;
const mockAuthorizationStatusFor = healthkitMocks.authorizationStatusFor;
const mockEmit = reactNativeMocks.emit;
const mockGetLatestCycleSnapshot = storeMocks.getLatestCycleSnapshot;
const mockUpsertCycleSnapshot = storeMocks.upsertCycleSnapshot;
const mockUpsertCycleSnapshotRemote = cycleEventMocks.upsertCycleSnapshotRemote;
const mockUpsertCycleEvents = cycleEventMocks.upsertCycleEvents;
const mockFetchCurrentAutoPostSettings = usersMocks.fetchCurrentAutoPostSettings;
const mockSelectAutoPostedPeriodSamples = autoPostMocks.selectAutoPostedPeriodSamples;

const userId = 'test-user-id';

describe('syncHealthData signal integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    mockGetState.mockImplementation(() => ({
      permissions: { granted: true },
      session: { userId },
      autoPostSettings: {
        postPeriodDays: true,
        postOnlyPeriodStart: false,
        postPhaseTransitions: true,
      },
      setAutoPostSettings: mockSetAutoPostSettings,
      setHealthPermissions: mockSetHealthPermissions,
    }));
    mockAuthorizationStatusFor.mockResolvedValue(2);
    mockFetchCurrentAutoPostSettings.mockResolvedValue(null);
    mockGetLatestCycleSnapshot.mockResolvedValue({
      snapshot: { currentPhase: 'follicular' },
      lastSyncedAt: '2026-03-10T12:00:00.000Z',
    });
    mockSelectAutoPostedPeriodSamples.mockImplementation((samples: unknown[]) => samples.slice(0, 1));
    mockUpsertCycleSnapshot.mockResolvedValue(undefined);
    mockUpsertCycleSnapshotRemote.mockResolvedValue(undefined);
    mockUpsertCycleEvents.mockResolvedValue(undefined);

    mockQueryCategorySamples.mockImplementation((identifier: string) => {
      if (identifier === 'HKCategoryTypeIdentifierMenstrualFlow') {
        return Promise.resolve([
          {
            uuid: 'm1',
            startDate: new Date('2026-01-01T08:00:00.000Z'),
            endDate: new Date('2026-01-03T08:00:00.000Z'),
            value: 1,
          },
          {
            uuid: 'm2',
            startDate: new Date('2026-01-30T08:00:00.000Z'),
            endDate: new Date('2026-02-01T08:00:00.000Z'),
            value: 1,
          },
          {
            uuid: 'm3',
            startDate: new Date('2026-02-28T08:00:00.000Z'),
            endDate: new Date('2026-03-02T08:00:00.000Z'),
            value: 1,
          },
        ]);
      }

      if (identifier === 'HKCategoryTypeIdentifierOvulationTestResult') {
        return Promise.resolve([
          {
            uuid: 'ovu-1',
            startDate: new Date('2026-03-15T07:00:00.000Z'),
            endDate: new Date('2026-03-15T07:00:00.000Z'),
            value: 2,
          },
        ]);
      }

      if (identifier === 'HKCategoryTypeIdentifierProgesteroneTestResult') {
        return Promise.resolve([
          {
            uuid: 'prog-1',
            startDate: new Date('2026-03-10T07:00:00.000Z'),
            endDate: new Date('2026-03-10T07:00:00.000Z'),
            value: 2,
          },
        ]);
      }

      if (identifier === 'HKCategoryTypeIdentifierCervicalMucusQuality') {
        return Promise.resolve([
          {
            uuid: 'mucus-1',
            startDate: new Date('2026-03-15T07:00:00.000Z'),
            endDate: new Date('2026-03-15T07:00:00.000Z'),
            value: 4,
          },
        ]);
      }

      return Promise.resolve([]);
    });

    mockQueryQuantitySamples.mockResolvedValue([
      {
        uuid: 'bbt-1',
        startDate: new Date('2026-03-14T07:00:00.000Z'),
        endDate: new Date('2026-03-14T07:00:00.000Z'),
        value: 36.8,
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queries all optional HealthKit signals and persists phase-source metadata', async () => {
    const snapshot = await syncHealthData({ trigger: 'manual' });

    expect(mockQueryCategorySamples).toHaveBeenCalledWith(
      'HKCategoryTypeIdentifierOvulationTestResult',
      expect.any(Object),
    );
    expect(mockQueryCategorySamples).toHaveBeenCalledWith(
      'HKCategoryTypeIdentifierProgesteroneTestResult',
      expect.any(Object),
    );
    expect(mockQueryCategorySamples).toHaveBeenCalledWith(
      'HKCategoryTypeIdentifierCervicalMucusQuality',
      expect.any(Object),
    );
    expect(mockQueryQuantitySamples).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierBasalBodyTemperature',
      expect.any(Object),
    );

    const signalKinds = snapshot?.signalSamples?.map((sample) => sample.kind) ?? [];
    expect(signalKinds).toEqual(
      expect.arrayContaining([
        'ovulation_test',
        'progesterone_test',
        'cervical_mucus',
        'basal_body_temperature',
      ]),
    );

    const postedEvents = mockUpsertCycleEvents.mock.calls[0][0];
    const flowEvent = postedEvents.find((event: { event_type: string }) => event.event_type === 'menstrual_flow');
    const transitionEvent = postedEvents.find(
      (event: { event_type: string }) => event.event_type === 'phase_transition',
    );

    expect(flowEvent?.symptoms?.phase_source).toBe(snapshot?.phaseSource ?? 'unknown');
    expect(transitionEvent?.symptoms?.phase_source).toBe(snapshot?.phaseSource ?? 'unknown');

    // A period-flow event is always labeled 'menstruation' — never the current
    // derived phase (which mislabeled period posts as e.g. "Follicular phase"
    // and duplicated the label across multiple logged days). See BUGS.md.
    expect(flowEvent?.phase).toBe('menstruation');
    // The phase-transition post still carries the real current phase.
    expect(transitionEvent?.phase).toBe(snapshot?.currentPhase);
  });
});
