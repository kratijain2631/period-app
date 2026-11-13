jest.mock('../../supabase/cyclePrivacy', () => ({
  readCycleSyncEnabled: jest.fn().mockResolvedValue(true),
  saveCycleSyncEnabled: jest.fn().mockResolvedValue(undefined),
}));
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
  const remoteSnapshotHasSamples = jest.fn();
  const upsertCycleEvents = jest.fn();
  const upsertCycleSnapshotRemote = jest.fn();
  return {
    remoteSnapshotHasSamples,
    upsertCycleEvents,
    upsertCycleSnapshotRemote,
    __mocks: {
      remoteSnapshotHasSamples,
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
    remoteSnapshotHasSamples: jest.Mock;
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
const mockRemoteSnapshotHasSamples = cycleEventMocks.remoteSnapshotHasSamples;
const mockFetchCurrentAutoPostSettings = usersMocks.fetchCurrentAutoPostSettings;
const mockSelectAutoPostedPeriodSamples = autoPostMocks.selectAutoPostedPeriodSamples;

const userId = 'test-user-id';

describe('syncHealthData signal integration', () => {
  it('does not let a Health read in flight refill an explicitly erased account', async () => {
    let release!: (data: never[]) => void;
    const held = new Promise<never[]>(resolve => { release = resolve; });
    mockQueryCategorySamples.mockReturnValueOnce(held);
    const running = syncHealthData();
    await Promise.resolve();
    const { eraseSyncedCycleData } = jest.requireActual('../syncHealthData');
    const removal = eraseSyncedCycleData(userId);
    release([]);
    await Promise.all([running, removal]);
    expect(mockUpsertCycleSnapshot).not.toHaveBeenCalled();
    expect(mockUpsertCycleSnapshotRemote).not.toHaveBeenCalled();
    expect(storeMocks.clearCycleSnapshots).toHaveBeenCalledWith(userId);
  });
  it('clears this account and skips Health reads when another device withdrew consent', async () => {
    jest.requireMock('../../supabase/cyclePrivacy').readCycleSyncEnabled.mockResolvedValueOnce(false);
    expect(await syncHealthData({ trigger: 'background' })).toBeNull();
    expect(storeMocks.clearCycleSnapshots).toHaveBeenCalledWith(userId);
    expect(mockQueryCategorySamples).not.toHaveBeenCalled();
    expect(mockUpsertCycleSnapshotRemote).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    mockGetState.mockImplementation(() => ({
      hasSeenCompanionIntro: true,
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
    mockRemoteSnapshotHasSamples.mockResolvedValue(false);

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

  it('waits for initial sharing choices before reading Health or posting events', async () => {
    mockGetState.mockReturnValueOnce({ session: { userId }, permissions: { granted: true }, hasSeenCompanionIntro: false });
    expect(await syncHealthData({ trigger: 'background' })).toBeNull();
    expect(mockAuthorizationStatusFor).not.toHaveBeenCalled();
    expect(mockUpsertCycleEvents).not.toHaveBeenCalled();
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

  describe('when Health returns no flow samples', () => {
    beforeEach(() => {
      mockQueryCategorySamples.mockResolvedValue([]);
      mockQueryQuantitySamples.mockResolvedValue([]);
    });

    it('keeps an existing shared snapshot that has period history', async () => {
      mockRemoteSnapshotHasSamples.mockResolvedValue(true);
      const snapshot = await syncHealthData({ trigger: 'manual' });

      expect(snapshot?.currentPhase).toBe('unknown');
      expect(mockRemoteSnapshotHasSamples).toHaveBeenCalledWith(userId);
      expect(mockUpsertCycleSnapshotRemote).not.toHaveBeenCalled();
    });

    it('still writes a first snapshot for a user with no shared history', async () => {
      await syncHealthData({ trigger: 'manual' });

      expect(mockUpsertCycleSnapshotRemote).toHaveBeenCalledTimes(1);
    });

    it('leaves the shared snapshot unchanged when the check fails', async () => {
      mockRemoteSnapshotHasSamples.mockRejectedValue(new Error('offline'));
      await syncHealthData({ trigger: 'manual' });

      expect(mockUpsertCycleSnapshotRemote).not.toHaveBeenCalled();
    });
  });

  it('uploads without checking the shared snapshot when samples were read', async () => {
    await syncHealthData({ trigger: 'manual' });

    expect(mockRemoteSnapshotHasSamples).not.toHaveBeenCalled();
    expect(mockUpsertCycleSnapshotRemote).toHaveBeenCalledTimes(1);
  });

  it('does not post a transition when the phase can no longer be estimated', async () => {
    // 62 days after the latest period started, with no newer flow logged.
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
    const snapshot = await syncHealthData({ trigger: 'manual' });

    expect(snapshot?.currentPhase).toBe('unknown');
    const postedEvents = mockUpsertCycleEvents.mock.calls[0][0];
    expect(
      postedEvents.some((event: { event_type: string }) => event.event_type === 'phase_transition'),
    ).toBe(false);
  });
});
