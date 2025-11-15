import { useEffect } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useCycleSnapshot, syncHealthData } from '../../../services/healthkit/syncHealthData';

const FeedScreen = () => {
  const snapshot = useCycleSnapshot();

  useEffect(() => {
    syncHealthData({ source: 'foreground' });
  }, []);

  const samples = snapshot?.samples ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={samples}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => syncHealthData({ source: 'foreground' })} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Daily Cycle Summary</Text>
            <Text style={styles.subtitle}>
              {snapshot
                ? `Last synced ${new Date(snapshot.syncedAt).toLocaleString()}`
                : 'Grant Health permissions to start syncing.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.flowValue?.toString() ?? 'Flow'}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(item.startDate).toLocaleDateString()} → {new Date(item.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            {snapshot
              ? 'No recent menstrual flow entries in Apple Health.'
              : 'Cycles will appear here after permissions are granted.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5ff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#555',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 24,
  },
});

export default FeedScreen;
