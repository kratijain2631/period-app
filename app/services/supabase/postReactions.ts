import { isSupabaseConfigured, supabase } from './client';

export type PostReactionRow = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export const fetchPostReactions = async (postIds: string[]): Promise<PostReactionRow[]> => {
  if (!isSupabaseConfigured || postIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('post_reactions')
    .select('id, post_id, user_id, emoji, created_at')
    .in('post_id', postIds);
  if (error) {
    throw error;
  }
  return (data as PostReactionRow[]) ?? [];
};

export const addPostReaction = async (postId: string, emoji: string) => {
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
    .from('post_reactions')
    .insert({ post_id: postId, user_id: data.user.id, emoji })
    .select('id, post_id, user_id, emoji, created_at')
    .single();
  if (insertError) {
    if (insertError.code === '23505') {
      return null;
    }
    throw insertError;
  }
  return inserted as PostReactionRow;
};
