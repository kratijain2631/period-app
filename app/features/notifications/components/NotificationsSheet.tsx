import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NotificationRow } from '../../../services/supabase/notifications';
import type { FriendRequestRow } from '../../../services/supabase/friendRequests';
import type { AcceptanceNotification } from '../hooks/useNotifications';
import { brand, brandType } from '../../../theme/brand';

type NotificationsSheetProps = {
  visible: boolean;
  notifications: NotificationRow[];
  friendRequests: FriendRequestRow[];
  requestProfileMap: Record<string, { alias?: string | null }>;
  acceptances?: AcceptanceNotification[];
  onRespondRequest: (requestId: string, status: 'accepted' | 'declined') => void | Promise<void>;
  onClose: () => void;
};

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

const NotificationsSheet = ({
  visible,
  notifications,
  friendRequests,
  requestProfileMap,
  acceptances = [],
  onRespondRequest,
  onClose,
}: NotificationsSheetProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={{ gap: 12 }}>
                {acceptances.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>New friends</Text>
                    {acceptances.map((item) => (
                      <View key={item.id} style={styles.row}>
                        <Text style={styles.rowTitle}>{item.name} accepted your request 🎉</Text>
                        <Text style={styles.rowMeta}>{formatTimestamp(item.createdAt)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
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
                          <Text style={styles.requestDate}>
                            {formatTimestamp(request.created_at)}
                          </Text>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={[styles.requestButton, styles.requestAccept]}
                            onPress={() => onRespondRequest(request.id, 'accepted')}
                          >
                            <Text style={styles.requestAcceptText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.requestButton, styles.requestDecline]}
                            onPress={() => onRespondRequest(request.id, 'declined')}
                          >
                            <Text style={styles.requestDeclineText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              friendRequests.length || acceptances.length ? null : (
                <Text style={styles.empty}>No notifications yet.</Text>
              )
            }
            renderItem={({ item }) => {
              const payload = (item.payload ?? {}) as Record<string, unknown>;
              const eventType = typeof payload.event_type === 'string' ? payload.event_type : 'cycle_update';
              const phase = typeof payload.phase === 'string' ? payload.phase : 'unknown';
              return (
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>{eventType.replace('_', ' ')}</Text>
                  <Text style={styles.rowSubtitle}>Phase: {phase}</Text>
                  <Text style={styles.rowMeta}>{formatTimestamp(item.created_at)}</Text>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: brand.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: brand.colors.separator,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    color: brand.colors.primaryText,
    ...brandType.heading,
  },
  close: {
    fontSize: 14,
    color: brand.colors.accent,
    ...brandType.semibold,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
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
    borderColor: brand.colors.separator,
    padding: 12,
    gap: 4,
    backgroundColor: brand.colors.mutedFill,
  },
  rowTitle: {
    fontSize: 14,
    color: brand.colors.primaryText,
    ...brandType.semibold,
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

export default NotificationsSheet;
