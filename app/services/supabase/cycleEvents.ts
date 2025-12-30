import type { CycleSnapshot } from '../../../packages/domain/cycles/models';
import { isSupabaseConfigured, supabase } from './client';

export type CycleEventInsert = {
  user_id: string;
  event_type: string;
  phase?: string | null;
  symptoms?: Record<string, unknown> | null;
  starts_at: string;
};

export type CycleEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  phase?: string | null;
  starts_at: string;
  created_at: string;
};

export const fetchCycleEvents = async (limit = 40): Promise<CycleEventRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from('cycle_events')
    .select('id, user_id, event_type, phase, starts_at, created_at')
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data as CycleEventRow[]) ?? [];
};

export const upsertCycleSnapshotRemote = async (userId: string, snapshot: CycleSnapshot) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.from('cycle_snapshots').upsert(
    {
      user_id: userId,
      last_synced_at: snapshot.syncedAt,
      snapshot,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    throw error;
  }
};

export const upsertCycleEvents = async (events: CycleEventInsert[]) => {
  if (!isSupabaseConfigured || events.length === 0) {
    return;
  }
  const { error } = await supabase.from('cycle_events').upsert(events, {
    onConflict: 'user_id,starts_at,event_type',
  });
  if (error) {
    throw error;
  }
};
