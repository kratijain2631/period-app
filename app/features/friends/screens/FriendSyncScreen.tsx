import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  PlatformColor,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchFriendSharing } from '../../../services/supabase/friendSharing';
import { fetchCycleSnapshotByUserId } from '../../../services/supabase/cycleSnapshots';
import { sendBoop } from '../../../services/supabase/boops';
import {
  fetchFriendRecommendations,
  shouldUseFriendRecommendations,
} from '../../../services/supabase/friendRecommendations';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import {
  computeSyncScore,
  createPreviewSnapshots,
  fallbackRecommendations,
  type SyncScoreSummary,
} from '../utils/syncScore';

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
  disabled: iosColor('systemGray4', '#D1D5DB'),
};

const DAY_MS = 24 * 60 * 60 * 1000;

const FriendSyncScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const session = useSessionStore(selectSession);
  const isOnline = useConnectionStore(selectIsOnline);
  const [syncScore, setSyncScore] = useState<SyncScoreSummary | null>(null);
  const [friendSnapshot, setFriendSnapshot] = useState<{ phase?: string | null } | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsMeta, setRecommendationsMeta] = useState<{
    source: 'llm' | 'fallback' | 'stale';
    generatedAt?: string;
  } | null>(null);
  const [selfPhase, setSelfPhase] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [boopStatus, setBoopStatus] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle');
  const progress = useRef(new Animated.Value(0)).current;
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const routeParams = (route as { params?: { friendId?: string; preview?: boolean } }).params;
  const friendId = routeParams?.friendId ?? '';
  const shouldShowPreview = __DEV__ && !!routeParams?.preview;

  const loadSync = useCallback(async () => {
    setLoading(true);
    try {
      if (shouldShowPreview) {
        const { selfSnapshot, friendSnapshot: previewFriend } = createPreviewSnapshots();
        const previewScore = computeSyncScore({
          selfSnapshot,
          friendSnapshot: previewFriend,
        });
        setSyncScore(previewScore);
        setSelfPhase(selfSnapshot.currentPhase);
        setFriendSnapshot({ phase: previewFriend.currentPhase });
        setRecommendations(
          fallbackRecommendations({
            selfPhase: selfSnapshot.currentPhase,
            friendPhase: previewFriend.currentPhase,
            score: previewScore.score,
          }),
        );
        setRecommendationsMeta({ source: 'fallback' });
        setHasConsent(true);
        return;
      }

      if (!friendId) {
        setHasConsent(null);
        setSyncScore(null);
        setRecommendations([]);
        setRecommendationsMeta(null);
        setFriendSnapshot(null);
        setSelfPhase(null);
        return;
      }

      if (!session?.userId) {
        setHasConsent(false);
        setSyncScore(null);
        setRecommendations([]);
        setRecommendationsMeta(null);
        setFriendSnapshot(null);
        setSelfPhase(null);
        return;
      }

      const [sharingRows, friendSnapshotRow, selfSnapshotRow, recRow] = await Promise.all([
        fetchFriendSharing(),
        fetchCycleSnapshotByUserId(friendId).catch(() => null),
        fetchCycleSnapshotByUserId(session.userId).catch(() => null),
        fetchFriendRecommendations(friendId).catch(() => null),
      ]);
      const hasFreshRecommendations = shouldUseFriendRecommendations({ row: recRow });
      const recommendationMeta =
        hasFreshRecommendations && recRow
          ? { source: 'llm' as const, generatedAt: recRow.generated_at }
          : recRow
            ? { source: 'stale' as const }
            : { source: 'fallback' as const };

      const hasLocal = sharingRows.some(
        (row) => row.user_id === session.userId && row.friend_id === friendId && row.has_shared,
      );
      const hasRemote = sharingRows.some(
        (row) => row.user_id === friendId && row.friend_id === session.userId && row.has_shared,
      );
      const hasBoth = hasLocal && hasRemote;
      setHasConsent(hasBoth);

      if (!hasBoth) {
        setSyncScore(null);
        setRecommendations([]);
        setRecommendationsMeta(null);
        setFriendSnapshot(friendSnapshotRow ? { phase: friendSnapshotRow.snapshot?.currentPhase } : null);
        setSelfPhase(selfSnapshotRow?.snapshot?.currentPhase ?? null);
        return;
      }

      const selfSnapshot = selfSnapshotRow?.snapshot;
      const friendSnapshotValue = friendSnapshotRow?.snapshot;

      if (selfSnapshot && friendSnapshotValue) {
        const computed = computeSyncScore({
          selfSnapshot,
          friendSnapshot: friendSnapshotValue,
        });
        setSyncScore(computed);
        setSelfPhase(selfSnapshot.currentPhase ?? null);
        setFriendSnapshot({ phase: friendSnapshotValue.currentPhase });
        const fallback = fallbackRecommendations({
          selfPhase: selfSnapshot.currentPhase ?? 'unknown',
          friendPhase: friendSnapshotValue.currentPhase ?? 'unknown',
          score: computed.score,
        });
        const nextRecommendations = hasFreshRecommendations && recRow ? recRow.recommendations : fallback;
        setRecommendations(nextRecommendations);
        setRecommendationsMeta(recommendationMeta);
      } else {
        setSyncScore(null);
        setSelfPhase(selfSnapshot?.currentPhase ?? null);
        setFriendSnapshot(friendSnapshotValue ? { phase: friendSnapshotValue.currentPhase } : null);
        const fallback = fallbackRecommendations({
          selfPhase: selfSnapshot?.currentPhase ?? 'unknown',
          friendPhase: friendSnapshotValue?.currentPhase ?? 'unknown',
          score: 60,
        });
        const nextRecommendations = hasFreshRecommendations && recRow ? recRow.recommendations : fallback;
        setRecommendations(nextRecommendations);
        setRecommendationsMeta(recommendationMeta);
      }
    } catch (error) {
      console.warn('[friend-sync] Failed to load sync data', error);
      setHasConsent(false);
    } finally {
      setLoading(false);
    }
  }, [friendId, session?.userId, shouldShowPreview]);

  useEffect(() => {
    loadSync();
  }, [loadSync]);

  const cycleTrend = useMemo(() => syncScore?.cycleTrend ?? [], [syncScore]);
  const highlightItems = useMemo(() => syncScore?.highlights ?? [], [syncScore]);

  const handleBoop = useCallback(async () => {
    if (!friendId || boopStatus === 'sending') {
      return;
    }
    setBoopStatus('sending');
    try {
      const result = await sendBoop({ toUserId: friendId });
      setBoopStatus(result.status === 'queued' ? 'queued' : 'sent');
    } catch (error) {
      console.warn('[friend-sync] Failed to send boop', error);
      setBoopStatus('idle');
    }
  }, [boopStatus, friendId]);

  const scoreValue = syncScore?.score ?? 0;
  const animatedWidth = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [progress],
  );
  const scoreTone = useMemo(() => {
    if (scoreValue >= 80) {
      return { label: 'High sync', color: '#34C759', background: '#E7F7EC' };
    }
    if (scoreValue >= 60) {
      return { label: 'Aligned', color: '#007AFF', background: '#E6F0FF' };
    }
    if (scoreValue >= 40) {
      return { label: 'Mixed', color: '#FF9500', background: '#FFF3E0' };
    }
    return { label: 'Needs care', color: '#FF3B30', background: '#FFE8E7' };
  }, [scoreValue]);
  const phaseTone = useMemo(() => {
    const phase = (selfPhase ?? 'unknown').toLowerCase();
    switch (phase) {
      case 'menstruation':
        return {
          label: 'You',
          color: '#FF3B30',
          background: '#FFECEC',
          icon: 'water-outline' as const,
        };
      case 'follicular':
        return {
          label: 'You',
          color: '#34C759',
          background: '#E6F7ED',
          icon: 'leaf-outline' as const,
        };
      case 'ovulation':
        return {
          label: 'You',
          color: '#FF9500',
          background: '#FFF3E0',
          icon: 'sparkles' as const,
        };
      case 'luteal':
        return {
          label: 'You',
          color: '#AF52DE',
          background: '#F4E8FA',
          icon: 'moon-outline' as const,
        };
      case 'pms':
        return {
          label: 'You',
          color: '#FF2D55',
          background: '#FFE5EC',
          icon: 'cloud-outline' as const,
        };
      default:
        return {
          label: 'You',
          color: '#8E8E93',
          background: '#F2F2F7',
          icon: 'help-circle-outline' as const,
        };
    }
  }, [selfPhase]);
  const friendPhaseTone = useMemo(() => {
    const phase = (friendSnapshot?.phase ?? 'unknown').toLowerCase();
    switch (phase) {
      case 'menstruation':
        return {
          label: 'Friend',
          color: '#FF3B30',
          background: '#FFECEC',
          icon: 'water-outline' as const,
        };
      case 'follicular':
        return {
          label: 'Friend',
          color: '#34C759',
          background: '#E6F7ED',
          icon: 'leaf-outline' as const,
        };
      case 'ovulation':
        return {
          label: 'Friend',
          color: '#FF9500',
          background: '#FFF3E0',
          icon: 'sparkles' as const,
        };
      case 'luteal':
        return {
          label: 'Friend',
          color: '#AF52DE',
          background: '#F4E8FA',
          icon: 'moon-outline' as const,
        };
      case 'pms':
        return {
          label: 'Friend',
          color: '#FF2D55',
          background: '#FFE5EC',
          icon: 'cloud-outline' as const,
        };
      default:
        return {
          label: 'Friend',
          color: '#8E8E93',
          background: '#F2F2F7',
          icon: 'help-circle-outline' as const,
        };
    }
  }, [friendSnapshot?.phase]);

  const formatDateRange = useCallback(
    (start: string, end: string) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 'Unknown';
      }
      const [first, second] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
      const formatMonthDay = (date: Date) =>
        date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (first.toDateString() === second.toDateString()) {
        return formatMonthDay(first);
      }
      if (first.getMonth() === second.getMonth() && first.getFullYear() === second.getFullYear()) {
        return `${formatMonthDay(first)}–${second.getDate()}`;
      }
      return `${formatMonthDay(first)}–${formatMonthDay(second)}`;
    },
    [],
  );
  const buildTimelineSegments = useCallback((row: SyncScoreSummary['cycleTrend'][number]) => {
    const selfStart = new Date(row.selfStart).getTime();
    const selfEnd = new Date(row.selfEnd).getTime();
    const friendStart = new Date(row.friendStart).getTime();
    const friendEnd = new Date(row.friendEnd).getTime();

    if ([selfStart, selfEnd, friendStart, friendEnd].some((value) => Number.isNaN(value))) {
      return null;
    }

    const spanStart = Math.min(selfStart, friendStart);
    const spanEnd = Math.max(selfEnd, friendEnd);
    const spanDays = Math.max(1, Math.round((spanEnd - spanStart) / DAY_MS) + 1);

    const toSegment = (startValue: number, endValue: number) => {
      const safeStart = Math.min(startValue, endValue);
      const safeEnd = Math.max(startValue, endValue);
      const offsetDays = Math.max(0, Math.round((safeStart - spanStart) / DAY_MS));
      const durationDays = Math.max(1, Math.round((safeEnd - safeStart) / DAY_MS) + 1);
      return {
        left: `${(offsetDays / spanDays) * 100}%`,
        width: `${(durationDays / spanDays) * 100}%`,
      };
    };

    const overlapStart = Math.max(selfStart, friendStart);
    const overlapEnd = Math.min(selfEnd, friendEnd);
    const overlap =
      overlapEnd >= overlapStart ? toSegment(overlapStart, overlapEnd) : null;

    return {
      self: toSegment(selfStart, selfEnd),
      friend: toSegment(friendStart, friendEnd),
      overlap,
    };
  }, []);
  const recommendationNote = recommendationsMeta?.generatedAt
    ? `Updated ${new Date(recommendationsMeta.generatedAt).toLocaleDateString()}`
    : recommendationsMeta?.source === 'stale'
      ? 'Recommendations stale, showing fallback'
    : recommendationsMeta?.source === 'fallback'
      ? 'Fallback suggestions'
      : 'Awaiting recommendations';
  const isBoopDisabled = !friendId || boopStatus === 'sending';

  useEffect(() => {
    if (!syncScore) {
      progress.setValue(0);
      animatedScore.setValue(0);
      setDisplayScore(0);
      return;
    }
    const listenerId = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    Animated.parallel([
      Animated.timing(progress, {
        toValue: scoreValue / 100,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedScore, {
        toValue: scoreValue,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    return () => {
      animatedScore.removeListener(listenerId);
    };
  }, [progress, scoreValue, syncScore]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-back" size={20} color={palette.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {!friendId && !shouldShowPreview ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Select a Friend</Text>
            <Text style={styles.noticeText}>
              Pick someone from your feed or friends list to view Friend Sync.
            </Text>
          </View>
        ) : hasConsent === false ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Consent Needed</Text>
            <Text style={styles.noticeText}>
              Friend Sync unlocks once both of you approve sharing.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>Compatibility</Text>
              </View>
              {syncScore ? (
                <>
                  <Text style={styles.heroScore}>{displayScore}%</Text>
                  <View style={styles.scoreBar}>
                    <Animated.View
                      style={[
                        styles.scoreFill,
                        { width: animatedWidth, backgroundColor: scoreTone.color },
                      ]}
                    />
                    <View style={styles.scoreTicks}>
                      <View style={[styles.scoreTick, { left: '33%' }]} />
                      <View style={[styles.scoreTick, { left: '66%' }]} />
                    </View>
                  </View>
                  <View style={styles.scoreMetaRow}>
                    <Text style={styles.heroLabel}>Cycle alignment</Text>
                    <View style={[styles.scorePill, { backgroundColor: scoreTone.background }]}>
                      <Text style={[styles.scorePillText, { color: scoreTone.color }]}>
                        {scoreTone.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scoreHint}>Based on phase alignment, timing, and overlap.</Text>
                  <View style={styles.phaseRow}>
                    <View style={[styles.phaseChip, { backgroundColor: phaseTone.background }]}>
                      <Ionicons name={phaseTone.icon as never} size={12} color={phaseTone.color} />
                      <Text style={[styles.phaseChipLabel, { color: phaseTone.color }]}>
                        You: {selfPhase ?? 'unknown'}
                      </Text>
                    </View>
                    <View style={[styles.phaseChip, { backgroundColor: friendPhaseTone.background }]}>
                      <Ionicons
                        name={friendPhaseTone.icon as never}
                        size={12}
                        color={friendPhaseTone.color}
                      />
                      <Text style={[styles.phaseChipLabel, { color: friendPhaseTone.color }]}>
                        Friend: {friendSnapshot?.phase ?? 'unknown'}
                      </Text>
                    </View>
                  </View>
                  {isLoading ? <Text style={styles.scoreStatus}>Updating from latest sync...</Text> : null}
                </>
              ) : (
                <Text style={styles.mutedText}>
                  {isLoading ? 'Loading sync insights...' : 'Not enough shared cycle data yet.'}
                </Text>
              )}
            </View>

            {syncScore ? (
              <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Match Highlights</Text>
                <Text style={styles.sectionSubtitle}>Key signals driving the score.</Text>
                {highlightItems.map((item, index) => {
                  const highlightTone = item.tone ?? {
                    color: scoreTone.color,
                    background: scoreTone.background,
                  };
                  return (
                    <View
                      key={`${item.label}-${index}`}
                      style={[styles.groupRow, index > 0 ? styles.groupRowDivider : null]}
                    >
                      <View style={styles.highlightText}>
                        <View style={styles.highlightIconRow}>
                          {item.icon ? (
                            <View
                              style={[
                                styles.highlightIcon,
                                { backgroundColor: highlightTone.background },
                              ]}
                            >
                              <Ionicons name={item.icon as never} size={12} color={highlightTone.color} />
                            </View>
                          ) : null}
                          <Text style={styles.highlightLabel}>{item.label}</Text>
                        </View>
                        {item.detail && item.kind !== 'phase' ? (
                          <Text style={styles.highlightDetail}>{item.detail}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.highlightValue}>{item.value}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {syncScore ? (
              <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Cycle Overlap</Text>
                <Text style={styles.sectionSubtitle}>How your cycles have lined up recently.</Text>
                {cycleTrend.length === 0 ? (
                  <Text style={styles.mutedText}>Not enough cycle history yet.</Text>
                ) : (
                  cycleTrend.map((row, index) => {
                    const segments = buildTimelineSegments(row);
                    const trendLabel =
                      row.trend === 'closer' ? 'Closer' : row.trend === 'further' ? 'Further' : 'Steady';
                    const trendTone =
                      row.trend === 'closer'
                        ? { color: '#34C759', background: '#E7F7EC', icon: 'arrow-down' as const }
                        : row.trend === 'further'
                          ? { color: '#FF3B30', background: '#FFE8E7', icon: 'arrow-up' as const }
                          : { color: palette.secondaryText, background: palette.mutedFill, icon: 'remove' as const };
                    return (
                      <View
                        key={`${row.label}-${index}`}
                        style={[styles.cycleRow, index > 0 ? styles.groupRowDivider : null]}
                      >
                        <View style={styles.cycleHeaderRow}>
                          <View style={styles.cycleMeta}>
                            <Text style={styles.cycleLabel}>{row.label}</Text>
                            <Text style={styles.cycleDates}>
                              You {formatDateRange(row.selfStart, row.selfEnd)} · Friend{' '}
                              {formatDateRange(row.friendStart, row.friendEnd)}
                            </Text>
                          </View>
                          {row.trend !== 'unknown' ? (
                            <View
                              style={[
                                styles.cycleTrendBadge,
                                { backgroundColor: trendTone.background },
                              ]}
                            >
                              <Ionicons name={trendTone.icon} size={12} color={trendTone.color} />
                              <Text style={[styles.cycleTrendBadgeText, { color: trendTone.color }]}>
                                {trendLabel}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {segments ? (
                          <View style={styles.cycleTimeline}>
                            <View style={styles.cycleTimelineRow}>
                              <View style={styles.cycleTimelineLabel}>
                                <Ionicons name={phaseTone.icon as never} size={12} color={phaseTone.color} />
                                <Text style={styles.cycleTimelineLabelText}>You</Text>
                              </View>
                              <View style={styles.cycleTrack}>
                                <View
                                  style={[
                                    styles.cycleBar,
                                    {
                                      left: segments.self.left,
                                      width: segments.self.width,
                                      backgroundColor: phaseTone.color,
                                    },
                                  ]}
                                />
                                {segments.overlap ? (
                                  <View
                                    style={[
                                      styles.cycleOverlap,
                                      {
                                        left: segments.overlap.left,
                                        width: segments.overlap.width,
                                        backgroundColor: scoreTone.color,
                                        borderColor: scoreTone.color,
                                      },
                                    ]}
                                  />
                                ) : null}
                              </View>
                            </View>
                            <View style={styles.cycleTimelineRow}>
                              <View style={styles.cycleTimelineLabel}>
                                <Ionicons
                                  name={friendPhaseTone.icon as never}
                                  size={12}
                                  color={friendPhaseTone.color}
                                />
                                <Text style={styles.cycleTimelineLabelText}>Friend</Text>
                              </View>
                              <View style={styles.cycleTrack}>
                                <View
                                  style={[
                                    styles.cycleBar,
                                    {
                                      left: segments.friend.left,
                                      width: segments.friend.width,
                                      backgroundColor: friendPhaseTone.color,
                                    },
                                  ]}
                                />
                                {segments.overlap ? (
                                  <View
                                    style={[
                                      styles.cycleOverlap,
                                      {
                                        left: segments.overlap.left,
                                        width: segments.overlap.width,
                                        backgroundColor: scoreTone.color,
                                        borderColor: scoreTone.color,
                                      },
                                    ]}
                                  />
                                ) : null}
                              </View>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.mutedText}>Timeline unavailable.</Text>
                        )}
                        <View style={styles.cycleTagRow}>
                          <View style={styles.cycleTag}>
                            <Ionicons name="time-outline" size={12} color={palette.secondaryText} />
                            <Text style={styles.cycleTagText}>
                              {row.daysApart === null ? 'Gap unknown' : `${row.daysApart}d apart`}
                            </Text>
                          </View>
                          <View style={styles.cycleTag}>
                            <Ionicons name="link-outline" size={12} color={palette.secondaryText} />
                            <Text style={styles.cycleTagText}>
                              {row.overlapDays} overlap day{row.overlapDays === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}

            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Recommendations</Text>
              <Text style={styles.sectionSubtitle}>{recommendationNote}</Text>
              {recommendations.length > 0 ? (
                <View style={styles.recommendationList}>
                  {recommendations.map((item) => (
                    <View key={item} style={styles.recommendationRow}>
                      <View style={styles.recommendationDot} />
                      <Text style={styles.recommendationText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>No recommendations yet.</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryButton, isBoopDisabled ? styles.primaryButtonDisabled : null]}
                onPress={handleBoop}
                disabled={isBoopDisabled}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>
                  {!friendId
                    ? 'Boop unavailable in preview'
                    : boopStatus === 'sent'
                      ? 'Boop sent'
                      : boopStatus === 'queued'
                        ? 'Boop queued'
                        : boopStatus === 'sending'
                          ? 'Sending...'
                          : 'Send boop'}
                </Text>
              </TouchableOpacity>
              {!isOnline ? (
                <Text style={styles.offlineNote}>Offline: boops will queue until you're back online.</Text>
              ) : null}
            </View>
          </>
        )}
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
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
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
  mutedText: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  noticeCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  noticeText: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  heroCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.secondaryText,
    letterSpacing: 0.2,
  },
  heroScore: {
    fontSize: 44,
    fontWeight: '700',
    color: palette.primaryText,
  },
  heroLabel: {
    fontSize: 13,
    color: palette.secondaryText,
    fontWeight: '500',
  },
  scoreHint: {
    fontSize: 12,
    color: palette.tertiaryText,
    marginTop: 2,
    lineHeight: 16,
  },
  phaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  phaseChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  groupCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  groupRowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.separator,
    paddingTop: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.fill,
    overflow: 'hidden',
  },
  scoreTicks: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scoreTick: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: palette.separator,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  scoreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreStatus: {
    fontSize: 11,
    color: palette.tertiaryText,
  },
  highlightText: {
    flex: 1,
    paddingRight: 12,
  },
  highlightIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryText,
  },
  highlightDetail: {
    fontSize: 12,
    color: palette.secondaryText,
    lineHeight: 16,
  },
  highlightValue: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primaryText,
    marginTop: 2,
  },
  recommendationList: {
    gap: 8,
    marginTop: 4,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.tertiaryText,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  recommendationText: {
    fontSize: 13,
    color: palette.primaryText,
    lineHeight: 18,
    flex: 1,
    flexShrink: 1,
  },
  cycleRow: {
    gap: 8,
    paddingVertical: 10,
  },
  cycleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cycleMeta: {
    flex: 1,
  },
  cycleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryText,
  },
  cycleDates: {
    fontSize: 12,
    color: palette.secondaryText,
    marginTop: 2,
  },
  cycleTimeline: {
    marginTop: 8,
    gap: 8,
  },
  cycleTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cycleTimelineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 64,
  },
  cycleTimelineLabelText: {
    fontSize: 11,
    color: palette.secondaryText,
    fontWeight: '600',
  },
  cycleTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
    position: 'relative',
    overflow: 'hidden',
  },
  cycleBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
    zIndex: 1,
  },
  cycleOverlap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
    opacity: 0.18,
    borderWidth: 1,
    zIndex: 2,
  },
  cycleTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  cycleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
  },
  cycleTagText: {
    fontSize: 11,
    color: palette.secondaryText,
    fontWeight: '500',
  },
  cycleTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cycleTrendBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: palette.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  primaryButtonDisabled: {
    backgroundColor: palette.disabled,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  offlineNote: {
    fontSize: 12,
    color: palette.secondaryText,
  },
});

export default FriendSyncScreen;
