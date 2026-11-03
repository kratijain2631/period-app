import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { generateGuidance, type GuidanceFriend } from './generate.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

export const createGuidanceHandler = (
  createCallerClient: (authorization: string) => SupabaseClient,
  config: { apiKey: string; model: string },
) => async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);
  try {
    // Every read and RPC carries the caller JWT. No service-role credential is
    // needed, and friends are read only through the existing sanitized RPCs.
    const client = createCallerClient(authorization);
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Authentication required' }, 401);
    let input: { userId?: unknown; phase?: unknown; phaseStart?: unknown };
    try { input = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!input || typeof input.phase !== 'string' ||
      !['menstruation', 'follicular', 'ovulation', 'luteal', 'pms'].includes(input.phase) ||
      (input.phaseStart !== null && typeof input.phaseStart !== 'string')) {
      return json({ error: 'Invalid phase' }, 400);
    }
    if (input.userId !== auth.user.id) return json({ error: 'Account changed' }, 403);
    const { data: requestId, error: claimError } = await client.rpc('claim_cycle_guidance', {
      p_phase: input.phase, p_phase_start: input.phaseStart,
    });
    if (claimError) throw claimError;
    if (!requestId) {
      const { data: cached, error } = await client.from('cycle_guidance').select('*').maybeSingle();
      if (error) throw error;
      const matches = cached?.phase === input.phase &&
        (cached?.phase_started_at ?? null) === input.phaseStart &&
        cached?.dos?.length && cached?.donts?.length;
      return matches ? json({ guidance: cached }) : json({ guidance: null, pending: true }, 202);
    }

    // A friend-lookup outage must not prevent personal tips. Do not use raw
    // friend snapshots, symptoms, emails, or other HealthKit samples in AI input.
    let friends: GuidanceFriend[] = [];
    const { data: summaries, error: summaryError } = await client.rpc('friend_cycle_summaries');
    if (!summaryError) {
      const candidates = (summaries ?? []).filter((row: { user_id: string; snapshot?: { currentPhase?: string } }) =>
        row.user_id !== auth.user!.id && row.snapshot?.currentPhase === input.phase).slice(0, 3);
      if (candidates.length) {
        const { data: profiles, error } = await client.rpc('friend_profiles', {
          friend_ids: candidates.map((row: { user_id: string }) => row.user_id),
        });
        if (!error) friends = candidates.map((row: { user_id: string; snapshot: { currentPhase: string } }) => {
          const profile = profiles?.find((entry: { friend_id: string }) => entry.friend_id === row.user_id);
          return { id: row.user_id, name: profile?.alias || profile?.full_name || 'Friend', phase: row.snapshot.currentPhase };
        });
      }
    }
    const guidance = await generateGuidance(
      input.phase, friends, config.apiKey, config.model,
    );
    const { data: completed, error: saveError } = await client.rpc('complete_cycle_guidance', {
      p_request_id: requestId, p_dos: guidance.dos, p_donts: guidance.donts,
      p_friend_suggestions: guidance.friend_suggestions,
    });
    if (saveError) throw saveError;
    // The phase may have changed while AI was running. Never return obsolete tips.
    if (!completed) return json({ guidance: null, pending: true }, 202);
    return json({ guidance: {
      ...guidance, phase: input.phase, phase_started_at: input.phaseStart,
      generated_at: new Date().toISOString(),
    } });
  } catch (error) {
    console.error('[request-cycle-guidance] Request failed', error);
    return json({ error: 'Unable to refresh guidance right now' }, 503);
  }
};
