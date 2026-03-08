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
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id, true);
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
