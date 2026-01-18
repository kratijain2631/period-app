import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  type FriendProfileRow,
  type FriendSharingRow,
} from '../../../services/supabase/friendSharing';
import { fetchCurrentUserProfile, searchUsersByAliasOrEmail } from '../../../services/supabase/users';
import { fetchFriendCycleSnapshots, type CycleSnapshotRow } from '../../../services/supabase/cycleSnapshots';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import type { CyclePhase } from '../../../../packages/domain/cycles/models';

const ProfileScreen = () => {
  const session = useSessionStore(selectSession);
  const navigation = useNavigation();
  const { snapshot, isStale, lastSyncedAt } = useCycleSnapshot();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [friendId, setFriendId] = useState('');
  const [inboundRequests, setInboundRequests] = useState<FriendRequestRow[]>([]);
  const [outboundRequests, setOutboundRequests] = useState<FriendRequestRow[]>([]);
  const [requestProfileMap, setRequestProfileMap] = useState<
    Record<string, { alias?: string | null; full_name?: string | null }>
  >({});
  const [friendProfileMap, setFriendProfileMap] = useState<Record<string, FriendProfileRow>>({});
  const [sharing, setSharing] = useState<FriendSharingRow[]>([]);
  const [friendSnapshots, setFriendSnapshots] = useState<
    Array<{ user_id: string; last_synced_at?: string; snapshot?: CycleSnapshotRow['snapshot'] }>
  >([]);
  const [phaseFilter, setPhaseFilter] = useState<'all' | CyclePhase>('all');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchCurrentUserProfile();
      if (data) {
        setProfileName(data.full_name ?? '');
        setProfileEmail(data.email ?? '');
      }
    } catch (error) {
      console.warn('[profile] Failed to load user profile', error);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const acceptedRequests = await fetchAcceptedFriendRequests();
      if (acceptedRequests.length > 0) {
        try {
          await ensureFriendSharingForRequests(acceptedRequests.map((request) => request.id));
        } catch (error) {
          console.warn('[profile] Failed to ensure friend sharing', error);
        }
      }
      const [inbound, outbound, sharingRows, snapshots] = await Promise.all([
        fetchInboundFriendRequests(),
        fetchOutboundFriendRequests(),
        fetchFriendSharing(),
        fetchFriendCycleSnapshots(),
      ]);
      setInboundRequests(inbound);
      setOutboundRequests(outbound);
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
          console.warn('[profile] Failed to load request profiles', error);
          setRequestProfileMap({});
        }
      } else {
        setRequestProfileMap({});
      }
      setSharing(sharingRows.filter((row) => row.has_shared));
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
          console.warn('[profile] Failed to load friend profiles', error);
          setFriendProfileMap({});
        }
      } else {
        setFriendProfileMap({});
      }
    } catch (error) {
      console.warn('[profile] Failed to load friend data', error);
      setErrorMessage('Unable to load friends right now.');
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadProfile();
    loadFriends();
  }, [loadFriends, loadProfile]);

  const displayName = useMemo(() => {
    if (profileName) {
      return profileName;
    }
    if (profileEmail) {
      return profileEmail;
    }
    return 'Your Name';
  }, [profileEmail, profileName]);

  const avatarInitial = displayName.trim().slice(0, 1).toUpperCase() || '?';
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
      console.warn('[profile] Failed to send friend request', error);
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
        console.warn('[profile] Failed to respond to friend request', error);
        setErrorMessage('Could not update friend request.');
      } finally {
        setLoading(false);
      }
    },
    [loadFriends],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{displayName}</Text>
            {profileEmail ? <Text style={styles.profileEmail}>{profileEmail}</Text> : null}
            {session?.userId ? (
              <Text style={styles.profileId}>Your ID: {session.userId}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Cycle</Text>
          <Text style={styles.phaseLabel}>
            {snapshot ? snapshot.currentPhase : 'Unknown phase'}
          </Text>
          <Text style={styles.phaseSubtext}>
            {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : 'No recent cycle data.'}
          </Text>
          {isStale ? <Text style={styles.phaseWarning}>Data may be stale. Retry sync on Home.</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Sync</Text>
          <Text style={styles.sectionSubtitle}>Add a friend by alias or email.</Text>
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
              style={[styles.primaryButton, isLoading ? styles.primaryButtonDisabled : null]}
              onPress={handleSendRequest}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Filters</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends</Text>
          {filteredFriends.length === 0 ? (
            <>
              <Text style={styles.mutedText}>No friends in this phase yet.</Text>
              {__DEV__ ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewSyncButton]}
                  onPress={() => navigateToFriendSync(undefined, true)}
                >
                  <Text style={styles.actionButtonText}>Preview Friend Sync</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            filteredFriends.map((row) => (
              <View key={row.user_id} style={styles.friendRow}>
                <View>
                  <Text style={styles.requestLabel}>{friendDisplayName(row.user_id)}</Text>
                  <Text style={styles.requestDate}>Phase: {row.snapshot?.currentPhase ?? 'unknown'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewSyncButton]}
                  onPress={() => navigateToFriendSync(row.user_id)}
                >
                  <Text style={styles.actionButtonText}>View Sync</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming Requests</Text>
          {inboundRequests.length === 0 ? (
            <Text style={styles.mutedText}>No pending requests.</Text>
          ) : (
            inboundRequests.map((request) => (
              <View key={request.id} style={styles.requestRow}>
                <View>
                  <Text style={styles.requestLabel}>
                    From: {requestDisplayName(request.from_user_id)}
                  </Text>
                  <Text style={styles.requestDate}>{new Date(request.created_at).toLocaleString()}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleRespond(request.id, 'accepted')}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleRespond(request.id, 'declined')}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outgoing Requests</Text>
          {outboundRequests.length === 0 ? (
            <Text style={styles.mutedText}>No outgoing requests.</Text>
          ) : (
            outboundRequests.map((request) => (
              <View key={request.id} style={styles.requestRow}>
                <View>
                  <Text style={styles.requestLabel}>
                    To: {requestDisplayName(request.to_user_id)}
                  </Text>
                  <Text style={styles.requestDate}>Status: {request.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Hidden for now: "Sharing With" duplicates Friends until we add one-way sharing controls. */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5ff',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8e2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3d2f8f',
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  profileEmail: {
    fontSize: 14,
    color: '#555',
  },
  profileId: {
    fontSize: 12,
    color: '#777',
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3d2f8f',
    textTransform: 'capitalize',
  },
  phaseSubtext: {
    fontSize: 12,
    color: '#555',
  },
  phaseWarning: {
    fontSize: 12,
    color: '#b06d00',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#444',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: '#b00020',
    fontSize: 12,
  },
  mutedText: {
    fontSize: 13,
    color: '#777',
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
    backgroundColor: '#f0f0f5',
  },
  filterChipActive: {
    backgroundColor: '#3d2f8f',
  },
  filterChipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  requestLabel: {
    fontSize: 14,
    color: '#111',
  },
  requestDate: {
    fontSize: 12,
    color: '#777',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  viewSyncButton: {
    backgroundColor: '#111',
  },
  acceptButton: {
    backgroundColor: '#1c6d1c',
  },
  declineButton: {
    backgroundColor: '#9b1c1c',
  },
});

export default ProfileScreen;
