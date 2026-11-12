import { ensureCycleGuidance } from '../cycleGuidance';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: { from: jest.fn(), functions: { invoke: jest.fn() } },
}));
const { supabase } = jest.requireMock('../client');
const cached = {
  phase: 'luteal', phase_started_at: '2026-11-01T00:00:00.000Z',
  dos: ['Rest'], donts: ['Overbook'], friend_suggestions: [], generated_at: '2026-11-03',
};
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockReturnValue({ select: () => ({ eq }) });
  maybeSingle.mockResolvedValue({ data: null, error: null });
  supabase.functions.invoke.mockResolvedValue({ data: { guidance: cached }, error: null });
});

it('reads a current cache without calling AI', async () => {
  maybeSingle.mockResolvedValue({ data: cached, error: null });
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toEqual(cached);
  expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  expect(supabase.functions.invoke).not.toHaveBeenCalled();
});

it('regenerates after a phase change and coalesces overlapping requests', async () => {
  maybeSingle.mockResolvedValue({ data: { ...cached, phase: 'ovulation' }, error: null });
  const first = ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at);
  const second = ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at);
  expect(first).toBe(second);
  await expect(first).resolves.toEqual(cached);
  expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  expect(supabase.functions.invoke).toHaveBeenCalledWith('request-cycle-guidance', {
    body: { userId: 'user-1', phase: 'luteal', phaseStart: cached.phase_started_at },
  });
});

it('does not reuse the same phase from a prior cycle', async () => {
  maybeSingle.mockResolvedValue({ data: { ...cached, phase_started_at: '2026-10-01' }, error: null });
  await ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at);
  expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
});

it('keeps different accounts separate during overlapping requests', async () => {
  await Promise.all([
    ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at),
    ensureCycleGuidance('user-2', 'luteal', cached.phase_started_at),
  ]);
  expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
  expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  expect(eq).toHaveBeenCalledWith('user_id', 'user-2');
});

it('leaves fallback selected if generation is pending or returns another phase', async () => {
  supabase.functions.invoke.mockResolvedValueOnce({ data: { pending: true, guidance: null }, error: null });
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toBeNull();
  supabase.functions.invoke.mockResolvedValueOnce({ data: { guidance: { ...cached, phase: 'pms' } }, error: null });
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toBeNull();
});

it('can retry after a failed request and rejects malformed tips', async () => {
  supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).rejects.toThrow('Offline');
  supabase.functions.invoke.mockResolvedValueOnce({ data: { guidance: { ...cached, dos: [null, {}] } }, error: null });
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toBeNull();
  await expect(ensureCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toEqual(cached);
});

it('does not call the server before a phase is known', async () => {
  await expect(ensureCycleGuidance('user-1', 'unknown', null)).resolves.toBeNull();
  expect(supabase.from).not.toHaveBeenCalled();
});

it('manual refresh bypasses the cache and coalesces double taps', async () => {
  const { refreshCycleGuidance } = require('../cycleGuidance');
  const first = refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at);
  const second = refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at);
  expect(first).toBe(second);
  await expect(first).resolves.toEqual({ guidance: cached, refreshLimited: false, pending: false });
  expect(supabase.from).not.toHaveBeenCalled();
  expect(supabase.functions.invoke).toHaveBeenCalledWith('request-cycle-guidance', {
    body: { userId: 'user-1', phase: 'luteal', phaseStart: cached.phase_started_at, refresh: true },
  });
});

it('manual refresh preserves cooldown and pending responses', async () => {
  const { refreshCycleGuidance } = require('../cycleGuidance');
  supabase.functions.invoke.mockResolvedValueOnce({ data: { guidance: cached, refreshLimited: true }, error: null });
  expect((await refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at)).refreshLimited).toBe(true);
  supabase.functions.invoke.mockResolvedValueOnce({ data: { guidance: null, pending: true }, error: null });
  expect((await refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at)).pending).toBe(true);
});


it('manual refresh rejects malformed success and can retry after errors', async () => {
  const { refreshCycleGuidance } = require('../cycleGuidance');
  supabase.functions.invoke.mockResolvedValueOnce({ data: { guidance: null }, error: null });
  await expect(refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at)).rejects.toThrow('no current guidance');
  await expect(refreshCycleGuidance('user-1', 'luteal', cached.phase_started_at)).resolves.toEqual({ guidance: cached, refreshLimited: false, pending: false });
});
