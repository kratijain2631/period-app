import { isSupabaseConfigured, supabase } from './client';

export const FRIEND_RECOMMENDATIONS_TTL_DAYS = 3;

export type FriendRecommendationsRow = {
  recommendations: string[];
  generated_at: string;
  score?: number | null;
};

export const isFriendRecommendationsFresh = ({
  generatedAt,
  now = Date.now(),
  ttlDays = FRIEND_RECOMMENDATIONS_TTL_DAYS,
}: {
  generatedAt?: string | null;
  now?: number;
  ttlDays?: number;
}): boolean => {
  if (!generatedAt) {
    return false;
  }
  const generatedAtMs = new Date(generatedAt).getTime();
  if (Number.isNaN(generatedAtMs)) {
    return false;
  }
  return now - generatedAtMs < ttlDays * 24 * 60 * 60 * 1000;
};

export const shouldUseFriendRecommendations = ({
  row,
  now = Date.now(),
}: {
  row: FriendRecommendationsRow | null;
  now?: number;
}): boolean =>
  !!row &&
  row.recommendations.length > 0 &&
  isFriendRecommendationsFresh({ generatedAt: row.generated_at, now });

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
