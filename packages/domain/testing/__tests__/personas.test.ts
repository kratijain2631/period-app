jest.mock('@kingstinct/react-native-healthkit', () => ({
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import { deriveSnapshot, getCycleDay, normalizeFlowSamples, normalizeSignalSamples } from '../../cycles/models';
import type { CycleSignalKind } from '../../cycles/models';
import {
  PERSONAS,
  PERSONA_BOOPS,
  PERSONA_FRIENDSHIPS,
  PERSONA_PENDING_REQUESTS,
  PERSONA_POSTS,
  PERSONA_POST_REACTIONS,
  generatePersonaHealthData,
  getPersona,
  personaFromEmail,
} from '../personas';

const NOW = new Date(2026, 10, 3, 12, 0, 0); // 3 Nov 2026, local noon

const snapshotFor = (key: string, now = NOW) => {
  const persona = getPersona(key)!;
  const data = generatePersonaHealthData(persona, now);
  const signals = (Object.keys(data.signals) as CycleSignalKind[]).flatMap((kind) =>
    normalizeSignalSamples(data.signals[kind], kind),
  );
  return { data, snapshot: deriveSnapshot(normalizeFlowSamples(data.flow), now.toISOString(), signals) };
};

describe('test personas', () => {
  it('has unique keys, emails and aliases', () => {
    const keys = PERSONAS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(PERSONAS.map((p) => p.email)).size).toBe(keys.length);
    expect(new Set(PERSONAS.map((p) => p.alias)).size).toBe(keys.length);
  });

  it('shows each persona the cycle day their history implies', () => {
    expect(getCycleDay(snapshotFor('ava').snapshot, NOW)).toBe(10);
    expect(getCycleDay(snapshotFor('eli').snapshot, NOW)).toBe(26);
    expect(getCycleDay(snapshotFor('cleo').snapshot, NOW)).toBe(3);
    expect(getCycleDay(snapshotFor('dev').snapshot, NOW)).toBeNull();
  });

  it('only references known personas and posts in the social seed', () => {
    const keys = new Set(PERSONAS.map((p) => p.key));
    const labels = new Set(PERSONA_POSTS.map((p) => p.label));
    PERSONA_FRIENDSHIPS.forEach(([a, b]) => {
      expect(keys.has(a) && keys.has(b) && a !== b).toBe(true);
    });
    PERSONA_PENDING_REQUESTS.forEach(({ from, to }) => expect(keys.has(from) && keys.has(to)).toBe(true));
    PERSONA_POSTS.forEach((post) => expect(keys.has(post.author)).toBe(true));
    PERSONA_POST_REACTIONS.forEach((r) => {
      expect(labels.has(r.post)).toBe(true);
      expect(keys.has(r.from)).toBe(true);
    });
    PERSONA_BOOPS.forEach((b) => {
      expect(keys.has(b.from) && keys.has(b.to)).toBe(true);
      if (b.post) expect(labels.has(b.post)).toBe(true);
    });
  });

  it('maps login emails back to personas, case-insensitively', () => {
    expect(personaFromEmail('AVA@personas.example.com')?.key).toBe('ava');
    expect(personaFromEmail('someone@else.com')).toBeUndefined();
    expect(personaFromEmail(null)).toBeUndefined();
  });

  it('is deterministic for the same day', () => {
    const a = generatePersonaHealthData(getPersona('bea')!, NOW);
    const b = generatePersonaHealthData(getPersona('bea')!, new Date(2026, 10, 3, 18, 0, 0));
    expect(b).toEqual(a);
  });

  it('never generates samples in the future', () => {
    PERSONAS.forEach((persona) => {
      const data = generatePersonaHealthData(persona, NOW);
      const all = [...data.flow, ...Object.values(data.signals).flat()];
      all.forEach((sample) => expect(sample.startDate.getTime()).toBeLessThanOrEqual(NOW.getTime()));
    });
  });

  it('gives ava a complete, regular ~28 day cycle', () => {
    const { data, snapshot } = snapshotFor('ava');
    expect(data.periodStarts).toHaveLength(7);
    expect(snapshot.currentPhase).not.toBe('unknown');
    expect(snapshot.cycleLengthDays).toBeGreaterThanOrEqual(27);
    expect(snapshot.cycleLengthDays).toBeLessThanOrEqual(29);
    expect(snapshot.nextPhaseStart).toBeTruthy();
  });

  it('gives bea fertility signals alongside flow', () => {
    const { data } = snapshotFor('bea');
    expect(data.signals.ovulation_test.length).toBeGreaterThan(0);
    expect(data.signals.basal_body_temperature.length).toBeGreaterThan(0);
    expect(data.signals.ovulation_test.some((s) => s.value === 2)).toBe(true);
  });

  it('puts cleo on her first period', () => {
    const { data, snapshot } = snapshotFor('cleo');
    expect(data.periodStarts).toHaveLength(1);
    expect(data.flow).toHaveLength(3); // started 2 days ago → days 0, 1, 2 so far
    expect(snapshot.currentPhase).toBe('menstruation');
  });

  it('gives dev no cycle data at all', () => {
    const { data, snapshot } = snapshotFor('dev');
    expect(data.flow).toHaveLength(0);
    expect(snapshot.currentPhase).toBe('unknown');
  });

  it('puts eli late in her cycle', () => {
    const { snapshot } = snapshotFor('eli');
    expect(['luteal', 'pms']).toContain(snapshot.currentPhase);
  });
});
