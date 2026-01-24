import { isSupabaseConfigured, supabase } from './client';
import { selectIsOnline, useConnectionStore } from '../../state/connectionStore';
import { enqueueBoop, listPendingBoops, removeQueuedBoop } from '../../storage/sqlite/boopQueueStore';

export type BoopSendResult = {
  status: 'sent' | 'queued';
};

export type BoopSendPayload = {
  toUserId: string;
  eventId?: string;
  postId?: string;
};

export const sendBoop = async ({
  toUserId,
  eventId,
  postId,
}: BoopSendPayload): Promise<BoopSendResult> => {
  if (!isSupabaseConfigured) {
    return { status: 'queued' };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }

  const isOnline = useConnectionStore.getState().isOnline;
  if (!isOnline) {
    await enqueueBoop(data.user.id, toUserId, eventId ?? null, postId ?? null);
    return { status: 'queued' };
  }

  const { error: insertError } = await supabase.from('boops').insert({
    from_user_id: data.user.id,
    to_user_id: toUserId,
    event_id: eventId ?? null,
    post_id: postId ?? null,
  });
  if (insertError) {
    throw insertError;
  }
  return { status: 'sent' };
};

export const flushBoopQueue = async () => {
  if (!isSupabaseConfigured) {
    return;
  }
  const isOnline = selectIsOnline(useConnectionStore.getState());
  if (!isOnline) {
    return;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    return;
  }
  const pending = await listPendingBoops(data.user.id);
  for (const item of pending) {
    const { error: insertError } = await supabase.from('boops').insert({
      from_user_id: item.user_id,
      to_user_id: item.to_user_id,
      event_id: item.event_id ?? null,
      post_id: item.post_id ?? null,
      created_at: item.created_at,
    });
    if (insertError) {
      console.warn('[boop-queue] Failed to flush boop', insertError.message);
      continue;
    }
    await removeQueuedBoop(item.id);
  }
};

export const fetchPostBoops = async (postIds: string[]) => {
  if (!isSupabaseConfigured || postIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('boops')
    .select('post_id')
    .in('post_id', postIds);
  if (error) {
    throw error;
  }
  return (data as { post_id: string | null }[]) ?? [];
};

export const fetchPostBoopsByUser = async (postIds: string[], userId: string) => {
  if (!isSupabaseConfigured || postIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('boops')
    .select('post_id')
    .in('post_id', postIds)
    .eq('from_user_id', userId);
  if (error) {
    throw error;
  }
  return (data as { post_id: string | null }[]) ?? [];
};

export const fetchEventBoops = async (eventIds: string[]) => {
  if (!isSupabaseConfigured || eventIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('boops')
    .select('event_id')
    .in('event_id', eventIds);
  if (error) {
    throw error;
  }
  return (data as { event_id: string | null }[]) ?? [];
};

export const fetchEventBoopsByUser = async (eventIds: string[], userId: string) => {
  if (!isSupabaseConfigured || eventIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('boops')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('from_user_id', userId);
  if (error) {
    throw error;
  }
  return (data as { event_id: string | null }[]) ?? [];
};
