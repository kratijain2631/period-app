import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Alert,
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
import { brand, brandType } from '../../../theme/brand';
import { DottieAndFriend } from '../../../components/brand/DottieMascot';
import { PhaseAvatar, getPhaseColor } from '../../../components/brand/CycleRing';
import { useStaggeredEntrance } from '../../../components/brand/useStaggeredEntrance';

const palette = {
  background: brand.colors.background,
  card: brand.colors.card,
  primaryText: brand.colors.primaryText,
  secondaryText: brand.colors.secondaryText,
  tertiaryText: brand.colors.tertiaryText,
  separator: brand.colors.separator,
  accent: brand.colors.accent,
  fill: brand.colors.fill,
  mutedFill: brand.colors.mutedFill,
  destructive: brand.colors.destructive,
  white: brand.colors.white,
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
  const searchInputRef = useRef<TextInput>(null);

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
      (navigation as any).navigate('FriendSync', {
        friendId: friendUserId ?? '',
        preview: preview ?? false,
      });
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

  const deriveCycleDay = useCallback((snapshot?: CycleSnapshotRow['snapshot']) => {
    const latest = snapshot?.latestSampleStart;
    if (!latest) {
      return null;
    }
    const latestDate = new Date(latest);
    if (Number.isNaN(latestDate.getTime())) {
      return null;
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfLatest = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      latestDate.getDate(),
    ).getTime();
    const elapsedDays = Math.max(
      0,
      Math.floor((startOfToday - startOfLatest) / (24 * 60 * 60 * 1000)),
    );
    const cycleLength = snapshot?.cycleLengthDays ?? 28;
    return (elapsedDays % cycleLength) + 1;
  }, []);
  const entranceStyles = useStaggeredEntrance(4, {
    initialDelay: 40,
    stagger: 85,
    distance: 14,
  });
  const inviteBob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(inviteBob, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(inviteBob, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [inviteBob]);

  const inviteBobStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: inviteBob.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -6],
          }),
        },
      ],
    }),
    [inviteBob],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={entranceStyles[0]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Your Circle</Text>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => {
                setSearchNotice(null);
                searchInputRef.current?.focus();
              }}
              accessibilityLabel="Add a friend"
            >
              <Ionicons name="person-add-outline" size={18} color={palette.secondaryText} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Animated.View style={entranceStyles[1]}>
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={palette.tertiaryText} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (searchNotice) {
                    setSearchNotice(null);
                  }
                }}
                placeholder="Search friends..."
                placeholderTextColor={palette.tertiaryText}
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
              <View style={styles.searchResultsWrap}>
                <Text style={styles.helperText}>
                  Send a private request by email. We won&apos;t reveal whether they have an account.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
                  onPress={handleSendEmailRequest}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isEmailQuery && (normalizedQuery.length >= 2 || isSearching || searchNotice) ? (
              <View style={styles.searchResultsWrap}>
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
                            style={styles.secondaryButton}
                            onPress={() => navigateToFriendSync(result.id)}
                          >
                            <Text style={styles.secondaryButtonText}>View Sync</Text>
                          </TouchableOpacity>
                        ) : isInbound ? (
                          <View style={styles.pendingChip}>
                            <Text style={styles.pendingChipText}>Requested you</Text>
                          </View>
                        ) : isOutbound ? (
                          <View style={styles.pendingChip}>
                            <Text style={styles.pendingChipText}>Requested</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
                            onPress={() => handleSendRequest(result.id)}
                            disabled={isLoading}
                          >
                            <Text style={styles.primaryButtonText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

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
            ) : null}
          </View>
        </Animated.View>

        <Animated.View style={entranceStyles[2]}>
          {friendSnapshots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.mutedText}>No friends yet.</Text>
              {__DEV__ ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigateToFriendSync(undefined, true)}
                >
                  <Text style={styles.primaryButtonText}>Preview Friend Sync</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.friendsList}>
              <Text style={styles.friendsListTitle}>Friends</Text>
              {friendSnapshots.map((row, index) => {
                const username = friendUsername(row.user_id);
                const initial = username.replace('@', '').trim().slice(0, 1).toUpperCase() || '?';
                const normalizedScoreRaw = friendScores[row.user_id];
                const normalizedScore =
                  typeof normalizedScoreRaw === 'number'
                    ? normalizedScoreRaw <= 1
                      ? Math.round(normalizedScoreRaw * 100)
                      : Math.round(normalizedScoreRaw)
                    : 0;
                const friendPhaseColor = getPhaseColor(row.snapshot?.currentPhase);
                const friendCycleDay = deriveCycleDay(row.snapshot);
                const trendLabel = normalizedScore >= 50 ? 'Converging' : 'Diverging';

                return (
                  <TouchableOpacity
                    key={row.user_id}
                    style={styles.friendCard}
                    onPress={() => navigateToFriendSync(row.user_id)}
                    onLongPress={() => confirmRemoveFriend(row.user_id)}
                    activeOpacity={0.93}
                  >
                    <View style={styles.friendCardRow}>
                      <PhaseAvatar initial={initial} phase={row.snapshot?.currentPhase} size={50} />

                      <View style={styles.friendMeta}>
                        <View style={styles.friendTitleRow}>
                          <View style={styles.friendTitleLeft}>
                            <Text style={styles.friendName} numberOfLines={1}>
                              {username}
                            </Text>
                            <View style={styles.syncBadge}>
                              <Text style={styles.syncBadgeText}>Sync</Text>
                            </View>
                          </View>
                          <Text style={styles.friendRemove}>Remove</Text>
                        </View>

                        <Text style={styles.friendSubtitle}>
                          {`Day ${friendCycleDay ?? '--'} · ${formatPairSummary(row.snapshot?.currentPhase)}`}
                        </Text>

                        <View style={styles.scoreRow}>
                          <View style={styles.scoreTrack}>
                            <View
                              style={[
                                styles.scoreFill,
                                {
                                  width: `${Math.max(0, Math.min(100, normalizedScore))}%`,
                                  backgroundColor: friendPhaseColor,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.scoreValue}>{`${normalizedScore}%`}</Text>
                        </View>

                        <View style={styles.friendFootRow}>
                          <Text style={styles.friendStatus}>{trendLabel}</Text>
                          <Text style={styles.friendLastActive}>{formatSyncedAt(row.last_synced_at)}</Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color="#DDD9D3" />
                    </View>

                    {index < friendSnapshots.length - 1 ? <View style={styles.friendDivider} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View style={entranceStyles[3]}>
          <View style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>Grow Your Circle</Text>
            <Text style={styles.inviteSubtitle}>Invite friends to sync your cycles together</Text>
            <Animated.View style={[styles.inviteMascot, inviteBobStyle]}>
              <DottieAndFriend size={140} color1="#C4654A" color2="#D4A252" />
            </Animated.View>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => {
                setSearchNotice({
                  message: 'Share your friend alias or email in search to invite them.',
                  tone: 'info',
                });
              }}
            >
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    paddingTop: 14,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 42,
    color: palette.primaryText,
    ...brandType.display,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...brand.shadow.soft,
  },
  errorText: {
    color: palette.destructive,
    fontSize: 12,
    marginBottom: 8,
    ...brandType.body,
  },
  searchWrap: {
    marginBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EDE9E3',
    backgroundColor: palette.white,
    padding: 12,
    ...brand.shadow.card,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9E3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2D2A26',
    ...brandType.body,
  },
  searchClear: {
    padding: 2,
  },
  searchResultsWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F0EC',
    paddingTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#8A857E',
    marginBottom: 8,
    ...brandType.body,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F3F0EC',
  },
  searchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarText: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.semibold,
  },
  searchMeta: {
    flex: 1,
  },
  searchName: {
    fontSize: 14,
    color: '#2D2A26',
    ...brandType.semibold,
  },
  searchActions: {
    minWidth: 92,
    alignItems: 'flex-end',
  },
  primaryButton: {
    backgroundColor: '#C4654A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    ...brandType.semibold,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE9E3',
    backgroundColor: '#F7F5F2',
  },
  secondaryButtonText: {
    fontSize: 12,
    color: '#2D2A26',
    ...brandType.semibold,
  },
  pendingChip: {
    borderRadius: 999,
    backgroundColor: '#F7F5F2',
    borderWidth: 1,
    borderColor: '#EDE9E3',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingChipText: {
    fontSize: 11,
    color: '#8A857E',
    ...brandType.semibold,
  },
  noticeText: {
    marginTop: 8,
    fontSize: 12,
    ...brandType.body,
  },
  noticeError: {
    color: palette.destructive,
  },
  noticeInfo: {
    color: '#8A857E',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  friendsList: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 16,
    ...brand.shadow.card,
  },
  friendsListTitle: {
    fontSize: 37,
    color: '#2D2A26',
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    ...brandType.display,
  },
  friendCard: {
    backgroundColor: '#FFFFFF',
  },
  friendCardRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendMeta: {
    flex: 1,
    minWidth: 0,
  },
  friendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  friendTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    color: '#2D2A26',
    ...brandType.semibold,
  },
  syncBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFE8E7',
  },
  syncBadgeText: {
    fontSize: 11,
    color: '#FF6B63',
    ...brandType.semibold,
  },
  friendRemove: {
    fontSize: 12,
    color: '#C4654A',
    ...brandType.semibold,
  },
  phaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phaseBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseBadgeText: {
    fontSize: 11,
    ...brandType.semibold,
  },
  friendSubtitle: {
    fontSize: 12,
    color: '#8A857E',
    marginBottom: 7,
    ...brandType.body,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F3F0EC',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 999,
  },
  scoreValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    color: '#5A564F',
    ...brandType.semibold,
  },
  friendFootRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendStatus: {
    fontSize: 11,
    color: '#8A857E',
    ...brandType.body,
  },
  friendLastActive: {
    fontSize: 11,
    color: '#B5AFA7',
    ...brandType.body,
  },
  friendDivider: {
    height: 1,
    backgroundColor: '#F3F0EC',
    marginHorizontal: 16,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    marginBottom: 14,
    ...brand.shadow.card,
  },
  mutedText: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
  inviteCard: {
    backgroundColor: '#FFF0EB',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteTitle: {
    fontSize: 34,
    color: '#C4654A',
    marginBottom: 2,
    ...brandType.display,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: '#8A857E',
    textAlign: 'center',
    marginBottom: 10,
    ...brandType.body,
  },
  inviteMascot: {
    marginBottom: 8,
  },
  inviteButton: {
    borderRadius: 16,
    backgroundColor: '#C4654A',
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  inviteButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    ...brandType.semibold,
  },
});

export default FriendsScreen;
