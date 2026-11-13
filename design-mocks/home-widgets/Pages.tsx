import { useState, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Surface, ActionButton } from '../../app/components/ui/WidgetPrimitives';
import { FriendRequestsCard } from '../../app/features/friends/components/FriendRequestsCard';
import { ShareUpdateButton } from '../../app/features/feed/components/ShareUpdateButton';
import { RankingTabs } from '../../app/components/ui/RankingTabs';
import { PageHeading, TextAction } from '../../app/components/ui/ScreenControls';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import { PeopleList, rankSync, type CirclePerson } from '../../app/features/friends/components/CircleWidgets';
import {
  ProfileIdentity,
  CycleMetrics,
  type ProfileIdentityModel,
} from '../../app/features/profile/components/ProfileWidgets';
import type { CycleOverview } from '../../app/features/cycle/models/cycleOverview';
import { CycleStatus } from '../../app/features/cycle/components/CycleStatus';
import { PhaseGuide } from '../../app/features/profile/components/PhaseGuide';
import { phaseLabels } from '../../app/features/cycle/models/phaseLabels';
import { fallbackPhaseGuidance } from '../../packages/domain/cycles/guidance';
import { CommunityLeaderboard } from './CommunityLeaderboard';
import { DiscoverFriends, InviteCircle } from './PreviewDetails';
import { communityExamples, supportExamples, sampleContacts, type ContactRelation, type PreviewState } from './fixtures';

export function FeedPage({
  state,
  feed,
  onWrite,
  draft,
  onNotifications,
  onRetry,
}: {
  state: PreviewState;
  feed: ReactNode;
  onWrite: () => void;
  draft: boolean;
  onNotifications: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      <PageHeading title="Feed" icon="notifications-outline" action="Notifications" onPress={onNotifications} />
      {state === 'Stale' || state === 'Offline' ? (
        <AppText role="caption">
          {state === 'Offline' ? 'Offline · Showing saved activity' : 'Showing your last feed update'}
        </AppText>
      ) : null}
      <ShareUpdateButton draft={draft} onPress={onWrite} />
      <AppText role="heading" accessibilityRole="header">
        Latest activity
      </AppText>
      {state === 'Error' ? (
        <Surface>
          <AppText>Your feed couldn’t load.</AppText>
          <TextAction label="Try again" onPress={onRetry} />
        </Surface>
      ) : state === 'Loading' ? (
        <AppText>Loading your feed…</AppText>
      ) : (
        feed
      )}
    </>
  );
}

const personalBoards = ['Most in sync', 'Most supportive'] as const;
export type PersonalBoard = (typeof personalBoards)[number];

export function CirclePage({
  personalBoard,
  onBoardChange,
  people,
  state,
  onPerson,
  onFind,
  onRetry,
  community,
  support,
}: {
  personalBoard: PersonalBoard;
  onBoardChange: (board: PersonalBoard) => void;
  people: CirclePerson[];
  state: PreviewState;
  onPerson: (p: CirclePerson) => void;
  onFind: () => void;
  community: typeof communityExamples;
  support: typeof supportExamples;
  onRetry: () => void;
}) {
  const t = useWidgetTheme();
  const [query, setQuery] = useState('');
  const visiblePeople = people.filter((p) =>
    (p.name + ' ' + p.alias).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const ranked = rankSync(people);
  const totalSupport = (p: CirclePerson) => {
    const { reactions, comments, boops } = support[p.id];
    return reactions + comments + boops;
  };
  const supportive = people
    .filter((p) => support[p.id])
    .sort((a, b) => totalSupport(b) - totalSupport(a) || a.name.localeCompare(b.name))
    .slice(0, 5);
  const unavailable = state === 'Loading' || state === 'Error';
  return (
    <>
      <AppText role="heading" accessibilityRole="header" style={{ fontSize: 36, lineHeight: 46 }}>
        Your circle
      </AppText>
      {unavailable ? (
        <Surface>
          <AppText>{state === 'Loading' ? 'Loading your circle…' : 'Your circle couldn’t load.'}</AppText>
          {state === 'Error' && <TextAction label="Try again" onPress={onRetry} />}
        </Surface>
      ) : (
        <>
          <View nativeID="leaderboard" tabIndex={-1}>
            <Surface style={{ gap: 10 }}>
              <AppText role="heading" accessibilityRole="header">
                Circle rankings
              </AppText>
              <RankingTabs
                label="Personal rankings"
                options={personalBoards}
                selected={personalBoard}
                onSelect={onBoardChange}
              />
              <AppText role="caption" style={{ color: t.colors.secondary }}>
                {personalBoard === 'Most in sync'
                  ? 'Cycle sync with you'
                  : 'Support your friends gave you · Last 30 days'}
              </AppText>
              {personalBoard === 'Most in sync' ? (
                ranked.length ? (
                  <PeopleList embedded people={ranked} firstRank={1} onOpen={onPerson} />
                ) : (
                  <AppText>Friends with a sync score will appear here.</AppText>
                )
              ) : supportive.length ? (
                <PeopleList
                  embedded
                  people={supportive}
                  firstRank={1}
                  onOpen={onPerson}
                  scoreFor={(p) => {
                    const { reactions, comments, boops } = support[p.id];
                    const detail = [
                      [reactions, 'reaction'],
                      [comments, 'comment'],
                      [boops, 'boop'],
                    ]
                      .map(([n, label]) => n + ' ' + label + (n === 1 ? '' : 's'))
                      .join(' · ');
                    return { value: String(totalSupport(p)), detail };
                  }}
                />
              ) : (
                <AppText>No support activity yet.</AppText>
              )}
            </Surface>
          </View>
          {state === 'Stale' || state === 'Offline' ? (
            <AppText role="caption" style={{ color: t.colors.secondary }}>
              {state === 'Offline' ? 'Offline · Showing saved friends' : 'Showing your last circle update'}
            </AppText>
          ) : null}
          <PageHeading
            compact
            title={'Friends · ' + people.length}
            action="Add Friends"
            onPress={onFind}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.control,
              backgroundColor: t.colors.surface,
            }}
          >
            <Ionicons name="search-outline" size={18} color={t.colors.secondary} />
            <TextInput
              accessibilityLabel="Search your friends"
              placeholder="Search your friends"
              placeholderTextColor={t.colors.secondary}
              value={query}
              onChangeText={setQuery}
              style={{ minHeight: 44, flex: 1, minWidth: 0, color: t.colors.text, fontFamily: t.type.body }}
            />
          </View>
          {visiblePeople.length ? (
            <PeopleList people={visiblePeople} maxVisibleRows={4} onOpen={onPerson} />
          ) : (
            <AppText>{query ? 'No matching friends.' : 'Your friends will appear here.'}</AppText>
          )}
          <CommunityLeaderboard onPerson={onPerson} members={community} />
        </>
      )}
    </>
  );
}

export function YouPage({
  profile,
  model,
  onEdit,
  onSettings,
  onProfile,
  updates,
}: {
  profile: ProfileIdentityModel;
  model: CycleOverview;
  onEdit: () => void;
  onSettings: () => void;
  onProfile: () => void;
  updates: ReactNode;
}) {
  const [refreshes, setRefreshes] = useState(0);
  const guide = fallbackPhaseGuidance(model.phase);
  const tips = [...guide.dos.slice(refreshes % guide.dos.length), ...guide.dos.slice(0, refreshes % guide.dos.length)];
  const previewTip = [model.guidance.title, model.guidance.body].filter(Boolean).join(': ');
  return (
    <>
      <PageHeading title="You" icon="settings-outline" action="Profile settings" onPress={onSettings} />
      <ProfileIdentity profile={profile} onEdit={onEdit} onOpen={onProfile} />
      <View nativeID="cycle" tabIndex={-1}>
        <CycleStatus model={model} />
      </View>
      {model.state === 'ready' && (
        <CycleMetrics
          month="November"
          metrics={[
            { label: 'Cycle length', value: `${model.cycleLength}d` },
            { label: 'Period length', value: '5d' },
            { label: 'Months tracked', value: '3' },
          ]}
        />
      )}
      <View nativeID="phase-guide" tabIndex={-1}>
        <PhaseGuide
          dos={refreshes ? tips : [previewTip, ...guide.dos.slice(1)]}
          onRefresh={() => setRefreshes(n => n + 1)}
          refreshDisabled={model.state !== 'ready' || model.phase === 'unknown'}
          message={model.phase === 'unknown' ? 'Sync your cycle to refresh tips.' : refreshes ? 'Sample tips refreshed.' : null}
          donts={guide.donts}
          personalized={false}
          phaseLabel={model.state === 'ready' ? phaseLabels[model.phase] : null}
        />
      </View>
      <View nativeID="my-posts" tabIndex={-1} style={{ gap: 8 }}>
        <AppText role="heading" accessibilityRole="header">
          My posts
        </AppText>
        {updates}
      </View>
    </>
  );
}

type RequestProps = {
  incomingRequests: CirclePerson[];
  onCancel: (id: string) => void;
  onPerson: (p: CirclePerson) => void;
  onRequest: (id: string, accept: boolean) => void;
  state: PreviewState;
};
export function AddFriendsPage(
  props: RequestProps & { relations: Record<string, ContactRelation>; onSend: (ids: readonly string[]) => void },
) {
  const { onPerson, relations, onRequest, onSend, state } = props;
  return (
    <>
      <AppText role="heading" accessibilityRole="header">
        Add friends
      </AppText>
      <View nativeID="requests" tabIndex={-1}>
        <FriendRequestsCard
          incoming={props.incomingRequests.map(p => ({ id: p.id, memberId: p.id, alias: p.alias }))}
          outgoing={sampleContacts.filter(p => relations[p.id] === 'outgoing').map(p => ({ id: p.id, memberId: p.id, alias: p.alias }))}
          busy={state === 'Offline'} status="ready" onRetry={() => {}}
          onProfile={id => { const p = sampleContacts.find(c => c.id === id); if (p) onPerson(p); }}
          onRespond={onRequest} onCancel={props.onCancel}
        />
      </View>
      <View nativeID="discover" tabIndex={-1}>
        <DiscoverFriends
          onPerson={onPerson}
          relations={relations}
          onRespond={onRequest}
          onSend={onSend}
          offline={state === 'Offline'}
        />
      </View>
      <InviteCircle />
    </>
  );
}
