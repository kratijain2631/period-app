import type { CycleSample } from '../../../../packages/domain/cycles/models';
import {
  DEFAULT_AUTO_POST_SETTINGS,
  selectAutoPostedPeriodSamples,
} from '../autoPostSettings';

const sample = (id: string, startDate: string): CycleSample => ({
  id,
  startDate,
  endDate: startDate,
  flowValue: 1 as CycleSample['flowValue'],
});

describe('selectAutoPostedPeriodSamples', () => {
  it('returns no samples when period-day posting is disabled', () => {
    const samples = [sample('a', '2026-02-01T08:00:00.000Z')];
    const result = selectAutoPostedPeriodSamples(samples, {
      ...DEFAULT_AUTO_POST_SETTINGS,
      postPeriodDays: false,
    });

    expect(result).toEqual([]);
  });

  it('returns all samples when first-day-only mode is off', () => {
    const samples = [
      sample('a', '2026-02-01T08:00:00.000Z'),
      sample('b', '2026-02-02T08:00:00.000Z'),
      sample('c', '2026-02-10T08:00:00.000Z'),
    ];
    const result = selectAutoPostedPeriodSamples(samples, DEFAULT_AUTO_POST_SETTINGS);

    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns only first-day entries of each contiguous period run', () => {
    const samples = [
      sample('d', '2026-02-11T10:00:00.000Z'),
      sample('b', '2026-02-02T12:00:00.000Z'),
      sample('a', '2026-02-01T08:00:00.000Z'),
      sample('c', '2026-02-03T09:00:00.000Z'),
      sample('e', '2026-02-11T18:00:00.000Z'),
    ];
    const result = selectAutoPostedPeriodSamples(samples, {
      ...DEFAULT_AUTO_POST_SETTINGS,
      postOnlyPeriodStart: true,
    });

    expect(result.map((item) => item.id)).toEqual(['a', 'd']);
  });
});
