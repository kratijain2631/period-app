import type { CycleSnapshot } from '../../../packages/domain/cycles/models';
import { isSupabaseConfigured, supabase } from './client';

export type CycleSnapshotRow = {
  user_id: string;
  last_synced_at: string;
  snapshot: CycleSnapshot;
};

const isMissingSummaryRpcError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeError = error as { code?: string; message?: string | null; details?: string | null };
  const text = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`.toLowerCase();
  return maybeError.code === 'PGRST202' && text.includes('friend_cycle_summaries');
};

const fetchLegacyCycleSnapshots = async (): Promise<CycleSnapshotRow[]> => {
  const { data, error } = await supabase
    .from('cycle_snapshots')
    .select('user_id, last_synced_at, snapshot')
    .order('last_synced_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as CycleSnapshotRow[]) ?? [];
};

export const fetchFriendCycleSnapshots = async (): Promise<CycleSnapshotRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase.rpc('friend_cycle_summaries');
  if (error) {
    if (isMissingSummaryRpcError(error)) {
      return fetchLegacyCycleSnapshots();
    }
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
  const rows = await fetchFriendCycleSnapshots();
  return rows.find((row) => row.user_id === userId) ?? null;
};

export const fetchFriendCycleSnapshot = async (
  friendId: string,
): Promise<CycleSnapshotRow | null> => fetchCycleSnapshotByUserId(friendId);
