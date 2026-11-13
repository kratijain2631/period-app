jest.mock('@kingstinct/react-native-healthkit', () => ({ CategoryValueMenstrualFlow: { none: 5 } }));
import { deriveCycleTimeline, deriveSnapshot, type CycleSample } from '../../../../../packages/domain/cycles/models';
import { selectCycleOverview } from '../cycleOverview';

const sample = (day: number, month = 2): CycleSample => ({ id: `${month}-${day}`, startDate: new Date(2026, month, day, 12).toISOString(), endDate: new Date(2026, month, day, 13).toISOString(), flowValue: 1 });
const now = new Date(2026, 2, 9, 12);
const samples = [sample(1), sample(2), sample(3)];
const snapshot = () => deriveSnapshot(samples, now.toISOString());

it('has explicit loading, unknown and error states without an invented day', () => {
  expect(selectCycleOverview({ snapshot: null, isLoading: true }).state).toBe('loading');
  expect(selectCycleOverview({ snapshot: null, error: true }).state).toBe('error');
  const model = selectCycleOverview({ snapshot: deriveSnapshot([], now.toISOString()), now });
  expect(model).toMatchObject({ state: 'empty', currentDay: null, ranges: [], upcoming: null });
});
it('anchors day 9 at the first day of the latest run, not the last flow sample', () => {
  const model = selectCycleOverview({ snapshot: snapshot(), now });
  expect(model.currentDay).toBe(9);
  expect(model.ranges.map(r => r.phase)).toEqual(['menstruation', 'follicular', 'ovulation', 'luteal', 'pms']);
  expect(model.ranges.reduce((sum, r) => sum + r.endDay - r.startDay + 1, 0)).toBe(model.cycleLength);
  expect(model.ranges.at(-1)?.endDay).toBe(model.cycleLength);
});
it('uses the derived non-28-day cycle and preserves contiguous boundaries', () => {
  const result = deriveCycleTimeline([sample(1, 0), sample(2, 0), sample(31, 0), sample(1, 1)], new Date(2026, 1, 10, 12));
  expect(result.resolved.cycleLengthDays).toBe(30);
  expect(result.currentDay).toBe(11);
  result.ranges.slice(1).forEach((range, index) => expect(range.startDay).toBe(result.ranges[index].endDay + 1));
});
it('keeps stale facts as of sync and hides an expired upcoming claim', () => {
  const model = selectCycleOverview({ snapshot: snapshot(), now: new Date(2026, 3, 12) });
  expect(model).toMatchObject({ stale: true, currentDay: 9, upcoming: null });
});
it('qualifies an observed phase that differs from the estimated day position', () => {
  const data = snapshot();
  data.signalSamples = [{ id: 'test', kind: 'ovulation_test', startDate: now.toISOString(), endDate: now.toISOString(), value: 2 }];
  const model = selectCycleOverview({ snapshot: data, now });
  expect(model).toMatchObject({ phase: 'ovulation', source: 'observed', markerMatchesPhase: false, currentDay: 9 });
});
it('treats invalid sync dates as errors and future flow history as unknown', () => {
  expect(selectCycleOverview({ snapshot: { ...snapshot(), syncedAt: 'bad' }, now }).state).toBe('error');
  expect(deriveCycleTimeline([sample(20)], now).currentDay).toBeNull();
});

it('qualifies retained data when a refresh read fails', () => {
  expect(selectCycleOverview({ snapshot: snapshot(), error: true, now })).toMatchObject({ stale: true, upcoming: null });
});
