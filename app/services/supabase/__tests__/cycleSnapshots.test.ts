import { fetchCycleSnapshotByUserId, fetchFriendCycleSnapshots } from '../cycleSnapshots';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

describe('cycle snapshot sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads only the server-sanitized cycle summaries', async () => {
    const rows = [
      {
        user_id: 'friend-1',
        last_synced_at: '2026-07-29T12:00:00.000Z',
        snapshot: {
          currentPhase: 'luteal',
          samples: [
            {
              id: 'shared-1',
              flowValue: 1,
              startDate: '2026-07-01T00:00:00.000Z',
              endDate: '2026-07-03T00:00:00.000Z',
            },
          ],
        },
      },
    ];
    supabase.rpc.mockResolvedValue({ data: rows, error: null });

    await expect(fetchFriendCycleSnapshots()).resolves.toEqual(rows);
    expect(supabase.rpc).toHaveBeenCalledWith('friend_cycle_summaries');
  });

  it('selects a requested user from the sanitized summaries', async () => {
    const friend = {
      user_id: 'friend-2',
      last_synced_at: '2026-07-29T12:00:00.000Z',
      snapshot: { currentPhase: 'follicular', samples: [] },
    };
    supabase.rpc.mockResolvedValue({ data: [friend], error: null });

    await expect(fetchCycleSnapshotByUserId('friend-2')).resolves.toEqual(friend);
    await expect(fetchCycleSnapshotByUserId('not-visible')).resolves.toBeNull();
  });
});

