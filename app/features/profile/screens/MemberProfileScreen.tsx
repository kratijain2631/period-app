import { useState, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { ProfileIdentity } from '../components/ProfileWidgets';
import { AppText, ActionButton, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { supabase } from '../../../services/supabase/client';
import { sendFriendRequest } from '../../../services/supabase/friendRequests';
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
  const nav = useNavigation<any>();
  const id: string = route.params.memberId;
  const { id: self, circle, notifications, refreshCircle, respondToRequest } = useSocial();
  const t = useWidgetTheme();
  const [profile, setProfile] = useState<Identity | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, retry] = useState(0);
  const person = circle.people.find((p) => p.id === id);
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
        await sendFriendRequest(id);
        await refreshCircle();
      }
      retry((v) => v + 1);
    } catch {
      setError('The request couldn’t be updated. Try again.');
    } finally {
      setBusy(false);
    }
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
              name: profile.full_name || profile.alias || 'Circle member',
              alias: profile.alias || '',
              bio: profile.bio || '',
              avatarUrl: profile.avatar_url,
            }}
          />
          {self === id ? (
            <AppText>Your profile</AppText>
          ) : profile.has_access ? (
            <>
              <AppText>In your circle{person?.score != null ? ` · ${person.score}% in sync` : ''}</AppText>
              <ActionButton
                outline
                label="View cycle comparison"
                onPress={() => nav.navigate('FriendSync', { friendId: id })}
              />
            </>
          ) : (
            <ActionButton
              label={
                incoming
                  ? 'Accept request'
                  : circle.outgoing.includes(id)
                    ? 'Request pending'
                    : 'Send friend request'
              }
              onPress={action}
              disabled={busy || circle.outgoing.includes(id)}
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
