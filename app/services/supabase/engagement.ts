import { supabase } from './client';
import type { ActivityTarget } from '../../features/feed/models/activity';

export type EngagementMember = {
  member_id: string; display_name: string | null; alias: string | null; emojis: string[]; booped: boolean;
};
export type ReadEngagement = (interaction: string | null, offset: number) => Promise<EngagementMember[]>;

export async function readEngagement(target: ActivityTarget, interaction: string | null, offset: number): Promise<EngagementMember[]> {
  const { data, error } = await supabase.rpc('update_engagement_members', {
    target_kind: target.type, target_id: target.id, interaction, page_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}
