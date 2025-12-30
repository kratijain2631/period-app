import { isSupabaseConfigured, supabase } from './client';

export type SyncScoreResult = {
  score: number;
  overlap?: Record<string, unknown>[];
};

export const fetchSyncScore = async (friendId: string): Promise<SyncScoreResult | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase.rpc('sync-score', { friend_id: friendId });
  if (error) {
    throw error;
  }
  return data as SyncScoreResult;
};
