import { useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../../state/sessionStore';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { TextAction } from '../../../components/ui/ScreenControls';
import { HomeHeader } from '../components/HomeHeader';
import { CycleSummaryStrip } from '../../cycle/components/CycleSummaryStrip';
import { PhaseGuidancePreview } from '../../cycle/components/PhaseGuidancePreview';
import { UpcomingTransition } from '../../cycle/components/UpcomingTransition';
import { selectCycleOverview } from '../../cycle/models/cycleOverview';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import { useSocial } from '../../social/SocialProvider';
import { rankSync, SyncSpotlight } from '../../friends/components/CircleWidgets';
import { syncHealthData } from '../../../services/healthkit/syncHealthData';

export default function HomeScreen() {
  const { feed, circle, notifications, refreshCircle } = useSocial();
  const cycle = useCycleSnapshot();
  const model = selectCycleOverview(cycle);
  const nav = useNavigation<any>();
  const theme = useWidgetTheme();
  const alias = useSessionStore((s) => s.alias);
  const online = useConnectionStore(selectIsOnline);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const top = rankSync(circle.people)[0];
  const latest = feed.items[0];
  const open = (section: 'cycle' | 'guide') =>
    nav.navigate('Profile', { screen: 'ProfileRoot', params: { section } });
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const synced = await syncHealthData({ trigger: 'manual' });
      setSyncError(!synced && useSessionStore.getState().permissions.granted);
      await Promise.all([cycle.reload(), feed.reload(), refreshCircle(), notifications.reload()]);
    } catch {
      setSyncError(true);
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <HomeHeader
          name={alias?.replace(/^@/, '') || 'you'}
          unreadCount={notifications.unreadCount}
          onOpenCircle={() => nav.navigate('Friends')}
          onOpenNotifications={() => nav.navigate('Notifications')}
        />
        {!online && <AppText>Offline · Showing available updates</AppText>}
        {syncError && <AppText>Cycle sync couldn’t refresh. Pull down to retry.</AppText>}
        <CycleSummaryStrip model={model} onOpen={() => open('cycle')} />
        <PhaseGuidancePreview {...model.guidance} onOpenGuide={() => open('guide')} />
        {model.upcoming && <UpcomingTransition transition={model.upcoming} onOpenDetails={() => open('cycle')} />}
        {top && (
          <SyncSpotlight
            person={top}
            onOpen={() =>
              nav.navigate('Friends', {
                screen: 'FriendsRoot',
                params: { section: 'leaderboard', visit: Date.now() },
              })
            }
          />
        )}
        <Surface>
          <TextAction label="Latest from your feed →" onPress={() => nav.navigate('Feed')} />
          {latest ? (
            <View>
              <TextAction
                label={latest.actorName}
                onPress={() =>
                  nav.navigate('MemberProfile', { memberId: latest.actorId, alias: latest.actorName })
                }
              />
              <Pressable accessibilityRole="button" onPress={() => nav.navigate('Feed')}>
                <AppText numberOfLines={2}>{latest.body || latest.label}</AppText>
              </Pressable>
            </View>
          ) : (
            <AppText>
              {!online ? 'Connect to the internet to load your circle feed.' : feed.loading ? 'Loading updates…' : feed.error || 'Your circle’s updates will appear here.'}
            </AppText>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
