import {
  deriveCycleTimeline,
  type CyclePhase,
  type CyclePhaseRange,
  type CyclePhaseSource,
  type CycleSnapshot,
} from '../../../../packages/domain/cycles/models';
import { fallbackPhaseGuidance, splitGuidanceTip } from '../../../../packages/domain/cycles/guidance';

export type CycleOverview = {
  state: 'loading' | 'empty' | 'ready' | 'error';
  phase: CyclePhase;
  source: CyclePhaseSource;
  currentDay: number | null;
  cycleLength: number | null;
  // Days past the expected next period (0 = due today); null when not overdue.
  daysLate: number | null;
  ranges: CyclePhaseRange[];
  stale: boolean;
  syncedLabel: string | null;
  markerMatchesPhase: boolean;
  upcoming: { phase: CyclePhase; daysAway: number } | null;
  guidance: { title: string; body: string | null };
};
export const lateLabel = (daysLate: number | null) =>
  daysLate === null
    ? null
    : daysLate === 0
      ? 'Period expected today'
      : `Period expected ${daysLate} day${daysLate === 1 ? '' : 's'} ago`;

export const selectCycleOverview = ({
  snapshot,
  isLoading = false,
  error = false,
  now = new Date(),
}: {
  snapshot: CycleSnapshot | null;
  isLoading?: boolean;
  error?: boolean;
  now?: Date;
}): CycleOverview => {
  const empty: CycleOverview = {
    state: isLoading ? 'loading' : error ? 'error' : 'empty',
    phase: 'unknown',
    source: 'unknown',
    currentDay: null,
    cycleLength: null,
    daysLate: null,
    ranges: [],
    stale: false,
    syncedLabel: null,
    markerMatchesPhase: true,
    upcoming: null,
    guidance: splitGuidanceTip(fallbackPhaseGuidance('unknown').dos[0]),
  };
  if (!snapshot) return empty;
  const syncedAt = new Date(snapshot.syncedAt);
  if (!Number.isFinite(syncedAt.getTime())) return { ...empty, state: 'error' };
  // Display the facts as of the recorded sync; never silently manufacture fresh observed data.
  const { resolved, currentDay, ranges } = deriveCycleTimeline(snapshot.samples, syncedAt, snapshot.signalSamples);
  if (currentDay === null) return empty;
  // A late cycle counts past its length; its marker stays on the last day.
  const markerDay = Math.min(currentDay, resolved.cycleLengthDays);
  const stale = error || now.getTime() - syncedAt.getTime() >= 24 * 60 * 60 * 1000;
  const next = resolved.nextPhaseStart ? new Date(resolved.nextPhaseStart) : null;
  const localDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAway = next ? Math.round((localDay(next) - localDay(now)) / 86400000) : -1;
  return {
    state: 'ready',
    phase: resolved.phase,
    source: resolved.source,
    currentDay,
    cycleLength: resolved.cycleLengthDays,
    daysLate: resolved.daysLate ?? null,
    ranges,
    stale,
    syncedLabel: syncedAt.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    markerMatchesPhase:
      ranges.find((r) => markerDay >= r.startDay && markerDay <= r.endDay)?.phase === resolved.phase,
    upcoming: !stale && daysAway >= 0 && resolved.nextPhase ? { phase: resolved.nextPhase, daysAway } : null,
    guidance: splitGuidanceTip(fallbackPhaseGuidance(resolved.phase).dos[0]),
  };
};
