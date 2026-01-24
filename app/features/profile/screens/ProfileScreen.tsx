import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  PlatformColor,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import { fetchCurrentUserProfile } from '../../../services/supabase/users';
import { fetchFriendSharing } from '../../../services/supabase/friendSharing';
import {
  fetchInboundFriendRequests,
  fetchOutboundFriendRequests,
} from '../../../services/supabase/friendRequests';
import {
  fetchCycleGuidance,
  type CycleGuidanceRow,
} from '../../../services/supabase/cycleGuidance';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';

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
  success: iosColor('systemGreen', '#16A34A'),
  warningText: iosColor('systemRed', '#B42318'),
  fill: iosColor('systemGray5', '#E5E7EB'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
};

const ProfileScreen = () => {
  const session = useSessionStore(selectSession);
  const navigation = useNavigation();
  const { snapshot, isStale, lastSyncedAt } = useCycleSnapshot();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [cycleGuidance, setCycleGuidance] = useState<CycleGuidanceRow | null>(null);
  const [cycleGuidanceStatus, setCycleGuidanceStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [friendSummary, setFriendSummary] = useState({
    friendCount: 0,
    inboundCount: 0,
    outboundCount: 0,
  });

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

  const loadFriendSummary = useCallback(async () => {
    try {
      if (!session?.userId) {
        setFriendSummary({ friendCount: 0, inboundCount: 0, outboundCount: 0 });
        return;
      }
      const [sharingRows, inbound, outbound] = await Promise.all([
        fetchFriendSharing(),
        fetchInboundFriendRequests(),
        fetchOutboundFriendRequests(),
      ]);
      const pendingOutbound = outbound.filter((row) => row.status === 'pending');
      const incomingSet = new Set(
        sharingRows
          .filter((row) => row.friend_id === session.userId && row.has_shared)
          .map((row) => row.user_id),
      );
      const mutualCount = sharingRows.filter(
        (row) =>
          row.user_id === session.userId &&
          row.has_shared &&
          incomingSet.has(row.friend_id),
      ).length;
      setFriendSummary({
        friendCount: mutualCount,
        inboundCount: inbound.length,
        outboundCount: pendingOutbound.length,
      });
    } catch (error) {
      console.warn('[profile] Failed to load friend summary', error);
    }
  }, [session?.userId]);

  const loadCycleGuidance = useCallback(async () => {
    if (!session?.userId) {
      setCycleGuidance(null);
      setCycleGuidanceStatus('idle');
      return;
    }
    try {
      setCycleGuidanceStatus('loading');
      const guidance = await fetchCycleGuidance();
      setCycleGuidance(guidance);
      setCycleGuidanceStatus('idle');
    } catch (error) {
      console.warn('[profile] Failed to load cycle guidance', error);
      setCycleGuidance(null);
      setCycleGuidanceStatus('error');
    }
  }, [session?.userId]);

  const formatSyncLabel = (value?: string | null) => {
    if (!value) {
      return 'Not synced yet';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not synced yet';
    }
    const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${datePart} • ${timePart}`;
  };

  const formatPhaseLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const normalized = value.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const shortId = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

  const phasePillPalette: Record<string, string> = {
    menstruation: '#FDECEC',
    follicular: '#ECFDF3',
    ovulation: '#FFF8E1',
    luteal: '#EEF2FF',
    pms: '#FEF3C7',
    unknown: '#F3F4F6',
  };

  const phasePillPaletteText: Record<string, string> = {
    menstruation: '#B42318',
    follicular: '#027A48',
    ovulation: '#B54708',
    luteal: '#3730A3',
    pms: '#92400E',
    unknown: '#6B7280',
  };

  useEffect(() => {
    loadProfile();
    loadFriendSummary();
    loadCycleGuidance();
  }, [loadCycleGuidance, loadFriendSummary, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadFriendSummary();
      loadCycleGuidance();
    }, [loadCycleGuidance, loadFriendSummary]),
  );

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

  const handleManageFriends = useCallback(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Friends' as never);
      return;
    }
    navigation.navigate('Friends' as never);
  }, [navigation]);

  const navigateToFriendSync = useCallback(
    (friendUserId: string) => {
      navigation.navigate('FriendSync' as never, { friendId: friendUserId } as never);
    },
    [navigation],
  );

  const friendSummaryText = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      friendSummary.friendCount === 1
        ? '1 friend'
        : `${friendSummary.friendCount} friends`,
    );
    if (friendSummary.inboundCount > 0) {
      parts.push(
        friendSummary.inboundCount === 1
          ? '1 incoming request'
          : `${friendSummary.inboundCount} incoming requests`,
      );
    }
    if (friendSummary.outboundCount > 0) {
      parts.push(
        friendSummary.outboundCount === 1
          ? '1 outgoing request'
          : `${friendSummary.outboundCount} outgoing requests`,
      );
    }
    return parts.join(' - ');
  }, [friendSummary]);

  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const cyclePhaseLabel = useMemo(
    () => formatPhaseLabel(snapshot?.currentPhase) ?? 'Unknown phase',
    [snapshot?.currentPhase],
  );
  const cycleSyncLabel = useMemo(
    () => formatSyncLabel(lastSyncedAt ?? snapshot?.syncedAt ?? null),
    [lastSyncedAt, snapshot?.syncedAt],
  );
  const cycleMetaLabel = useMemo(() => {
    if (!snapshot) {
      return 'Connect Health';
    }
    if (isStale) {
      return cycleSyncLabel === 'Not synced yet'
        ? 'Needs sync'
        : `Needs sync • ${cycleSyncLabel}`;
    }
    return 'Up to date';
  }, [cycleSyncLabel, isStale, snapshot]);
  const cycleDetailLabel = useMemo(() => {
    if (!snapshot) {
      return 'Connect Health to see your phase.';
    }
    if (isStale) {
      return cycleSyncLabel === 'Not synced yet'
        ? 'Needs sync'
        : `Needs sync • ${cycleSyncLabel}`;
    }
    return cycleSyncLabel === 'Not synced yet' ? 'Synced recently' : `Last synced ${cycleSyncLabel}`;
  }, [cycleSyncLabel, isStale, snapshot]);
  const cycleMetaTone = !snapshot || isStale ? 'stale' : 'fresh';
  const cyclePhaseColors = {
    background: phasePillPalette[cyclePhaseKey] ?? palette.mutedFill,
    text: phasePillPaletteText[cyclePhaseKey] ?? palette.secondaryText,
  };
  const isGuidanceStale = Boolean(cycleGuidance?.phase && cycleGuidance.phase !== cyclePhaseKey);
  const guidanceUpdatedLabel = useMemo(() => {
    if (isGuidanceStale) {
      return 'Refreshing tips';
    }
    if (cycleGuidance?.generated_at) {
      const date = new Date(cycleGuidance.generated_at);
      return Number.isNaN(date.getTime())
        ? 'Updated recently'
        : `Updated ${date.toLocaleDateString()}`;
    }
    return cycleGuidanceStatus === 'loading' ? 'Refreshing tips' : 'No guidance yet';
  }, [cycleGuidance?.generated_at, cycleGuidanceStatus, isGuidanceStale]);
  const phaseDos = cycleGuidance?.dos ?? [];
  const phaseDonts = cycleGuidance?.donts ?? [];
  const friendSuggestions = cycleGuidance?.friend_suggestions ?? [];
  const guidanceEmptyLabel = useMemo(() => {
    if (cycleGuidanceStatus === 'loading') {
      return 'Refreshing your phase guidance.';
    }
    if (!snapshot) {
      return 'Sync Health data to unlock phase guidance.';
    }
    return 'No guidance yet.';
  }, [cycleGuidanceStatus, snapshot]);
  const friendsEmptyLabel = useMemo(() => {
    if (cycleGuidanceStatus === 'loading') {
      return 'Finding friends in similar phases...';
    }
    return 'No similar-phase friends yet.';
  }, [cycleGuidanceStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
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

        <View style={styles.cycleCard}>
          <View style={styles.cycleHeader}>
            <View style={styles.cycleHeaderLeft}>
              <View
                style={[
                  styles.cycleIconBadge,
                  { backgroundColor: cyclePhaseColors.background },
                ]}
              >
                <Ionicons
                  name="pulse-outline"
                  size={16}
                  color={cyclePhaseColors.text}
                />
              </View>
              <View style={styles.cycleHeaderText}>
                <Text style={styles.cycleHeaderLabel}>My cycle</Text>
                <Text style={styles.cycleHeaderValue}>{cyclePhaseLabel}</Text>
              </View>
            </View>
            <Text
              style={[
                styles.cycleHeaderMeta,
                cycleMetaTone === 'stale' ? styles.cycleHeaderMetaStale : null,
              ]}
            >
              {cycleMetaLabel}
            </Text>
          </View>
          <View style={styles.cycleMetaRow}>
            <View
              style={[
                styles.phasePill,
                { backgroundColor: cyclePhaseColors.background },
              ]}
            >
              <Text
                style={[
                  styles.phasePillText,
                  { color: cyclePhaseColors.text },
                ]}
              >
                {cyclePhaseLabel}
              </Text>
            </View>
            <Text style={styles.cycleMetaDetail}>{cycleDetailLabel}</Text>
          </View>
          <View style={styles.cycleSectionHeader}>
            <Text style={styles.sectionTitle}>Phase guide</Text>
            <Text style={styles.sectionHint}>{guidanceUpdatedLabel}</Text>
          </View>
          {phaseDos.length || phaseDonts.length ? (
            <View style={styles.phaseGuideGrid}>
              <View style={styles.phaseGuideColumn}>
                <Text style={styles.phaseGuideLabel}>Do</Text>
                {phaseDos.map((item, index) => (
                  <View key={`do-${index}`} style={styles.phaseGuideRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={palette.success}
                    />
                    <Text style={styles.phaseGuideText}>{item}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.phaseGuideColumn}>
                <Text style={styles.phaseGuideLabel}>Don't</Text>
                {phaseDonts.map((item, index) => (
                  <View key={`dont-${index}`} style={styles.phaseGuideRow}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={palette.warningText}
                    />
                    <Text style={styles.phaseGuideText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.cycleEmptyText}>{guidanceEmptyLabel}</Text>
          )}
          <View style={styles.cycleSectionHeader}>
            <Text style={styles.sectionTitle}>Friends in sync</Text>
            <Text style={styles.sectionHint}>Similar phases</Text>
          </View>
          {friendSuggestions.length ? (
            <View style={styles.friendSuggestionList}>
              {friendSuggestions.map((item, index) => {
                const friendName =
                  item.friend_name ?? `Friend ${shortId(item.friend_id)}`;
                const initial = friendName.trim().slice(0, 1).toUpperCase() || '?';
                return (
                  <TouchableOpacity
                    key={`${item.friend_id}-${index}`}
                    style={styles.friendSuggestionRow}
                    onPress={() => navigateToFriendSync(item.friend_id)}
                    accessibilityLabel={`View sync with ${friendName}`}
                  >
                    <View style={styles.friendSuggestionAvatar}>
                      <Text style={styles.friendSuggestionInitial}>{initial}</Text>
                    </View>
                    <View style={styles.friendSuggestionContent}>
                      <Text style={styles.friendSuggestionName}>{friendName}</Text>
                      <Text style={styles.friendSuggestionText}>{item.suggestion}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={palette.tertiaryText}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.cycleEmptyText}>{friendsEmptyLabel}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends</Text>
          <Text style={styles.cardSubtitle}>{friendSummaryText}</Text>
          <Text style={styles.mutedText}>
            Manage sharing, friend requests, and Friend Sync details.
          </Text>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleManageFriends}
          >
            <Text style={styles.primaryActionText}>Manage Friends</Text>
          </TouchableOpacity>
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
  profileCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.primaryText,
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primaryText,
  },
  profileEmail: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  profileId: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  card: {
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
  cycleCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cycleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cycleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleHeaderText: {
    flex: 1,
    gap: 2,
  },
  cycleHeaderLabel: {
    fontSize: 12,
    color: palette.tertiaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleHeaderValue: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primaryText,
    textTransform: 'capitalize',
  },
  cycleHeaderMeta: {
    fontSize: 12,
    color: palette.secondaryText,
    textAlign: 'right',
  },
  cycleHeaderMetaStale: {
    color: palette.warningText,
  },
  cycleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phasePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cycleMetaDetail: {
    fontSize: 12,
    color: palette.secondaryText,
    flex: 1,
    textAlign: 'right',
  },
  cycleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseGuideGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseGuideColumn: {
    flex: 1,
    gap: 6,
  },
  phaseGuideLabel: {
    fontSize: 12,
    color: palette.tertiaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phaseGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  phaseGuideText: {
    fontSize: 13,
    color: palette.primaryText,
    flexShrink: 1,
  },
  cycleEmptyText: {
    fontSize: 13,
    color: palette.tertiaryText,
  },
  friendSuggestionList: {
    gap: 10,
  },
  friendSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.mutedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  friendSuggestionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendSuggestionInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primaryText,
  },
  friendSuggestionContent: {
    flex: 1,
    gap: 2,
  },
  friendSuggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  friendSuggestionText: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  sectionHint: {
    fontSize: 12,
    color: palette.tertiaryText,
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
  mutedText: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  primaryAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ProfileScreen;
