import { memberName, memberInitial } from '../../app/features/social/memberIdentity';
import { PreviewPair } from './PreviewPair';
import { PostSettingsRows } from '../../app/features/profile/components/PostSettingsRows';
import { SharingPreferences } from '../../app/features/profile/components/SharingPreferences';
import { DEFAULT_AUTO_POST_SETTINGS } from '../../app/services/healthkit/autoPostSettings';
import { CommentThreads } from '../../app/features/feed/components/CommentThreads';
import { OpeningIdentity } from '../../app/components/brand/OpeningIdentity';
import { SettingsMenu, SampleContactDetails } from './PreviewPreferences';
import { PostComments } from '../../app/features/feed/components/PostComments';
import type { PostComment } from '../../app/services/supabase/postComments';
import { NotificationItem } from '../../app/features/notifications/components/NotificationItem';
import { buildInbox } from '../../app/features/notifications/models/inbox';
// Local design preview. Fixture actions stay in memory, including posting and account settings.
import { useEffect, useState, type ReactNode } from 'react';
import { registerRootComponent } from 'expo';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { WidgetThemeProvider, illustratedTheme, neutralTheme } from '../../app/theme/widgetTheme';
import { AppText, ActionButton, Surface } from '../../app/components/ui/WidgetPrimitives';
import { TextAction } from '../../app/components/ui/ScreenControls';
import { HomeHeader } from '../../app/features/home/components/HomeHeader';
import { CycleSummaryStrip } from '../../app/features/cycle/components/CycleSummaryStrip';
import { PhaseGuidancePreview } from '../../app/features/cycle/components/PhaseGuidancePreview';
import { UpcomingTransition } from '../../app/features/cycle/components/UpcomingTransition';
import { PostComposer } from '../../app/features/feed/components/PostComposer';
import { ActivityItem } from '../../app/features/feed/components/ActivityItem';
import { ReactionPicker } from '../../app/features/feed/components/ReactionPicker';
import {
  activityKey,
  quickEmojis,
  updateReaction,
  type ActivityItemModel,
} from '../../app/features/feed/models/activity';
import type { CycleOverview } from '../../app/features/cycle/models/cycleOverview';
import { fallbackPhaseGuidance, splitGuidanceTip } from '../../packages/domain/cycles/guidance';
import {
  SyncSpotlight,
  rankSync,
  type CirclePerson,
} from '../../app/features/friends/components/CircleWidgets';
import { AddFriendsPage, CirclePage, FeedPage, YouPage, type PersonalBoard } from './Pages';
import { ProfileEditor, OutwardProfile } from './PreviewDetails';
import {
  example,
  activity,
  people,
  request,
  initialProfile,
  requestArrival,
  bios,
  sampleContacts,
  communityExamples,
  supportWithVisiblePosts,
  earlierManualPosts,
  batchLimit,
  type ContactRelation,
  pages,
  type PreviewPage,
  type PreviewState,
} from './fixtures';

type Section = 'cycle' | 'phase-guide' | 'my-posts' | 'leaderboard' | 'discover' | 'requests';
const sampleItemKeys = new Set(activity.map((item) => activityKey(item.target)));
const states = ['Ready', 'Empty', 'Loading', 'Error', 'Stale', 'Offline'] as const;
const pageIcons = { Home: 'home', Feed: 'chatbubbles', Circle: 'people', You: 'person-circle' } as const;
type Detail =
  | 'opening'
  | 'setup'
  | 'sharing'
  | 'posting'
  | 'sign-out'
  | 'delete-account'
  | 'add-friends'
  | 'edit'
  | 'settings'
  | 'write'
  | 'profile'
  | 'notifications'
  | 'delete'
  | null;
const screenParam = () => new URLSearchParams(window.location.search).get('screen');
const initialPage = (): PreviewPage => {
  if (screenParam() === 'profile' || screenParam() === 'add-friends') return 'Circle';
  if (['settings', 'contacts', 'posting', 'edit', 'sign-out', 'delete-account'].includes(screenParam() ?? ''))
    return 'You';
  if (screenParam() === 'write') return 'Feed';
  if (screenParam() === 'notifications') return 'Feed';
  return pages.find((p) => p.toLowerCase() === screenParam()) ?? 'Home';
};

function Preview() {
  const [loaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    ...Ionicons.font,
  });
  const [neutral, setNeutral] = useState(false);
  const [state, setState] = useState<PreviewState>('Ready');
  const [width, setWidth] = useState(390);
  const [controls, setControls] = useState(false);
  const [page, setPage] = useState<PreviewPage>(initialPage);
  const [section, setSection] = useState<Section | null>(() => {
    const hash = window.location.hash.slice(1);
    if (initialPage() === 'Circle' && (hash === 'discover' || hash === 'requests' || hash === 'leaderboard'))
      return hash;
    if (initialPage() !== 'You') return null;
    if (hash === 'my-updates') return 'my-posts';
    if (hash === 'upcoming') return 'cycle';
    return hash === 'cycle' || hash === 'phase-guide' || hash === 'my-posts' ? hash : null;
  });
  const [detail, setDetail] = useState<Detail>(() => {
    const screen = screenParam();
    if (screen === 'contacts') return 'settings';
    if (!screen || screen === 'opening') return 'opening';
    if (
      screen === 'setup' || screen === 'sharing' || screen === 'profile' ||
      screen === 'notifications' ||
      screen === 'add-friends' ||
      screen === 'settings' ||
      screen === 'posting' ||
      screen === 'edit' ||
      screen === 'write' ||
      screen === 'sign-out' ||
      screen === 'delete-account'
    )
      return screen;
    if (initialPage() === 'Circle' && ['#requests', '#discover'].includes(window.location.hash))
      return 'add-friends';
    return null;
  });
  const [profile, setProfile] = useState(initialProfile);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [cycleSharing, setCycleSharing] = useState(true);
  const [items, setItems] = useState(activity);
  const [comments, setComments] = useState<Record<string, PostComment[]>>({
    'post:sunday-walk': [
      {
        id: 'sample-comment',
        user_id: 'jules',
        alias: 'juleswalks',
        body: 'That sounds like a lovely morning.',
        created_at: '2026-11-01T16:00:00Z',
      },
    ],
  });
  const [picker, setPicker] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [personId, setPersonId] = useState(
    () => new URLSearchParams(window.location.search).get('person') ?? '',
  );
  const [returnTo, setReturnTo] = useState<{ page: PreviewPage; detail: Detail; section: Section | null }>(
    () => ({
      page: initialPage(),
      detail: null,
      section: null,
    }),
  );
  const me = { id: 'self', name: profile.name, alias: profile.alias, score: null };
  const personById = (id: string) => [me, ...people, request, ...sampleContacts].find((p) => p.id === id);
  const person = personById(personId);
  const [personalBoard, setPersonalBoard] = useState<PersonalBoard>('Most in sync');
  const [relations, setRelations] = useState<Record<string, ContactRelation>>({
    rory: 'incoming',
    mina: 'incoming',
    eden: 'incoming',
    ari: 'incoming',
    lou: 'outgoing',
  });
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const remove = (id: string) => {
    setRemovedIds(prev => [...prev, id]);
    setRelations(prev => ({ ...prev, [id]: 'available' }));
  };
  const [ranked, setRanked] = useState(false);
  const [postSettings, setPostSettings] = useState(DEFAULT_AUTO_POST_SETTINGS);
  const [contactDetails, setContactDetails] = useState({ email: 'alex@example.com', phone: screenParam() === 'setup' ? '' : '+12025550120' });
  const settingsChild =
    detail === 'posting' || detail === 'sign-out' || detail === 'delete-account';
  const theme = neutral ? neutralTheme : illustratedTheme;
  const offline = state === 'Offline';
  const incomingRequests =
    state === 'Empty' ? [] : sampleContacts.filter((p) => relations[p.id] === 'incoming');
  const sendRequests = (ids: readonly string[]) => {
    if (offline || ids.length > batchLimit) return;
    setRelations((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if ((sampleContacts.some(p => p.id === id) || removedIds.includes(id)) && (!next[id] || next[id] === 'available')) next[id] = 'outgoing';
      }
      return next;
    });
  };
  const cancelRequest = (id: string) => {
    if (!offline) setRelations(prev => {
      if (prev[id] !== 'outgoing') return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const respond = (id: string, accept: boolean) => {
    if (!offline)
      setRelations((prev) =>
        prev[id] === 'incoming' ? { ...prev, [id]: accept ? 'friends' : 'dismissed' } : prev,
      );
  };
  const visiblePeople = [
    ...(state === 'Empty' ? [] : people.filter(p => !removedIds.includes(p.id) || relations[p.id] === 'friends')),
    ...sampleContacts.filter((p) => relations[p.id] === 'friends'),
  ].map(p => cycleSharing ? p : { ...p, score: null });
  const availableItems = items.filter(item => !removedIds.includes(item.actorId) || relations[item.actorId] === 'friends');
  const visibleItems =
    state === 'Empty' ? availableItems.filter((p) => !sampleItemKeys.has(activityKey(p.target))) : availableItems;
  const ownItems = visibleItems.filter((p) => p.isSelf);
  const ownPosts = ownItems.filter((i) => i.target.type === 'post');
  const topFriend = rankSync(visiblePeople)[0];
  const unavailable = state === 'Loading' || state === 'Error';
  const model: CycleOverview =
    !cycleSharing || state === 'Empty' || unavailable
      ? {
          ...example,
          state: !cycleSharing || state === 'Empty' ? 'empty' : state === 'Loading' ? 'loading' : 'error',
          daysLate: null,
          phase: 'unknown',
          source: 'unknown',
          currentDay: null,
          cycleLength: null,
          ranges: [],
          upcoming: null,
          syncedLabel: null,
          guidance: splitGuidanceTip(fallbackPhaseGuidance('unknown').dos[0]),
        }
      : { ...example, stale: state === 'Stale', upcoming: state === 'Stale' ? null : example.upcoming };

  useEffect(() => {
    const title =
      detail === 'profile' ? (person?.name ?? 'Profile') : detail === 'notifications' ? 'Notifications' : page;
    document.title = title + ' · Widget preview';
    const url = new URL(window.location.href);
    url.searchParams.set('screen', detail && detail !== 'delete' ? detail : page.toLowerCase());
    if (detail === 'profile') url.searchParams.set('person', personId);
    else url.searchParams.delete('person');
    url.hash = section ?? '';
    window.history.replaceState(null, '', url);
    if (!section || !loaded) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(section);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [page, section, loaded, detail, personId, person?.name]);
  const navigate = (next: PreviewPage, subpage: Detail = null, target: Section | null = null) => {
    setSection(target);
    setPage(next);
    setDetail(subpage);
    setPicker(null);
  };
  const openFriend = (p: CirclePerson) => {
    if (detail !== 'profile') setReturnTo({ page, detail, section });
    setPersonId(p.id);
    navigate(page, 'profile');
  };
  const submit = () => {
    if (offline || (!text.trim() && !mood)) return;
    const now = new Date();
    const post: ActivityItemModel = {
      ...activity[0],
      target: { type: 'post', id: now.toISOString() },
      isSelf: true,
      actorId: 'self',
      actorInitial: memberInitial(memberName(profile.name, profile.alias)), actorName: 'You',
      body: text.trim() || null,
      label: mood ?? 'Circle update',
      createdAt: now.toISOString(),
      reactions: [],
      boopCount: 0,
      boopStatus: 'idle',
    };
    setItems((prev) => [post, ...prev]);
    setText('');
    setMood(null);
    navigate('Feed');
  };
  const mutateItem = (key: string, apply: (item: ActivityItemModel) => ActivityItemModel) =>
    setItems((prev) => prev.map((item) => (activityKey(item.target) === key ? apply(item) : item)));
  const react = (key: string, emoji: string, addOnly = false) => {
    if (offline) return;
    mutateItem(key, (item) => {
      const selected = !!item.reactions.find((r) => r.emoji === emoji)?.selected;
      return addOnly && selected ? item : updateReaction(item, emoji, !selected);
    });
  };
  const renderItem = (item: ActivityItemModel) => {
    const key = activityKey(item.target);
    return (
      <ActivityItem
        key={key} self="self" onMember={id => { const p = personById(id); if (p) openFriend(p); }}
        readEngagement={async (filter, offset) => {
          const pool = [...people.filter(p => p.id !== item.actorId), me];
          return pool.flatMap((p, index) => {
            const self = p.id === 'self';
            const booped = self ? item.boopStatus === 'sent' : index < item.boopCount - Number(item.boopStatus === 'sent');
            const emojis = item.reactions.filter(r => self ? r.selected : index < r.count - Number(r.selected)).map(r => r.emoji);
            if (!(booped || emojis.length) || (filter === 'boop' && !booped) || (filter && filter !== 'boop' && !emojis.includes(filter))) return [];
            return [{ member_id: p.id, display_name: p.name, alias: p.alias, emojis: filter === 'boop' ? [] : filter ? [filter] : emojis, booped: booped && (!filter || filter === 'boop') }];
          }).slice(offset, offset + 40);
        }}
        model={item.isSelf ? { ...item, actorInitial: memberInitial(memberName(profile.name, profile.alias)), actorName: 'You' } : item}
        onOpenProfile={
          detail === 'profile'
            ? undefined
            : () => {
                const p = personById(item.actorId);
                if (p) openFriend(p);
              }
        }
        comments={
          <PostComments
            threadKey={key}
            self="self"
            offline={offline}
            revision={0}
            actions={{
              read: async (start, n) => (comments[key] ?? []).slice(start, start + n),
              add: async (body) => {
                const comment = {
                  id: 'local-' + Date.now(),
                  user_id: 'self',
                  alias: profile.alias,
                  body,
                  created_at: new Date().toISOString(),
                };
                setComments((prev) => ({
                  ...prev,
                  [key]: [...(prev[key] ?? []), comment],
                }));
              },
              remove: async (id) =>
                setComments((prev) => ({
                  ...prev,
                  [key]: (prev[key] ?? []).filter((c) => c.id !== id),
                })),
            }}
            onProfile={(id) => {
              const p = personById(id);
              if (p) openFriend(p);
            }}
          />
        }
        pending={false}
        offline={offline}
        onChooseReaction={() => {
          if (!offline) setPicker(key);
        }}
        onReact={(emoji) => react(key, emoji)}
        onDoubleTap={() => react(key, '❤️', true)}
        onBoop={() =>
          mutateItem(key, (i) =>
            i.boopStatus !== 'idle'
              ? i
              : { ...i, boopStatus: offline ? 'queued' : 'sent', boopCount: i.boopCount + (offline ? 0 : 1) },
          )
        }
        onDelete={() => {
          setDeleteKey(key);
          setDetail('delete');
        }}
      />
    );
  };
  const composer = (
    <PostComposer
      text={text}
      mood={mood}
      offline={offline}
      posting={false}
      error={null}
      onChangeText={setText}
      onChangeMood={setMood}
      onSubmit={submit}
    />
  );
  const noActivity = (
    <Surface>
      <AppText>No circle updates yet. Share the first one.</AppText>
    </Surface>
  );
  let content: ReactNode;
  if (detail) {
    switch (detail) {
      case 'opening':
        content = (
          <View style={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 14, gap: 54 }}>
            <OpeningIdentity />
            <View style={{ gap: 6 }}>
              <ActionButton label="Enter preview" onPress={() => navigate('Home')} />
              <TextAction label="Preview first-time setup" onPress={() => {
                setContactDetails(details => ({ ...details, phone: '' }));
                navigate('Home', 'setup');
              }} />
            </View>
          </View>
        );
        break;
      case 'setup':
        content = <Surface style={{ gap: 12 }}>
          <AppText role="heading">Set up your account</AppText>
          <SampleContactDetails setup details={contactDetails} save={setContactDetails} />
          <ActionButton label="Continue" onPress={() => navigate('Home', 'sharing')} />
        </Surface>;
        break;
      case 'sharing':
        content = <SharingPreferences ranked={ranked} onRanked={setRanked} posts={postSettings} onPosts={setPostSettings}
          busy={false} onContinue={() => navigate('Home')} />;
        break;
      case 'write':
        content = composer;
        break;
      case 'edit':
        content = (
          <ProfileEditor
            profile={profile}
            onSave={(p) => {
              setProfile(p);
              setDetail(null);
            }}
          />
        );
        break;
      case 'profile': {
        if (!person) {
          content = <AppText>Profile unavailable.</AppText>;
          break;
        }
        const self = person.id === 'self';
        const member = visiblePeople.some((p) => p.id === person.id);
        const posts = visibleItems.filter((item) => item.actorId === person.id);
        const incoming = relations[person.id] === 'incoming';
        content = (
          <OutwardProfile
            identity={{
              name: self || member ? person.name : person.alias,
              alias: person.alias,
              bio: self ? profile.bio : member ? (bios[person.id] ?? '') : '',
            }}
            relation={
              self
                ? 'Your outward profile'
                : member
                  ? 'In your circle'
                  : incoming
                    ? 'Wants to join your circle'
                    : relations[person.id] === 'outgoing'
                      ? 'Friend request sent'
                      : 'Member'
            }
            comparison={!self && member ? <PreviewPair key={person.id} person={cycleSharing ? person : { ...person, score: null }} yourName={memberName(profile.name, profile.alias)} offline={offline} onRemove={() => remove(person.id)} /> : undefined}
            updates={
              self || member ? (
                posts.length ? (
                  posts.map(renderItem)
                ) : (
                  <Surface>
                    <AppText>No shared updates yet.</AppText>
                  </Surface>
                )
              ) : null
            }
            action={
              (sampleContacts.some((p) => p.id === person.id) || removedIds.includes(person.id)) &&
              !member &&
              !incoming &&
              relations[person.id] !== 'dismissed' ? (
                <ActionButton
                  label={relations[person.id] === 'outgoing' ? 'Cancel request' : 'Send friend request'}
                  disabled={offline}
                  onPress={() => relations[person.id] === 'outgoing' ? cancelRequest(person.id) : sendRequests([person.id])}
                />
              ) : incoming ? (
                <ActionButton
                  label="Accept request"
                  disabled={offline}
                  onPress={() => respond(person.id, true)}
                />
              ) : undefined
            }
          />
        );
        break;
      }
      case 'settings':
        content = (
          <SettingsMenu cycleSharing={cycleSharing} onCycleSharing={enabled => {
            setCycleSharing(enabled);
            if (!enabled) setItems(rows => rows.filter(row => !(row.isSelf && row.target.type === 'cycle')));
          }} details={contactDetails} save={setContactDetails} ranked={ranked} onRanked={setRanked} onOpen={setDetail} />
        );
        break;
      case 'posting':
        content = <PostSettingsRows value={postSettings} onChange={setPostSettings} />;
        break;
      case 'sign-out':
      case 'delete-account':
        content = (
          <Surface style={{ gap: 12 }}>
            <AppText role="heading">{detail === 'sign-out' ? 'Sign out?' : 'Delete this account?'}</AppText>
            <AppText>
              {detail === 'sign-out'
                ? 'Leave the sample session and return to the opening page.'
                : 'Reset the sample profile, posts and settings for this preview.'}
            </AppText>
            <ActionButton outline label="Cancel" onPress={() => setDetail('settings')} />
            <ActionButton
              label={detail === 'sign-out' ? 'Sign out' : 'Delete sample account'}
              onPress={() => window.location.assign(window.location.pathname + '?screen=opening')}
            />
          </Surface>
        );
        break;
      case 'add-friends':
        content = (
          <AddFriendsPage
            state={state}
            incomingRequests={incomingRequests}
            relations={relations}
            onPerson={openFriend}
            onSend={sendRequests}
            onRequest={respond}
            onCancel={cancelRequest}
          />
        );
        break;
      case 'notifications': {
        const rows = buildInbox({
          friendRequests: incomingRequests.map((p) => ({
            id: p.id,
            from_user_id: p.id,
            to_user_id: 'self',
            status: 'pending',
            created_at: requestArrival[p.id],
            updated_at: requestArrival[p.id],
          })),
          requestProfileMap: Object.fromEntries(incomingRequests.map((p) => [p.id, { alias: p.alias }])),
          acceptances: [],
          notifications:
            state === 'Empty'
              ? []
              : [
                  {
                    id: 'sample-reaction',
                    user_id: 'self',
                    created_at: '2026-11-03T15:00:00Z',
                    payload: {
                      type: 'post_reaction',
                      actor_id: 'maya',
                      actor_alias: people[0].alias,
                      emoji: '❤️',
                    },
                  },
                ],
        });
        content = (
          <>
            <AppText role="heading" accessibilityRole="header">
              Notifications
            </AppText>
            <View>
              {rows.length ? (
                rows.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    disabled={offline}
                    onRespond={respond}
                    onProfile={(id) => {
                      const p = personById(id);
                      if (p) openFriend(p);
                    }}
                  />
                ))
              ) : (
                <AppText>No notifications yet.</AppText>
              )}
            </View>
          </>
        );
        break;
      }
      case 'delete':
        content = (
          <Surface>
            <AppText role="heading">Delete this update?</AppText>
            <TextAction label="Keep update" onPress={() => setDetail(null)} />
            <ActionButton
              outline
              label="Delete update"
              onPress={() => {
                setItems((prev) => prev.filter((i) => activityKey(i.target) !== deleteKey));
                setDetail(null);
              }}
            />
          </Surface>
        );
        break;
    }
  } else if (page === 'Home') {
    content = (
      <>
        <HomeHeader
          name={profile.name.split(' ')[0]}
          unreadCount={1 + incomingRequests.length}
          onOpenCircle={() => navigate('Circle')}
          onOpenNotifications={() => navigate('Home', 'notifications')}
        />
        <CycleSummaryStrip model={model} onOpen={() => navigate('You', null, 'cycle')} />
        <PhaseGuidancePreview {...model.guidance} onOpenGuide={() => navigate('You', null, 'phase-guide')} />
        {model.upcoming && (
          <UpcomingTransition
            transition={model.upcoming}
            onOpenDetails={() => navigate('You', null, 'cycle')}
          />
        )}
        {!unavailable && topFriend && (
          <SyncSpotlight
            person={topFriend}
            onOpen={() => {
              setPersonalBoard('Most in sync');
              navigate('Circle', null, 'leaderboard');
            }}
          />
        )}
        <Surface style={{ gap: 5 }}>
          <TextAction label="Latest from your feed →" onPress={() => navigate('Feed')} />
          {unavailable ? (
            <AppText>{state === 'Loading' ? 'Loading updates…' : 'Open Feed to retry.'}</AppText>
          ) : visibleItems.length ? (
            <>
              <TextAction
                label={visibleItems[0].isSelf ? 'You' : visibleItems[0].actorName}
                onPress={() => {
                  const p = personById(visibleItems[0].actorId);
                  if (p) openFriend(p);
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open the latest update in Feed"
                onPress={() => navigate('Feed')}
              >
                <AppText numberOfLines={2}>{visibleItems[0].body || visibleItems[0].label}</AppText>
              </Pressable>
            </>
          ) : (
            <TextAction label="Share your first update" onPress={() => navigate('Feed', 'write')} />
          )}
        </Surface>
      </>
    );
  } else if (page === 'Feed') {
    content = (
      <FeedPage
        state={state}
        feed={visibleItems.length ? visibleItems.map(renderItem) : noActivity}
        onWrite={() => setDetail('write')}
        draft={!!(text || mood)}
        onNotifications={() => setDetail('notifications')}
        onRetry={() => setState('Ready')}
      />
    );
  } else if (page === 'Circle') {
    content = (
      <CirclePage
        personalBoard={personalBoard}
        onBoardChange={setPersonalBoard}
        people={visiblePeople}
        state={state}
        onPerson={openFriend}
        onFind={() => navigate('Circle', 'add-friends')}
        community={[
          ...communityExamples.map((row) => ({
            ...row,
            friends:
              row.friends - (removedIds.includes(row.person.id) && people.some(p => p.id === row.person.id) && relations[row.person.id] !== 'friends' ? 1 : 0) +
              (relations[row.person.id] === 'friends' && !people.some((p) => p.id === row.person.id) ? 1 : 0),
          })),
          ...(ranked
            ? [
                {
                  person: me,
                  friends: visiblePeople.length,
                  posts: earlierManualPosts + ownItems.filter((i) => i.target.type === 'post').length,
                },
              ]
            : []),
        ]}
        support={supportWithVisiblePosts(ownItems, comments)}
        onRetry={() => setState('Ready')}
      />
    );
  } else {
    content = (
      <YouPage
        profile={profile}
        model={model}
        onEdit={() => setDetail('edit')}
        onSettings={() => setDetail('settings')}
        onProfile={() => openFriend(me)}
        updates={
          unavailable ? (
            <Surface>
              <AppText>{state === 'Loading' ? 'Loading your posts…' : 'Your posts couldn’t load.'}</AppText>
              {state === 'Error' && <TextAction label="Try again" onPress={() => setState('Ready')} />}
            </Surface>
          ) : (
            <>
              {(offline || state === 'Stale') && <AppText role="caption">Showing your saved posts</AppText>}
              {ownPosts.length ? (
                ownPosts.map(renderItem)
              ) : (
                <Surface>
                  <AppText>Your posts will appear here.</AppText>
                  <TextAction label="Write an update" onPress={() => navigate('Feed', 'write')} />
                </Surface>
              )}
            </>
          )
        }
      />
    );
  }
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <WidgetThemeProvider theme={theme}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor: '#EDE9E3',
            paddingHorizontal: 4,
            paddingBottom: 8,
          }}
        >
          <View style={{ width: '100%', maxWidth: 580, paddingHorizontal: 10, paddingVertical: 3 }}>
            <View
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <AppText role="caption" style={{ color: theme.colors.secondary }}>
                Design preview · Sample data
              </AppText>
              <TextAction
                label={controls ? 'Hide controls' : `Controls · ${width} px`}
                onPress={() => setControls(!controls)}
              />
            </View>
            {controls && (
              <View style={{ paddingBottom: 5, gap: 4 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  <TextAction
                    label="Opening page"
                    onPress={() => {
                      navigate('Home', 'opening');
                      setControls(false);
                    }}
                  />
                  {[320, 390, 480].map((w) => (
                    <ActionButton outline={width !== w} key={w} label={w + ' PX'} onPress={() => setWidth(w)} />
                  ))}
                  <ActionButton
                    outline
                    label={neutral ? 'Illustrated theme' : 'Neutral theme'}
                    onPress={() => setNeutral(!neutral)}
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {page === 'Circle' && Object.values(relations).includes('outgoing') && (
                    <TextAction
                      label="Simulate next pending contact accepting"
                      onPress={() =>
                        setRelations((prev) => {
                          const id = Object.keys(prev).find((key) => prev[key] === 'outgoing');
                          return id ? { ...prev, [id]: 'friends' } : prev;
                        })
                      }
                    />
                  )}
                  {states.map((s) => (
                    <ActionButton outline={state !== s} key={s} label={s} onPress={() => setState(s)} />
                  ))}
                </View>
              </View>
            )}
          </View>
          <View
            testID="preview-device"
            style={{
              width,
              maxWidth: '100%',
              maxHeight: 930,
              flex: 1,
              backgroundColor: theme.colors.canvas,
              borderRadius: 30,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 23,
                paddingTop: 11,
                paddingBottom: 2,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <AppText style={{ fontFamily: theme.type.semibold, fontSize: 13 }}>9:41</AppText>
              <View aria-hidden style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {(['cellular', 'wifi', 'battery-full'] as const).map((icon) => (
                  <Ionicons key={icon} name={icon} size={14} color={theme.colors.text} />
                ))}
              </View>
            </View>
            <ScrollView
              key={page + '-' + detail}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28, flexGrow: 1 }}
            >
              {!!detail && !['opening','setup','sharing'].includes(detail) && (
                <TextAction
                  label={
                    '‹ Back to ' +
                    (detail === 'profile'
                      ? returnTo.detail === 'notifications'
                        ? 'Notifications'
                        : returnTo.detail === 'add-friends'
                          ? 'Add friends'
                          : returnTo.page
                      : settingsChild
                        ? 'Settings'
                        : page)
                  }
                  onPress={() =>
                    detail === 'profile'
                      ? navigate(returnTo.page, returnTo.detail, returnTo.section)
                      : navigate(page, settingsChild ? 'settings' : null)
                  }
                />
              )}
              <CommentThreads key={page + '-' + detail}>{content}</CommentThreads>
            </ScrollView>
            {!['opening', 'setup', 'sharing', 'write'].includes(detail ?? '') && (
              <View
                accessibilityRole="tablist"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopWidth: 1,
                  borderColor: theme.colors.border,
                  flexDirection: 'row',
                  paddingHorizontal: 12,
                  paddingTop: 5,
                  paddingBottom: 7,
                }}
              >
                {pages.map((label) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: page === label }}
                    onPress={() => navigate(label)}
                    key={label}
                    style={{ flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 1 }}
                  >
                    <Ionicons
                      name={page === label ? pageIcons[label] : `${pageIcons[label]}-outline`}
                      size={22}
                      color={page === label ? theme.colors.accent : theme.colors.secondary}
                    />
                    <AppText
                      role="caption"
                      style={{
                        fontFamily: theme.type.semibold,
                        fontSize: 11,
                        color: page === label ? theme.colors.accent : theme.colors.secondary,
                      }}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        <ReactionPicker
          visible={!!picker}
          quickReactions={quickEmojis}
          onClose={() => setPicker(null)}
          onSelect={(emoji) => {
            if (picker) react(picker, emoji);
            setPicker(null);
          }}
        />
      </WidgetThemeProvider>
    </SafeAreaProvider>
  );
}
registerRootComponent(Preview);
