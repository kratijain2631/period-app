import { CategoryValueMenstrualFlow } from '@kingstinct/react-native-healthkit';

export type CyclePhase = 'unknown' | 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'pms';
export type CyclePhaseSource = 'unknown' | 'estimated' | 'observed';
export type CycleSignalKind =
  | 'ovulation_test'
  | 'progesterone_test'
  | 'cervical_mucus'
  | 'basal_body_temperature';

export type CycleSample = {
  id: string;
  flowValue: CategoryValueMenstrualFlow;
  startDate: string;
  endDate: string;
  metadata?: Record<string, unknown>;
};

export type RawFlowSample = {
  uuid?: string | null;
  startDate: Date;
  endDate: Date;
  value: CategoryValueMenstrualFlow;
  metadata?: unknown;
};

export type CycleSignalSample = {
  id: string;
  kind: CycleSignalKind;
  startDate: string;
  endDate: string;
  value?: number | null;
  metadata?: Record<string, unknown>;
};

export type RawSignalSample = {
  uuid?: string | null;
  startDate: Date;
  endDate: Date;
  value?: number | null;
  metadata?: unknown;
};

export type CycleSnapshot = {
  syncedAt: string;
  samples: CycleSample[];
  currentPhase: CyclePhase;
  phaseSource?: CyclePhaseSource;
  cycleLengthDays?: number;
  lutealLengthDays?: number;
  latestSampleStart?: string;
  signalSamples?: CycleSignalSample[];
};

export type ResolvedCyclePhase = {
  phase: CyclePhase;
  source: CyclePhaseSource;
  cycleLengthDays: number;
  lutealLengthDays: number;
  periodLengthDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_LUTEAL_LENGTH = 14;
const DEFAULT_PERIOD_LENGTH = 5;
const MIN_VALID_CYCLE_LENGTH = 16;
const MAX_VALID_CYCLE_LENGTH = 60;
const MIN_LUTEAL_LENGTH = 11;
const MAX_LUTEAL_LENGTH = 16;
const MIN_PERIOD_LENGTH = 3;
const MAX_PERIOD_LENGTH = 8;

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isFiniteDate = (date: Date) => !Number.isNaN(date.getTime());
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const dayDiff = (left: Date, right: Date) =>
  Math.floor((toDayStart(left).getTime() - toDayStart(right).getTime()) / DAY_MS);
const toDateKey = (date: Date) => toDayStart(date).toISOString().slice(0, 10);
const parseIsoDate = (value: string) => new Date(value);

type FlowRun = {
  start: Date;
  end: Date;
  lengthDays: number;
};

const collectFlowDays = (samples: readonly CycleSample[]) => {
  const dayStarts = new Set<number>();
  samples.forEach((sample) => {
    if (sample.flowValue === CategoryValueMenstrualFlow.none) {
      return;
    }
    const start = parseIsoDate(sample.startDate);
    const end = parseIsoDate(sample.endDate);
    if (!isFiniteDate(start) || !isFiniteDate(end)) {
      return;
    }
    const normalizedStart = toDayStart(start);
    const normalizedEnd = toDayStart(end);
    const cursor = new Date(Math.min(normalizedStart.getTime(), normalizedEnd.getTime()));
    const limit = Math.max(normalizedStart.getTime(), normalizedEnd.getTime());
    while (cursor.getTime() <= limit) {
      dayStarts.add(cursor.getTime());
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return [...dayStarts].sort((a, b) => a - b);
};

const buildFlowRuns = (samples: readonly CycleSample[]): FlowRun[] => {
  const dayStarts = collectFlowDays(samples);
  if (!dayStarts.length) {
    return [];
  }

  const runs: FlowRun[] = [];
  let runStart = dayStarts[0];
  let previous = dayStarts[0];

  for (let index = 1; index < dayStarts.length; index += 1) {
    const current = dayStarts[index];
    if (current - previous > DAY_MS) {
      const lengthDays = Math.floor((previous - runStart) / DAY_MS) + 1;
      runs.push({ start: new Date(runStart), end: new Date(previous), lengthDays });
      runStart = current;
    }
    previous = current;
  }

  const trailingLength = Math.floor((previous - runStart) / DAY_MS) + 1;
  runs.push({ start: new Date(runStart), end: new Date(previous), lengthDays: trailingLength });
  return runs;
};

const roundAverage = (values: readonly number[]) =>
  values.length ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length) : null;

const deriveCycleLengthDays = (runs: readonly FlowRun[]) => {
  if (runs.length < 2) {
    return DEFAULT_CYCLE_LENGTH;
  }
  const intervals: number[] = [];
  for (let index = 1; index < runs.length; index += 1) {
    const intervalDays = dayDiff(runs[index].start, runs[index - 1].start);
    if (intervalDays >= MIN_VALID_CYCLE_LENGTH && intervalDays <= MAX_VALID_CYCLE_LENGTH) {
      intervals.push(intervalDays);
    }
  }
  const averaged = roundAverage(intervals);
  if (!averaged) {
    return DEFAULT_CYCLE_LENGTH;
  }
  return clamp(averaged, 21, 40);
};

const derivePeriodLengthDays = (runs: readonly FlowRun[]) => {
  const valid = runs
    .map((run) => run.lengthDays)
    .filter((value) => value >= 1 && value <= 10);
  const averaged = roundAverage(valid);
  if (!averaged) {
    return DEFAULT_PERIOD_LENGTH;
  }
  return clamp(averaged, MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH);
};

const isOvulationSignal = (signal: CycleSignalSample) =>
  signal.kind === 'ovulation_test' && (signal.value === 2 || signal.value === 4);

const isProgesteroneSignal = (signal: CycleSignalSample) =>
  signal.kind === 'progesterone_test' && signal.value === 2;

const isPeakMucusSignal = (signal: CycleSignalSample) =>
  signal.kind === 'cervical_mucus' && typeof signal.value === 'number' && signal.value >= 4;

const deriveLutealLengthDays = (
  runs: readonly FlowRun[],
  signals: readonly CycleSignalSample[],
  cycleLengthDays: number,
) => {
  if (!runs.length) {
    return DEFAULT_LUTEAL_LENGTH;
  }
  const ovulationDates = signals
    .filter((signal) => isOvulationSignal(signal) || isPeakMucusSignal(signal))
    .map((signal) => parseIsoDate(signal.startDate))
    .filter(isFiniteDate)
    .sort((a, b) => a.getTime() - b.getTime());

  const intervals: number[] = [];
  ovulationDates.forEach((ovulationDate) => {
    const nextPeriod = runs.find((run) => run.start.getTime() > ovulationDate.getTime());
    if (!nextPeriod) {
      return;
    }
    const days = dayDiff(nextPeriod.start, ovulationDate);
    if (days >= 9 && days <= 17) {
      intervals.push(days);
    }
  });

  const averaged = roundAverage(intervals);
  if (!averaged) {
    return clamp(DEFAULT_LUTEAL_LENGTH, MIN_LUTEAL_LENGTH, Math.min(MAX_LUTEAL_LENGTH, cycleLengthDays - 5));
  }
  return clamp(averaged, MIN_LUTEAL_LENGTH, Math.min(MAX_LUTEAL_LENGTH, cycleLengthDays - 5));
};

const hasFlowOnDate = (samples: readonly CycleSample[], referenceDate: Date) => {
  const referenceKey = toDateKey(referenceDate);
  return samples.some((sample) => {
    if (sample.flowValue === CategoryValueMenstrualFlow.none) {
      return false;
    }
    const start = parseIsoDate(sample.startDate);
    const end = parseIsoDate(sample.endDate);
    if (!isFiniteDate(start) || !isFiniteDate(end)) {
      return false;
    }
    const normalizedStart = toDayStart(start).getTime();
    const normalizedEnd = toDayStart(end).getTime();
    const minTime = Math.min(normalizedStart, normalizedEnd);
    const maxTime = Math.max(normalizedStart, normalizedEnd);
    const current = new Date(minTime);
    while (current.getTime() <= maxTime) {
      if (toDateKey(current) === referenceKey) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  });
};

const findRecentSignal = (
  signals: readonly CycleSignalSample[],
  predicate: (signal: CycleSignalSample) => boolean,
  referenceDate: Date,
  maxDaysAgo: number,
  allowFutureDays = 0,
) => {
  const matches = signals
    .filter(predicate)
    .map((signal) => ({ signal, date: parseIsoDate(signal.startDate) }))
    .filter(({ date }) => isFiniteDate(date))
    .map(({ signal, date }) => ({ signal, days: dayDiff(referenceDate, date), date }))
    .filter(({ days }) => days >= -allowFutureDays && days <= maxDaysAgo)
    .sort((left, right) => right.date.getTime() - left.date.getTime());

  return matches[0]?.signal ?? null;
};

const hasRecentElevatedBbt = (signals: readonly CycleSignalSample[], referenceDate: Date) => {
  const bbtSignals = signals
    .filter((signal) => signal.kind === 'basal_body_temperature' && typeof signal.value === 'number')
    .map((signal) => ({ signal, date: parseIsoDate(signal.startDate), value: signal.value as number }))
    .filter(({ date }) => isFiniteDate(date));

  const recent = bbtSignals
    .map((item) => ({ ...item, days: dayDiff(referenceDate, item.date) }))
    .filter((item) => item.days >= 0 && item.days <= 3)
    .sort((left, right) => right.date.getTime() - left.date.getTime())[0];

  if (!recent) {
    return false;
  }

  const baselineValues = bbtSignals
    .map((item) => ({ ...item, days: dayDiff(referenceDate, item.date) }))
    .filter((item) => item.days >= 5 && item.days <= 45)
    .map((item) => item.value);

  if (baselineValues.length < 4) {
    return false;
  }

  const baselineAverage = baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length;
  return recent.value >= baselineAverage + 0.2;
};

const resolveObservedPhase = (
  samples: readonly CycleSample[],
  signals: readonly CycleSignalSample[],
  referenceDate: Date,
): CyclePhase | null => {
  if (hasFlowOnDate(samples, referenceDate)) {
    return 'menstruation';
  }

  if (findRecentSignal(signals, isOvulationSignal, referenceDate, 1, 1)) {
    return 'ovulation';
  }

  if (findRecentSignal(signals, isPeakMucusSignal, referenceDate, 2)) {
    return 'ovulation';
  }

  if (findRecentSignal(signals, isProgesteroneSignal, referenceDate, 10)) {
    return 'luteal';
  }

  if (hasRecentElevatedBbt(signals, referenceDate)) {
    return 'luteal';
  }

  return null;
};

const estimatePhaseFromCycleDay = (
  cycleDay: number,
  cycleLengthDays: number,
  periodLengthDays: number,
  lutealLengthDays: number,
): CyclePhase => {
  const menstruationEnd = clamp(periodLengthDays, 1, Math.max(1, cycleLengthDays - 1));
  const ovulationCenter = clamp(
    cycleLengthDays - lutealLengthDays,
    menstruationEnd + 2,
    Math.max(menstruationEnd + 2, cycleLengthDays - 2),
  );
  const ovulationStart = clamp(ovulationCenter - 1, menstruationEnd + 1, cycleLengthDays);
  const ovulationEnd = clamp(ovulationCenter + 1, ovulationStart, cycleLengthDays);
  const lutealStart = clamp(ovulationEnd + 1, ovulationEnd, cycleLengthDays);
  const pmsStart = clamp(cycleLengthDays - 4, lutealStart, cycleLengthDays);

  if (cycleDay <= menstruationEnd) {
    return 'menstruation';
  }
  if (cycleDay < ovulationStart) {
    return 'follicular';
  }
  if (cycleDay <= ovulationEnd) {
    return 'ovulation';
  }
  if (cycleDay >= pmsStart) {
    return 'pms';
  }
  return 'luteal';
};

export const resolveCyclePhase = ({
  samples,
  signals = [],
  referenceDate = new Date(),
}: {
  samples: readonly CycleSample[];
  signals?: readonly CycleSignalSample[];
  referenceDate?: Date;
}): ResolvedCyclePhase => {
  if (!samples.length || !isFiniteDate(referenceDate)) {
    return {
      phase: 'unknown',
      source: 'unknown',
      cycleLengthDays: DEFAULT_CYCLE_LENGTH,
      lutealLengthDays: DEFAULT_LUTEAL_LENGTH,
      periodLengthDays: DEFAULT_PERIOD_LENGTH,
    };
  }

  const runs = buildFlowRuns(samples);
  if (!runs.length) {
    return {
      phase: 'unknown',
      source: 'unknown',
      cycleLengthDays: DEFAULT_CYCLE_LENGTH,
      lutealLengthDays: DEFAULT_LUTEAL_LENGTH,
      periodLengthDays: DEFAULT_PERIOD_LENGTH,
    };
  }

  const cycleLengthDays = deriveCycleLengthDays(runs);
  const periodLengthDays = derivePeriodLengthDays(runs);
  const lutealLengthDays = deriveLutealLengthDays(runs, signals, cycleLengthDays);

  const observedPhase = resolveObservedPhase(samples, signals, referenceDate);
  if (observedPhase) {
    return {
      phase: observedPhase,
      source: 'observed',
      cycleLengthDays,
      lutealLengthDays,
      periodLengthDays,
    };
  }

  const latestRun = runs[runs.length - 1];
  const daysSinceStart = dayDiff(referenceDate, latestRun.start);
  if (daysSinceStart < 0) {
    return {
      phase: 'unknown',
      source: 'unknown',
      cycleLengthDays,
      lutealLengthDays,
      periodLengthDays,
    };
  }

  const cycleDay = (daysSinceStart % cycleLengthDays) + 1;
  return {
    phase: estimatePhaseFromCycleDay(cycleDay, cycleLengthDays, periodLengthDays, lutealLengthDays),
    source: 'estimated',
    cycleLengthDays,
    lutealLengthDays,
    periodLengthDays,
  };
};

export const estimateCyclePhase = (
  samples: readonly CycleSample[],
  referenceDate: Date = new Date(),
  signals: readonly CycleSignalSample[] = [],
): CyclePhase => {
  return resolveCyclePhase({ samples, signals, referenceDate }).phase;
};

export const normalizeFlowSample = (sample: RawFlowSample): CycleSample => ({
  id: sample.uuid ?? `${sample.startDate.toISOString()}-${sample.endDate.toISOString()}`,
  startDate: sample.startDate.toISOString(),
  endDate: sample.endDate.toISOString(),
  flowValue: sample.value,
  metadata: (sample.metadata as Record<string, unknown> | undefined) ?? undefined,
});

export const normalizeFlowSamples = (samples: readonly RawFlowSample[]): CycleSample[] =>
  samples.map(normalizeFlowSample);

export const normalizeSignalSample = (
  sample: RawSignalSample,
  kind: CycleSignalKind,
): CycleSignalSample => ({
  id: sample.uuid ?? `${kind}-${sample.startDate.toISOString()}-${sample.endDate.toISOString()}`,
  kind,
  startDate: sample.startDate.toISOString(),
  endDate: sample.endDate.toISOString(),
  value: typeof sample.value === 'number' ? sample.value : null,
  metadata: (sample.metadata as Record<string, unknown> | undefined) ?? undefined,
});

export const normalizeSignalSamples = (
  samples: readonly RawSignalSample[],
  kind: CycleSignalKind,
): CycleSignalSample[] => samples.map((sample) => normalizeSignalSample(sample, kind));

export const getLatestSample = (samples: readonly CycleSample[]): CycleSample | undefined =>
  [...samples].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

export const deriveSnapshot = (
  samples: readonly CycleSample[],
  syncedAt: string,
  signalSamples: readonly CycleSignalSample[] = [],
): CycleSnapshot => {
  const latest = getLatestSample(samples);
  const syncedDate = new Date(syncedAt);
  const resolved = resolveCyclePhase({
    samples,
    signals: signalSamples,
    referenceDate: syncedDate,
  });

  return {
    syncedAt,
    samples: [...samples],
    signalSamples: [...signalSamples],
    currentPhase: resolved.phase,
    phaseSource: resolved.source,
    cycleLengthDays: resolved.cycleLengthDays,
    lutealLengthDays: resolved.lutealLengthDays,
    latestSampleStart: latest?.startDate,
  };
};
