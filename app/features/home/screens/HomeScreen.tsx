import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../../state/sessionStore';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
import { WidgetThemeProvider, useWidgetTheme } from '../../../theme/widgetTheme';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { HomeHeader } from '../components/HomeHeader';
import { CycleSummaryStrip } from '../../cycle/components/CycleSummaryStrip';
import { PhaseGuidancePreview } from '../../cycle/components/PhaseGuidancePreview';
import { UpcomingTransition } from '../../cycle/components/UpcomingTransition';
import { selectCycleOverview } from '../../cycle/models/cycleOverview';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import { useActivityFeed } from '../../feed/hooks/useActivityFeed';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { PostComposer } from '../../feed/components/PostComposer';
import { ActivityItem } from '../../feed/components/ActivityItem';
import { ReactionPicker } from '../../feed/components/ReactionPicker';
import { activityKey, type ActivityTarget } from '../../feed/models/activity';
import { syncHealthData } from '../../../services/healthkit/syncHealthData';

const HomeContent = ({ userId }: { userId: string }) => {
  const t = useWidgetTheme();
  const navigation = useNavigation<any>();
  const alias = useSessionStore(state => state.alias);
  const offline = !useConnectionStore(selectIsOnline);
  const feed = useActivityFeed(userId, alias);
  const cycle = useCycleSnapshot();
  const model = selectCycleOverview(cycle);
  const { unreadCount, reload: reloadNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [reactionTarget, setReactionTarget] = useState<ActivityTarget | null>(null);
  const { reload: reloadFeed } = feed;
  const { reload: reloadCycle } = cycle;
  useFocusEffect(useCallback(() => {
    void reloadFeed(); void reloadNotifications(); void reloadCycle();
    const timer = setInterval(() => { void reloadFeed(); void reloadNotifications(); void reloadCycle(); }, 60000);
    return () => clearInterval(timer);
  }, [reloadFeed, reloadNotifications, reloadCycle]));
  const refresh = async () => {
    if (refreshLock.current) return;
    refreshLock.current = true; setRefreshing(true); setSyncError(null);
    try {
      const results = await Promise.allSettled([reloadNotifications(), (async () => {
        const expectedSync = useSessionStore.getState().permissions.granted;
        const synced = await syncHealthData({ trigger: 'manual' });
        if (expectedSync && !synced) setSyncError('Your cycle couldn’t refresh. Your last available data is shown.');
        await reloadCycle();
      })()]);
      if (results[1].status === 'rejected') setSyncError('Your cycle couldn’t refresh. Your last available data is shown.');
      await reloadFeed();
    } catch { setSyncError('Your cycle couldn’t refresh. Your last available data is shown.'); }
    finally { refreshLock.current = false; setRefreshing(false); }
  };
  const openDetails = (section: 'cycle' | 'guide') => navigation.navigate('Profile', { screen: 'ProfileRoot', params: { section } });
  const chooseReaction = (target: ActivityTarget) => {
    const item = feed.items.find(i => activityKey(i.target) === activityKey(target));
    if (!offline && item?.reactionsAvailable && !feed.pending.includes(activityKey(target))) setReactionTarget(target);
  };
  const composer = feed.composer;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.colors.canvas }}>
    <FlatList data={feed.items} keyExtractor={item => activityKey(item.target)} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, paddingBottom: 30, width: '100%', maxWidth: 620, alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.colors.accent} />}
      ListHeaderComponent={<View style={{ gap: 14, marginBottom: 12 }}>
        <HomeHeader name={alias?.replace(/^@/, '') || 'you'} unreadCount={unreadCount} onOpenCircle={() => navigation.navigate('Friends')} onOpenNotifications={() => navigation.navigate('Notifications')} />
        {offline ? <AppText role="caption" style={{ color: t.colors.secondary }}>You’re offline · showing available updates</AppText> : null}
        {syncError ? <AppText accessibilityRole="alert" style={{ color: t.colors.error }}>{syncError}</AppText> : null}
        <CycleSummaryStrip model={model} onOpen={() => openDetails('cycle')} />
        <PhaseGuidancePreview title={model.guidance.title} body={model.guidance.body} onOpenGuide={() => openDetails('guide')} />
        {model.upcoming ? <UpcomingTransition transition={model.upcoming} onOpenDetails={() => openDetails('cycle')} /> : null}
        <PostComposer text={composer.text} mood={composer.mood} posting={composer.posting} offline={offline} error={composer.error}
          onChangeText={composer.setText} onChangeMood={composer.setMood} onSubmit={composer.submit} />
        <View style={{ marginTop: 8, gap: 3 }}><AppText role="heading" accessibilityRole="header">Around your circle</AppText><AppText role="caption" style={{ color: t.colors.secondary }}>Little updates. Shared rhythms.</AppText></View>
        {feed.error ? <AppText accessibilityRole="alert" style={{ color: t.colors.error }}>{feed.error}</AppText> : null}
      </View>}
      ListEmptyComponent={feed.loading ? <ActivityIndicator color={t.colors.accent} accessibilityLabel="Loading your circle" /> : <AppText style={{ paddingVertical: 18, color: t.colors.secondary, textAlign: 'center' }}>{feed.error ? 'Pull down to try loading your circle again.' : 'Your circle’s updates will appear here. Start with a hello.'}</AppText>}
      renderItem={({ item }) => <ActivityItem model={item} pending={feed.pending.includes(activityKey(item.target))} offline={offline}
        onReact={emoji => void feed.react(item.target, emoji)} onChooseReaction={() => chooseReaction(item.target)}
        onDoubleTap={() => void feed.react(item.target, feed.quickReactions[0], true)} onBoop={() => void feed.boop(item.target)}
        onDelete={() => Alert.alert('Delete post', 'This permanently removes your post. This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void feed.remove(item.target) },
        ])} />}
    />
    <ReactionPicker visible={!!reactionTarget} quickReactions={feed.quickReactions} onClose={() => setReactionTarget(null)}
      onSelect={emoji => { if (reactionTarget) void feed.react(reactionTarget, emoji); setReactionTarget(null); }} />
  </SafeAreaView>;
};

const HomeScreen = () => {
  const userId = useSessionStore(state => state.session?.userId);
  return <WidgetThemeProvider>{userId ? <HomeContent key={userId} userId={userId} /> : null}</WidgetThemeProvider>;
};
export default HomeScreen;
