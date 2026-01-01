import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchSyncScore, type SyncScoreResult } from '../../../services/supabase/syncScore';
import { fetchFriendSharing } from '../../../services/supabase/friendSharing';
import { fetchFriendCycleSnapshot } from '../../../services/supabase/cycleSnapshots';
import { sendBoop } from '../../../services/supabase/boops';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { selectSession, useSessionStore } from '../../../state/sessionStore';

const FriendSyncScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const session = useSessionStore(selectSession);
  const isOnline = useConnectionStore(selectIsOnline);
  const [syncScore, setSyncScore] = useState<SyncScoreResult | null>(null);
  const [friendSnapshot, setFriendSnapshot] = useState<{ phase?: string | null } | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [boopStatus, setBoopStatus] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle');

  const friendId = (route as { params?: { friendId?: string } }).params?.friendId ?? '';

  const loadSync = useCallback(async () => {
    if (!friendId) {
      return;
    }
    setLoading(true);
    try {
      const [scoreResult, sharingRows, snapshotRow] = await Promise.all([
        fetchSyncScore(friendId).catch(() => null),
        fetchFriendSharing(),
        fetchFriendCycleSnapshot(friendId).catch(() => null),
      ]);

      const hasLocal = session?.userId
        ? sharingRows.some(
            (row) => row.user_id === session.userId && row.friend_id === friendId && row.has_shared,
          )
        : false;
      const hasRemote = session?.userId
        ? sharingRows.some(
            (row) => row.user_id === friendId && row.friend_id === session.userId && row.has_shared,
          )
        : false;

      setHasConsent(hasLocal && hasRemote);
      setSyncScore(scoreResult);
      setFriendSnapshot(snapshotRow ? { phase: snapshotRow.snapshot?.currentPhase } : null);
    } catch (error) {
      console.warn('[friend-sync] Failed to load sync data', error);
      setHasConsent(false);
    } finally {
      setLoading(false);
    }
  }, [friendId, session?.userId]);

  useEffect(() => {
    loadSync();
  }, [loadSync]);

  const recommendations = useMemo(
    () => ['Send a supportive boop', 'Offer a low-key check-in', 'Share a warm note'],
    [],
  );

  const timelineItems = useMemo(() => {
    if (Array.isArray(syncScore?.overlap)) {
      return syncScore?.overlap as { label?: string; date?: string }[];
    }
    return [
      { label: 'Shared peak window', date: 'This week' },
      { label: 'Overlap streak', date: '3 days' },
    ];
  }, [syncScore]);

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

  const scoreValue = syncScore?.score ?? 78;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Friend Sync</Text>
            <Text style={styles.subtitle}>Friend ID: {friendId || 'Unknown'}</Text>
          </View>
        </View>

        {isLoading ? <Text style={styles.mutedText}>Loading sync insights...</Text> : null}

        {hasConsent === false ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consent Needed</Text>
            <Text style={styles.sectionSubtitle}>
              Friend Sync unlocks once both of you approve sharing.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sync Score</Text>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreValue}>{scoreValue}%</Text>
                <Text style={styles.scoreLabel}>Overlap momentum</Text>
                <Text style={styles.scoreMeta}>Friend phase: {friendSnapshot?.phase ?? 'unknown'}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overlap Timeline</Text>
              {timelineItems.map((item, index) => (
                <View key={`${item.label ?? 'item'}-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View>
                    <Text style={styles.timelineLabel}>{item.label ?? 'Shared moment'}</Text>
                    <Text style={styles.timelineDate}>{item.date ?? 'Recently'}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              <View style={styles.chipRow}>
                {recommendations.map((item) => (
                  <View key={item} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, boopStatus === 'sending' ? styles.primaryButtonDisabled : null]}
                onPress={handleBoop}
                disabled={boopStatus === 'sending'}
              >
                <Text style={styles.primaryButtonText}>
                  {boopStatus === 'sent'
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
    backgroundColor: '#f8f5ff',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d2f8f',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  mutedText: {
    fontSize: 13,
    color: '#777',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  scoreCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#3d2f8f',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#333',
  },
  scoreMeta: {
    fontSize: 12,
    color: '#666',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d2f8f',
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  timelineDate: {
    fontSize: 12,
    color: '#666',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f0f0f5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#111',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#444',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  offlineNote: {
    fontSize: 12,
    color: '#7a1f1f',
  },
});

export default FriendSyncScreen;
