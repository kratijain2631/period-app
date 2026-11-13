import { supabase } from './client';
export type PostComment = { id: string; user_id: string; alias: string | null; body: string; created_at: string };
const fields = 'id,user_id,alias,body,created_at';
export async function readPostComments(postId: string, offset: number, limit: number): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(fields)
    .eq('post_id', postId)
    .order('created_at')
    .order('id')
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}
export async function addPostComment(postId: string, text: string) {
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, body: text.trim() })
    .select('id')
    .single();
  if (error) throw error;
}
export async function deletePostComment(id: string) {
  const { error } = await supabase.from('post_comments').delete().eq('id', id).select('id').single();
  if (error) throw error;
}
