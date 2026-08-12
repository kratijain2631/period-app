import * as Contacts from 'expo-contacts';
import { sha256 } from 'js-sha256';
import { isSupabaseConfigured, supabase } from '../supabase/client';

export type ContactDiscoveryPermission = 'undetermined' | 'denied' | 'limited' | 'granted';

export type ContactMatch = {
  id: string;
  alias?: string | null;
  contactName: string;
};

type ContactMatchRow = {
  id: string;
  alias?: string | null;
  email_hash: string;
};

export const normalizeContactEmail = (email: string) => email.trim().toLowerCase();

export const hashContactEmail = (email: string) => sha256(normalizeContactEmail(email));

const permissionFromResponse = (
  response: Contacts.ContactsPermissionResponse,
): ContactDiscoveryPermission => {
  if (response.status !== 'granted') {
    return response.status === 'undetermined' ? 'undetermined' : 'denied';
  }
  return response.accessPrivileges === 'limited' ? 'limited' : 'granted';
};

export const getContactDiscoveryPermission = async (): Promise<ContactDiscoveryPermission> =>
  permissionFromResponse(await Contacts.getPermissionsAsync());

export const requestContactDiscoveryPermission = async (): Promise<ContactDiscoveryPermission> =>
  permissionFromResponse(await Contacts.requestPermissionsAsync());

export const presentLimitedContactPicker = async (): Promise<void> => {
  await Contacts.presentAccessPickerAsync();
};

export const findDiscoverableContacts = async (): Promise<ContactMatch[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }

  const response = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Emails],
    sort: Contacts.SortTypes.FirstName,
  });
  const nameByHash = new Map<string, string>();
  response.data.forEach((contact) => {
    const displayName = contact.name?.trim() || 'Contact';
    contact.emails?.forEach(({ email }) => {
      if (!email) {
        return;
      }
      nameByHash.set(hashContactEmail(email), displayName);
    });
  });

  const hashes = [...nameByHash.keys()];
  if (hashes.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < hashes.length; index += 200) {
    batches.push(hashes.slice(index, index + 200));
  }
  const responses = await Promise.all(
    batches.map((emailHashes) =>
      supabase.rpc('contact_friend_matches', {
        email_hashes: emailHashes,
        max_results: 100,
      }),
    ),
  );
  const rows: ContactMatchRow[] = [];
  responses.forEach(({ data, error }) => {
    if (error) {
      throw new Error(`[contact_friend_matches] ${error.message}`);
    }
    rows.push(...(((data as ContactMatchRow[]) ?? [])));
  });

  return rows.slice(0, 50).map((row) => ({
    id: row.id,
    alias: row.alias,
    contactName: nameByHash.get(row.email_hash) ?? 'Contact',
  }));
};

export const fetchContactDiscoverability = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    return false;
  }
  const { data, error } = await supabase
    .from('users')
    .select('discoverable_by_contacts')
    .single();
  if (error) {
    throw error;
  }
  return data?.discoverable_by_contacts === true;
};

export const setContactDiscoverability = async (enabled: boolean): Promise<void> => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw authError ?? new Error('No signed-in user.');
  }
  const { error } = await supabase
    .from('users')
    .update({ discoverable_by_contacts: enabled })
    .eq('id', authData.user.id);
  if (error) {
    throw error;
  }
};
