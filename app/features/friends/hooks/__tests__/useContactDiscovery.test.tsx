import React from 'react';
import { AppState, Linking } from 'react-native';
import * as contacts from '../../../../services/contacts/contactDiscovery';
import { useContactDiscovery } from '../useContactDiscovery';

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn() },
  Linking: { openSettings: jest.fn() },
}));
jest.mock('../../../../services/contacts/contactDiscovery', () => ({
  getContactDiscoveryPermission: jest.fn(),
  requestContactDiscoveryPermission: jest.fn(),
  findDiscoverableContacts: jest.fn(),
  fetchContactDiscoverability: jest.fn(),
  setContactDiscoverability: jest.fn(),
}));

const { act, create } = require('react-test-renderer');
const mockContacts = jest.mocked(contacts);
const match = { id: 'friend', alias: 'friend', contactName: 'Local name' };
let current: ReturnType<typeof useContactDiscovery>;
let root: ReturnType<typeof create>;
let onAppState: (state: string) => void;
const removeListener = jest.fn();

const Harness = ({ userId = 'self', focused = true }: { userId?: string; focused?: boolean }) => {
  current = useContactDiscovery(userId, focused);
  return null;
};
const mount = async () => { await act(async () => { root = create(<Harness />); }); };
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  jest.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  (AppState.addEventListener as jest.Mock).mockImplementation((_event, listener) => {
    onAppState = listener;
    return { remove: removeListener };
  });
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('limited');
  mockContacts.fetchContactDiscoverability.mockResolvedValue(false);
  mockContacts.findDiscoverableContacts.mockResolvedValue([match]);
  mockContacts.setContactDiscoverability.mockResolvedValue();
  (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  jest.useRealTimers();
});

it('does not request permission or read contacts on mount', async () => {
  await mount();
  expect(current.contactPermission).toBe('limited');
  expect(mockContacts.requestContactDiscoveryPermission).not.toHaveBeenCalled();
  expect(mockContacts.findDiscoverableContacts).not.toHaveBeenCalled();
});

it.each(['limited', 'granted'] as const)('finds contacts with %s access while own discoverability stays off', async (permission) => {
  mockContacts.getContactDiscoveryPermission.mockResolvedValue(permission);
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.contactMatches).toEqual([match]);
  expect(current.isContactDiscoverable).toBe(false);
  expect(mockContacts.setContactDiscoverability).not.toHaveBeenCalled();
});

it('denial never starts a lookup', async () => {
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('undetermined');
  mockContacts.requestContactDiscoveryPermission.mockResolvedValue('denied');
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.contactPermission).toBe('denied');
  expect(current.contactNotice).toContain('Settings');
  expect(mockContacts.findDiscoverableContacts).not.toHaveBeenCalled();
});

it('uses Settings and refreshes permission on return without a tab change', async () => {
  await mount();
  await act(async () => current.handleContactSettings());
  expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  await act(async () => onAppState('background'));
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('granted');
  await act(async () => onAppState('active'));
  expect(current.contactPermission).toBe('granted');
  await act(async () => current.handleFindContacts());
  expect(current.contactMatches).toEqual([match]);
});

it('clears cached results and ignores a lookup that finishes after access is revoked', async () => {
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.contactMatches).toEqual([match]);
  const pending = deferred<contacts.ContactMatch[]>();
  mockContacts.findDiscoverableContacts.mockReturnValue(pending.promise);
  let lookup!: Promise<void>;
  await act(async () => { lookup = current.handleFindContacts(); });
  await act(async () => onAppState('background'));
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('denied');
  await act(async () => onAppState('active'));
  await act(async () => { pending.resolve([match]); await lookup; });
  expect(current.contactPermission).toBe('denied');
  expect(current.contactMatches).toEqual([]);
  expect(current.isFindingContacts).toBe(false);
});

it('ignores old-account results and preferences after account switching', async () => {
  const preference = deferred<boolean>();
  mockContacts.fetchContactDiscoverability.mockReturnValueOnce(preference.promise);
  await mount();
  const pending = deferred<contacts.ContactMatch[]>();
  mockContacts.findDiscoverableContacts.mockReturnValue(pending.promise);
  let lookup!: Promise<void>;
  await act(async () => { lookup = current.handleFindContacts(); });
  await act(async () => root.update(<Harness userId="other" />));
  await act(async () => { pending.resolve([match]); preference.resolve(true); await lookup; });
  expect(current.contactMatches).toEqual([]);
  expect(current.isContactDiscoverable).toBe(false);
});

it('keeps the account toggle independent of denied Contacts access and preserves it on failure', async () => {
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('denied');
  await mount();
  await act(async () => current.handleDiscoverabilityChange(true));
  expect(current.isContactDiscoverable).toBe(true);
  mockContacts.setContactDiscoverability.mockRejectedValue(new Error('Offline'));
  await act(async () => current.handleDiscoverabilityChange(false));
  expect(current.isContactDiscoverable).toBe(true);
  expect(current.contactNotice).toContain('Could not confirm');
  expect(mockContacts.requestContactDiscoveryPermission).not.toHaveBeenCalled();
});

it('shows progress immediately and recovers from a hanging native call', async () => {
  jest.useFakeTimers();
  await mount();
  mockContacts.getContactDiscoveryPermission.mockReturnValue(new Promise(() => {}));
  let lookup!: Promise<void>;
  await act(async () => { lookup = current.handleFindContacts(); });
  expect(current.isFindingContacts).toBe(true);
  expect(current.contactNotice).toContain('Checking');
  await act(async () => { jest.advanceTimersByTime(15000); await lookup; });
  expect(current.isFindingContacts).toBe(false);
  expect(current.contactNotice).toContain('Could not check contacts');
});

it('shows an actionable explanation for empty results', async () => {
  mockContacts.findDiscoverableContacts.mockResolvedValue([]);
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.contactNotice).toContain('email matching their account');
  expect(current.contactNotice).toContain('Let contacts find me');
});

it('closes the lookup when returning from Settings so one tap searches again', async () => {
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.isContactLookupOpen).toBe(true);
  await act(async () => current.handleContactSettings());
  await act(async () => onAppState('background'));
  await act(async () => onAppState('active'));
  expect(current.isContactLookupOpen).toBe(false);
  expect(current.contactMatches).toEqual([]);
  expect(current.contactNotice).toContain('Tap Find Contacts');
});

it('says access was updated after the permission sheet backgrounds the app, but not on a plain return', async () => {
  await mount();
  await act(async () => onAppState('background'));
  await act(async () => onAppState('active'));
  expect(current.contactNotice).toBeNull();

  mockContacts.getContactDiscoveryPermission.mockResolvedValue('undetermined');
  const sheet = deferred<contacts.ContactDiscoveryPermission>();
  mockContacts.requestContactDiscoveryPermission.mockReturnValue(sheet.promise);
  let lookup!: Promise<void>;
  await act(async () => { lookup = current.handleFindContacts(); });
  // iOS 18+ backgrounds the app for the alert and again for the contact picker.
  await act(async () => onAppState('inactive'));
  await act(async () => onAppState('active'));
  await act(async () => onAppState('inactive'));
  mockContacts.getContactDiscoveryPermission.mockResolvedValue('limited');
  await act(async () => onAppState('active'));
  await act(async () => { sheet.resolve('limited'); await lookup; });
  expect(current.isContactLookupOpen).toBe(false);
  expect(current.contactNotice).toContain('Tap Find Contacts');
});

it('hiding the lookup clears matches and the notice', async () => {
  mockContacts.findDiscoverableContacts.mockResolvedValue([]);
  await mount();
  await act(async () => current.handleFindContacts());
  expect(current.contactNotice).toContain('No discoverable contacts');
  await act(async () => current.closeContactLookup());
  expect(current.isContactLookupOpen).toBe(false);
  expect(current.contactNotice).toBeNull();
});
