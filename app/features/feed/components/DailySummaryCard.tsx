import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CycleSnapshot } from '../../../../packages/domain/cycles/models';

type DailySummaryCardProps = {
  snapshot: CycleSnapshot | null;
  lastSyncedAt?: string | null;
  isStale?: boolean;
  isOffline?: boolean;
  onRetrySync?: () => void;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
};

const formatPhaseLabel = (value?: string | null) => {
  if (!value) {
    return 'Unknown phase';
  }
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatPhaseSourceLabel = (value?: string | null) => {
  if (value === 'estimated') {
    return 'Estimated';
  }
  return null;
};

const DailySummaryCard = ({
  snapshot,
  lastSyncedAt,
  isStale = false,
  isOffline = false,
  onRetrySync,
}: DailySummaryCardProps) => {
  const showStale = !snapshot || isStale;
  const phaseLabel = snapshot && !isStale ? formatPhaseLabel(snapshot.currentPhase) : 'Unknown phase';
  const phaseSourceLabel =
    snapshot && !isStale ? formatPhaseSourceLabel(snapshot.phaseSource ?? null) : null;
  const syncLabel = lastSyncedAt ?? snapshot?.syncedAt ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Daily Cycle Summary</Text>
        <Text style={styles.phase}>
          {phaseSourceLabel ? `${phaseLabel} (${phaseSourceLabel})` : phaseLabel}
        </Text>
      </View>
      {showStale ? (
        <View style={styles.staleBanner}>
          <Text style={styles.staleText}>
            {snapshot ? 'Data is stale.' : 'No recent cycle data.'}
          </Text>
          {isOffline ? (
            <Text style={styles.staleSubtext}>Offline mode: sync will resume when online.</Text>
          ) : null}
          {onRetrySync ? (
            <TouchableOpacity style={styles.retryButton} onPress={onRetrySync}>
              <Text style={styles.retryButtonText}>Retry sync</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.timestamp}>
        {syncLabel ? `Last synced ${formatTimestamp(syncLabel)}` : 'No recent cycle data.'}
      </Text>
      <Text style={styles.samples}>
        {snapshot ? `${snapshot.samples.length} samples` : 'Grant permissions to sync Health data.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  phase: {
    fontSize: 13,
    color: '#6a5acd',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 13,
    color: '#555',
  },
  samples: {
    fontSize: 13,
    color: '#777',
  },
  staleBanner: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  staleText: {
    fontSize: 12,
    color: '#7a5b00',
    fontWeight: '600',
  },
  staleSubtext: {
    fontSize: 11,
    color: '#8a6b00',
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DailySummaryCard;
