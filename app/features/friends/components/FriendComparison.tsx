import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSocial } from '../../social/SocialProvider';
import { fetchFriendRecommendations, shouldUseFriendRecommendations, type FriendRecommendationsRow } from '../../../services/supabase/friendRecommendations';
import { buildPairComparison, PairComparison } from './PairComparison';

export function FriendComparison({ memberId, name, avatar }: { memberId: string; name: string; avatar: string | null }) {
  const { id, circle, feed } = useSocial();
  const [recommendation, setRecommendation] = useState<FriendRecommendationsRow | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void fetchFriendRecommendations(memberId).then(row => {
      if (active) setRecommendation(shouldUseFriendRecommendations({ row }) ? row : null);
    }).catch(() => { if (active) setRecommendation(null); });
    return () => { active = false; };
  }, [id, memberId]));
  const model = useMemo(() => buildPairComparison(circle.snapshots.get(id), circle.snapshots.get(memberId), recommendation),
    [circle.snapshots, id, memberId, recommendation]);
  return <PairComparison model={model} name={name} yourName={feed.selfName} yourAvatar={feed.selfAvatar} theirAvatar={avatar} />;
}
