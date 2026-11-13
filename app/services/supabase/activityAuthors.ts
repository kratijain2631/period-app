import { isSupabaseConfigured, supabase } from './client';
import type { MemberIdentity } from '../../features/social/memberIdentity';

export async function fetchActivityAuthors(memberIds: string[]): Promise<MemberIdentity[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('activity_author_profiles', { member_ids: memberIds });
  if (error) throw error;
  return data ?? [];
}
