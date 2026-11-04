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
});
