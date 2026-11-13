import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSocial } from '../../social/SocialProvider';
import { fetchUserProfilesByIds } from '../../../services/supabase/users';
import { fetchFriendRecommendations, shouldUseFriendRecommendations, type FriendRecommendationsRow } from '../../../services/supabase/friendRecommendations';
import { buildPairComparison, PairComparison } from './PairComparison';

export function FriendComparison({ memberId, name, avatar }: { memberId: string; name: string; avatar: string | null }) {
  const { id, circle } = useSocial();
  const [recommendation, setRecommendation] = useState<FriendRecommendationsRow | null>(null);
  const [yourAvatar, setYourAvatar] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void fetchFriendRecommendations(memberId).then(row => {
      if (active) setRecommendation(shouldUseFriendRecommendations({ row }) ? row : null);
    }).catch(() => { if (active) setRecommendation(null); });
    void fetchUserProfilesByIds([id]).then(rows => {
      if (active) setYourAvatar(rows[0]?.avatar_url ?? null);
    }).catch(() => { if (active) setYourAvatar(null); });
    return () => { active = false; };
  }, [id, memberId]));
  const model = useMemo(() => buildPairComparison(circle.snapshots.get(id), circle.snapshots.get(memberId), recommendation),
    [circle.snapshots, id, memberId, recommendation]);
  return <PairComparison model={model} name={name} yourAvatar={yourAvatar} theirAvatar={avatar} />;
}
