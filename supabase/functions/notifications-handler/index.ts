// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const expoAccessToken =
  Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type CycleEventPayload = {
  id: string;
  user_id: string;
  event_type: string;
  phase?: string | null;
  starts_at: string;
};

const collectMutualFriendIds = async (userId: string) => {
  const { data: shared, error } = await supabase
    .from('friend_sharing')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('has_shared', true);

  if (error) {
    throw error;
  }

  const friendIds = (shared ?? []).map((row) => row.friend_id);
  if (friendIds.length === 0) {
    return [];
  }

  const { data: reciprocal, error: reciprocalError } = await supabase
    .from('friend_sharing')
    .select('user_id')
    .in('user_id', friendIds)
    .eq('friend_id', userId)
    .eq('has_shared', true);

  if (reciprocalError) {
    throw reciprocalError;
  }

  return (reciprocal ?? []).map((row) => row.user_id);
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const isExpoToken = (token: string) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

const sendPushNotifications = async (
  userIds: string[],
  payload: Record<string, unknown>,
): Promise<number> => {
  if (userIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from('device_tokens')
    .select('token')
    .in('user_id', userIds);
  if (error) {
    throw error;
  }

  const tokens = Array.from(
    new Set((data ?? []).map((row) => row.token).filter((token) => isExpoToken(token))),
  );
  if (tokens.length === 0) {
    return 0;
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Cycle update';
  const body =
    typeof payload.body === 'string'
      ? payload.body
      : 'A friend shared a new cycle update.';

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: payload,
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  let sentCount = 0;
  for (const batch of chunk(messages, 100)) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('[notifications] push send failed', response.status, text);
      continue;
    }
    const result = await response.json();
    if (Array.isArray(result.data)) {
      sentCount += result.data.length;
    }
  }

  return sentCount;
};

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as { record?: CycleEventPayload };
    const event = payload.record;
    if (!event) {
      return new Response(JSON.stringify({ error: 'Missing event payload' }), { status: 400 });
    }

    const friendIds = await collectMutualFriendIds(event.user_id);
    if (friendIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, pushed: 0 }), { status: 200 });
    }

    const notifications = friendIds.map((friendId) => ({
      user_id: friendId,
      friend_id: event.user_id,
      event_id: event.id,
      payload: {
        event_type: event.event_type,
        phase: event.phase,
        starts_at: event.starts_at,
      },
    }));

    const { error: insertError } = await supabase.from('notifications').insert(notifications);
    if (insertError) {
      throw insertError;
    }

    const pushed = await sendPushNotifications(friendIds, {
      title: 'Cycle update',
      body: 'A friend shared a new cycle update.',
      event_type: event.event_type,
      phase: event.phase,
      starts_at: event.starts_at,
      event_id: event.id,
      friend_id: event.user_id,
    });

    return new Response(JSON.stringify({ inserted: notifications.length, pushed }), {
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), { status: 500 });
  }
});
