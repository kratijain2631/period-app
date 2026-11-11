import React from 'react';
import { usePhaseGuidance } from '../usePhaseGuidance';
import { ensureCycleGuidance, refreshCycleGuidance } from '../../../../services/supabase/cycleGuidance';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../services/supabase/cycleGuidance', () => ({
  ensureCycleGuidance: jest.fn(), refreshCycleGuidance: jest.fn(),
}));
const { create, act } = require('react-test-renderer');
const ensure = jest.mocked(ensureCycleGuidance);
const refresh = jest.mocked(refreshCycleGuidance);
const guidance = { phase: 'luteal', phase_started_at: 'start', dos: ['Rest'], donts: ['Overbook'], friend_suggestions: [], generated_at: 'now' };
let current: ReturnType<typeof usePhaseGuidance>;
let root: ReturnType<typeof create>;
const Harness = ({ user = 'self', phase = 'luteal' }: { user?: string; phase?: string }) => {
  current = usePhaseGuidance(user, phase, 'start');
  return null;
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => {
  jest.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  ensure.mockResolvedValue(guidance);
  refresh.mockResolvedValue({ guidance, refreshLimited: false, pending: false });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const mount = async () => { await act(async () => { root = create(<Harness />); }); };

it('keeps old tips during refresh and ignores double taps before rendering', async () => {
  await mount();
  const pending = deferred<Awaited<ReturnType<typeof refreshCycleGuidance>>>();
  refresh.mockReturnValueOnce(pending.promise);
  let request!: Promise<void>;
  await act(async () => { request = current.refresh(); void current.refresh(); });
  expect(current.guidance).toEqual(guidance);
  expect(current.status).toBe('loading');
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve({ guidance: { ...guidance, dos: ['New'] }, refreshLimited: false, pending: false }); await request; });
  expect(current.guidance?.dos).toEqual(['New']);
  expect(current.message).toBe('Tips refreshed.');
});

it('keeps advice and shows actionable feedback when refresh fails', async () => {
  await mount();
  refresh.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { await current.refresh(); });
  expect(current.guidance).toEqual(guidance);
  expect(current.status).toBe('error');
  expect(current.message).toContain('Couldn’t refresh');
});

it.each([{ user: 'other', phase: 'luteal' }, { user: 'self', phase: 'pms' }])('ignores a late refresh after scope changes to %j', async (props) => {
  await mount();
  const pending = deferred<Awaited<ReturnType<typeof refreshCycleGuidance>>>();
  refresh.mockReturnValueOnce(pending.promise);
  let request!: Promise<void>;
  await act(async () => { request = current.refresh(); });
  ensure.mockResolvedValueOnce(null);
  await act(async () => { root.update(<Harness {...props} />); });
  await act(async () => { pending.resolve({ guidance, refreshLimited: false, pending: false }); await request; });
  expect(current.guidance).toBeNull();
  expect(current.message).toBeNull();
});

it('keeps the current advice and explains a cooldown response', async () => {
  await mount();
  refresh.mockResolvedValueOnce({ guidance, refreshLimited: true, pending: false });
  await act(async () => { await current.refresh(); });
  expect(current.guidance).toEqual(guidance);
  expect(current.message).toContain('couple of minutes');
});

it('disables refresh until a phase is known', async () => {
  await act(async () => { root = create(<Harness phase="unknown" />); });
  await act(async () => { await current.refresh(); });
  expect(current.canRefresh).toBe(false);
  expect(ensure).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
});
