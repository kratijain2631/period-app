import { isSupabaseConfigured, supabase } from './client';

export type FriendSharingRow = {
  user_id: string;
  friend_id: string;
  has_shared: boolean;
  created_at: string;
  updated_at: string;
};

export const fetchFriendSharing = async (): Promise<FriendSharingRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from('friend_sharing')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as FriendSharingRow[]) ?? [];
};

export const setFriendSharing = async (friendId: string, hasShared: boolean) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }
  const { error: upsertError } = await supabase.from('friend_sharing').upsert(
    {
      user_id: data.user.id,
      friend_id: friendId,
      has_shared: hasShared,
    },
    { onConflict: 'user_id,friend_id' },
  );
  if (upsertError) {
    throw upsertError;
  }
};
