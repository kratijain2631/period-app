import { CategoryValueMenstrualFlow } from '@kingstinct/react-native-healthkit';
import type { CyclePhase, CycleSample, CycleSnapshot } from '../../../../packages/domain/cycles/models';

type SyncScoreMetrics = {
  phaseAlignment: number;
  flowTiming: number;
  overlapRatio: number;
  daysApart: number | null;
  overlapDays: number;
};

type SyncScoreHighlight = {
  label: string;
  value: string;
  detail?: string;
  kind?: 'phase' | 'timing' | 'overlap';
  icon?: string;
  tone?: {
    color: string;
    background: string;
  };
};

type SyncScoreTimelineItem = {
  label: string;
  date: string;
};

type CycleTrendRow = {
  label: string;
  selfStart: string;
  selfEnd: string;
  friendStart: string;
  friendEnd: string;
  daysApart: number | null;
  overlapDays: number;
  trend: 'closer' | 'further' | 'steady' | 'unknown';
};

export type SyncScoreSummary = {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  metrics: SyncScoreMetrics;
  highlights: SyncScoreHighlight[];
  timelineItems: SyncScoreTimelineItem[];
  cycleTrend: CycleTrendRow[];
};

const PHASE_ORDER: CyclePhase[] = ['menstruation', 'follicular', 'ovulation', 'luteal', 'pms'];
const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const phaseIndex = (phase: CyclePhase) => PHASE_ORDER.indexOf(phase);

const phaseDistance = (a: CyclePhase, b: CyclePhase): number | null => {
  if (a === 'unknown' || b === 'unknown') {
    return null;
  }
  const aIndex = phaseIndex(a);
  const bIndex = phaseIndex(b);
  if (aIndex < 0 || bIndex < 0) {
    return null;
  }
  const diff = Math.abs(aIndex - bIndex);
  const loopDiff = Math.min(diff, PHASE_ORDER.length - diff);
  return loopDiff;
};

const scorePhaseAlignment = (a: CyclePhase, b: CyclePhase) => {
  const distance = phaseDistance(a, b);
  if (distance === null) {
    return 0.45;
  }
  const maxDistance = Math.floor(PHASE_ORDER.length / 2);
  return clamp(1 - distance / maxDistance, 0, 1);
};

const getLatestDate = (snapshot: CycleSnapshot) => {
  if (snapshot.latestSampleStart) {
    return new Date(snapshot.latestSampleStart);
  }
  const latest = [...snapshot.samples].sort(
    (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
  )[0];
  return latest ? new Date(latest.startDate) : null;
};

const sortFlowSamples = (samples: CycleSample[]) =>
  [...samples]
    .filter((sample) => sample.flowValue !== CategoryValueMenstrualFlow.none)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const collectFlowDates = (samples: CycleSample[], now: Date, windowDays = 28): Set<string> => {
  const cutoff = new Date(now.getTime() - windowDays * DAY_MS);
  const dates = new Set<string>();

  samples.forEach((sample) => {
    if (sample.flowValue === CategoryValueMenstrualFlow.none) {
      return;
    }
    const start = new Date(sample.startDate);
    const end = new Date(sample.endDate);
    if (end < cutoff) {
      return;
    }
    const cursor = new Date(Math.max(start.getTime(), cutoff.getTime()));
    while (cursor <= end) {
      dates.add(toDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  });

  return dates;
};

const overlapDaysBetweenSamples = (left: CycleSample, right: CycleSample): number => {
  const start = Math.max(new Date(left.startDate).getTime(), new Date(right.startDate).getTime());
  const end = Math.min(new Date(left.endDate).getTime(), new Date(right.endDate).getTime());
  if (end < start) {
    return 0;
  }
  return Math.round((end - start) / DAY_MS) + 1;
};

const buildHighlights = (
  selfPhase: CyclePhase,
  friendPhase: CyclePhase,
  metrics: SyncScoreMetrics,
): SyncScoreHighlight[] => {
  const phaseText =
    selfPhase === friendPhase
      ? `Both in ${selfPhase}`
      : `${selfPhase} vs ${friendPhase}`;
  const phaseDetail =
    selfPhase === 'unknown' || friendPhase === 'unknown'
      ? 'Awaiting more phase data.'
      : 'Phase proximity drives most of the score.';

  const daysApartLabel =
    metrics.daysApart === null
      ? 'No recent flow data'
      : `${metrics.daysApart} day${metrics.daysApart === 1 ? '' : 's'} apart`;

  const overlapLabel =
    metrics.overlapDays === 0
      ? 'No shared flow days'
      : `${metrics.overlapDays} shared day${metrics.overlapDays === 1 ? '' : 's'}`;

  return [
    {
      label: 'Phase alignment',
      value: phaseText,
      detail: phaseDetail,
      kind: 'phase',
      icon: 'sparkles',
      tone: { color: '#5856D6', background: '#EEEAFE' },
    },
    {
      label: 'Recent flow timing',
      value: daysApartLabel,
      kind: 'timing',
      icon: 'time-outline',
      tone: { color: '#007AFF', background: '#E6F0FF' },
    },
    {
      label: '28-day overlap',
      value: overlapLabel,
      kind: 'overlap',
      icon: 'link-outline',
      tone: { color: '#34C759', background: '#E7F7EC' },
    },
  ];
};

const buildTimeline = (
  selfPhase: CyclePhase,
  friendPhase: CyclePhase,
  metrics: SyncScoreMetrics,
): SyncScoreTimelineItem[] => {
  const items: SyncScoreTimelineItem[] = [];
  items.push({
    label: 'Current phase snapshot',
    date: selfPhase === friendPhase ? `Both in ${selfPhase}` : `${selfPhase} vs ${friendPhase}`,
  });
  items.push({
    label: 'Latest flow gap',
    date:
      metrics.daysApart === null
        ? 'No recent flow data'
        : `${metrics.daysApart} day${metrics.daysApart === 1 ? '' : 's'} apart`,
  });
  items.push({
    label: 'Shared flow days (28d)',
    date: metrics.overlapDays
      ? `${metrics.overlapDays} day${metrics.overlapDays === 1 ? '' : 's'}`
      : 'None yet',
  });
  return items;
};

const buildCycleTrend = (selfSnapshot: CycleSnapshot, friendSnapshot: CycleSnapshot): CycleTrendRow[] => {
  const selfSamples = sortFlowSamples(selfSnapshot.samples);
  const friendSamples = sortFlowSamples(friendSnapshot.samples);
  const count = Math.min(selfSamples.length, friendSamples.length, 3);
  const rows: CycleTrendRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const selfSample = selfSamples[index];
    const friendSample = friendSamples[index];
    const selfEnd = selfSample.endDate ?? selfSample.startDate;
    const friendEnd = friendSample.endDate ?? friendSample.startDate;
    const daysApart = Math.abs(
      Math.round(
        (new Date(selfSample.startDate).getTime() - new Date(friendSample.startDate).getTime()) / DAY_MS,
      ),
    );
    const overlapDays = overlapDaysBetweenSamples(selfSample, friendSample);
    const label =
      index === 0 ? 'Most recent' : index === 1 ? 'Previous cycle' : 'Two cycles ago';

    rows.push({
      label,
      selfStart: selfSample.startDate,
      selfEnd,
      friendStart: friendSample.startDate,
      friendEnd,
      daysApart,
      overlapDays,
      trend: 'unknown',
    });
  }

  return rows.map((row, index) => {
    const next = rows[index + 1];
    if (!next || row.daysApart === null || next.daysApart === null) {
      return { ...row, trend: 'unknown' };
    }
    if (row.daysApart < next.daysApart) {
      return { ...row, trend: 'closer' };
    }
    if (row.daysApart > next.daysApart) {
      return { ...row, trend: 'further' };
    }
    return { ...row, trend: 'steady' };
  });
};

export const computeSyncScore = ({
  selfSnapshot,
  friendSnapshot,
  now = new Date(),
}: {
  selfSnapshot: CycleSnapshot;
  friendSnapshot: CycleSnapshot;
  now?: Date;
}): SyncScoreSummary => {
  const selfPhase = selfSnapshot.currentPhase ?? 'unknown';
  const friendPhase = friendSnapshot.currentPhase ?? 'unknown';
  const phaseAlignment = scorePhaseAlignment(selfPhase, friendPhase);

  const selfLatest = getLatestDate(selfSnapshot);
  const friendLatest = getLatestDate(friendSnapshot);
  const daysApart =
    selfLatest && friendLatest
      ? Math.abs(Math.round((selfLatest.getTime() - friendLatest.getTime()) / DAY_MS))
      : null;
  const flowTiming = daysApart === null ? 0.5 : clamp(1 - daysApart / 14, 0, 1);

  const selfDates = collectFlowDates(selfSnapshot.samples, now);
  const friendDates = collectFlowDates(friendSnapshot.samples, now);
  const overlapDays = [...selfDates].filter((date) => friendDates.has(date)).length;
  const unionDays = new Set([...selfDates, ...friendDates]).size;
  const overlapRatio = unionDays === 0 ? 0.5 : clamp(overlapDays / unionDays, 0, 1);

  const rawScore = 0.45 * phaseAlignment + 0.35 * flowTiming + 0.2 * overlapRatio;
  const score = Math.round(clamp(rawScore, 0, 1) * 100);

  const freshest = [selfLatest, friendLatest].filter(Boolean) as Date[];
  const daysSinceLatest = freshest.length
    ? Math.max(...freshest.map((date) => Math.round((now.getTime() - date.getTime()) / DAY_MS)))
    : null;
  const minSamples = Math.min(selfSnapshot.samples.length, friendSnapshot.samples.length);
  const confidence: SyncScoreSummary['confidence'] =
    daysSinceLatest !== null && daysSinceLatest <= 45 && minSamples >= 4
      ? 'high'
      : minSamples >= 2
        ? 'medium'
        : 'low';

  const metrics: SyncScoreMetrics = {
    phaseAlignment,
    flowTiming,
    overlapRatio,
    daysApart,
    overlapDays,
  };

  return {
    score,
    confidence,
    metrics,
    highlights: buildHighlights(selfPhase, friendPhase, metrics),
    timelineItems: buildTimeline(selfPhase, friendPhase, metrics),
    cycleTrend: buildCycleTrend(selfSnapshot, friendSnapshot),
  };
};

export const fallbackRecommendations = ({
  selfPhase,
  friendPhase,
  score,
}: {
  selfPhase: CyclePhase;
  friendPhase: CyclePhase;
  score: number;
}): string[] => {
  const recs: string[] = [];

  if (selfPhase === friendPhase && selfPhase !== 'unknown') {
    recs.push(`Plan around your shared ${selfPhase} window.`);
  } else {
    recs.push('Keep plans flexible for each other today.');
  }

  if (friendPhase === 'menstruation' || friendPhase === 'pms') {
    recs.push('Send a gentle check-in and offer extra warmth.');
  } else if (friendPhase === 'ovulation') {
    recs.push('Share a playful or celebratory note.');
  } else {
    recs.push('Offer a low-key hang or quick voice note.');
  }

  if (score >= 80) {
    recs.push('Lean into this high-sync week for plans.');
  } else if (score <= 50) {
    recs.push('Focus on small, supportive touches.');
  } else {
    recs.push('Sync on one small plan together.');
  }

  return recs.slice(0, 3);
};

export const createPreviewSnapshots = (now = new Date()): {
  selfSnapshot: CycleSnapshot;
  friendSnapshot: CycleSnapshot;
} => {
  const buildSamples = (label: string, offsets: number[], spanDays = 3): CycleSample[] =>
    offsets.map((offset, index) => {
      const start = new Date(now.getTime() - offset * DAY_MS);
      const end = new Date(start.getTime() + (spanDays - 1) * DAY_MS);
      return {
        id: `${label}-${index}`,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        flowValue: CategoryValueMenstrualFlow.light,
      };
    });

  const selfSnapshot: CycleSnapshot = {
    syncedAt: now.toISOString(),
    samples: buildSamples('self', [2, 3, 4]),
    currentPhase: 'luteal',
    latestSampleStart: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
  };

  const friendSnapshot: CycleSnapshot = {
    syncedAt: now.toISOString(),
    samples: buildSamples('friend', [4, 5, 6]),
    currentPhase: 'pms',
    latestSampleStart: new Date(now.getTime() - 4 * DAY_MS).toISOString(),
  };

  return { selfSnapshot, friendSnapshot };
};
