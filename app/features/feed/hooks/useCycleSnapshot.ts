import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { CycleSnapshot } from '../../../../packages/domain/cycles/models';
import { resolveCyclePhase } from '../../../../packages/domain/cycles/models';
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
      const resolved = Number.isNaN(referenceDate.getTime())
        ? null
        : resolveCyclePhase({
            samples: stored.snapshot.samples,
            signals: stored.snapshot.signalSamples ?? [],
            referenceDate,
          });
      setSnapshotState({
        snapshot: {
          ...stored.snapshot,
          currentPhase: resolved?.phase ?? stored.snapshot.currentPhase,
          phaseSource: resolved?.source ?? stored.snapshot.phaseSource ?? 'unknown',
          cycleLengthDays: resolved?.cycleLengthDays ?? stored.snapshot.cycleLengthDays,
          lutealLengthDays: resolved?.lutealLengthDays ?? stored.snapshot.lutealLengthDays,
        },
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
