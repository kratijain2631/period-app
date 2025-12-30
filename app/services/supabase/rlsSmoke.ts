import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from './client';

type SmokeResult = {
  ok: boolean;
  error?: string;
};

export const runUsersRlsSmokeTest = async (): Promise<{
  authed: SmokeResult;
  anon: SmokeResult;
}> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authedResult = await supabase.from('users').select('id').limit(1);
  const anonResult = await anonClient.from('users').select('id').limit(1);

  return {
    authed: {
      ok: !authedResult.error,
      error: authedResult.error?.message,
    },
    anon: {
      ok: !anonResult.error && (anonResult.data?.length ?? 0) === 0,
      error: anonResult.error?.message,
    },
  };
};
