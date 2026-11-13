import { FriendRequestsCard } from '../components/FriendRequestsCard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, View, ScrollView, Share, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSocial } from '../../social/SocialProvider';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
import { PageHeading } from '../../../components/ui/ScreenControls';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { PeopleList, type CirclePerson } from '../components/CircleWidgets';
import { CommunityRankings, PersonalRankings, type PersonalBoard } from '../components/CircleRankings';
import { DiscoverMembers } from '../components/DiscoverMembers';
import { APP_INVITE_URL } from '../../../config/branding';
import { cancelSentFriendRequest, sendFriendRequest } from '../../../services/supabase/friendRequests';
export default function NativeCircleScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { circle, notifications, refreshCircle, circleStatus } = useSocial();
  const t = useWidgetTheme();
  const online = useConnectionStore(selectIsOnline);
  const [board, choose] = useState<PersonalBoard>('Most in sync');
  const [query, search] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const [rankY, setRankY] = useState<number | null>(null);
  const reload = useCallback(async () => {
    await Promise.all([refreshCircle(), notifications.reload()]);
  }, [refreshCircle, notifications.reload]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  useEffect(() => {
    if (route.params?.section !== 'leaderboard' || rankY === null) return;
    choose('Most in sync');
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ y: rankY, animated: false });
      nav.setParams({ section: undefined });
    });
    return () => cancelAnimationFrame(frame);
  }, [route.params?.section, route.params?.visit, rankY, nav]);
  const open = (memberId: string, alias: string) => nav.navigate('MemberProfile', { memberId, alias });
  const openPerson = (p: CirclePerson) => open(p.id, p.alias);
  const visible = circle.people.filter((p) =>
    (p.name + ' ' + p.alias).toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await reload();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
      >
        <AppText role="heading" accessibilityRole="header" style={{ fontSize: 36, lineHeight: 46 }}>
          Your circle
        </AppText>
        {!online && <AppText>Offline · Showing available friends</AppText>}
        <View onLayout={(e) => setRankY(e.nativeEvent.layout.y)}>
          <PersonalRankings board={board} onChange={choose} onPerson={openPerson} />
        </View>
        <PageHeading
          title={'Friends · ' + circle.people.length}
          compact
          action="Add Friends"
          onPress={() => nav.navigate('AddFriends')}
        />
        <TextInput
          accessibilityLabel="Search your friends"
          placeholder="Search your friends"
          value={query}
          onChangeText={search}
          style={{
            minHeight: 44,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.control,
            backgroundColor: t.colors.surface,
            color: t.colors.text,
          }}
        />
        {visible.length ? (
          <PeopleList people={visible} maxVisibleRows={4} onOpen={openPerson} />
        ) : (
          <AppText>
            {circleStatus === 'loading'
              ? 'Loading friends…'
              : circleStatus === 'error'
                ? 'Couldn’t load your friends. Pull down to retry.'
                : query
                  ? 'No matching friends.'
                  : 'Your friends will appear here.'}
          </AppText>
        )}
        <CommunityRankings onOpen={open} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function AddFriendsScreen() {
  const { id: userId, circle, notifications, refreshCircle, circleStatus, respondToRequest } = useSocial();
  const t = useWidgetTheme();
  const nav = useNavigation<any>();
  const online = useConnectionStore(selectIsOnline);
  const [message, report] = useState('');
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const [copied, setCopied] = useState(false);
  const open = (memberId: string, alias: string) => nav.navigate('MemberProfile', { memberId, alias });
  const reload = useCallback(async () => {
    await Promise.all([refreshCircle(), notifications.reload()]);
  }, [refreshCircle, notifications.reload]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  const busy = !online || sending || circleStatus !== 'ready';
  const send = async (ids: string[]) => {
    if (lock.current || busy || !ids.length || ids.length > 5) return ids;
    lock.current = true;
    setSending(true);
    report('');
    try {
      const wanted = [...new Set(ids)].filter(
        (id) =>
          !circle.outgoing.some(r => r.memberId === id) &&
          !circle.people.some((p) => p.id === id) &&
          !notifications.friendRequests.some((r) => r.from_user_id === id),
      );
      const result = await Promise.allSettled(wanted.map(sendFriendRequest));
      const failed = wanted.filter((_, i) => result[i].status === 'rejected');
      await reload();
      report(
        failed.length
          ? `Sent ${wanted.length - failed.length} of ${wanted.length}. Check the remaining requests and try again.`
          : 'Friend request' + (wanted.length === 1 ? '' : 's') + ' sent.',
      );
      return failed;
    } finally {
      lock.current = false;
      setSending(false);
    }
  };
  const respond = async (requestId: string, accept: boolean) => {
    if (lock.current || !online) return;
    lock.current = true;
    setSending(true);
    report('');
    try {
      await respondToRequest(requestId, accept ? 'accepted' : 'declined');
      report(accept ? 'Added to your friends.' : 'Request declined.');
    } catch {
      report('Couldn’t update the request. Try again.');
    } finally {
      lock.current = false;
      setSending(false);
    }
  };
  const cancel = async (requestId: string) => {
    if (lock.current || !online) return;
    lock.current = true;
    setSending(true);
    report('');
    try {
      const cancelled = await cancelSentFriendRequest(requestId, userId);
      await reload();
      report(cancelled ? 'Request canceled.' : 'This request is no longer pending.');
    } catch {
      report('Couldn’t cancel the request. Try again.');
    } finally {
      setSending(false);
      lock.current = false;
    }
  };
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.colors.canvas }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
    >
      {message && <AppText accessibilityLiveRegion="polite">{message}</AppText>}
      <FriendRequestsCard
        incoming={notifications.friendRequests.map(r => ({
          id: r.id, memberId: r.from_user_id, alias: notifications.requestProfileMap[r.from_user_id]?.alias || '',
          name: notifications.requestProfileMap[r.from_user_id]?.name, createdAt: r.created_at,
        }))}
        outgoing={circle.outgoing}
        onCancel={cancel}
        status={circleStatus === 'ready' ? notifications.requestStatus : circleStatus}
        onRetry={() => void reload()}
        onProfile={open}
        onRespond={respond}
        busy={sending || !online}
      />
      <View>
        <DiscoverMembers open={open} send={send} respond={respond} busy={busy} />
      </View>
      <Surface tone="upcoming" style={{ gap: 10 }}>
        <AppText role="heading" accessibilityRole="header">
          Grow your circle
        </AppText>
        <AppText>Invite a friend to join you.</AppText>
        <ActionButton
          label="Share invite link"
          onPress={async () => {
            try {
              await Share.share({ message: APP_INVITE_URL });
            } catch {
              report('Couldn’t open sharing. Copy the invite link instead.');
            }
          }}
        />
        <ActionButton
          label={copied ? 'Link copied' : 'Copy invite link'}
          onPress={() => {
            try {
              Clipboard.setString(APP_INVITE_URL);
              setCopied(true);
            } catch {
              report('Couldn’t copy the link. Use Share invite link.');
            }
          }}
        />
      </Surface>
    </ScrollView>
  );
}
