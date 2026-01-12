import { isSupabaseConfigured, supabase } from './client';

export type FriendRecommendationsRow = {
  recommendations: string[];
  generated_at: string;
  score?: number | null;
};

export const fetchFriendRecommendations = async (
  friendId: string,
): Promise<FriendRecommendationsRow | null> => {
  if (!isSupabaseConfigured || !friendId) {
    return null;
  }
  const { data, error } = await supabase
    .from('friend_recommendations')
    .select('recommendations, generated_at, score')
    .eq('friend_id', friendId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return {
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    generated_at: data.generated_at,
    score: typeof data.score === 'number' ? data.score : null,
  };
};
