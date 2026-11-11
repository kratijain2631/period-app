import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

// These functions are only for server-side callers. The public key can reach any edge
// function, so without this anyone could run them. The secret lives in the vault, and
// cron_secret_matches compares it. Fails closed: no secret or any error means rejected.
export const rejectUnlessScheduled = async (
  req: Request,
  supabase: SupabaseClient,
): Promise<Response | null> => {
  const provided = req.headers.get('x-cron-secret');
  if (provided) {
    const { data, error } = await supabase.rpc('cron_secret_matches', { provided });
    if (!error && data === true) {
      return null;
    }
    if (error) {
      console.error('[cron-auth] Could not check secret', error.message);
    }
  }
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
};
