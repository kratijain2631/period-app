import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './client';

// The Expo push token this device last registered, so it can be released on sign-out.
export const TOKEN_STORAGE_KEY = 'device-push-token';
const RELEASE_TIMEOUT_MS = 3000;

export const registerDeviceToken = async (token: string, platform: string) => {
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
  // The database moves a token to whoever registers it last, so a shared phone
  // only receives the signed-in account's pushes.
  const { error: upsertError } = await supabase.from('device_tokens').upsert(
    {
      user_id: data.user.id,
      token,
      platform,
    },
    { onConflict: 'user_id,token' },
  );
  if (upsertError) {
    throw upsertError;
  }
};

export const revokeDeviceToken = async (token: string) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.from('device_tokens').delete().eq('token', token);
  if (error) {
    throw error;
  }
};

// Delete this device's token while the session still exists. Row-level security
// only lets the owner delete it, so this must run before signing out. Bounded so
// an offline sign-out never hangs; the server also reassigns the token on the
// next sign-in.
export const releaseStoredDeviceToken = async () => {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY).catch(() => null);
  if (!token) {
    return;
  }
  await Promise.race([
    revokeDeviceToken(token),
    new Promise<void>((resolve) => setTimeout(resolve, RELEASE_TIMEOUT_MS)),
  ]).catch((error) => console.warn('[push] Failed to release device token', error));
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY).catch(() => {});
};
