import { CommentThreads } from '../components/CommentThreads';
import { useState } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PageHeading } from '../../../components/ui/ScreenControls';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { SharedActivity } from '../components/SharedActivity';
import { ShareUpdateButton } from '../components/ShareUpdateButton';
import { activityKey } from '../models/activity';
import { useSocial } from '../../social/SocialProvider';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
export default function CircleFeedScreen() {
  const { feed } = useSocial();
  const nav = useNavigation<any>();
  const t = useWidgetTheme();
  const c = feed.composer;
  const offline = !useConnectionStore(selectIsOnline);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <CommentThreads>
        <FlatList
          data={feed.items}
          keyExtractor={(i) => activityKey(i.target)}
          renderItem={({ item }) => <SharedActivity item={item} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await feed.reload();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: 12 }}>
              <PageHeading
                title="Feed"
                icon="notifications-outline"
                action="Notifications"
                onPress={() => nav.navigate('Notifications')}
              />
              <ShareUpdateButton
                draft={Boolean(c.text || c.mood)}
                onPress={() => nav.navigate('WritePost')}
              />
              <AppText role="heading" accessibilityRole="header">
                Latest activity
              </AppText>
              {offline && <AppText>Offline · Showing saved activity</AppText>}
              {feed.error && <AppText accessibilityRole="alert">{feed.error}</AppText>}
            </View>
          }
          ListEmptyComponent={
            <AppText>
              {offline
                ? 'Connect to the internet to load your circle feed.'
                : feed.loading
                  ? 'Loading updates…'
                  : feed.error
                    ? 'Pull down to retry.'
                    : 'No shared updates yet.'}
            </AppText>
          }
        />
      </CommentThreads>
    </SafeAreaView>
  );
}
