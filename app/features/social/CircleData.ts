import { fetchAcceptedFriendRequests, fetchOutboundFriendRequests, fetchFriendRequestProfiles } from '../../services/supabase/friendRequests';
import { fetchFriendProfiles } from '../../services/supabase/friendSharing';
import { fetchFriendCycleSnapshots } from '../../services/supabase/cycleSnapshots';
import { computeSyncScore } from '../friends/utils/syncScore';
import type { CirclePerson } from '../friends/components/CircleWidgets';
import { supabase } from '../../services/supabase/client';

export async function loadCircle(userId: string) {
  const [accepted, outbound, snapshots] = await Promise.all([
    fetchAcceptedFriendRequests(),
    fetchOutboundFriendRequests(),
    fetchFriendCycleSnapshots(),
  ]);
  const ids = [...new Set(accepted.map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id)))];
  const pending = outbound.filter(r => r.status === 'pending');
  const [profiles, recipients] = await Promise.all([
    fetchFriendProfiles(ids),
    fetchFriendRequestProfiles(pending.map(r => r.id)),
  ]);
  const recipientByRequest = new Map(recipients.map(r => [r.request_id, r]));

  const byId = new Map(snapshots.map((r) => [r.user_id, r.snapshot]));
  const self = byId.get(userId);
  const people: CirclePerson[] = ids.map((id) => {
    const p = profiles.find((r) => r.friend_id === id);
    const snapshot = byId.get(id);
    const alias = p?.alias?.replace(/^@/, '') || '';
    return {
      id,
      name: p?.full_name?.trim() || alias || 'Circle member',
      alias,
      score: self && snapshot ? (computeSyncScore({ selfSnapshot: self, friendSnapshot: snapshot })?.score ?? null) : null,
    };
  });
  return { people, snapshots: byId, outgoing: pending.map(row => ({
    id: row.id, memberId: row.to_user_id, createdAt: row.created_at,
    alias: recipientByRequest.get(row.id)?.alias || '', name: recipientByRequest.get(row.id)?.full_name,
  })) };
}

export type Support = { member_id: string; reactions: number; comments: number; boops: number };
export type Standing = { member_id: string; alias: string; score: number };
export type CommunityMetric = 'friends' | 'posts';
export async function loadSupport(): Promise<Support[]> {
  const { data, error } = await supabase.rpc('my_circle_support');
  if (error) throw error;
  return data ?? [];
}
export async function loadStandings(board: CommunityMetric): Promise<Standing[]> {
  const { data, error } = await supabase.rpc('circle_community_top', { board });
  if (error) throw error;
  return data ?? [];
}
