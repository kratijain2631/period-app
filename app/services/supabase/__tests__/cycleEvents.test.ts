import { fetchCycleEvents, remoteSnapshotHasSamples } from '../cycleEvents';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

const eventRow = {
  id: 'event-1',
  user_id: 'friend-1',
  event_type: 'menstrual_flow',
  phase: 'menstruation',
  symptoms: { phase_source: 'observed' },
  starts_at: '2026-08-06T12:00:00.000Z',
  created_at: '2026-08-06T12:00:00.000Z',
};

describe('shared cycle events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the safe shared-event projection', async () => {
    supabase.rpc.mockResolvedValue({ data: [eventRow], error: null });

    await expect(fetchCycleEvents(25)).resolves.toEqual([eventRow]);
    expect(supabase.rpc).toHaveBeenCalledWith('shared_cycle_events', { max_rows: 25 });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propagates RPC failures without reading the raw table', async () => {
    const error = { code: '42501', message: 'permission denied' };
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(fetchCycleEvents()).rejects.toEqual(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('remoteSnapshotHasSamples', () => {
  const selectOwnRow = (result: { data: unknown; error: unknown }) => {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    supabase.from.mockReturnValue({ select });
    return { select, eq };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads only the signed-in user\'s own row', async () => {
    const { select, eq } = selectOwnRow({ data: { snapshot: { samples: [{ id: 's1' }] } }, error: null });

    await expect(remoteSnapshotHasSamples('user-1')).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('cycle_snapshots');
    expect(select).toHaveBeenCalledWith('snapshot');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('is false with no row or an empty snapshot', async () => {
    selectOwnRow({ data: null, error: null });
    await expect(remoteSnapshotHasSamples('user-1')).resolves.toBe(false);
    selectOwnRow({ data: { snapshot: { samples: [] } }, error: null });
    await expect(remoteSnapshotHasSamples('user-1')).resolves.toBe(false);
  });

  it('propagates query errors', async () => {
    const error = { code: '42501', message: 'permission denied' };
    selectOwnRow({ data: null, error });
    await expect(remoteSnapshotHasSamples('user-1')).rejects.toEqual(error);
  });
});
