import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { brand, brandType } from '../../../theme/brand';
import { useNotifications } from '../hooks/useNotifications';

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
};

const formatAlias = (alias?: string | null) => {
  if (!alias) {
    return '@unknown';
  }
  return alias.startsWith('@') ? alias : `@${alias}`;
};

const formatActor = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return formatAlias(value.trim());
  }
  return 'Someone';
};

// Friendly one-liner for a DB notification row's payload.
const describeNotification = (payload: Record<string, unknown>): string => {
  const type =
    typeof payload.type === 'string'
      ? payload.type
      : typeof payload.event_type === 'string'
        ? payload.event_type
        : 'update';
  const actor = formatActor(payload.actor_alias);
  const emoji = typeof payload.emoji === 'string' ? payload.emoji : '';
  switch (type) {
    case 'post_reaction':
      return `${actor} reacted ${emoji} to your post`.replace(/\s+/g, ' ').trim();
    case 'event_reaction':
      return `${actor} reacted ${emoji} to your update`.replace(/\s+/g, ' ').trim();
    case 'boop':
      return `${actor} booped you 👉`;
    case 'phase_transition':
      return typeof payload.phase === 'string'
        ? `You've entered your ${payload.phase} phase`
        : 'Your cycle phase changed';
    default:
      return type.replace(/_/g, ' ');
  }
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  timestamp: string;
  unread: boolean;
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const {
    notifications,
    friendRequests,
    requestProfileMap,
    acceptances,
    readAcceptanceIds,
    markAllRead,
    respondToFriendRequest,
    reload,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  // Freeze which items were unread when the page opened, so they stay in the
  // "New" section for this visit even after we mark them read in the background.
  const [newIds, setNewIds] = useState<string[] | null>(null);

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...acceptances.map((item) => ({
        id: item.id,
        title: `${item.name} accepted your request 🎉`,
        subtitle: null,
        timestamp: item.createdAt,
        unread: !readAcceptanceIds.includes(item.id),
      })),
      ...notifications.map((row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          title: describeNotification(payload),
          subtitle: null,
          timestamp: row.created_at,
          unread: !row.read_at,
        };
      }),
    ];
    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [acceptances, notifications, readAcceptanceIds]);

  // On first load with content, snapshot the unread items and mark everything
  // read (clears the bell) without removing anything from the page.
  useEffect(() => {
    if (newIds === null && (notifications.length > 0 || acceptances.length > 0)) {
      setNewIds(activity.filter((item) => item.unread).map((item) => item.id));
      markAllRead();
    }
  }, [activity, acceptances.length, markAllRead, newIds, notifications.length]);

  const isNew = (id: string) => (newIds ? newIds.includes(id) : false);
  const newActivity = activity.filter((item) => isNew(item.id));
  const earlierActivity = activity.filter((item) => !isNew(item.id));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const renderActivityRow = (item: ActivityItem) => (
    <View key={item.id} style={[styles.row, isNew(item.id) ? styles.rowUnread : styles.rowRead]}>
      <View style={styles.rowHeader}>
        {isNew(item.id) ? <View style={styles.unreadDot} /> : null}
        <Text style={[styles.rowTitle, !isNew(item.id) && styles.rowTitleRead]}>{item.title}</Text>
      </View>
      {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
      <Text style={styles.rowMeta}>{formatTimestamp(item.timestamp)}</Text>
    </View>
  );

  const hasAnything = friendRequests.length > 0 || activity.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={brand.colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={earlierActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={brand.colors.accent}
            colors={[brand.colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {friendRequests.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend requests</Text>
                {friendRequests.map((request) => {
                  const profile = requestProfileMap[request.from_user_id];
                  const alias = formatAlias(profile?.alias);
                  return (
                    <View key={request.id} style={styles.requestRow}>
                      <View style={styles.requestMeta}>
                        <Text style={styles.requestName}>{alias}</Text>
                        <Text style={styles.requestDate}>{formatTimestamp(request.created_at)}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.requestAccept]}
                          onPress={() => respondToFriendRequest(request.id, 'accepted')}
                        >
                          <Text style={styles.requestAcceptText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.requestDecline]}
                          onPress={() => respondToFriendRequest(request.id, 'declined')}
                        >
                          <Text style={styles.requestDeclineText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {newActivity.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New</Text>
                {newActivity.map(renderActivityRow)}
              </View>
            ) : null}

            {earlierActivity.length ? <Text style={styles.sectionTitle}>Earlier</Text> : null}
          </View>
        }
        renderItem={({ item }) => renderActivityRow(item)}
        ListEmptyComponent={
          hasAnything ? null : <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: brand.colors.separator,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    color: brand.colors.primaryText,
    ...brandType.heading,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: brand.colors.primaryText,
    ...brandType.semibold,
  },
  requestRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.colors.separator,
    padding: 12,
    gap: 8,
    backgroundColor: brand.colors.mutedFill,
  },
  requestMeta: {
    gap: 4,
  },
  requestName: {
    fontSize: 14,
    color: brand.colors.primaryText,
    ...brandType.semibold,
  },
  requestDate: {
    fontSize: 12,
    color: brand.colors.secondaryText,
    ...brandType.body,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  requestAccept: {
    backgroundColor: brand.colors.accent,
  },
  requestAcceptText: {
    color: brand.colors.white,
    fontSize: 12,
    ...brandType.semibold,
  },
  requestDecline: {
    backgroundColor: brand.colors.white,
    borderWidth: 1,
    borderColor: brand.colors.destructive,
  },
  requestDeclineText: {
    color: brand.colors.destructive,
    fontSize: 12,
    ...brandType.semibold,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  rowUnread: {
    borderColor: brand.colors.accent,
    backgroundColor: brand.colors.white,
  },
  rowRead: {
    borderColor: brand.colors.separator,
    backgroundColor: brand.colors.mutedFill,
    opacity: 0.85,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.colors.accent,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    color: brand.colors.primaryText,
    ...brandType.semibold,
  },
  rowTitleRead: {
    color: brand.colors.secondaryText,
  },
  rowSubtitle: {
    fontSize: 13,
    color: brand.colors.secondaryText,
    ...brandType.body,
  },
  rowMeta: {
    fontSize: 12,
    color: brand.colors.tertiaryText,
    ...brandType.body,
  },
  empty: {
    textAlign: 'center',
    color: brand.colors.secondaryText,
    paddingVertical: 24,
    ...brandType.body,
  },
});

export default NotificationsScreen;
