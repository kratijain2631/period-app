jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import {
  countPeriods,
  deriveSnapshot,
  getCycleDay,
  resolveCyclePhase,
  type CycleSample,
  type CycleSignalSample,
} from '../models';

const flowSample = (id: string, startDate: string, endDate = startDate): CycleSample => ({
  id,
  startDate,
  endDate,
  flowValue: 1 as CycleSample['flowValue'],
});

const signalSample = (
  id: string,
  kind: CycleSignalSample['kind'],
  startDate: string,
  value: number,
): CycleSignalSample => ({
  id,
  kind,
  startDate,
  endDate: startDate,
  value,
});

describe('resolveCyclePhase', () => {
  it('returns unknown when no menstrual samples are available', () => {
    const resolved = resolveCyclePhase({
      samples: [],
      signals: [signalSample('ovu-1', 'ovulation_test', '2026-03-14T07:00:00.000Z', 2)],
      referenceDate: new Date('2026-03-14T13:00:00.000Z'),
    });

    expect(resolved.phase).toBe('unknown');
    expect(resolved.source).toBe('unknown');
  });

  it('uses user-average cycle length instead of a fixed 28-day cycle', () => {
    const samples = [
      flowSample('p1d1', '2026-01-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-01-02T08:00:00.000Z'),
      flowSample('p1d3', '2026-01-03T08:00:00.000Z'),
      flowSample('p2d1', '2026-01-30T08:00:00.000Z'),
      flowSample('p2d2', '2026-01-31T08:00:00.000Z'),
      flowSample('p2d3', '2026-02-01T08:00:00.000Z'),
      flowSample('p3d1', '2026-02-27T08:00:00.000Z'),
      flowSample('p3d2', '2026-02-28T08:00:00.000Z'),
      flowSample('p3d3', '2026-03-01T08:00:00.000Z'),
    ];

    const resolved = resolveCyclePhase({
      samples,
      referenceDate: new Date('2026-03-10T10:00:00.000Z'),
    });

    expect(resolved.source).toBe('estimated');
    expect(resolved.cycleLengthDays).toBe(29);
    expect(resolved.phase).toBe('follicular');
  });

  it('marks ovulation as observed when ovulation-test signals are present', () => {
    const samples = [
      flowSample('p1d1', '2026-02-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-02-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-03-01T08:00:00.000Z'),
      flowSample('p2d2', '2026-03-02T08:00:00.000Z'),
    ];
    const signals = [signalSample('ovu-1', 'ovulation_test', '2026-03-14T07:00:00.000Z', 2)];

    const resolved = resolveCyclePhase({
      samples,
      signals,
      referenceDate: new Date('2026-03-14T13:00:00.000Z'),
    });

    expect(resolved.phase).toBe('ovulation');
    expect(resolved.source).toBe('observed');
  });

  it('falls back to estimated phase when optional observed signals are absent', () => {
    const samples = [
      flowSample('p1d1', '2026-01-05T08:00:00.000Z'),
      flowSample('p1d2', '2026-01-06T08:00:00.000Z'),
      flowSample('p2d1', '2026-02-03T08:00:00.000Z'),
      flowSample('p2d2', '2026-02-04T08:00:00.000Z'),
      flowSample('p3d1', '2026-03-04T08:00:00.000Z'),
      flowSample('p3d2', '2026-03-05T08:00:00.000Z'),
    ];

    const resolved = resolveCyclePhase({
      samples,
      signals: [],
      referenceDate: new Date('2026-03-16T08:00:00.000Z'),
    });

    expect(resolved.source).toBe('estimated');
    expect(resolved.phase).not.toBe('unknown');
  });

  it('covers all estimated phases across cycle day boundaries', () => {
    const samples = [
      flowSample('p1d1', '2026-01-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-01-02T08:00:00.000Z'),
      flowSample('p1d3', '2026-01-03T08:00:00.000Z'),
      flowSample('p2d1', '2026-01-30T08:00:00.000Z'),
      flowSample('p2d2', '2026-01-31T08:00:00.000Z'),
      flowSample('p2d3', '2026-02-01T08:00:00.000Z'),
      flowSample('p3d1', '2026-02-28T08:00:00.000Z'),
      flowSample('p3d2', '2026-03-01T08:00:00.000Z'),
      flowSample('p3d3', '2026-03-02T08:00:00.000Z'),
    ];

    const phasesByDate = [
      ['2026-02-28T12:00:00.000Z', 'menstruation', 'observed'],
      ['2026-03-06T12:00:00.000Z', 'follicular', 'estimated'],
      ['2026-03-14T12:00:00.000Z', 'ovulation', 'estimated'],
      ['2026-03-19T12:00:00.000Z', 'luteal', 'estimated'],
      ['2026-03-25T12:00:00.000Z', 'pms', 'estimated'],
    ] as const;

    phasesByDate.forEach(([referenceDate, expectedPhase, expectedSource]) => {
      const resolved = resolveCyclePhase({
        samples,
        signals: [],
        referenceDate: new Date(referenceDate),
      });
      expect(resolved.source).toBe(expectedSource);
      expect(resolved.phase).toBe(expectedPhase);
    });
  });

  it('marks luteal as observed when progesterone signals are present', () => {
    const samples = [
      flowSample('p1d1', '2026-02-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-02-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-03-01T08:00:00.000Z'),
      flowSample('p2d2', '2026-03-02T08:00:00.000Z'),
    ];
    const signals = [signalSample('prog-1', 'progesterone_test', '2026-03-10T07:00:00.000Z', 2)];

    const resolved = resolveCyclePhase({
      samples,
      signals,
      referenceDate: new Date('2026-03-14T13:00:00.000Z'),
    });

    expect(resolved.phase).toBe('luteal');
    expect(resolved.source).toBe('observed');
  });

  it('marks ovulation as observed when peak cervical mucus signals are present', () => {
    const samples = [
      flowSample('p1d1', '2026-02-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-02-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-03-01T08:00:00.000Z'),
      flowSample('p2d2', '2026-03-02T08:00:00.000Z'),
    ];
    const signals = [signalSample('mucus-1', 'cervical_mucus', '2026-03-14T07:00:00.000Z', 4)];

    const resolved = resolveCyclePhase({
      samples,
      signals,
      referenceDate: new Date('2026-03-15T13:00:00.000Z'),
    });

    expect(resolved.phase).toBe('ovulation');
    expect(resolved.source).toBe('observed');
  });

  it('marks luteal as observed when BBT is elevated over baseline', () => {
    const samples = [
      flowSample('p1d1', '2026-02-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-02-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-03-01T08:00:00.000Z'),
      flowSample('p2d2', '2026-03-02T08:00:00.000Z'),
    ];
    const signals: CycleSignalSample[] = [
      signalSample('bbt-recent', 'basal_body_temperature', '2026-03-19T07:00:00.000Z', 36.8),
      signalSample('bbt-base-1', 'basal_body_temperature', '2026-03-14T07:00:00.000Z', 36.3),
      signalSample('bbt-base-2', 'basal_body_temperature', '2026-03-12T07:00:00.000Z', 36.4),
      signalSample('bbt-base-3', 'basal_body_temperature', '2026-03-10T07:00:00.000Z', 36.35),
      signalSample('bbt-base-4', 'basal_body_temperature', '2026-03-08T07:00:00.000Z', 36.45),
    ];

    const resolved = resolveCyclePhase({
      samples,
      signals,
      referenceDate: new Date('2026-03-20T13:00:00.000Z'),
    });

    expect(resolved.phase).toBe('luteal');
    expect(resolved.source).toBe('observed');
  });
});

describe('resolveCyclePhase when a period is late', () => {
  const day = (date: string) => new Date(`${date}T12:00:00`);
  const period = (start: string, lengthDays: number): CycleSample[] =>
    Array.from({ length: lengthDays }, (_, index) => {
      const date = new Date(`${start}T12:00:00`);
      date.setDate(date.getDate() + index);
      return flowSample(`${start}-${index}`, date.toISOString());
    });
  // 28-day cycles; the next period was due 2026-10-26.
  const samples = [...period('2026-08-31', 5), ...period('2026-09-28', 5)];

  it('stays in PMS with no period logged instead of estimating menstruation', () => {
    const due = resolveCyclePhase({ samples, referenceDate: day('2026-10-25') });
    const late = resolveCyclePhase({ samples, referenceDate: day('2026-11-03') });
    expect(due.cycleLengthDays).toBe(28);
    expect(due).toMatchObject({ phase: 'pms', daysLate: null });
    expect(late).toMatchObject({ phase: 'pms', source: 'estimated', daysLate: 8 });
    expect(resolveCyclePhase({ samples, referenceDate: day('2026-10-26') }).daysLate).toBe(0);
  });

  it('keeps the same phase start so no new transition is posted while late', () => {
    const due = resolveCyclePhase({ samples, referenceDate: day('2026-10-25') });
    const late = resolveCyclePhase({ samples, referenceDate: day('2026-11-03') });
    expect(late.currentPhaseStart).toBe(due.currentPhaseStart);
  });

  it('stops predicting the next phase date while overdue', () => {
    const late = resolveCyclePhase({ samples, referenceDate: day('2026-11-03') });
    expect(late.nextPhaseStart).toBeNull();
    expect(late.nextPhase).toBe('menstruation');
  });

  it('becomes unknown 60 days after the latest period started', () => {
    expect(resolveCyclePhase({ samples, referenceDate: day('2026-11-26') }).phase).toBe('pms');
    expect(resolveCyclePhase({ samples, referenceDate: day('2026-11-27') })).toMatchObject({
      phase: 'unknown',
      source: 'unknown',
    });
  });

  it('starts a new cycle as soon as the late period is logged', () => {
    const resolved = resolveCyclePhase({
      samples: [...samples, ...period('2026-11-03', 1)],
      referenceDate: day('2026-11-03'),
    });
    expect(resolved.phase).toBe('menstruation');
    expect(resolved.daysLate ?? null).toBeNull();
  });
});

describe('deriveSnapshot', () => {
  it('persists phase source and personalized cycle metrics', () => {
    const samples = [
      flowSample('p1d1', '2026-01-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-01-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-01-30T08:00:00.000Z'),
      flowSample('p2d2', '2026-01-31T08:00:00.000Z'),
      flowSample('p3d1', '2026-02-27T08:00:00.000Z'),
      flowSample('p3d2', '2026-02-28T08:00:00.000Z'),
    ];

    const snapshot = deriveSnapshot(samples, '2026-03-10T08:00:00.000Z');

    expect(snapshot.phaseSource).toBe('estimated');
    expect(snapshot.cycleLengthDays).toBe(29);
    expect(snapshot.lutealLengthDays).toBeGreaterThanOrEqual(11);
    expect(snapshot.signalSamples).toEqual([]);
  });

  it('anchors currentPhaseStart to a stable day boundary regardless of sync time-of-day', () => {
    const samples = [
      flowSample('p1d1', '2026-01-01T08:00:00.000Z'),
      flowSample('p1d2', '2026-01-02T08:00:00.000Z'),
      flowSample('p2d1', '2026-01-30T08:00:00.000Z'),
      flowSample('p2d2', '2026-01-31T08:00:00.000Z'),
      flowSample('p3d1', '2026-02-27T08:00:00.000Z'),
      flowSample('p3d2', '2026-02-28T08:00:00.000Z'),
    ];

    // Two syncs on the same calendar day, hours apart, must produce the *same*
    // currentPhaseStart so the phase-transition post de-dupes instead of
    // double-posting (regression guard for the "Entered <phase>" duplicate bug).
    const morning = deriveSnapshot(samples, '2026-03-10T09:15:00.000Z');
    const evening = deriveSnapshot(samples, '2026-03-10T21:45:00.000Z');

    expect(morning.currentPhaseStart).toBe(evening.currentPhaseStart);
    // And it is a midnight boundary (no carried time-of-day).
    const anchored = new Date(morning.currentPhaseStart as string);
    expect(anchored.getHours()).toBe(0);
    expect(anchored.getMinutes()).toBe(0);
    expect(anchored.getSeconds()).toBe(0);
  });
});

describe('getCycleDay', () => {
  // Local-time ISO strings so the day boundaries hold in any timezone.
  const day = (date: string) => new Date(`${date}T12:00:00`).toISOString();
  const period = (start: string, lengthDays: number): CycleSample[] =>
    Array.from({ length: lengthDays }, (_, index) => {
      const date = new Date(`${start}T12:00:00`);
      date.setDate(date.getDate() + index);
      return flowSample(`${start}-${index}`, date.toISOString());
    });

  it('counts from the first day of the latest period, not the last', () => {
    const snapshot = deriveSnapshot(period('2026-10-25', 5), day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(10);
  });

  it('is day 1 on the first day of a period and counts up during it', () => {
    const samples = period('2026-11-01', 3);
    const snapshot = deriveSnapshot(samples, day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-11-01')))).toBe(1);
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(3);
  });

  it('uses the most recent period when there is history', () => {
    const samples = [...period('2026-09-27', 5), ...period('2026-10-25', 5)];
    const snapshot = deriveSnapshot(samples, day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(10);
  });

  it('treats one multi-day sample as a single period', () => {
    const samples = [flowSample('range', day('2026-10-25'), day('2026-10-29'))];
    const snapshot = deriveSnapshot(samples, day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(10);
  });

  it('keeps counting when the next period is overdue instead of starting a new cycle', () => {
    const snapshot = deriveSnapshot(period('2026-10-01', 5), day('2026-11-03'));
    // 33 days elapsed in a 28-day cycle.
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(34);
  });

  it('returns null once the latest period is too old to estimate from', () => {
    const snapshot = deriveSnapshot(period('2026-09-01', 5), day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-10-30')))).toBe(60);
    expect(getCycleDay(snapshot, new Date(day('2026-10-31')))).toBeNull();
  });

  it('ignores samples with no flow', () => {
    const none = { ...flowSample('none', day('2026-11-02')), flowValue: 5 as CycleSample['flowValue'] };
    const snapshot = deriveSnapshot([...period('2026-10-25', 5), none], day('2026-11-03'));
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(10);
  });

  it('falls back to latestSampleStart when a snapshot has no samples', () => {
    const snapshot = { samples: [], latestSampleStart: day('2026-10-29'), cycleLengthDays: 28 };
    expect(getCycleDay(snapshot, new Date(day('2026-11-03')))).toBe(6);
  });

  it('returns null with no data or only future data', () => {
    expect(getCycleDay({ samples: [] }, new Date(day('2026-11-03')))).toBeNull();
    expect(getCycleDay(undefined, new Date(day('2026-11-03')))).toBeNull();
    expect(getCycleDay({ samples: period('2026-11-10', 2) }, new Date(day('2026-11-03')))).toBeNull();
  });
});

describe('countPeriods', () => {
  const sample = (id: string, date: string) => flowSample(id, new Date(`${date}T12:00:00`).toISOString());

  it('counts runs of consecutive flow days as one period each', () => {
    expect(countPeriods([])).toBe(0);
    expect(countPeriods([sample('a', '2026-10-01'), sample('b', '2026-10-02')])).toBe(1);
    expect(
      countPeriods([sample('a', '2026-10-01'), sample('b', '2026-10-02'), sample('c', '2026-10-29')]),
    ).toBe(2);
  });
});
