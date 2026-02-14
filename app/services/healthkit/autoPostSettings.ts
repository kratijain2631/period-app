import type { CycleSample } from '../../../packages/domain/cycles/models';

const DAY_MS = 24 * 60 * 60 * 1000;

export type AutoPostSettings = {
  postPeriodDays: boolean;
  postOnlyPeriodStart: boolean;
  postPhaseTransitions: boolean;
};

export const DEFAULT_AUTO_POST_SETTINGS: AutoPostSettings = {
  postPeriodDays: true,
  postOnlyPeriodStart: false,
  postPhaseTransitions: true,
};

type AutoPostSettingsRow = {
  auto_post_period_days?: boolean | null;
  auto_post_period_start_only?: boolean | null;
  auto_post_phase_transitions?: boolean | null;
};

export const resolveAutoPostSettings = (
  row?: AutoPostSettingsRow | null,
): AutoPostSettings => ({
  postPeriodDays:
    typeof row?.auto_post_period_days === 'boolean'
      ? row.auto_post_period_days
      : DEFAULT_AUTO_POST_SETTINGS.postPeriodDays,
  postOnlyPeriodStart:
    typeof row?.auto_post_period_start_only === 'boolean'
      ? row.auto_post_period_start_only
      : DEFAULT_AUTO_POST_SETTINGS.postOnlyPeriodStart,
  postPhaseTransitions:
    typeof row?.auto_post_phase_transitions === 'boolean'
      ? row.auto_post_phase_transitions
      : DEFAULT_AUTO_POST_SETTINGS.postPhaseTransitions,
});

const toDayStart = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const selectAutoPostedPeriodSamples = (
  samples: readonly CycleSample[],
  settings: AutoPostSettings,
): CycleSample[] => {
  if (!settings.postPeriodDays || samples.length === 0) {
    return [];
  }
  if (!settings.postOnlyPeriodStart) {
    return [...samples];
  }

  const sorted = [...samples].sort(
    (left, right) =>
      new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
  );
  const selected: CycleSample[] = [];
  let previousDayStart: number | null = null;

  sorted.forEach((sample) => {
    const dayStart = toDayStart(sample.startDate);
    if (dayStart === null) {
      return;
    }
    const startsNewRun = previousDayStart === null || dayStart - previousDayStart > DAY_MS;
    if (startsNewRun) {
      selected.push(sample);
    }
    previousDayStart = dayStart;
  });

  return selected;
};
