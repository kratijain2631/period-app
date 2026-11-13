import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { CycleSnapshot } from '../../../../packages/domain/cycles/models';
import { resolveCyclePhase } from '../../../../packages/domain/cycles/models';
import { CYCLE_SNAPSHOT_UPDATED } from '../../../services/healthkit/syncHealthData';
import { getLatestCycleSnapshot, isSnapshotStale } from '../../../storage/sqlite/cycleSnapshotStore';
import { useSessionStore } from '../../../state/sessionStore';

export type CycleSnapshotState = {
  snapshot: CycleSnapshot | null; lastSyncedAt: string | null; isStale: boolean;
  isLoading: boolean; error: boolean;
};
const initial: CycleSnapshotState = { snapshot: null, lastSyncedAt: null, isStale: false, isLoading: true, error: false };

// Read one snapshot for a screen and pass its model to all of its widgets.
// HealthKit sync remains owned by the existing app lifecycle / explicit refresh.
export const useCycleSnapshot = (): CycleSnapshotState & { reload: () => Promise<void> } => {
  const userId = useSessionStore(state => state.session?.userId);
  const [owned, setOwned] = useState<{ userId?: string; state: CycleSnapshotState }>({ userId, state: initial });
  const generation = useRef(0);
  const alive = useRef(true);
  const loadSnapshot = useCallback(async () => {
    const request = ++generation.current;
    const active = () => alive.current && request === generation.current && useSessionStore.getState().session?.userId === userId;
    try {
      const stored = userId ? await getLatestCycleSnapshot(userId) : null;
      if (!active()) return;
      if (!stored) {
        setOwned({ userId, state: { ...initial, isLoading: false } });
        return;
      }
      const referenceDate = new Date(stored.lastSyncedAt ?? stored.snapshot.syncedAt);
      const resolved = Number.isNaN(referenceDate.getTime()) ? null : resolveCyclePhase({ samples: stored.snapshot.samples, signals: stored.snapshot.signalSamples ?? [], referenceDate });
      setOwned({ userId, state: {
        snapshot: { ...stored.snapshot, currentPhase: resolved?.phase ?? stored.snapshot.currentPhase,
          phaseSource: resolved?.source ?? stored.snapshot.phaseSource ?? 'unknown',
          cycleLengthDays: resolved?.cycleLengthDays ?? stored.snapshot.cycleLengthDays,
          lutealLengthDays: resolved?.lutealLengthDays ?? stored.snapshot.lutealLengthDays },
        lastSyncedAt: stored.lastSyncedAt, isStale: isSnapshotStale(stored.lastSyncedAt), isLoading: false, error: false,
      } });
    } catch {
      if (active()) setOwned(previous => ({ userId, state: { ...(previous.userId === userId ? previous.state : initial), isLoading: false, error: true } }));
    }
  }, [userId]);
  useEffect(() => {
    alive.current = true;
    void loadSnapshot();
    const subscription = DeviceEventEmitter.addListener(CYCLE_SNAPSHOT_UPDATED, loadSnapshot);
    return () => { alive.current = false; generation.current++; subscription.remove(); };
  }, [loadSnapshot]);
  return { ...(owned.userId === userId ? owned.state : initial), reload: loadSnapshot };
};
