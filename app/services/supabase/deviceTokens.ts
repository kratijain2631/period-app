import { isSupabaseConfigured, supabase } from './client';

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
