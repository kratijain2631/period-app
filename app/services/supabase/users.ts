import { isSupabaseConfigured, supabase } from './client';

export type UserProfilePayload = {
  appleUserId?: string;
  email?: string;
  fullName?: string;
  alias?: string;
};

export type UserProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  alias?: string | null;
};

export type UserSearchResult = {
  id: string;
  full_name?: string | null;
  alias?: string | null;
};

const buildUpdate = (
  userId: string,
  payload: UserProfilePayload,
  fallbackEmail?: string | null,
) => {
  const update: {
    id: string;
    updated_at: string;
    email?: string;
    apple_user_id?: string;
    full_name?: string;
    alias?: string;
  } = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  const resolvedEmail = payload.email ?? fallbackEmail;
  if (resolvedEmail) {
    update.email = resolvedEmail;
  }
  if (payload.appleUserId) {
    update.apple_user_id = payload.appleUserId;
  }
  if (payload.fullName) {
    update.full_name = payload.fullName;
  }
  if (payload.alias) {
    update.alias = payload.alias;
  }

  return update;
};

export const upsertCurrentUserProfile = async (payload: UserProfilePayload) => {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }

  const update = buildUpdate(data.user.id, payload, data.user.email);
  const { error: upsertError } = await supabase.from('users').upsert(update, {
    onConflict: 'id',
  });
  if (upsertError) {
    throw upsertError;
  }
};

export const fetchCurrentUserProfile = async (): Promise<UserProfileRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, alias')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (data) {
    return data as UserProfileRow;
  }
  return {
    id: userData.user.id,
    email: userData.user.email,
    alias:
      typeof userData.user.user_metadata?.alias === 'string'
        ? userData.user.user_metadata.alias
        : null,
    full_name:
      typeof userData.user.user_metadata?.full_name === 'string'
        ? userData.user.user_metadata.full_name
        : null,
  };
};

export const fetchUserProfilesByIds = async (ids: string[]): Promise<UserProfileRow[]> => {
  if (!isSupabaseConfigured || ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, alias')
    .in('id', ids);
  if (error) {
    throw error;
  }
  return (data as UserProfileRow[]) ?? [];
};

export const searchUsersByAliasOrEmail = async (
  query: string,
  limit = 5,
): Promise<UserSearchResult[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const { data, error } = await supabase.rpc('search_users', {
    search: trimmed,
    max_results: limit,
  });
  if (error) {
    throw new Error(`[search_users] ${error.message}`);
  }
  return (data as UserSearchResult[]) ?? [];
};

export const updateUserAlias = async (alias: string) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const trimmed = alias.trim();
  if (!trimmed) {
    throw new Error('Alias cannot be empty.');
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }
  const { error: updateError } = await supabase
    .from('users')
    .update({ alias: trimmed, updated_at: new Date().toISOString() })
    .eq('id', data.user.id);
  if (updateError) {
    throw updateError;
  }
};
