import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';
import type { Session } from '../../state/sessionStore';
import { upsertCurrentUserProfile } from './users';

const REMOTE_SIGN_OUT_TIMEOUT_MS = 5000;

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

  Promise.resolve(upsertCurrentUserProfile({ email })).catch((upsertError) => {
    console.warn('[auth] failed to upsert user profile', upsertError);
  });

  return mapSupabaseSession(data.session);
};

const waitFor = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const triggerBestEffortRemoteSignOut = () => {
  void Promise.race([
    supabase.auth.signOut({ scope: 'global' }),
    waitFor(REMOTE_SIGN_OUT_TIMEOUT_MS).then(() => null),
  ]).catch((error) => {
    console.warn('[auth] remote sign out failed', error);
  });
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
  triggerBestEffortRemoteSignOut();
};

export const deleteCurrentAccount = async () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as { ok?: boolean; error?: string };
  if (!payload.ok) {
    throw new Error(payload.error ?? 'Failed to delete account.');
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    throw signOutError;
  }
  triggerBestEffortRemoteSignOut();
};
