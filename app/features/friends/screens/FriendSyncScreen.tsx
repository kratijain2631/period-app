import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { fetchFriendProfiles, fetchFriendSharing } from '../../../services/supabase/friendSharing';
import { fetchUserProfilesByIds } from '../../../services/supabase/users';
import { fetchCycleSnapshotByUserId } from '../../../services/supabase/cycleSnapshots';
import { sendBoop } from '../../../services/supabase/boops';
import { fetchFriendRecommendations } from '../../../services/supabase/friendRecommendations';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import {
  computeSyncScore,
  createPreviewSnapshots,
  fallbackRecommendations,
  type SyncScoreSummary,
} from '../utils/syncScore';
import { brand, brandType } from '../../../theme/brand';
import { SyncRings, getPhaseColor } from '../../../components/brand/CycleRing';
import { DottieSyncScene } from '../../../components/brand/DottieMascot';
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
  disabled: brand.colors.disabled,
  white: brand.colors.white,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const FlowGapSparkline = ({
  data,
  color,
  width = 130,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (data.length < 2) {
    return null;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * usableW,
    y: padding + usableH - ((value - min) / range) * usableH,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
  const gradientId = `sync-gap-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path d={linePath} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.8} fill={color} />
    </Svg>
  );
};

const FriendSyncScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const session = useSessionStore(selectSession);
  const isOnline = useConnectionStore(selectIsOnline);
  const [syncScore, setSyncScore] = useState<SyncScoreSummary | null>(null);
  const [friendSnapshot, setFriendSnapshot] = useState<{ phase?: string | null } | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsMeta, setRecommendationsMeta] = useState<{
    source: 'llm' | 'fallback';
    generatedAt?: string;
  } | null>(null);
  const [selfPhase, setSelfPhase] = useState<string | null>(null);
  const [friendAlias, setFriendAlias] = useState<string | null>(null);
  const [selfAvatarUrl, setSelfAvatarUrl] = useState<string | null>(null);
  const [friendAvatarUrl, setFriendAvatarUrl] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [boopStatus, setBoopStatus] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle');
  const progress = useRef(new Animated.Value(0)).current;
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const routeParams = (route as { params?: { friendId?: string; preview?: boolean } }).params;
  const friendId = routeParams?.friendId ?? '';
  const shouldShowPreview = __DEV__ && !!routeParams?.preview;
  const viewportWidth = Dimensions.get('window').width;

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
        setFriendAlias('nehaha');
        setSelfAvatarUrl(null);
        setFriendAvatarUrl(null);
        setHasConsent(true);
        return;
      }

      if (!friendId) {
        setHasConsent(null);
        setSyncScore(null);
        setRecommendations([]);
        setRecommendationsMeta(null);
        setFriendSnapshot(null);
        setFriendAlias(null);
        setSelfAvatarUrl(null);
        setFriendAvatarUrl(null);
        setSelfPhase(null);
        return;
      }

      if (!session?.userId) {
        setHasConsent(false);
        setSyncScore(null);
        setRecommendations([]);
        setRecommendationsMeta(null);
        setFriendSnapshot(null);
        setFriendAlias(null);
        setSelfAvatarUrl(null);
        setFriendAvatarUrl(null);
        setSelfPhase(null);
        return;
      }

      const [sharingRows, friendSnapshotRow, selfSnapshotRow, recRow, friendProfileRows, userProfiles] =
        await Promise.all([
        fetchFriendSharing(),
        fetchCycleSnapshotByUserId(friendId).catch(() => null),
        fetchCycleSnapshotByUserId(session.userId).catch(() => null),
        fetchFriendRecommendations(friendId).catch(() => null),
        fetchFriendProfiles([friendId]).catch(() => []),
        fetchUserProfilesByIds([session.userId, friendId]).catch(() => []),
      ]);
      const friendProfile = userProfiles.find((profile) => profile.id === friendId);
      const selfProfile = userProfiles.find((profile) => profile.id === session.userId);
      setSelfAvatarUrl(selfProfile?.avatar_url ?? null);
      setFriendAvatarUrl(friendProfile?.avatar_url ?? null);
      const rawAlias =
        friendProfileRows[0]?.alias?.trim() ??
        friendProfile?.alias?.trim() ??
        friendProfile?.full_name?.trim() ??
        null;
      setFriendAlias(rawAlias ? rawAlias.replace(/^@/, '') : null);

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
        const nextRecommendations =
          recRow?.recommendations && recRow.recommendations.length > 0
            ? recRow.recommendations
            : fallback;
        setRecommendations(nextRecommendations);
        setRecommendationsMeta(
          recRow
            ? { source: 'llm', generatedAt: recRow.generated_at }
            : { source: 'fallback' },
        );
      } else {
        setSyncScore(null);
        setSelfPhase(selfSnapshot?.currentPhase ?? null);
        setFriendSnapshot(friendSnapshotValue ? { phase: friendSnapshotValue.currentPhase } : null);
        const fallback = fallbackRecommendations({
          selfPhase: selfSnapshot?.currentPhase ?? 'unknown',
          friendPhase: friendSnapshotValue?.currentPhase ?? 'unknown',
          score: 60,
        });
        const nextRecommendations =
          recRow?.recommendations && recRow.recommendations.length > 0
            ? recRow.recommendations
            : fallback;
        setRecommendations(nextRecommendations);
        setRecommendationsMeta(
          recRow
            ? { source: 'llm', generatedAt: recRow.generated_at }
            : { source: 'fallback' },
        );
      }
    } catch (error) {
      console.warn('[friend-sync] Failed to load sync data', error);
      setFriendAlias(null);
      setSelfAvatarUrl(null);
      setFriendAvatarUrl(null);
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
      return { label: 'High sync', color: '#7BA68F', background: '#EDF5F0' };
    }
    if (scoreValue >= 60) {
      return { label: 'Aligned', color: '#6B8DB5', background: '#EEF3F8' };
    }
    if (scoreValue >= 40) {
      return { label: 'Mixed', color: '#D4A252', background: '#FFF8ED' };
    }
    return { label: 'Needs care', color: '#C4654A', background: '#FFF0EB' };
  }, [scoreValue]);
  const phaseTone = useMemo(() => {
    const phase = (selfPhase ?? 'unknown').toLowerCase();
    switch (phase) {
      case 'menstruation':
        return {
          label: 'You',
          phaseLabel: 'Menstruation',
          color: '#C4654A',
          background: '#FFF0EB',
          icon: 'water-outline' as const,
        };
      case 'follicular':
        return {
          label: 'You',
          phaseLabel: 'Follicular',
          color: '#7BA68F',
          background: '#EDF5F0',
          icon: 'leaf-outline' as const,
        };
      case 'ovulation':
        return {
          label: 'You',
          phaseLabel: 'Ovulation',
          color: '#D4A252',
          background: '#FFF8ED',
          icon: 'sparkles' as const,
        };
      case 'luteal':
        return {
          label: 'You',
          phaseLabel: 'Luteal',
          color: '#6B8DB5',
          background: '#EEF3F8',
          icon: 'moon-outline' as const,
        };
      case 'pms':
        return {
          label: 'You',
          phaseLabel: 'PMS',
          color: '#B56E9D',
          background: '#F8EAF2',
          icon: 'cloud-outline' as const,
        };
      default:
        return {
          label: 'You',
          phaseLabel: 'Unknown',
          color: '#8A857E',
          background: '#F3F0EC',
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
          phaseLabel: 'Menstruation',
          color: '#C4654A',
          background: '#FFF0EB',
          icon: 'water-outline' as const,
        };
      case 'follicular':
        return {
          label: 'Friend',
          phaseLabel: 'Follicular',
          color: '#7BA68F',
          background: '#EDF5F0',
          icon: 'leaf-outline' as const,
        };
      case 'ovulation':
        return {
          label: 'Friend',
          phaseLabel: 'Ovulation',
          color: '#D4A252',
          background: '#FFF8ED',
          icon: 'sparkles' as const,
        };
      case 'luteal':
        return {
          label: 'Friend',
          phaseLabel: 'Luteal',
          color: '#6B8DB5',
          background: '#EEF3F8',
          icon: 'moon-outline' as const,
        };
      case 'pms':
        return {
          label: 'Friend',
          phaseLabel: 'PMS',
          color: '#B56E9D',
          background: '#F8EAF2',
          icon: 'cloud-outline' as const,
        };
      default:
        return {
          label: 'Friend',
          phaseLabel: 'Unknown',
          color: '#8A857E',
          background: '#F3F0EC',
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
        left: (offsetDays / spanDays) * 100,
        width: (durationDays / spanDays) * 100,
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

  const displayFriendName = useMemo(() => {
    if (friendAlias) {
      return friendAlias;
    }
    if (!friendId) {
      return 'friend';
    }
    if (friendId.length > 14) {
      return `${friendId.slice(0, 6)}...`;
    }
    return friendId;
  }, [friendAlias, friendId]);

  const latestGapDays = syncScore?.metrics.daysApart ?? null;
  const overlapDays = syncScore?.metrics.overlapDays ?? 0;
  const flowGapHistory = useMemo(() => {
    const values = cycleTrend
      .slice(-6)
      .map((row) => row.daysApart)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length >= 2) {
      return values;
    }
    if (values.length === 1) {
      return [values[0], values[0]];
    }
    return [12, 28, 45, 52, 65, 69];
  }, [cycleTrend]);
  const flowGapColor = useMemo(() => {
    const latestTrend = cycleTrend[cycleTrend.length - 1]?.trend;
    if (latestTrend === 'closer') {
      return '#7BA68F';
    }
    if (latestTrend === 'further') {
      return '#C4654A';
    }
    return '#6B8DB5';
  }, [cycleTrend]);
  const yourRingDay = 18;
  const friendRingDay = useMemo(() => {
    if (latestGapDays === null) {
      return 8;
    }
    const offset = Math.max(1, Math.min(27, latestGapDays % 28));
    return Math.max(1, Math.min(28, yourRingDay - offset));
  }, [latestGapDays]);
  const entranceStyles = useStaggeredEntrance(3, {
    initialDelay: 40,
    stagger: 90,
    distance: 14,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {!friendId && !shouldShowPreview ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Select a Friend</Text>
            <Text style={styles.noticeText}>Pick someone from your circle to open Friend Sync.</Text>
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
            <Animated.View style={entranceStyles[0]}>
              <View style={styles.sceneHeader}>
              <View style={styles.sceneArtworkBleed}>
                <DottieSyncScene
                  width={viewportWidth + 40}
                  height={258}
                  color1={getPhaseColor(selfPhase)}
                  color2={getPhaseColor(friendSnapshot?.phase)}
                />
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="chevron-back" size={20} color="#5A564F" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.sceneTitleWrap}>
                <Text style={styles.sceneSubtitle}>Sync with</Text>
                <Text style={styles.sceneTitle}>{displayFriendName}</Text>
              </View>
              </View>
            </Animated.View>

            <Animated.View style={entranceStyles[1]}>
              <View style={styles.ringsWrap}>
                <View style={styles.ringCard}>
                  <SyncRings
                    yourDay={yourRingDay}
                    yourPhase={selfPhase}
                    theirDay={friendRingDay}
                    theirPhase={friendSnapshot?.phase}
                    syncPercent={displayScore}
                    yourInitial="Y"
                    friendInitial={(displayFriendName[0] ?? 'F').toUpperCase()}
                    yourAvatarUrl={selfAvatarUrl}
                    friendAvatarUrl={friendAvatarUrl}
                    size={170}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View style={entranceStyles[2]}>
              <View style={styles.bodyContent}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statEyebrow}>Flow Gap</Text>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>{latestGapDays ?? '--'}</Text>
                    <Text style={styles.statSuffix}>days</Text>
                  </View>
                  <View style={styles.sparklineWrap}>
                    <FlowGapSparkline data={flowGapHistory} color={flowGapColor} width={130} height={32} />
                  </View>
                  <Text style={styles.statNote}>Last cycles</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statEyebrow}>Overlap</Text>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>{overlapDays}</Text>
                    <Text style={styles.statSuffix}>shared days</Text>
                  </View>
                  <View style={styles.overlapSegments}>
                    {[...Array(5)].map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.overlapSegment,
                          index < overlapDays
                            ? { backgroundColor: scoreTone.color, opacity: 0.7 }
                            : null,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.statNote}>of last 5 days</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Match Highlights</Text>
              <View style={styles.groupCard}>
                <View style={styles.highlightRow}>
                  <View style={styles.highlightLabelRow}>
                    <Text style={styles.highlightEmoji}>🌊</Text>
                    <Text style={styles.highlightLabel}>Your phase</Text>
                  </View>
                  <View style={[styles.phaseBadge, { backgroundColor: `${phaseTone.color}14` }]}>
                    <View style={[styles.phaseBadgeDot, { backgroundColor: phaseTone.color }]} />
                    <Text style={[styles.phaseBadgeText, { color: phaseTone.color }]}>
                      {phaseTone.phaseLabel}
                    </Text>
                  </View>
                </View>
                <View style={[styles.highlightRow, styles.rowDivider]}>
                  <View style={styles.highlightLabelRow}>
                    <Text style={styles.highlightEmoji}>🌱</Text>
                    <Text style={styles.highlightLabel}>Their phase</Text>
                  </View>
                  <View style={[styles.phaseBadge, { backgroundColor: `${friendPhaseTone.color}14` }]}>
                    <View style={[styles.phaseBadgeDot, { backgroundColor: friendPhaseTone.color }]} />
                    <Text style={[styles.phaseBadgeText, { color: friendPhaseTone.color }]}>
                      {friendPhaseTone.phaseLabel}
                    </Text>
                  </View>
                </View>
                <View style={[styles.highlightRow, styles.rowDivider]}>
                  <View style={styles.highlightLabelRow}>
                    <Text style={styles.highlightEmoji}>🕐</Text>
                    <Text style={styles.highlightLabel}>Flow timing</Text>
                  </View>
                  <Text style={styles.highlightValue}>
                    {latestGapDays === null ? 'Unknown' : `${latestGapDays} days apart`}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Cycle History</Text>
              <Text style={styles.sectionSub}>How your cycles have aligned</Text>
              <View style={styles.historyList}>
                {cycleTrend.length === 0 ? (
                  <View style={styles.groupCard}>
                    <Text style={styles.mutedText}>Not enough cycle history yet.</Text>
                  </View>
                ) : (
                  cycleTrend.map((row, index) => {
                    const segments = buildTimelineSegments(row);
                    return (
                      <View key={`${row.label}-${index}`} style={styles.historyCard}>
                        <Text style={styles.historyTitle}>{row.label}</Text>

                        {segments ? (
                          <View style={styles.historyTracks}>
                            <View style={styles.historyTrackRow}>
                              <Text style={styles.historyTrackLabel}>You</Text>
                              <View style={styles.historyTrack}>
                                <View
                                  style={[
                                    styles.historyFill,
                                    {
                                      left: `${segments.self.left}%`,
                                      width: `${segments.self.width}%`,
                                      backgroundColor: phaseTone.color,
                                    },
                                  ]}
                                />
                                {segments.overlap ? (
                                  <View
                                    style={[
                                      styles.historyOverlap,
                                      {
                                        left: `${segments.overlap.left}%`,
                                        width: `${segments.overlap.width}%`,
                                        borderColor: scoreTone.color,
                                        backgroundColor: scoreTone.color,
                                      },
                                    ]}
                                  />
                                ) : null}
                              </View>
                              <Text style={styles.historyDate}>{formatDateRange(row.selfStart, row.selfEnd)}</Text>
                            </View>

                            <View style={styles.historyTrackRow}>
                              <Text style={styles.historyTrackLabel}>Them</Text>
                              <View style={styles.historyTrack}>
                                <View
                                  style={[
                                    styles.historyFill,
                                    {
                                      left: `${segments.friend.left}%`,
                                      width: `${segments.friend.width}%`,
                                      backgroundColor: friendPhaseTone.color,
                                    },
                                  ]}
                                />
                                {segments.overlap ? (
                                  <View
                                    style={[
                                      styles.historyOverlap,
                                      {
                                        left: `${segments.overlap.left}%`,
                                        width: `${segments.overlap.width}%`,
                                        borderColor: scoreTone.color,
                                        backgroundColor: scoreTone.color,
                                      },
                                    ]}
                                  />
                                ) : null}
                              </View>
                              <Text style={styles.historyDate}>{formatDateRange(row.friendStart, row.friendEnd)}</Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.mutedText}>Timeline unavailable.</Text>
                        )}

                        <View style={styles.historyMetaRow}>
                          <Text style={styles.historyMetaText}>
                            {row.daysApart === null ? 'Gap unknown' : `${row.daysApart}d apart`}
                          </Text>
                          <Text style={styles.historyMetaText}>{row.overlapDays} overlap</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <Text style={styles.sectionTitle}>Recommendations</Text>
              <View style={styles.recommendationsList}>
                {recommendations.length === 0 ? (
                  <View style={styles.groupCard}>
                    <Text style={styles.mutedText}>No recommendations yet.</Text>
                  </View>
                ) : (
                  recommendations.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.recommendationCard}>
                      <Text style={styles.recommendationIcon}>
                        {index % 3 === 0 ? '🎬' : index % 3 === 1 ? '🍿' : '🌿'}
                      </Text>
                      <Text style={styles.recommendationText}>{item}</Text>
                    </View>
                  ))
                )}
              </View>

              <Text style={styles.recommendationMeta}>{recommendationNote}</Text>

              <TouchableOpacity
                style={[
                  styles.boopButton,
                  boopStatus === 'sent' ? styles.boopButtonSent : null,
                  isBoopDisabled ? styles.boopButtonDisabled : null,
                ]}
                onPress={handleBoop}
                disabled={isBoopDisabled}
              >
                <Ionicons
                  name={boopStatus === 'sent' ? 'checkmark' : 'hand-left'}
                  size={17}
                  color={palette.white}
                />
                <Text style={styles.boopButtonText}>
                  {!friendId
                    ? 'Boop unavailable in preview'
                    : boopStatus === 'sent'
                      ? 'Booped!'
                      : boopStatus === 'queued'
                        ? 'Boop queued'
                        : boopStatus === 'sending'
                          ? 'Sending...'
                  : `Boop ${displayFriendName}`}
                </Text>
              </TouchableOpacity>
              </View>
            </Animated.View>
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
    paddingBottom: 40,
  },
  noticeCard: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
    ...brand.shadow.card,
  },
  noticeTitle: {
    fontSize: 18,
    color: '#2D2A26',
    ...brandType.heading,
  },
  noticeText: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
  sceneHeader: {
    height: 250,
    backgroundColor: '#F0F4F8',
    overflow: 'hidden',
    position: 'relative',
  },
  sceneArtworkBleed: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  backText: {
    fontSize: 14,
    color: '#5A564F',
    ...brandType.semibold,
  },
  sceneTitleWrap: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sceneSubtitle: {
    fontSize: 12,
    color: '#8A857E',
    marginBottom: 1,
    ...brandType.body,
  },
  sceneTitle: {
    fontSize: 26,
    color: '#2D2A26',
    ...brandType.display,
  },
  ringsWrap: {
    paddingHorizontal: 20,
    marginTop: -12,
  },
  ringCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 14,
    ...brand.shadow.card,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...brand.shadow.card,
  },
  statEyebrow: {
    fontSize: 10,
    color: '#8A857E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
    ...brandType.semibold,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    fontSize: 30,
    color: '#2D2A26',
    lineHeight: 32,
    ...brandType.display,
  },
  statSuffix: {
    fontSize: 11,
    color: '#8A857E',
    marginBottom: 4,
    ...brandType.body,
  },
  sparklineWrap: {
    marginTop: 8,
    minHeight: 32,
    justifyContent: 'flex-end',
  },
  statNote: {
    marginTop: 7,
    fontSize: 10,
    color: '#B5AFA7',
    ...brandType.body,
  },
  overlapSegments: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 5,
  },
  overlapSegment: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F0EDE8',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#2D2A26',
    marginBottom: 8,
    ...brandType.heading,
  },
  sectionSub: {
    marginTop: -5,
    marginBottom: 8,
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 18,
    ...brand.shadow.card,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  highlightLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightEmoji: {
    fontSize: 16,
  },
  highlightLabel: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
  highlightValue: {
    fontSize: 13,
    color: '#5A564F',
    ...brandType.semibold,
  },
  phaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F3F0EC',
  },
  historyList: {
    marginBottom: 18,
    gap: 10,
  },
  historyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    padding: 14,
    ...brand.shadow.card,
  },
  historyTitle: {
    fontSize: 13,
    color: '#8A857E',
    marginBottom: 10,
    ...brandType.semibold,
  },
  historyTracks: {
    gap: 8,
    marginBottom: 8,
  },
  historyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTrackLabel: {
    width: 34,
    fontSize: 11,
    color: '#8A857E',
    ...brandType.semibold,
  },
  historyTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F3F0EC',
    overflow: 'hidden',
    position: 'relative',
  },
  historyFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
    opacity: 0.8,
  },
  historyOverlap: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    borderRadius: 999,
    opacity: 0.4,
  },
  historyDate: {
    width: 52,
    textAlign: 'right',
    fontSize: 11,
    color: '#8A857E',
    ...brandType.body,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyMetaText: {
    fontSize: 12,
    color: '#8A857E',
    ...brandType.body,
  },
  recommendationsList: {
    gap: 10,
    marginBottom: 8,
  },
  recommendationCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...brand.shadow.card,
  },
  recommendationIcon: {
    fontSize: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#5A564F',
    lineHeight: 19,
    ...brandType.body,
  },
  recommendationMeta: {
    fontSize: 11,
    color: '#B5AFA7',
    marginBottom: 10,
    ...brandType.body,
  },
  boopButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#D4A252',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    ...brand.shadow.card,
  },
  boopButtonSent: {
    backgroundColor: '#7BA68F',
  },
  boopButtonDisabled: {
    opacity: 0.7,
  },
  boopButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    ...brandType.semibold,
  },
  mutedText: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
});

export default FriendSyncScreen;
