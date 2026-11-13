import { supabase } from './client';
import type { ActivityTarget } from '../../features/feed/models/activity';

export type PostComment = { id: string; user_id: string; alias: string | null; body: string; created_at: string };
const fields = 'id,user_id,alias,body,created_at';
const threads = {
  post: { table: 'post_comments', parent: 'post_id' },
  cycle: { table: 'event_comments', parent: 'event_id' },
} as const;

export async function readComments(target: ActivityTarget, offset: number, limit: number): Promise<PostComment[]> {
  const { table, parent } = threads[target.type];
  const { data, error } = await supabase.from(table).select(fields)
    .eq(parent, target.id).order('created_at').order('id').range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

export async function addComment(target: ActivityTarget, text: string) {
  const { table, parent } = threads[target.type];
  const { error } = await supabase.from(table).insert({ [parent]: target.id, body: text.trim() }).select('id').single();
  if (error) throw error;
}

export async function deleteComment(target: ActivityTarget, id: string) {
  const { table, parent } = threads[target.type];
  const { error } = await supabase.from(table).delete().eq(parent, target.id).eq('id', id).select('id').single();
  if (error) throw error;
}
