import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  PlatformColor,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import {
  fetchInboundFriendRequests,
  fetchAcceptedFriendRequests,
  fetchFriendRequestProfiles,
  fetchOutboundFriendRequests,
  ensureFriendSharingForRequests,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendRequestRow,
} from '../../../services/supabase/friendRequests';
import {
  fetchFriendProfiles,
  fetchFriendSharing,
  removeFriend,
  type FriendProfileRow,
} from '../../../services/supabase/friendSharing';
import { searchUsersByAliasOrEmail } from '../../../services/supabase/users';
import { fetchFriendCycleSnapshots, type CycleSnapshotRow } from '../../../services/supabase/cycleSnapshots';
import type { CyclePhase } from '../../../../packages/domain/cycles/models';

const iosColor = (name: string, fallback: string) =>
  Platform.OS === 'ios' ? PlatformColor(name) : fallback;

const palette = {
  background: iosColor('systemGroupedBackground', '#F2F2F7'),
  card: iosColor('secondarySystemGroupedBackground', '#FFFFFF'),
  primaryText: iosColor('label', '#111827'),
  secondaryText: iosColor('secondaryLabel', '#6B7280'),
  tertiaryText: iosColor('tertiaryLabel', '#9CA3AF'),
  separator: iosColor('separator', '#E5E7EB'),
  accent: iosColor('systemBlue', '#007AFF'),
  fill: iosColor('systemGray5', '#E5E7EB'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
  destructive: iosColor('systemRed', '#DC2626'),
  success: iosColor('systemGreen', '#16A34A'),
};

const FriendsScreen = () => {
  const navigation = useNavigation();
  const session = useSessionStore(selectSession);
  const [friendId, setFriendId] = useState('');
  const [inboundRequests, setInboundRequests] = useState<FriendRequestRow[]>([]);
  const [outboundRequests, setOutboundRequests] = useState<FriendRequestRow[]>([]);
  const [requestProfileMap, setRequestProfileMap] = useState<
    Record<string, { alias?: string | null; full_name?: string | null }>
  >({});
  const [friendProfileMap, setFriendProfileMap] = useState<Record<string, FriendProfileRow>>({});
  const [friendSnapshots, setFriendSnapshots] = useState<
    Array<{ user_id: string; last_synced_at?: string; snapshot?: CycleSnapshotRow['snapshot'] }>
  >([]);
  const [phaseFilter, setPhaseFilter] = useState<'all' | CyclePhase>('all');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const acceptedRequests = await fetchAcceptedFriendRequests();
      if (acceptedRequests.length > 0) {
        try {
          await ensureFriendSharingForRequests(acceptedRequests.map((request) => request.id));
        } catch (error) {
          console.warn('[friends] Failed to ensure friend sharing', error);
        }
      }
      const [inbound, outbound, sharingRows, snapshots] = await Promise.all([
        fetchInboundFriendRequests(),
        fetchOutboundFriendRequests(),
        fetchFriendSharing(),
        fetchFriendCycleSnapshots(),
      ]);
      setInboundRequests(inbound);
      setOutboundRequests(outbound.filter((row) => row.status === 'pending'));
      const requestIds = [...inbound, ...outbound].map((row) => row.id);
      if (requestIds.length > 0) {
        try {
          const profiles = await fetchFriendRequestProfiles(requestIds);
          const nextMap: Record<string, { alias?: string | null; full_name?: string | null }> = {};
          profiles.forEach((profile) => {
            nextMap[profile.other_user_id] = {
              alias: profile.alias ?? null,
              full_name: profile.full_name ?? null,
            };
          });
          setRequestProfileMap(nextMap);
        } catch (error) {
          console.warn('[friends] Failed to load request profiles', error);
          setRequestProfileMap({});
        }
      } else {
        setRequestProfileMap({});
      }
      const filteredSnapshots = session?.userId
        ? snapshots.filter((row) => row.user_id !== session.userId)
        : snapshots;
      const incomingSet = new Set(
        sharingRows
          .filter((row) => row.friend_id === session?.userId && row.has_shared)
          .map((row) => row.user_id),
      );
      const mutualFriendIds: string[] = [];
      sharingRows.forEach((row) => {
        if (
          row.user_id === session?.userId &&
          row.has_shared &&
          incomingSet.has(row.friend_id)
        ) {
          mutualFriendIds.push(row.friend_id);
        }
      });
      const snapshotMap = new Map(filteredSnapshots.map((row) => [row.user_id, row]));
      const friendList = mutualFriendIds.map((friendUserId) => {
        const snapshotRow = snapshotMap.get(friendUserId);
        return snapshotRow
          ? snapshotRow
          : { user_id: friendUserId, last_synced_at: undefined, snapshot: undefined };
      });
      setFriendSnapshots(friendList);
      if (mutualFriendIds.length > 0) {
        try {
          const profiles = await fetchFriendProfiles(mutualFriendIds);
          const nextMap: Record<string, FriendProfileRow> = {};
          profiles.forEach((profile) => {
            nextMap[profile.friend_id] = profile;
          });
          setFriendProfileMap(nextMap);
        } catch (error) {
          console.warn('[friends] Failed to load friend profiles', error);
          setFriendProfileMap({});
        }
      } else {
        setFriendProfileMap({});
      }
    } catch (error) {
      console.warn('[friends] Failed to load friend data', error);
      setErrorMessage('Unable to load friends right now.');
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const requestDisplayName = useCallback(
    (userId: string) => {
      const profile = requestProfileMap[userId];
      return profile?.alias || profile?.full_name || userId;
    },
    [requestProfileMap],
  );

  const friendDisplayName = useCallback(
    (userId: string) => {
      const profile = friendProfileMap[userId];
      return profile?.alias || profile?.full_name || 'Unknown friend';
    },
    [friendProfileMap],
  );

  const filteredFriends = useMemo(() => {
    if (phaseFilter === 'all') {
      return friendSnapshots;
    }
    return friendSnapshots.filter(
      (row) => (row.snapshot?.currentPhase ?? 'unknown') === phaseFilter,
    );
  }, [friendSnapshots, phaseFilter]);

  const phaseFilters: { label: string; value: 'all' | CyclePhase }[] = [
    { label: 'All', value: 'all' },
    { label: 'PMS', value: 'pms' },
    { label: 'Menstruation', value: 'menstruation' },
    { label: 'Follicular', value: 'follicular' },
    { label: 'Ovulation', value: 'ovulation' },
    { label: 'Luteal', value: 'luteal' },
    { label: 'Unknown', value: 'unknown' },
  ];

  const navigateToFriendSync = useCallback(
    (friendUserId?: string, preview?: boolean) => {
      navigation.navigate(
        'FriendSync' as never,
        { friendId: friendUserId ?? '', preview: preview ?? false } as never,
      );
    },
    [navigation],
  );

  const handleSendRequest = useCallback(async () => {
    const targetId = friendId.trim();
    if (!targetId) {
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      let resolvedId = targetId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
        const matches = await searchUsersByAliasOrEmail(targetId, 3);
        if (matches.length === 0) {
          setErrorMessage('No user found for that alias or email.');
          return;
        }
        if (matches.length > 1) {
          setErrorMessage('Multiple matches found. Use email or full user ID.');
          return;
        }
        resolvedId = matches[0].id;
      }
      await sendFriendRequest(resolvedId);
      setFriendId('');
      await loadFriends();
    } catch (error) {
      console.warn('[friends] Failed to send friend request', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('[search_users]')) {
        setErrorMessage('User search is unavailable. Ensure the search_users function is deployed.');
      } else if (message) {
        setErrorMessage(message);
      } else {
        setErrorMessage('Could not send request. Double-check the alias or email.');
      }
    } finally {
      setLoading(false);
    }
  }, [friendId, loadFriends]);

  const handleRespond = useCallback(
    async (requestId: string, status: 'accepted' | 'declined') => {
      setLoading(true);
      setErrorMessage(null);
      try {
        await respondToFriendRequest(requestId, status);
        await loadFriends();
      } catch (error) {
        console.warn('[friends] Failed to respond to friend request', error);
        setErrorMessage('Could not update friend request.');
      } finally {
        setLoading(false);
      }
    },
    [loadFriends],
  );

  const confirmRemoveFriend = useCallback(
    (friendUserId: string) => {
      const friendName = friendDisplayName(friendUserId);
      Alert.alert(
        'Remove friend?',
        `${friendName} will no longer see your updates, and you'll need to send a new request to reconnect.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              setErrorMessage(null);
              try {
                await removeFriend(friendUserId);
                await loadFriends();
              } catch (error) {
                console.warn('[friends] Failed to remove friend', error);
                setErrorMessage('Could not remove friend. Try again.');
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      );
    },
    [friendDisplayName, loadFriends],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={palette.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Manage sharing, requests, and Friend Sync.</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends</Text>
          <Text style={styles.cardSubtitle}>People you share cycle updates with.</Text>
          <View style={styles.filterRow}>
            {phaseFilters.map((filter) => {
              const active = filter.value === phaseFilter;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  onPress={() => setPhaseFilter(filter.value)}
                >
                  <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {filteredFriends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.mutedText}>No friends in this phase yet.</Text>
              {__DEV__ ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => navigateToFriendSync(undefined, true)}
                >
                  <Text style={styles.primaryActionText}>Preview Friend Sync</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredFriends.map((row, index) => (
              <View
                key={row.user_id}
                style={[styles.friendRow, index > 0 ? styles.rowDivider : null]}
              >
                <View style={styles.friendMeta}>
                  <Text style={styles.friendName}>{friendDisplayName(row.user_id)}</Text>
                  <Text style={styles.friendPhase}>
                    Phase: {row.snapshot?.currentPhase ?? 'unknown'}
                  </Text>
                </View>
                <View style={styles.friendActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryAction]}
                    onPress={() => navigateToFriendSync(row.user_id)}
                  >
                    <Text style={styles.primaryActionText}>View Sync</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.destructiveAction]}
                    onPress={() => confirmRemoveFriend(row.user_id)}
                  >
                    <Text style={styles.destructiveActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a Friend</Text>
          <Text style={styles.cardSubtitle}>Search by alias or email to send a request.</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={friendId}
              onChangeText={setFriendId}
              placeholder="Friend alias or email"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction, isLoading ? styles.disabledAction : null]}
              onPress={handleSendRequest}
              disabled={isLoading}
            >
              <Text style={styles.primaryActionText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Incoming Requests</Text>
          <Text style={styles.cardSubtitle}>Decide who can see your updates.</Text>
          {inboundRequests.length === 0 ? (
            <Text style={styles.mutedText}>No pending requests.</Text>
          ) : (
            inboundRequests.map((request, index) => (
              <View
                key={request.id}
                style={[styles.requestRow, index > 0 ? styles.rowDivider : null]}
              >
                <View style={styles.requestMeta}>
                  <Text style={styles.requestLabel}>
                    From: {requestDisplayName(request.from_user_id)}
                  </Text>
                  <Text style={styles.requestDate}>
                    {new Date(request.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.successAction]}
                    onPress={() => handleRespond(request.id, 'accepted')}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.destructiveAction]}
                    onPress={() => handleRespond(request.id, 'declined')}
                    disabled={isLoading}
                  >
                    <Text style={styles.destructiveActionText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Outgoing Requests</Text>
          <Text style={styles.cardSubtitle}>Requests waiting for approval.</Text>
          {outboundRequests.length === 0 ? (
            <Text style={styles.mutedText}>No outgoing requests.</Text>
          ) : (
            outboundRequests.map((request, index) => (
              <View
                key={request.id}
                style={[styles.requestRow, index > 0 ? styles.rowDivider : null]}
              >
                <View style={styles.requestMeta}>
                  <Text style={styles.requestLabel}>
                    To: {requestDisplayName(request.to_user_id)}
                  </Text>
                  <Text style={styles.requestDate}>Status: {request.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
    color: palette.accent,
  },
  titleRow: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.primaryText,
  },
  subtitle: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  cardSubtitle: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  errorText: {
    color: palette.destructive,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.mutedFill,
  },
  filterChipActive: {
    backgroundColor: palette.accent,
  },
  filterChipText: {
    fontSize: 12,
    color: palette.primaryText,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  emptyState: {
    gap: 10,
  },
  mutedText: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.separator,
  },
  friendMeta: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  friendPhase: {
    fontSize: 12,
    color: palette.secondaryText,
    textTransform: 'capitalize',
  },
  friendActions: {
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: palette.accent,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  destructiveAction: {
    backgroundColor: palette.mutedFill,
    borderWidth: 1,
    borderColor: palette.destructive,
  },
  destructiveActionText: {
    color: palette.destructive,
    fontSize: 12,
    fontWeight: '600',
  },
  successAction: {
    backgroundColor: palette.success,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledAction: {
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: palette.mutedFill,
    color: palette.primaryText,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  requestMeta: {
    flex: 1,
    gap: 4,
  },
  requestLabel: {
    fontSize: 14,
    color: palette.primaryText,
  },
  requestDate: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default FriendsScreen;
