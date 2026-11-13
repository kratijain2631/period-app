import { FriendComparison } from '../../friends/components/FriendComparison';
import { PairActions } from '../../friends/components/PairComparison';
import { removeFriend } from '../../../services/supabase/friendSharing';
import { sendBoop } from '../../../services/supabase/boops';
import { useState, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { ProfileIdentity } from '../components/ProfileWidgets';
import { AppText, ActionButton, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { supabase } from '../../../services/supabase/client';
import { cancelSentFriendRequest, sendFriendRequest } from '../../../services/supabase/friendRequests';
import { MemberUpdates } from '../../feed/components/SharedActivity';
import { useSocial } from '../../social/SocialProvider';

type Identity = {
  member_id: string;
  alias: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  has_access: boolean;
};
export default function MemberProfileScreen() {
  const route = useRoute<any>();
  const id: string = route.params.memberId;
  const { id: self, circle, circleStatus, feed, notifications, refreshCircle, respondToRequest } = useSocial();
  const t = useWidgetTheme();
  const [profile, setProfile] = useState<Identity | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, retry] = useState(0);
  const person = circle.people.find((p) => p.id === id);
  const outgoing = circle.outgoing.find(r => r.memberId === id);
  const incoming = notifications.friendRequests.find((r) => r.from_user_id === id);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setProfile(null);
      setError('');
      void (async () => {
        try {
          const { data, error } = await supabase
            .rpc('circle_member_profile', { subject: id })
            .maybeSingle<Identity>();
          if (error || !data) throw error ?? Error();
          if (current) setProfile(data);
        } catch {
          if (current) setError('This profile could not be loaded.');
        }
      })();
      return () => {
        current = false;
      };
    }, [id, version, !!person]),
  );
  const action = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (incoming) await respondToRequest(incoming.id, 'accepted');
      else {
        if (outgoing) await cancelSentFriendRequest(outgoing.id, self);
        else await sendFriendRequest(id);
        await refreshCircle();
      }
      retry((v) => v + 1);
    } catch {
      setError('The request couldn’t be updated. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const name = profile?.full_name || profile?.alias || 'Circle member';
  const isFriend = self !== id && !!person && profile?.has_access;
  const remove = async () => {
    await removeFriend(id);
    setProfile(null);
    await Promise.all([refreshCircle(), feed.reload()]);
    retry(v => v + 1);
  };
  return (
    <ScrollView
      style={{ backgroundColor: t.colors.canvas }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
    >
      {error && (
        <Surface>
          <AppText>{error}</AppText>
          <ActionButton label="Try again" onPress={() => retry((x) => x + 1)} />
        </Surface>
      )}
      {profile?.member_id === id ? (
        <>
          <ProfileIdentity
            profile={{
              name,
              alias: profile.alias || '',
              bio: profile.bio || '',
              avatarUrl: profile.avatar_url,
            }}
          />
          {self === id ? (
            <AppText>Your profile</AppText>
          ) : isFriend ? (
            <>
              <FriendComparison key={id} memberId={id} name={name} avatar={profile.avatar_url} />
              <PairActions key={`actions-${id}`} name={name} onBoop={async () => (await sendBoop({ toUserId: id })).status} onRemove={remove} />
            </>
          ) : profile.has_access ? (
            circleStatus === 'error'
              ? <ActionButton outline label="Reload circle" onPress={refreshCircle} />
              : <AppText>Loading friendship…</AppText>
          ) : (
            <ActionButton
              label={
                incoming
                  ? 'Accept request'
                  : outgoing
                    ? 'Cancel request'
                    : 'Send friend request'
              }
              onPress={action}
              disabled={busy}
            />
          )}
          {profile.has_access && (self === id || !!person) && (
            <>
              <AppText role="heading" accessibilityRole="header">
                Shared updates
              </AppText>
              <MemberUpdates memberId={id} link={false} />
            </>
          )}
        </>
      ) : !error ? (
        <AppText>Loading profile…</AppText>
      ) : null}
    </ScrollView>
  );
}
