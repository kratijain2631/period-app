import { CategoryValueMenstrualFlow } from '@kingstinct/react-native-healthkit';

export type CyclePhase = 'unknown' | 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'pms';

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

export type CycleSnapshot = {
  syncedAt: string;
  samples: CycleSample[];
  currentPhase: CyclePhase;
  latestSampleStart?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_LENGTH = 28;
const PHASE_WINDOWS: Array<{ phase: CyclePhase; start: number; end: number }> = [
  { phase: 'menstruation', start: 1, end: 5 },
  { phase: 'follicular', start: 6, end: 12 },
  { phase: 'ovulation', start: 13, end: 15 },
  { phase: 'luteal', start: 16, end: 23 },
  { phase: 'pms', start: 24, end: 28 },
];

const phaseFromFlowValue = (value: CategoryValueMenstrualFlow): CyclePhase =>
  value === CategoryValueMenstrualFlow.none ? 'unknown' : 'menstruation';

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const estimateCyclePhase = (
  samples: readonly CycleSample[],
  referenceDate: Date = new Date(),
): CyclePhase => {
  if (!samples.length) {
    return 'unknown';
  }
  const latestFlowSample = [...samples]
    .filter((sample) => sample.flowValue !== CategoryValueMenstrualFlow.none)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

  if (!latestFlowSample) {
    return 'unknown';
  }

  const flowStart = new Date(latestFlowSample.startDate);
  if (Number.isNaN(flowStart.getTime())) {
    return phaseFromFlowValue(latestFlowSample.flowValue);
  }

  if (Number.isNaN(referenceDate.getTime())) {
    return phaseFromFlowValue(latestFlowSample.flowValue);
  }

  const daysSinceStart = Math.floor(
    (toDayStart(referenceDate).getTime() - toDayStart(flowStart).getTime()) / DAY_MS,
  );

  if (daysSinceStart < 0) {
    return 'unknown';
  }

  const cycleDay = (daysSinceStart % DEFAULT_CYCLE_LENGTH) + 1;
  const window = PHASE_WINDOWS.find(
    ({ start, end }) => cycleDay >= start && cycleDay <= end,
  );

  return window?.phase ?? 'unknown';
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

export const getLatestSample = (samples: readonly CycleSample[]): CycleSample | undefined =>
  [...samples].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

export const deriveSnapshot = (samples: readonly CycleSample[], syncedAt: string): CycleSnapshot => {
  const latest = getLatestSample(samples);
  const syncedDate = new Date(syncedAt);
  const currentPhase = estimateCyclePhase(samples, syncedDate);

  return {
    syncedAt,
    samples: [...samples],
    currentPhase,
    latestSampleStart: latest?.startDate,
  };
};
