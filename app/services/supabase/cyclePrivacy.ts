import { supabase } from './client';

export async function readCycleSyncEnabled() {
  const { data, error } = await supabase.rpc('cycle_sync_enabled');
  if (error) throw error;
  if (typeof data !== 'boolean') throw new Error('Cycle sharing status unavailable');
  return data;
}

export async function saveCycleSyncEnabled(userId: string, enabled: boolean) {
  const { error } = await supabase.rpc('set_cycle_sync_enabled', { expected_user_id: userId, enabled });
  if (error) throw error;
}
