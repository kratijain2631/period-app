jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import { deriveSnapshot, type CycleSample } from '../../../../../packages/domain/cycles/models';
import { computeSyncScore } from '../syncScore';

const now = new Date('2026-11-03T12:00:00');

const period = (start: string, lengthDays: number): CycleSample[] =>
  Array.from({ length: lengthDays }, (_, index) => {
    const date = new Date(`${start}T12:00:00`);
    date.setDate(date.getDate() + index);
    return {
      id: `${start}-${index}`,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
      flowValue: 1 as CycleSample['flowValue'],
    };
  });

const snapshotFor = (samples: CycleSample[]) => deriveSnapshot(samples, now.toISOString());

describe('computeSyncScore flow timing', () => {
  it('compares period start dates, so period length does not add days apart', () => {
    const summary = computeSyncScore({
      selfSnapshot: snapshotFor(period('2026-10-25', 3)),
      friendSnapshot: snapshotFor(period('2026-10-25', 7)),
      now,
    });
    expect(summary.metrics.daysApart).toBe(0);
    expect(summary.metrics.flowTiming).toBe(1);
  });

  it('reports the gap between period starts', () => {
    const summary = computeSyncScore({
      selfSnapshot: snapshotFor(period('2026-10-20', 5)),
      friendSnapshot: snapshotFor(period('2026-10-27', 5)),
      now,
    });
    expect(summary.metrics.daysApart).toBe(7);
  });

  it('builds cycle history from whole periods, not single days', () => {
    const summary = computeSyncScore({
      selfSnapshot: snapshotFor([...period('2026-09-01', 5), ...period('2026-09-29', 5), ...period('2026-10-27', 5)]),
      friendSnapshot: snapshotFor([...period('2026-09-04', 4), ...period('2026-10-02', 4), ...period('2026-10-29', 4)]),
      now,
    });
    const rows = summary.cycleTrend;
    expect(rows.map((row) => row.label)).toEqual(['Most recent', 'Previous cycle', 'Two cycles ago']);
    expect(rows.map((row) => row.selfStart.slice(0, 10))).toEqual(['2026-10-27', '2026-09-29', '2026-09-01']);
    expect(rows.map((row) => row.daysApart)).toEqual([2, 3, 3]);
    expect(rows[0].overlapDays).toBe(3);
    expect(rows[0].trend).toBe('closer');
  });
});
