import type { CycleSnapshot } from '../../../packages/domain/cycles/models';
import { isSupabaseConfigured, supabase } from './client';

export type CycleSnapshotRow = {
  user_id: string;
  last_synced_at: string;
  snapshot: CycleSnapshot;
};

export const fetchFriendCycleSnapshots = async (): Promise<CycleSnapshotRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase.rpc('friend_cycle_summaries');
  if (error) {
    throw error;
  }
  return (data as CycleSnapshotRow[]) ?? [];
};

export const fetchCycleSnapshotByUserId = async (
  userId: string,
): Promise<CycleSnapshotRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase.rpc('friend_cycle_summaries');
  if (error) {
    throw error;
  }
  const row = ((data as CycleSnapshotRow[] | null) ?? []).find((item) => item.user_id === userId);
  if (!row) {
    return null;
  }
  return row;
};

export const fetchFriendCycleSnapshot = async (
  friendId: string,
): Promise<CycleSnapshotRow | null> => fetchCycleSnapshotByUserId(friendId);
