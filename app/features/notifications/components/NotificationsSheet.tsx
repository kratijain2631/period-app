import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NotificationRow } from '../../../services/supabase/notifications';

type NotificationsSheetProps = {
  visible: boolean;
  notifications: NotificationRow[];
  onClose: () => void;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
};

const NotificationsSheet = ({ visible, notifications, onClose }: NotificationsSheetProps) => {
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
            ListEmptyComponent={
              <Text style={styles.empty}>No notifications yet.</Text>
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
