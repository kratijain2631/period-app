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

const phaseFromFlowValue = (value: CategoryValueMenstrualFlow): CyclePhase => {
  // Minimal mapping until prediction data is available.
  return value === CategoryValueMenstrualFlow.none ? 'unknown' : 'menstruation';
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
  const currentPhase = latest ? phaseFromFlowValue(latest.flowValue) : 'unknown';

  return {
    syncedAt,
    samples: [...samples],
    currentPhase,
    latestSampleStart: latest?.startDate,
  };
};
