import { fetchCycleEvents } from '../cycleEvents';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

describe('shared cycle events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the safe shared-event projection', async () => {
    const rows = [
      {
        id: 'event-1',
        user_id: 'friend-1',
        event_type: 'menstrual_flow',
        phase: 'menstruation',
        symptoms: { phase_source: 'observed' },
        starts_at: '2026-07-29T12:00:00.000Z',
        created_at: '2026-07-29T12:00:00.000Z',
      },
    ];
    supabase.rpc.mockResolvedValue({ data: rows, error: null });

    await expect(fetchCycleEvents(25)).resolves.toEqual(rows);
    expect(supabase.rpc).toHaveBeenCalledWith('shared_cycle_events', { max_rows: 25 });
  });
});

