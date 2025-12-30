import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';

export type NotificationRow = {
  id: string;
  user_id: string;
  friend_id?: string | null;
  event_id?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
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
