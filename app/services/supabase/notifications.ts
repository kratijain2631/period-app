import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';

export type NotificationRow = {
  id: string;
  user_id: string;
  friend_id?: string | null;
  event_id?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
  read_at?: string | null;
};

export const fetchNotifications = async (): Promise<NotificationRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as NotificationRow[]) ?? [];
};

// Mark the given notifications read (sets read_at = now). RLS scopes the update
// to the caller's own rows. No-op when Supabase isn't configured or ids is empty.
export const markNotificationsRead = async (ids: string[]): Promise<void> => {
  if (!isSupabaseConfigured || ids.length === 0) {
    return;
  }
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
  if (error) {
    throw error;
  }
};

export const subscribeToNotifications = (
  onNotification: (notification: NotificationRow) => void,
): RealtimeChannel | null => {
  if (!isSupabaseConfigured) {
    return null;
  }
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        onNotification(payload.new as NotificationRow);
      },
    )
    .subscribe();
};
