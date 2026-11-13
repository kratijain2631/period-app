import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { IconButton } from '../../../components/ui/ScreenControls';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { useSocial } from '../../social/SocialProvider';
import { NotificationItem } from '../components/NotificationItem';
import { buildInbox } from '../models/inbox';

export default function NotificationsScreen() {
  const nav = useNavigation<any>();
  const theme = useWidgetTheme();
  const online = useConnectionStore(selectIsOnline);
  const { notifications: inbox, respondToRequest } = useSocial();
  const rows = buildInbox(inbox);
  const unseen =
    inbox.notifications.some((n) => !n.read_at) ||
    inbox.acceptances.some((a) => !inbox.readAcceptanceIds.includes(a.id));
  useFocusEffect(
    useCallback(() => {
      if (unseen) void inbox.markAllRead();
    }, [unseen, inbox.markAllRead]),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const respond = async (id: string, accept: boolean) => {
    if (lock.current || !online) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await respondToRequest(id, accept ? 'accepted' : 'declined');
    } catch {
      setError('Couldn’t update the request. Try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => nav.goBack()} />
        <AppText role="heading" accessibilityRole="header">
          Notifications
        </AppText>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await inbox.reload();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        ListHeaderComponent={
          <>
            {!!error && <AppText accessibilityRole="alert">{error}</AppText>}
            {inbox.requestStatus === 'error' && (
              <>
                <AppText>Couldn’t refresh friend requests.</AppText>
                <ActionButton outline label="Try again" onPress={inbox.reload} />
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            disabled={busy || !online}
            onProfile={(memberId) => nav.navigate('MemberProfile', { memberId })}
            onRespond={respond}
          />
        )}
        ListEmptyComponent={
          inbox.requestStatus !== 'error' ? (
            <AppText>
              {inbox.requestStatus === 'loading' ? 'Loading notifications…' : 'No notifications yet.'}
            </AppText>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
