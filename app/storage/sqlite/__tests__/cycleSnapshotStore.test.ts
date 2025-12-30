const buildStore = (options?: { snapshotJson?: string; lastSyncedAt?: string }) => {
  jest.resetModules();
  const runAsync = jest.fn();
  const execAsync = jest.fn();
  const getFirstAsync = jest.fn(() => {
    return {
      snapshot_json: options?.snapshotJson ?? JSON.stringify({ syncedAt: 'now', samples: [], currentPhase: 'unknown' }),
      last_synced_at: options?.lastSyncedAt ?? new Date().toISOString(),
    };
  });

  jest.doMock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(async () => ({ runAsync, execAsync, getFirstAsync })),
  }));

  const store = require('../cycleSnapshotStore');
  return { store, runAsync, execAsync, getFirstAsync };
};

describe('cycleSnapshotStore', () => {
  it('upserts cycle snapshots', async () => {
    const { store, runAsync } = buildStore();
    await store.upsertCycleSnapshot('user-1', {
      syncedAt: new Date().toISOString(),
      samples: [],
      currentPhase: 'unknown',
    });

    const insertCall = runAsync.mock.calls.find(([statement]) =>
      statement.includes('insert into cycle_snapshots'),
    );
    expect(insertCall).toBeTruthy();
  });

  it('parses stored snapshot JSON', async () => {
    const snapshotJson = JSON.stringify({
      syncedAt: '2025-01-01T00:00:00.000Z',
      samples: [],
      currentPhase: 'menstruation',
    });
    const { store } = buildStore({ snapshotJson, lastSyncedAt: '2025-01-01T00:00:00.000Z' });
    const stored = await store.getLatestCycleSnapshot('user-1');

    expect(stored?.snapshot.currentPhase).toBe('menstruation');
  });

  it('flags stale snapshots after 24 hours', () => {
    const { store } = buildStore();
    const stale = store.isSnapshotStale(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
    const fresh = store.isSnapshotStale(new Date(Date.now() - 5 * 60 * 1000).toISOString());

    expect(stale).toBe(true);
    expect(fresh).toBe(false);
  });
});
