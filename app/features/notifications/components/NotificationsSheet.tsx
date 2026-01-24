import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NotificationRow } from '../../../services/supabase/notifications';
import type { FriendRequestRow } from '../../../services/supabase/friendRequests';

type NotificationsSheetProps = {
  visible: boolean;
  notifications: NotificationRow[];
  friendRequests: FriendRequestRow[];
  requestProfileMap: Record<string, { alias?: string | null }>;
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
              friendRequests.length ? (
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
              ) : null
            }
            ListEmptyComponent={
              friendRequests.length ? null : (
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  close: {
    fontSize: 14,
    color: '#555',
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
    fontWeight: '700',
    color: '#111',
  },
  requestRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    gap: 8,
  },
  requestMeta: {
    gap: 4,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '700',
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
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  requestAccept: {
    backgroundColor: '#1f9d55',
  },
  requestAcceptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestDecline: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  requestDeclineText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#555',
  },
  rowMeta: {
    fontSize: 12,
    color: '#888',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 24,
  },
});

export default NotificationsSheet;
