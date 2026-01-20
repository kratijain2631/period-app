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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import { fetchCurrentUserProfile } from '../../../services/supabase/users';
import { fetchFriendSharing } from '../../../services/supabase/friendSharing';
import {
  fetchInboundFriendRequests,
  fetchOutboundFriendRequests,
} from '../../../services/supabase/friendRequests';
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
  fill: iosColor('systemGray5', '#E5E7EB'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
};

const ProfileScreen = () => {
  const session = useSessionStore(selectSession);
  const navigation = useNavigation();
  const { snapshot, isStale, lastSyncedAt } = useCycleSnapshot();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
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

  useEffect(() => {
    loadProfile();
    loadFriendSummary();
  }, [loadFriendSummary, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadFriendSummary();
    }, [loadFriendSummary]),
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Cycle</Text>
          <Text style={styles.phaseLabel}>
            {snapshot ? snapshot.currentPhase : 'Unknown phase'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {lastSyncedAt
              ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
              : 'No recent cycle data.'}
          </Text>
          {isStale ? (
            <Text style={styles.warningText}>Data may be stale. Retry sync on Home.</Text>
          ) : null}
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  cardSubtitle: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primaryText,
    textTransform: 'capitalize',
  },
  warningText: {
    fontSize: 12,
    color: '#b06d00',
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
