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
  const { data, error } = await supabase
    .from('cycle_snapshots')
    .select('user_id, last_synced_at, snapshot')
    .order('last_synced_at', { ascending: false });
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
  const { data, error } = await supabase
    .from('cycle_snapshots')
    .select('user_id, last_synced_at, snapshot')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return data as CycleSnapshotRow;
};

export const fetchFriendCycleSnapshot = async (
  friendId: string,
): Promise<CycleSnapshotRow | null> => fetchCycleSnapshotByUserId(friendId);
