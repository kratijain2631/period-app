jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import {
  deriveSnapshot,
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
});
