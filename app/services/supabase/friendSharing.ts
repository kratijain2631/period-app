import { isSupabaseConfigured, supabase } from './client';

export type FriendSharingRow = {
  user_id: string;
  friend_id: string;
  has_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type FriendProfileRow = {
  friend_id: string;
  alias?: string | null;
  full_name?: string | null;
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

export const fetchFriendProfiles = async (friendIds: string[]): Promise<FriendProfileRow[]> => {
  if (!isSupabaseConfigured || friendIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase.rpc('friend_profiles', {
    friend_ids: friendIds,
  });
  if (error) {
    throw error;
  }
  return (data as FriendProfileRow[]) ?? [];
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

export const removeFriend = async (friendId: string) => {
  if (!isSupabaseConfigured) {
    return;
  }
  if (!friendId) {
    throw new Error('Friend ID is required.');
  }
  const { error } = await supabase.rpc('remove_friend', { target_friend_id: friendId });
  if (error) {
    throw error;
  }
};
