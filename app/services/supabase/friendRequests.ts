import { isSupabaseConfigured, supabase } from './client';

export type FriendRequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
};

export type FriendRequestProfileRow = {
  request_id: string;
  other_user_id: string;
  alias?: string | null;
  full_name?: string | null;
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
  const currentUserId = data.user.id;

  const { data: existing, error: existingError } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status')
    .or(
      `and(from_user_id.eq.${currentUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUserId})`,
    );
  if (existingError) {
    throw existingError;
  }

  if (existing && existing.length > 0) {
    const hasAccepted = existing.find((row) => row.status === 'accepted');
    if (hasAccepted) {
      throw new Error("You're already friends.");
    }
    const pendingOutbound = existing.find(
      (row) => row.status === 'pending' && row.from_user_id === currentUserId,
    );
    if (pendingOutbound) {
      throw new Error('Request already sent.');
    }
    const pendingInbound = existing.find(
      (row) => row.status === 'pending' && row.from_user_id === toUserId,
    );
    if (pendingInbound) {
      throw new Error('They already requested you. Check Incoming Requests.');
    }
    const declinedIds = existing.filter((row) => row.status === 'declined').map((row) => row.id);
    if (declinedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('friend_requests')
        .delete()
        .in('id', declinedIds);
      if (deleteError) {
        throw deleteError;
      }
    }
  }

  const { error: insertError } = await supabase.from('friend_requests').insert({
    from_user_id: currentUserId,
    to_user_id: toUserId,
    status: 'pending',
  });
  if (insertError) {
    throw insertError;
  }
};

export const sendFriendRequestByEmail = async (email: string) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return;
  }
  const { error } = await supabase.rpc('send_friend_request_by_email', {
    target_email: trimmed,
  });
  if (error) {
    throw error;
  }
};

export const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'declined') => {
  if (!isSupabaseConfigured) {
    return;
  }
  if (status === 'declined') {
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
    if (deleteError) {
      throw deleteError;
    }
    return;
  }

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId);
  if (updateError) {
    throw updateError;
  }

  if (status === 'accepted') {
    await ensureFriendSharingForRequests([requestId]);
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

export const fetchAcceptedFriendRequests = async (): Promise<FriendRequestRow[]> => {
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
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${userData.user.id},to_user_id.eq.${userData.user.id}`)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data as FriendRequestRow[]) ?? [];
};

export const fetchFriendRequestProfiles = async (
  requestIds: string[],
): Promise<FriendRequestProfileRow[]> => {
  if (!isSupabaseConfigured || requestIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase.rpc('friend_request_profiles', {
    request_ids: requestIds,
  });
  if (error) {
    throw error;
  }
  return (data as FriendRequestProfileRow[]) ?? [];
};

export const ensureFriendSharingForRequests = async (requestIds: string[]) => {
  if (!isSupabaseConfigured || requestIds.length === 0) {
    return;
  }
  const { error } = await supabase.rpc('ensure_friend_sharing', {
    request_ids: requestIds,
  });
  if (error) {
    throw error;
  }
};
