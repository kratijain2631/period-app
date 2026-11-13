import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { describePush, isWanted, pushData, type OutboxRow, type Preferences } from './messages.ts';

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const isExpoToken = (token: string) =>
  token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

type Ticket = { status?: string; id?: string; message?: string; details?: { error?: string } };

type Deps = {
  supabase: SupabaseClient;
  // Returns a Response to send back when the caller isn't the database (see cronAuth.ts).
  authorize: (req: Request) => Promise<Response | null>;
  expoAccessToken?: string;
  fetchImpl?: typeof fetch;
};

// Called by the push_outbox insert trigger with {id}, and by the retry job with {}.
// claim_pushes hands out each row once, so the two never send the same push.
export const createSendPushHandler = ({ supabase, authorize, expoAccessToken, fetchImpl = fetch }: Deps) => {
  // Mark a row finished (sent or deliberately skipped) or record why it failed.
  async function finish(id: string, outcome: Record<string, unknown>, done: boolean) {
    const { error } = await supabase
      .from('push_outbox')
      .update({ result: outcome, ...(done ? { sent_at: new Date().toISOString() } : {}) })
      .eq('id', id);
    if (error) {
      console.error('[send-push] could not record outcome', error.message);
    }
    return { id, ...outcome };
  }

  async function deliver(row: OutboxRow) {
    const body = describePush(row);
    if (!body) {
      return finish(row.id, { status: 'skipped', reason: 'no push text for this type' }, true);
    }

    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();
    if (!isWanted(row.type, preferences as Preferences | null)) {
      return finish(row.id, { status: 'skipped', reason: 'turned off in preferences' }, true);
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', row.user_id);
    if (tokenError) {
      return finish(row.id, { status: 'error', error: tokenError.message }, false);
    }
    const tokens = [...new Set((tokenRows ?? []).map((t: { token: string }) => t.token).filter(isExpoToken))];
    if (tokens.length === 0) {
      return finish(row.id, { status: 'skipped', reason: 'no registered device' }, true);
    }

    const badge = await unreadCount(row.user_id);
    const data = pushData(row);
    const messages = tokens.map((to) => ({
      to,
      body,
      sound: 'default',
      data,
      ...(badge === null ? {} : { badge }),
    }));

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }
    const response = await fetchImpl(EXPO_SEND_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
    if (!response.ok) {
      return finish(row.id, { status: 'error', http: response.status, error: await response.text() }, false);
    }
    const tickets = ((await response.json())?.data ?? []) as Ticket[];

    // Expo says straight away when a token is dead (app deleted, push turned off).
    const dead = tickets
      .map((ticket, i) => (ticket?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
      .filter((token): token is string => !!token);
    if (dead.length > 0) {
      await supabase.from('device_tokens').delete().in('token', dead);
    }

    const sent = tickets.filter((ticket) => ticket?.status === 'ok').length;
    return finish(
      row.id,
      {
        status: sent > 0 ? 'sent' : 'failed',
        devices: tokens.length,
        sent,
        tickets: tickets.map((ticket) => ({ status: ticket?.status, id: ticket?.id, error: ticket?.details?.error })),
        removed_tokens: dead.length,
      },
      true,
    );
  }

  // App icon badge: unread notifications plus pending friend requests. Null leaves it alone.
  async function unreadCount(userId: string): Promise<number | null> {
    const [notifications, requests] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
      supabase.from('friend_requests').select('id', { count: 'exact', head: true }).eq('to_user_id', userId).eq('status', 'pending'),
    ]);
    if (notifications.error || requests.error) {
      return null;
    }
    return (notifications.count ?? 0) + (requests.count ?? 0);
  }

  return async (req: Request) => {
    const rejected = await authorize(req);
    if (rejected) {
      return rejected;
    }
    let input: { id?: unknown } = {};
    try {
      input = await req.json();
    } catch {
      // An empty body means "retry whatever is due".
    }
    const target = typeof input?.id === 'string' ? input.id : null;

    const { data, error } = await supabase.rpc('claim_pushes', { target });
    if (error) {
      return json({ error: error.message }, 500);
    }
    const rows = (data ?? []) as OutboxRow[];
    const results = [];
    for (const row of rows) {
      results.push(await deliver(row).catch((e) => ({ id: row.id, status: 'error', error: String(e?.message ?? e) })));
    }
    return json({ claimed: rows.length, results });
  };
};
