import React from 'react';
import { useProfileGate } from '../useProfileGate';
import { useSessionStore } from '../../../state/sessionStore';
import { useConnectionStore } from '../../../state/connectionStore';
import { fetchCurrentUserProfile } from '../users';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../users', () => ({ fetchCurrentUserProfile: jest.fn(), hasRemoteAutoPostSettings: () => false }));
jest.mock('../../../state/connectionStore', () => ({
  useConnectionStore: require('zustand').create(() => ({ isOnline: true })),
}));
const { create, act } = require('react-test-renderer');
const fetchProfile = jest.mocked(fetchCurrentUserProfile);
const Harness = () => { useProfileGate(); return null; };
let root: ReturnType<typeof create> | undefined;
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => { resolve = done; });
  return { resolve, promise };
};
const signIn = (id = 'a') => useSessionStore.getState().setSession({ userId: id, accessToken: 'token' });
const mount = async () => { await act(async () => { root = create(<Harness />); }); };
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await useSessionStore.persist.rehydrate();
  useSessionStore.getState().reset();
  useConnectionStore.setState({ isOnline: true });
  fetchProfile.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  jest.restoreAllMocks();
});

it('preserves the persisted alias on an offline cold start', async () => {
  signIn();
  useSessionStore.getState().setAlias('Existing');
  // Restore the on-disk account/profile as a fresh process would.
  useSessionStore.setState({ alias: null, session: null, isHydrating: true }, false);
  // setState persists too, so seed the stored cold-start fixture explicitly.
  const storage = require('@react-native-async-storage/async-storage');
  await storage.setItem('session-store', JSON.stringify({ version: 4, state: {
    session: { userId: 'a', accessToken: 'token' }, alias: 'Existing', hasSeenCompanionIntro: true,
  } }));
  await useSessionStore.persist.rehydrate();
  useConnectionStore.setState({ isOnline: false });
  useSessionStore.getState().setHydrating(false);
  await mount();
  expect(useSessionStore.getState().alias).toBe('Existing');
  expect(useSessionStore.getState().isProfileHydrating).toBe(false);
  expect(fetchProfile).not.toHaveBeenCalled();
});

it('retains an alias when a request fails even before offline detection', async () => {
  signIn(); useSessionStore.getState().setAlias('Existing');
  fetchProfile.mockRejectedValue(new Error('Network unavailable'));
  await mount();
  expect(useSessionStore.getState().alias).toBe('Existing');
  expect(useSessionStore.getState().profileLoadError).toBeTruthy();
});

it('uses an unavailable state instead of alias setup when no cache exists', async () => {
  signIn(); fetchProfile.mockRejectedValue(new Error('Offline'));
  await mount();
  expect(useSessionStore.getState().alias).toBeNull();
  expect(useSessionStore.getState().profileLoadError).toBeTruthy();
  fetchProfile.mockResolvedValue({ id: 'a', alias: 'Existing' } as any);
  await act(async () => useSessionStore.getState().retryProfile());
  expect(useSessionStore.getState().alias).toBe('Existing');
  expect(useSessionStore.getState().profileLoadError).toBeNull();
});

it('opens alias setup only after a successful profile lookup confirms no alias', async () => {
  signIn(); fetchProfile.mockResolvedValue({ id: 'a', alias: null } as any);
  await mount();
  expect(useSessionStore.getState().alias).toBeNull();
  expect(useSessionStore.getState().profileLoadError).toBeNull();
  expect(useSessionStore.getState().isProfileHydrating).toBe(false);
});

it('does not clear a cached alias while authentication is hydrating', async () => {
  signIn(); useSessionStore.getState().setAlias('Existing');
  useSessionStore.getState().setHydrating(true);
  await mount();
  expect(useSessionStore.getState().alias).toBe('Existing');
  expect(fetchProfile).not.toHaveBeenCalled();
});

it('retries on reconnect without asking for an alias again', async () => {
  signIn(); useConnectionStore.setState({ isOnline: false });
  await mount();
  fetchProfile.mockResolvedValue({ id: 'a', alias: 'Existing' } as any);
  await act(async () => useConnectionStore.setState({ isOnline: true }));
  expect(useSessionStore.getState().alias).toBe('Existing');
  expect(useSessionStore.getState().profileLoadError).toBeNull();
});

it('clears account A cache on switching to B and rejects a late A profile', async () => {
  signIn(); useSessionStore.getState().setAlias('A');
  const pending = deferred(); fetchProfile.mockReturnValueOnce(pending.promise);
  await mount();
  fetchProfile.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => signIn('b'));
  expect(useSessionStore.getState().alias).toBeNull();
  await act(async () => pending.resolve({ id: 'a', alias: 'Late A' }));
  expect(useSessionStore.getState().alias).toBeNull();
  expect(useSessionStore.getState().profileLoadError).toBeTruthy();
});

it('preserves cached alias during same-account token refresh and clears it on sign-out', async () => {
  signIn(); useSessionStore.getState().setAlias('A');
  useConnectionStore.setState({ isOnline: false }); await mount();
  await act(async () => useSessionStore.getState().setSession({ userId: 'a', accessToken: 'new' }));
  expect(useSessionStore.getState().alias).toBe('A');
  await act(async () => useSessionStore.getState().setSession(null));
  expect(useSessionStore.getState().alias).toBeNull();
});
