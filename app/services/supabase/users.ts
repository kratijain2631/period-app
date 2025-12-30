import { isSupabaseConfigured, supabase } from './client';

export type UserProfilePayload = {
  appleUserId?: string;
  email?: string;
  fullName?: string;
};

export type UserProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
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
    .select('id, full_name, email')
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
    .select('id, full_name, email')
    .in('id', ids);
  if (error) {
    throw error;
  }
  return (data as UserProfileRow[]) ?? [];
};
