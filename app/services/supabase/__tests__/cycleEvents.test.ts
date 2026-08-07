import { fetchCycleEvents } from '../cycleEvents';

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

  it('falls back to the legacy table only when the RPC is missing', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [eventRow], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.shared_cycle_events',
      },
    });
    supabase.from.mockReturnValue({ select });

    await expect(fetchCycleEvents(25)).resolves.toEqual([eventRow]);
    expect(supabase.from).toHaveBeenCalledWith('cycle_events');
    expect(limit).toHaveBeenCalledWith(25);
  });

  it('does not hide real RPC failures behind the legacy fallback', async () => {
    const error = { code: '42501', message: 'permission denied' };
    supabase.rpc.mockResolvedValue({ data: null, error });

    await expect(fetchCycleEvents()).rejects.toEqual(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

