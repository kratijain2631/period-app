import { useMemo } from 'react';
import type { CycleSnapshot } from '../../packages/domain/cycles/models';
import { buildPairComparison, PairActions, PairComparison } from '../../app/features/friends/components/PairComparison';
import type { CirclePerson } from '../../app/features/friends/components/CircleWidgets';

// Stable fixture dates match the rest of the November preview.
const asOf = new Date('2026-11-03T12:00:00Z');
function snapshot(offset: number, phase: CycleSnapshot['currentPhase']): CycleSnapshot {
  const samples = [8, 36, 64].map((days, i) => {
    const start = asOf.getTime() - (days + offset + (offset ? i : 0)) * 86_400_000;
    return { id: String(i), flowValue: 2, startDate: new Date(start).toISOString(), endDate: new Date(start + 4 * 86_400_000).toISOString() };
  });
  return { syncedAt: asOf.toISOString(), currentPhase: phase, cycleLengthDays: 28, samples };
}
export function PreviewPair({ person, offline, onRemove }: { person: CirclePerson; offline: boolean; onRemove: () => void }) {
  const model = useMemo(() => {
    const yours = snapshot(0, 'follicular');
    const theirs = person.score === null ? undefined : snapshot(person.id === 'maya' ? 1 : person.id === 'sam' ? 4 : 3, 'follicular');
    return buildPairComparison(yours, theirs, null, asOf);
  }, [person.id, person.score]);
  return (
    <>
      <PairComparison name={person.name} model={model} />
      <PairActions name={person.name} onBoop={async () => offline ? 'queued' : 'sent'} onRemove={async () => {
        if (offline) throw Error('Offline');
        onRemove();
      }} />
    </>
  );
}
