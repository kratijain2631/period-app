import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { syncHealthData } from '../../../services/healthkit/syncHealthData';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import DailySummaryCard from '../../feed/components/DailySummaryCard';
import NotificationsBell from '../../notifications/components/NotificationsBell';
import NotificationsSheet from '../../notifications/components/NotificationsSheet';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import FriendSyncButton from '../../friends/components/FriendSyncButton';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';

const HomeScreen = () => {
  const { snapshot, isStale, lastSyncedAt } = useCycleSnapshot();
  const { notifications, unreadCount } = useNotifications();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const isOnline = useConnectionStore(selectIsOnline);
  const isOffline = !isOnline;
  const samples = snapshot?.samples ?? [];

  useEffect(() => {
    syncHealthData({ trigger: 'foreground' });
  }, []);

  const notificationPayload = useMemo(() => {
    const params = (route as { params?: Record<string, unknown> }).params;
    return params?.notification as Record<string, unknown> | undefined;
  }, [route]);

  useEffect(() => {
    if (notificationPayload) {
      setSheetVisible(true);
    }
  }, [notificationPayload]);

  const navigateToProfile = () => {
    const state = navigation.getState();
    if (state?.routeNames?.includes('Profile')) {
      navigation.navigate('Profile' as never);
      return;
    }
    if (state?.routeNames?.includes('MainTabs')) {
      navigation.navigate('MainTabs' as never, { screen: 'Profile' } as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={samples}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => syncHealthData({ trigger: 'foreground' })} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Home</Text>
              <View style={styles.headerActions}>
                <FriendSyncButton onPress={navigateToProfile} />
                <NotificationsBell count={unreadCount} onPress={() => setSheetVisible(true)} />
              </View>
            </View>
            <Text style={styles.subtitle}>
              {snapshot
                ? `Last synced ${new Date(snapshot.syncedAt).toLocaleString()}`
                : 'Grant Health permissions to start syncing.'}
            </Text>
            {isOffline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>Offline: showing cached data.</Text>
              </View>
            ) : null}
            <DailySummaryCard
              snapshot={snapshot}
              isStale={isStale}
              lastSyncedAt={lastSyncedAt}
              isOffline={isOffline}
              onRetrySync={() => syncHealthData({ trigger: 'manual' })}
            />
            {notificationPayload ? (
              <View style={styles.notificationHint}>
                <Text style={styles.notificationHintText}>Opened from a notification.</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🩸 {item.flowValue?.toString() ?? 'Flow'}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(item.startDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            {snapshot
              ? 'No recent menstrual flow entries in Apple Health.'
              : 'Cycles will appear here after permissions are granted.'}
          </Text>
        }
      />
      <NotificationsSheet
        visible={isSheetVisible}
        notifications={notifications}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5ff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#555',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 24,
  },
  notificationHint: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f2f2f7',
  },
  notificationHintText: {
    fontSize: 12,
    color: '#555',
  },
  offlineBanner: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#ffe6e6',
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: '#7a1f1f',
    fontWeight: '600',
  },
});

export default HomeScreen;
