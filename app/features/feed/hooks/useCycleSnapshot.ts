import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { CycleSnapshot } from '../../../../packages/domain/cycles/models';
import { estimateCyclePhase } from '../../../../packages/domain/cycles/models';
import { CYCLE_SNAPSHOT_UPDATED } from '../../../services/healthkit/syncHealthData';
import {
  getLatestCycleSnapshot,
  isSnapshotStale,
} from '../../../storage/sqlite/cycleSnapshotStore';
import { useSessionStore } from '../../../state/sessionStore';

export type CycleSnapshotState = {
  snapshot: CycleSnapshot | null;
  lastSyncedAt: string | null;
  isStale: boolean;
};

export const useCycleSnapshot = (): CycleSnapshotState => {
  const session = useSessionStore((state) => state.session);
  const [snapshotState, setSnapshotState] = useState<CycleSnapshotState>({
    snapshot: null,
    lastSyncedAt: null,
    isStale: false,
  });

  const loadSnapshot = useCallback(async () => {
    if (!session) {
      setSnapshotState({ snapshot: null, lastSyncedAt: null, isStale: false });
      return;
    }

    try {
      const stored = await getLatestCycleSnapshot(session.userId);
      if (!stored) {
        setSnapshotState({ snapshot: null, lastSyncedAt: null, isStale: false });
        return;
      }
      const stale = isSnapshotStale(stored.lastSyncedAt);
      const referenceDate = new Date(stored.lastSyncedAt ?? stored.snapshot.syncedAt);
      const resolvedPhase = Number.isNaN(referenceDate.getTime())
        ? stored.snapshot.currentPhase
        : estimateCyclePhase(stored.snapshot.samples, referenceDate);
      setSnapshotState({
        snapshot: { ...stored.snapshot, currentPhase: resolvedPhase },
        lastSyncedAt: stored.lastSyncedAt,
        isStale: stale,
      });
    } catch (error) {
      console.warn('[cycle-snapshot] Failed to load snapshot', error);
      setSnapshotState({ snapshot: null, lastSyncedAt: null, isStale: false });
    }
  }, [session]);

  useEffect(() => {
    loadSnapshot();
    const subscription = DeviceEventEmitter.addListener(CYCLE_SNAPSHOT_UPDATED, loadSnapshot);
    return () => subscription.remove();
  }, [loadSnapshot]);

  return snapshotState;
};
