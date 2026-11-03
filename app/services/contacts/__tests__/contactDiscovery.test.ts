jest.mock('expo-contacts', () => ({
  Fields: { Emails: 'emails' },
  SortTypes: { FirstName: 'firstName' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
}));

jest.mock('../../supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import * as Contacts from 'expo-contacts';
import { supabase } from '../../supabase/client';
import {
  findDiscoverableContacts,
  fetchContactDiscoverability,
  getContactDiscoveryPermission,
  hashContactEmail,
  normalizeContactEmail,
  requestContactDiscoveryPermission,
  setContactDiscoverability,
} from '../contactDiscovery';

describe('contact discovery', () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([
    ['undetermined', undefined, 'undetermined'],
    ['denied', 'none', 'denied'],
    ['granted', 'limited', 'limited'],
    ['granted', 'all', 'granted'],
    ['granted', undefined, 'granted'],
  ])('maps status %s / access %s to %s without requesting access', async (status, accessPrivileges, expected) => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status, accessPrivileges });
    await expect(getContactDiscoveryPermission()).resolves.toBe(expected);
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['denied', 'none', 'denied'],
    ['granted', 'limited', 'limited'],
    ['granted', 'all', 'granted'],
  ])('preserves permission-request outcome %s / %s', async (status, accessPrivileges, expected) => {
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status, accessPrivileges });
    await expect(requestContactDiscoveryPermission()).resolves.toBe(expected);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not send a lookup for an empty or email-free contact selection', async () => {
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [{ name: 'No email' }, { name: 'Empty email', emails: [{ email: '' }] }],
    });
    await expect(findDiscoverableContacts()).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('surfaces Contacts read failures without sending a lookup', async () => {
    (Contacts.getContactsAsync as jest.Mock).mockRejectedValue(new Error('Access denied'));
    await expect(findDiscoverableContacts()).rejects.toThrow('Access denied');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([false, true])('loads discoverability %s independently of device permission', async (enabled) => {
    const single = jest.fn().mockResolvedValue({ data: { discoverable_by_contacts: enabled }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    (supabase.from as jest.Mock).mockReturnValue({ select });
    await expect(fetchContactDiscoverability()).resolves.toBe(enabled);
    expect(select).toHaveBeenCalledWith('discoverable_by_contacts');
    expect(Contacts.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it.each([false, true])('saves discoverability %s only for the signed-in account', async (enabled) => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });
    await setContactDiscoverability(enabled);
    expect(update).toHaveBeenCalledWith({ discoverable_by_contacts: enabled });
    expect(eq).toHaveBeenCalledWith('id', 'self');
    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('rejects a discoverability update without a signed-in account', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: null });
    await expect(setContactDiscoverability(true)).rejects.toThrow('No signed-in user');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('does not change the new account if authentication changes during a toggle', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'other' } }, error: null });
    await expect(setContactDiscoverability(true, 'self')).rejects.toThrow('account changed');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('surfaces failed discoverability writes rather than reporting success', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error('Unavailable') }) }),
    });
    await expect(setContactDiscoverability(true)).rejects.toThrow('Unavailable');
  });

  it('normalizes emails before hashing', () => {
    expect(normalizeContactEmail('  Friend@Example.COM ')).toBe('friend@example.com');
    expect(hashContactEmail('  Friend@Example.COM ')).toBe(hashContactEmail('friend@example.com'));
  });

  it('sends only hashes and maps a match back to the local contact name', async () => {
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [{ name: 'Maya', emails: [{ email: 'maya@example.com' }] }],
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ id: 'user-2', alias: 'maya', email_hash: hashContactEmail('maya@example.com') }],
      error: null,
    });

    await expect(findDiscoverableContacts()).resolves.toEqual([
      { id: 'user-2', alias: 'maya', contactName: 'Maya' },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith('contact_friend_matches', {
      email_hashes: [hashContactEmail('maya@example.com')],
      max_results: 100,
    });
    expect(JSON.stringify((supabase.rpc as jest.Mock).mock.calls)).not.toContain('maya@example.com');
  });
});
