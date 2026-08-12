jest.mock('expo-contacts', () => ({
  Fields: { Emails: 'emails' },
  SortTypes: { FirstName: 'firstName' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  presentAccessPickerAsync: jest.fn(),
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
  hashContactEmail,
  normalizeContactEmail,
} from '../contactDiscovery';

describe('contact discovery', () => {
  beforeEach(() => jest.clearAllMocks());

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
