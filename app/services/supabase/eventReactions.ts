import { isSupabaseConfigured, supabase } from './client';

export type EventReactionRow = {
  id: string;
  event_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export const fetchEventReactions = async (
  eventIds: string[],
): Promise<EventReactionRow[]> => {
  if (!isSupabaseConfigured || eventIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('event_reactions')
    .select('id, event_id, user_id, emoji, created_at')
    .in('event_id', eventIds);
  if (error) {
    throw error;
  }
  return (data as EventReactionRow[]) ?? [];
};

export const addEventReaction = async (eventId: string, emoji: string) => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }
  const { data: inserted, error: insertError } = await supabase
    .from('event_reactions')
    .insert({ event_id: eventId, user_id: data.user.id, emoji })
    .select('id, event_id, user_id, emoji, created_at')
    .single();
  if (insertError) {
    if (insertError.code === '23505') {
      return null;
    }
    throw insertError;
  }
  return inserted as EventReactionRow;
};

export const removeEventReaction = async (eventId: string, emoji: string) => {
  if (!isSupabaseConfigured) {
    return false;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }
  const { data: deleted, error: deleteError } = await supabase
    .from('event_reactions')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', data.user.id)
    .eq('emoji', emoji)
    .select('id');
  if (deleteError) {
    throw deleteError;
  }
  return Boolean(deleted && deleted.length > 0);
};
