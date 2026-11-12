import { fallbackPhaseGuidance, guidanceMatchesPhase, resolvePhaseGuidance, splitGuidanceTip } from '../guidance';

const current = {
  phase: 'luteal', phase_started_at: '2026-11-01T00:00:00.000Z',
  dos: ['AI do'], donts: ['AI dont'],
};

describe('phase guidance selection', () => {
  it.each(['menstruation', 'follicular', 'ovulation', 'luteal', 'pms', 'unknown', null, 'invalid', '__proto__', 'constructor', 'toString'])(
    'always has useful offline tips for %s', (phase) => {
      const guidance = fallbackPhaseGuidance(phase);
      expect(guidance.dos).toHaveLength(3);
      expect(guidance.donts).toHaveLength(3);
      expect([...guidance.dos, ...guidance.donts].every((tip) => tip.trim().length > 0)).toBe(true);
    },
  );
  it('uses AI only for the same phase occurrence', () => {
    expect(resolvePhaseGuidance(current, 'luteal', current.phase_started_at)).toBe(current);
    expect(resolvePhaseGuidance(current, 'ovulation', current.phase_started_at))
      .toBe(fallbackPhaseGuidance('ovulation'));
    expect(resolvePhaseGuidance(current, 'luteal', '2026-12-01T00:00:00.000Z'))
      .toBe(fallbackPhaseGuidance('luteal'));
  });
  it('does not let empty or legacy guidance suppress fallbacks', () => {
    expect(guidanceMatchesPhase({ ...current, dos: [] }, 'luteal', current.phase_started_at)).toBe(false);
    expect(guidanceMatchesPhase({ ...current, phase_started_at: undefined }, 'luteal', current.phase_started_at)).toBe(false);
    expect(resolvePhaseGuidance(null, 'unknown', null)).toBe(fallbackPhaseGuidance('unknown'));
  });
  it('preserves the full detail, including additional colons', () => {
    expect(splitGuidanceTip(' Try warmth: One option: a warm shower. ')).toEqual({
      title: 'Try warmth', body: 'One option: a warm shower.',
    });
  });
  it('shows legacy one-line tips once, without a repeated body', () => {
    expect(splitGuidanceTip(' Make time for rest ')).toEqual({ title: 'Make time for rest', body: null });
    expect(splitGuidanceTip('Rest:')).toEqual({ title: 'Rest:', body: null });
  });
});
