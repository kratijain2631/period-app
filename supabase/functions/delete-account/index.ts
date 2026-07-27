import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(500, { ok: false, error: 'Supabase environment is missing.' });
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { ok: false, error: 'Missing auth token.' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return jsonResponse(401, { ok: false, error: 'Invalid auth token.' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse(401, { ok: false, error: 'Unauthorized.' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const uid = userData.user.id;

    // Best-effort cleanup of tables whose user_id has no cascading foreign key
    // to auth.users (posts, reactions, boops). A failure here is logged but must
    // NOT block the account deletion itself — the priority is removing the
    // account and its visible data; any residue can be swept by the cleanup
    // script. (Each delete has an explicit filter, so PostgREST allows it.)
    const logCleanup = (table: string, error: unknown) => {
      if (error) {
        console.error(`[delete-account] cleanup of ${table} failed`, error);
      }
    };
    logCleanup(
      'post_reactions',
      (await adminClient.from('post_reactions').delete().eq('user_id', uid)).error,
    );
    logCleanup(
      'event_reactions',
      (await adminClient.from('event_reactions').delete().eq('user_id', uid)).error,
    );
    logCleanup('posts', (await adminClient.from('posts').delete().eq('user_id', uid)).error);
    logCleanup(
      'boops(from)',
      (await adminClient.from('boops').delete().eq('from_user_id', uid)).error,
    );
    logCleanup('boops(to)', (await adminClient.from('boops').delete().eq('to_user_id', uid)).error);

    // Hard-delete the auth user (shouldSoftDelete defaults to false) so the
    // cascading tables are actually removed: users, cycle_events,
    // cycle_snapshots, notifications, device_tokens, friend_requests,
    // friend_sharing, friend_recommendations. (A soft delete would leave all of
    // that behind.)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteError) {
      console.error('[delete-account] Failed to delete user', deleteError);
      return jsonResponse(500, { ok: false, error: 'Failed to delete account.' });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error('[delete-account] Unexpected error', error);
    return jsonResponse(500, { ok: false, error: 'Unexpected server error.' });
  }
});
