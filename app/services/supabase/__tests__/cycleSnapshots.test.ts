import { fetchCycleSnapshotByUserId, fetchFriendCycleSnapshots } from '../cycleSnapshots';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

const summaryRow = {
  user_id: 'friend-1',
  last_synced_at: '2026-08-06T12:00:00.000Z',
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
};

describe('cycle snapshot sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the server-sanitized cycle summaries', async () => {
    supabase.rpc.mockResolvedValue({ data: [summaryRow], error: null });

    await expect(fetchFriendCycleSnapshots()).resolves.toEqual([summaryRow]);
    expect(supabase.rpc).toHaveBeenCalledWith('friend_cycle_summaries');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('selects a requested user from one sanitized summary read', async () => {
    supabase.rpc.mockResolvedValue({ data: [summaryRow], error: null });

    await expect(fetchCycleSnapshotByUserId('friend-1')).resolves.toEqual(summaryRow);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('falls back to the legacy table only when the RPC is missing', async () => {
    const order = jest.fn().mockResolvedValue({ data: [summaryRow], error: null });
    const select = jest.fn().mockReturnValue({ order });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.friend_cycle_summaries',
      },
    });
    supabase.from.mockReturnValue({ select });

    await expect(fetchFriendCycleSnapshots()).resolves.toEqual([summaryRow]);
    expect(supabase.from).toHaveBeenCalledWith('cycle_snapshots');
  });

  it('does not hide real RPC failures behind the legacy fallback', async () => {
    const error = { code: '42501', message: 'permission denied' };
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(fetchFriendCycleSnapshots()).rejects.toEqual(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

