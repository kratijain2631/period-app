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
  fetchOutboundFriendRequests,
  ensureFriendSharingForRequests,
  sendFriendRequest,
  sendFriendRequestByEmail,
  type FriendRequestRow,
} from '../../../services/supabase/friendRequests';
import {
  fetchFriendProfiles,
  fetchFriendSharing,
  removeFriend,
  type FriendProfileRow,
} from '../../../services/supabase/friendSharing';
import { searchUsersByAliasOrEmail, type UserSearchResult } from '../../../services/supabase/users';
import { fetchFriendCycleSnapshots, type CycleSnapshotRow } from '../../../services/supabase/cycleSnapshots';
import { computeSyncScore } from '../utils/syncScore';
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
};

const FriendsScreen = () => {
  const navigation = useNavigation();
  const session = useSessionStore(selectSession);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchNotice, setSearchNotice] = useState<{ message: string; tone: 'info' | 'error' } | null>(
    null,
  );
  const [isSearching, setSearching] = useState(false);
  const [inboundRequests, setInboundRequests] = useState<FriendRequestRow[]>([]);
  const [outboundRequests, setOutboundRequests] = useState<FriendRequestRow[]>([]);
  const [friendProfileMap, setFriendProfileMap] = useState<Record<string, FriendProfileRow>>({});
  const [friendSnapshots, setFriendSnapshots] = useState<
    Array<{ user_id: string; last_synced_at?: string; snapshot?: CycleSnapshotRow['snapshot'] }>
  >([]);
  const [friendScores, setFriendScores] = useState<Record<string, number | null>>({});
  const [selfPhase, setSelfPhase] = useState<CyclePhase>('unknown');
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
      if (session?.userId) {
        const selfSnapshotRow = snapshots.find((row) => row.user_id === session.userId);
        setSelfPhase((selfSnapshotRow?.snapshot?.currentPhase ?? 'unknown') as CyclePhase);
      } else {
        setSelfPhase('unknown');
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
          const selfSnapshotValue = snapshots.find((row) => row.user_id === session?.userId)?.snapshot;
          const scores = mutualFriendIds.map((friendId) => {
            const friendSnapshot = snapshotMap.get(friendId)?.snapshot;
            if (!selfSnapshotValue || !friendSnapshot) {
              return [friendId, null] as const;
            }
            try {
              const summary = computeSyncScore({
                selfSnapshot: selfSnapshotValue,
                friendSnapshot,
              });
              return [friendId, summary.score] as const;
            } catch (error) {
              console.warn('[friends] Failed to compute sync score', error);
              return [friendId, null] as const;
            }
          });
          setFriendScores(Object.fromEntries(scores));
        } catch (error) {
          console.warn('[friends] Failed to load sync scores', error);
          setFriendScores({});
        }
      } else {
        setFriendScores({});
      }
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

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = useMemo(() => trimmedQuery.replace(/^@+/, ''), [trimmedQuery]);
  const isEmailQuery = useMemo(
    () => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedQuery),
    [trimmedQuery],
  );

  useEffect(() => {
    let isActive = true;
    if (!normalizedQuery) {
      setSearchResults([]);
      setSearching(false);
      setSearchNotice(null);
      return () => {
        isActive = false;
      };
    }
    if (isEmailQuery) {
      setSearchResults([]);
      setSearching(false);
      return () => {
        isActive = false;
      };
    }
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return () => {
        isActive = false;
      };
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchNotice(null);
      try {
        const results = await searchUsersByAliasOrEmail(normalizedQuery, 8);
        const filtered = results.filter((result) => result.id !== session?.userId);
        if (isActive) {
          setSearchResults(filtered);
        }
      } catch (error) {
        console.warn('[friends] Failed to search users', error);
        if (isActive) {
          setSearchResults([]);
          setSearchNotice({ message: 'Search is unavailable right now.', tone: 'error' });
        }
      } finally {
        if (isActive) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [isEmailQuery, normalizedQuery, session?.userId]);

  const inboundRequestMap = useMemo(
    () => new Map(inboundRequests.map((request) => [request.from_user_id, request])),
    [inboundRequests],
  );
  const outboundRequestIds = useMemo(
    () => new Set(outboundRequests.map((request) => request.to_user_id)),
    [outboundRequests],
  );
  const friendIds = useMemo(
    () => new Set(friendSnapshots.map((row) => row.user_id)),
    [friendSnapshots],
  );

  const formatAlias = useCallback((alias?: string | null) => {
    if (!alias) {
      return '@unknown';
    }
    return alias.startsWith('@') ? alias : `@${alias}`;
  }, []);

  const shortId = useCallback((value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`, []);

  const friendUsername = useCallback(
    (userId: string) => {
      const profile = friendProfileMap[userId];
      if (profile?.alias) {
        return formatAlias(profile.alias);
      }
      return `Friend ${shortId(userId)}`;
    },
    [friendProfileMap, formatAlias, shortId],
  );

  const formatPhaseLabel = useCallback((value?: string | null) => {
    if (!value) {
      return 'Unknown';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }, []);

  const formatPairSummary = useCallback(
    (friendPhase?: string | null) => {
      const safeFriendPhase = (friendPhase ?? 'unknown') as CyclePhase;
      const you = formatPhaseLabel(selfPhase);
      const them = formatPhaseLabel(safeFriendPhase);
      if (selfPhase === safeFriendPhase && selfPhase !== 'unknown') {
        return `Both in ${you}`;
      }
      return `${you} vs ${them}`;
    },
    [formatPhaseLabel, selfPhase],
  );

  const formatSyncedAt = useCallback((value?: string) => {
    if (!value) {
      return 'No sync yet';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'No sync yet';
    }
    return `Synced ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }, []);

  const scoreToneFor = useCallback((value: number) => {
    if (value >= 80) {
      return { label: 'High sync', color: '#34C759', background: '#E7F7EC' };
    }
    if (value >= 60) {
      return { label: 'Aligned', color: '#007AFF', background: '#E6F0FF' };
    }
    if (value >= 40) {
      return { label: 'Mixed', color: '#FF9500', background: '#FFF3E0' };
    }
    return { label: 'Needs care', color: '#FF3B30', background: '#FFE8E7' };
  }, []);

  const navigateToFriendSync = useCallback(
    (friendUserId?: string, preview?: boolean) => {
      navigation.navigate(
        'FriendSync' as never,
        { friendId: friendUserId ?? '', preview: preview ?? false } as never,
      );
    },
    [navigation],
  );

  const handleSendRequest = useCallback(
    async (targetId: string) => {
      if (!targetId) {
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        await sendFriendRequest(targetId);
        await loadFriends();
      } catch (error) {
        console.warn('[friends] Failed to send friend request', error);
        const message = error instanceof Error ? error.message : '';
        if (message) {
          setErrorMessage(message);
        } else {
          setErrorMessage('Could not send request. Try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [loadFriends],
  );

  const handleSendEmailRequest = useCallback(async () => {
    if (!trimmedQuery || !isEmailQuery) {
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await sendFriendRequestByEmail(trimmedQuery);
      setSearchNotice({
        message: 'If they have an account, your request was sent.',
        tone: 'info',
      });
    } catch (error) {
      console.warn('[friends] Failed to send email request', error);
      setSearchNotice({ message: 'Could not send the email request. Try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isEmailQuery, trimmedQuery]);

  const confirmRemoveFriend = useCallback(
    (friendUserId: string) => {
      const friendName = friendUsername(friendUserId);
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
    [friendUsername, loadFriends],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Friends</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Find friends</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={palette.secondaryText} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (searchNotice) {
                  setSearchNotice(null);
                }
              }}
              placeholder="Search by alias"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                style={styles.searchClear}
                onPress={() => {
                  setSearchQuery('');
                  setSearchNotice(null);
                }}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={palette.tertiaryText} />
              </TouchableOpacity>
            ) : null}
          </View>
          {isEmailQuery ? (
            <View style={styles.emailRequest}>
              <Text style={styles.helperText}>
                Send a private request by email. We won&apos;t reveal whether they have an account.
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction, isLoading ? styles.disabledAction : null]}
                onPress={handleSendEmailRequest}
                disabled={isLoading}
              >
                <Text style={styles.primaryActionText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchResults}>
              {isSearching ? <Text style={styles.mutedText}>Searching...</Text> : null}
              {!isSearching && normalizedQuery.length >= 2 && searchResults.length === 0 && !searchNotice ? (
                <Text style={styles.mutedText}>No matches yet.</Text>
              ) : null}
              {searchResults.map((result, index) => {
                const primaryName = result.alias ? formatAlias(result.alias) : 'Unknown';
                const initialSource = result.alias ?? '?';
                const initial = initialSource.trim().slice(0, 1).toUpperCase() || '?';
                const isInbound = inboundRequestMap.has(result.id);
                const isOutbound = outboundRequestIds.has(result.id);
                const isFriend = friendIds.has(result.id);

                return (
                  <View
                    key={result.id}
                    style={[styles.searchRow, index > 0 ? styles.rowDivider : null]}
                  >
                    <View style={styles.searchAvatar}>
                      <Text style={styles.searchAvatarText}>{initial}</Text>
                    </View>
                    <View style={styles.searchMeta}>
                      <Text style={styles.searchName}>{primaryName}</Text>
                    </View>
                    <View style={styles.searchActions}>
                      {isFriend ? (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.secondaryAction]}
                          onPress={() => navigateToFriendSync(result.id)}
                        >
                          <Text style={styles.secondaryActionText}>View Sync</Text>
                        </TouchableOpacity>
                      ) : isInbound ? (
                        <View style={[styles.actionButton, styles.pendingAction]}>
                          <Text style={styles.pendingActionText}>Requested you</Text>
                        </View>
                      ) : isOutbound ? (
                        <View style={[styles.actionButton, styles.pendingAction]}>
                          <Text style={styles.pendingActionText}>Requested</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.primaryAction]}
                          onPress={() => handleSendRequest(result.id)}
                          disabled={isLoading}
                        >
                          <Text style={styles.primaryActionText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {searchNotice ? (
            <Text
              style={[
                styles.noticeText,
                searchNotice.tone === 'error' ? styles.noticeError : styles.noticeInfo,
              ]}
            >
              {searchNotice.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends</Text>
          {friendSnapshots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.mutedText}>No friends yet.</Text>
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
            friendSnapshots.map((row, index) => {
              const username = friendUsername(row.user_id);
              const initial = username.replace('@', '').trim().slice(0, 1).toUpperCase() || '?';
              const score = friendScores[row.user_id];
              const normalizedScore =
                typeof score === 'number'
                  ? score <= 1
                    ? Math.round(score * 100)
                    : Math.round(score)
                  : null;
              const scoreTone = normalizedScore !== null ? scoreToneFor(normalizedScore) : null;
              const scoreLabel = normalizedScore !== null ? `${normalizedScore}%` : 'No data';
              const scoreStatus = scoreTone?.label ?? 'Sync score';
              const scoreColor = scoreTone?.color ?? palette.secondaryText;
              const scoreBackground = scoreTone?.background ?? palette.mutedFill;
              return (
                <View
                  key={row.user_id}
                  style={[styles.friendRow, index > 0 ? styles.rowDivider : null]}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{initial}</Text>
                  </View>
                  <View style={styles.friendMeta}>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {username}
                    </Text>
                    <Text style={styles.friendDetail}>
                      {formatPairSummary(row.snapshot?.currentPhase)}
                    </Text>
                    <View style={styles.friendMetaFooter}>
                      <Text style={styles.friendDetailMuted}>
                        {formatSyncedAt(row.last_synced_at)}
                      </Text>
                      <TouchableOpacity
                        style={styles.linkAction}
                        onPress={() => confirmRemoveFriend(row.user_id)}
                      >
                        <Text style={styles.linkDestructiveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.friendRight}>
                    <TouchableOpacity
                      style={styles.friendAction}
                      onPress={() => navigateToFriendSync(row.user_id)}
                    >
                      <Text style={styles.friendActionText}>View Sync</Text>
                      <Ionicons name="chevron-forward" size={12} color={palette.accent} />
                    </TouchableOpacity>
                    <View style={[styles.scoreBadge, { backgroundColor: scoreBackground }]}>
                      <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                        {scoreStatus}
                      </Text>
                      <Text style={[styles.scoreBadgeValue, { color: scoreColor }]}>
                        {scoreLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
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
  titleRow: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.primaryText,
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
  errorText: {
    color: palette.destructive,
    fontSize: 12,
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
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.secondaryText,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.separator,
  },
  friendMeta: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.primaryText,
    flexShrink: 1,
  },
  friendDetail: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  friendDetailMuted: {
    fontSize: 11,
    color: palette.tertiaryText,
  },
  friendMetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  friendAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  friendActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accent,
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
  disabledAction: {
    opacity: 0.6,
  },
  secondaryAction: {
    backgroundColor: palette.mutedFill,
    borderWidth: 1,
    borderColor: palette.separator,
  },
  secondaryActionText: {
    color: palette.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingAction: {
    backgroundColor: palette.mutedFill,
  },
  pendingActionText: {
    color: palette.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.mutedFill,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: palette.primaryText,
  },
  searchClear: {
    padding: 2,
  },
  searchResults: {
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  searchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.secondaryText,
  },
  searchMeta: {
    flex: 1,
    gap: 2,
  },
  searchName: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  linkAction: {
    paddingVertical: 4,
  },
  linkDestructiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.destructive,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helperText: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  emailRequest: {
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
  },
  noticeError: {
    color: palette.destructive,
  },
  noticeInfo: {
    color: palette.secondaryText,
  },
});

export default FriendsScreen;
