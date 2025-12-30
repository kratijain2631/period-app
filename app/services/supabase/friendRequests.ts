import { isSupabaseConfigured, supabase } from './client';

export type FriendRequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
};

export const sendFriendRequest = async (toUserId: string) => {
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
  const { error: insertError } = await supabase.from('friend_requests').insert({
    from_user_id: data.user.id,
    to_user_id: toUserId,
    status: 'pending',
  });
  if (insertError) {
    throw insertError;
  }
};

export const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'declined') => {
  if (!isSupabaseConfigured) {
    return;
  }
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id')
    .eq('id', requestId)
    .single();
  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId);
  if (updateError) {
    throw updateError;
  }

  if (status === 'accepted') {
    const { error: shareError } = await supabase.from('friend_sharing').upsert(
      [
        { user_id: data.from_user_id, friend_id: data.to_user_id, has_shared: true },
        { user_id: data.to_user_id, friend_id: data.from_user_id, has_shared: true },
      ],
      { onConflict: 'user_id,friend_id' },
    );
    if (shareError) {
      throw shareError;
    }
  }
};

export const fetchInboundFriendRequests = async (): Promise<FriendRequestRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('to_user_id', userData.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as FriendRequestRow[]) ?? [];
};

export const fetchOutboundFriendRequests = async (): Promise<FriendRequestRow[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', userData.user.id)
    .neq('status', 'declined')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as FriendRequestRow[]) ?? [];
};
