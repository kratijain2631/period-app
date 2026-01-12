import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationsBell from '../../notifications/components/NotificationsBell';
import NotificationsSheet from '../../notifications/components/NotificationsSheet';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import FriendSyncButton from '../../friends/components/FriendSyncButton';
import { fetchCycleEvents, type CycleEventRow } from '../../../services/supabase/cycleEvents';
import { fetchUserProfilesByIds } from '../../../services/supabase/users';
import { sendBoop } from '../../../services/supabase/boops';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';

const FeedScreen = () => {
  const { notifications, unreadCount } = useNotifications();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const session = useSessionStore(selectSession);
  const navigation = useNavigation();
  const [events, setEvents] = useState<CycleEventRow[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [isLoading, setLoading] = useState(false);
  const [boopStatusById, setBoopStatusById] = useState<Record<string, 'sent' | 'queued'>>({});
  const [boopLoading, setBoopLoading] = useState<Record<string, boolean>>({});
  const isOnline = useConnectionStore(selectIsOnline);
  const isOffline = !isOnline;

  const loadFeed = useCallback(async () => {
    if (!session?.userId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCycleEvents();
      const filtered = data.filter((event) => event.user_id !== session.userId);
      setEvents(filtered);
      const friendIds = Array.from(new Set(filtered.map((event) => event.user_id)));
      if (friendIds.length) {
        try {
          const profiles = await fetchUserProfilesByIds(friendIds);
          const nextMap: Record<string, string> = {};
          profiles.forEach((profile) => {
            if (profile.full_name) {
              nextMap[profile.id] = profile.full_name;
            }
          });
          setNameMap(nextMap);
        } catch (error) {
          console.warn('[feed] Failed to load friend names', error);
          setNameMap({});
        }
      } else {
        setNameMap({});
      }
    } catch (error) {
      console.warn('[feed] Failed to load friend updates', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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

  const navigateToFriendSync = useCallback(
    (friendUserId: string) => {
      navigation.navigate('FriendSync' as never, { friendId: friendUserId } as never);
    },
    [navigation],
  );

  const handleBoop = useCallback(async (event: CycleEventRow) => {
    if (!event.user_id) {
      return;
    }
    setBoopLoading((prev) => ({ ...prev, [event.id]: true }));
    try {
      const result = await sendBoop({ toUserId: event.user_id, eventId: event.id });
      setBoopStatusById((prev) => ({ ...prev, [event.id]: result.status }));
    } catch (error) {
      console.warn('[feed] Failed to send boop', error);
    } finally {
      setBoopLoading((prev) => ({ ...prev, [event.id]: false }));
    }
  }, []);

  const displayEvents = useMemo(() => events, [events]);
  const shortId = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayEvents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadFeed} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Feed</Text>
              <View style={styles.headerActions}>
                <FriendSyncButton onPress={navigateToProfile} />
                <NotificationsBell count={unreadCount} onPress={() => setSheetVisible(true)} />
              </View>
            </View>
            <Text style={styles.subtitle}>See recent cycle updates from friends you share with.</Text>
            {isOffline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>Offline: boops will queue until you're back online.</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const friendLabel = nameMap[item.user_id] ?? `Friend ${shortId(item.user_id)}`;
          const boopStatus = boopStatusById[item.id];
          const booped = boopStatus === 'sent';
          const queued = boopStatus === 'queued';
          const boopInFlight = boopLoading[item.id];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  onPress={() => navigateToFriendSync(item.user_id)}
                  accessibilityLabel={`View sync with ${friendLabel}`}
                >
                  <Text style={styles.cardTitle}>{friendLabel}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.event_type.replace(/_/g, ' ')} • {new Date(item.starts_at).toLocaleString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.boopButton,
                    booped ? styles.boopButtonDone : null,
                    queued ? styles.boopButtonQueued : null,
                  ]}
                  onPress={() => handleBoop(item)}
                  disabled={booped || queued || boopInFlight}
                >
                  <Text
                    style={[
                      styles.boopButtonText,
                      booped ? styles.boopButtonTextDone : null,
                      queued ? styles.boopButtonTextQueued : null,
                    ]}
                  >
                    {booped
                      ? 'Booped'
                      : queued
                        ? 'Queued'
                        : boopInFlight
                          ? 'Booping...'
                          : 'Boop'}
                  </Text>
                </TouchableOpacity>
              </View>
              {item.phase ? <Text style={styles.phaseText}>Phase: {item.phase}</Text> : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            {session ? 'No friend updates yet. Add friends to start sharing.' : 'Sign in to see friend updates.'}
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  offlineBanner: {
    marginTop: 6,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#555',
  },
  phaseText: {
    fontSize: 13,
    color: '#6a5acd',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  boopButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111',
  },
  boopButtonDone: {
    backgroundColor: '#e6f3e6',
  },
  boopButtonQueued: {
    backgroundColor: '#fff3cd',
  },
  boopButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  boopButtonTextDone: {
    color: '#1c6d1c',
  },
  boopButtonTextQueued: {
    color: '#7a5b00',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 24,
  },
});

export default FeedScreen;
