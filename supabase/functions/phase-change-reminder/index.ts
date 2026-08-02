// deno-lint-ignore-file no-explicit-any
// Daily-scheduled reminder: push "your phase is changing — open to share" to
// users whose predicted transition is today (and who haven't opened the app
// recently, so we don't double up with the on-device local reminder). This is a
// NUDGE, not a silent post — opening the app is what actually posts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Optional — Expo push works without it; only needed if Enhanced Security is on.
const expoAccessToken =
  Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const isExpoToken = (token: string) =>
  token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

const phaseWord = (phase: string) => (phase === 'menstruation' ? 'period' : phase);

const reminderBody = (phase: string) =>
  phase === 'menstruation'
    ? 'Your period is starting soon — open to share with your circle 💬'
    : `Your ${phaseWord(phase)} phase is starting soon — open to share with your circle 💬`;

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sendPush = async (tokens: string[], phase: string): Promise<number> => {
  if (tokens.length === 0) {
    return 0;
  }
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: 'Cycle heads-up',
    body: reminderBody(phase),
    data: { type: 'phase_reminder', phase },
  }));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }
  let sent = 0;
  for (const batch of chunk(messages, 100)) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      console.error('[phase-reminder] push failed', response.status, await response.text());
      continue;
    }
    const result = await response.json();
    if (Array.isArray(result?.data)) {
      sent += result.data.length;
    }
  }
  return sent;
};

Deno.serve(async () => {
  try {
    const { data: due, error } = await supabase.rpc('due_phase_reminders');
    if (error) {
      throw error;
    }
    const rows = (due ?? []) as Array<{
      user_id: string;
      next_phase: string;
      next_phase_start: string;
    }>;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ due: 0, pushed: 0 }), { status: 200 });
    }

    let pushedTotal = 0;
    for (const row of rows) {
      const { data: tokenRows, error: tokenError } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', row.user_id);
      if (tokenError) {
        console.error('[phase-reminder] token fetch failed', tokenError.message);
        continue;
      }
      const tokens = Array.from(
        new Set((tokenRows ?? []).map((t: any) => t.token).filter(isExpoToken)),
      );
      if (tokens.length > 0) {
        pushedTotal += await sendPush(tokens, row.next_phase);
      }
      // Mark reminded regardless of token presence, so we don't re-check this
      // same transition every day (they'll be re-eligible on the next cycle).
      const { error: markError } = await supabase.rpc('mark_phase_reminded', {
        target_user: row.user_id,
        phase_start: row.next_phase_start,
      });
      if (markError) {
        console.error('[phase-reminder] mark failed', markError.message);
      }
    }

    return new Response(JSON.stringify({ due: rows.length, pushed: pushedTotal }), {
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
    });
  }
});
