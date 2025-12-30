import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';
import type { Session } from '../../state/sessionStore';
import { upsertCurrentUserProfile } from './users';

const mapSupabaseSession = (session: SupabaseSession): Session => ({
  userId: session.user.id,
  accessToken: session.access_token,
  refreshToken: session.refresh_token ?? undefined,
  expiresAt: session.expires_at ?? undefined,
});

export const getMappedSession = (session: SupabaseSession | null): Session | null =>
  session ? mapSupabaseSession(session) : null;

export const signInWithAppleIdToken = async (
  token: string,
  nonce: string,
): Promise<Session> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token,
    nonce,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Supabase did not return a session for Apple sign-in.');
  }

  return mapSupabaseSession(data.session);
};

export const signInWithPassword = async (email: string, password: string): Promise<Session> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Supabase did not return a session for password sign-in.');
  }

  upsertCurrentUserProfile({ email }).catch((upsertError) => {
    console.warn('[auth] failed to upsert user profile', upsertError);
  });

  return mapSupabaseSession(data.session);
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};
