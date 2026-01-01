import { isSupabaseConfigured, supabase } from './client';

export type PostRow = {
  id: string;
  user_id: string;
  alias: string | null;
  body: string | null;
  mood_tag: string | null;
  created_at: string;
};

export const fetchPosts = async (limit = 50): Promise<PostRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, alias, body, mood_tag, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data as PostRow[]) ?? [];
};

export type CreatePostPayload = {
  body?: string;
  moodTag?: string;
  alias?: string | null;
};

export const createPost = async ({ body, moodTag, alias }: CreatePostPayload) => {
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

  const payload = {
    user_id: data.user.id,
    alias: alias ?? null,
    body: body?.trim() || null,
    mood_tag: moodTag ?? null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('posts')
    .insert(payload)
    .select('id, user_id, alias, body, mood_tag, created_at')
    .single();
  if (insertError) {
    throw insertError;
  }
  return inserted as PostRow;
};
