jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import { deriveSnapshot, type CycleSample } from '../../../../../packages/domain/cycles/models';
import { computeSyncScore, fallbackRecommendations } from '../syncScore';

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
    expect(summary?.metrics.daysApart).toBe(0);
    expect(summary?.metrics.flowTiming).toBe(1);
  });

  it('reports the gap between period starts', () => {
    const summary = computeSyncScore({
      selfSnapshot: snapshotFor(period('2026-10-20', 5)),
      friendSnapshot: snapshotFor(period('2026-10-27', 5)),
      now,
    });
    expect(summary?.metrics.daysApart).toBe(7);
  });
});

describe('computeSyncScore without enough data', () => {
  const withData = snapshotFor(period('2026-10-25', 5));

  it('has no score when either person has no period data', () => {
    const empty = snapshotFor([]);
    expect(computeSyncScore({ selfSnapshot: empty, friendSnapshot: withData, now })).toBeNull();
    expect(computeSyncScore({ selfSnapshot: withData, friendSnapshot: empty, now })).toBeNull();
    expect(computeSyncScore({ selfSnapshot: empty, friendSnapshot: empty, now })).toBeNull();
  });

  it('has no score when a phase is unknown, even with a period on record', () => {
    const unknownPhase = { ...withData, currentPhase: 'unknown' as const };
    expect(computeSyncScore({ selfSnapshot: withData, friendSnapshot: unknownPhase, now })).toBeNull();
  });

  it('scores when both people have a phase and a period start', () => {
    expect(computeSyncScore({ selfSnapshot: withData, friendSnapshot: withData, now })?.score).toEqual(
      expect.any(Number),
    );
  });

  it('leaves out score-based advice when there is no score', () => {
    const recs = fallbackRecommendations({ selfPhase: 'unknown', friendPhase: 'unknown', score: null });
    expect(recs).toHaveLength(3);
    expect(recs.join(' ')).not.toMatch(/high-sync/);
  });
});
