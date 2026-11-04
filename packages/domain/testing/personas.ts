/**
 * Test personas: code-defined test accounts with deterministic, generated
 * Apple Health cycle history. Shared by:
 *  - the staging seed script (scripts/test-accounts) to create accounts + data
 *  - the dev-only fake Health source (app/services/healthkit/fakeHealthClient.ts)
 *
 * Pure TypeScript — no React Native imports — so it runs under Node as well as in
 * the app. Never import this from production code paths; it is dev/test only.
 */
import type { CycleSignalKind, RawFlowSample, RawSignalSample } from '../cycles/models';

export const PERSONA_EMAIL_DOMAIN = 'personas.example.com';

export type PersonaKey = 'ava' | 'bea' | 'cleo' | 'dev' | 'eli' | 'fay';

export type CycleProfile =
  | { kind: 'none' }
  | {
      kind: 'cycling';
      /** Typical cycle length in days. */
      cycleLengthDays: number;
      /** Each past cycle varies by up to ± this many days (0 = perfectly regular). */
      cycleLengthJitterDays: number;
      /** Days of flow per period. */
      periodLengthDays: number;
      /** How many days ago the most recent period started (0 = today). */
      daysSinceLastPeriodStart: number;
      /** Number of periods to generate, counting the most recent one. */
      historyCycles: number;
      /** Optional fertility signals to log alongside flow. */
      signals?: ReadonlyArray<'ovulation_test' | 'basal_body_temperature'>;
    };

export type Persona = {
  key: PersonaKey;
  email: string;
  fullName: string;
  alias: string;
  bio: string;
  /** Why this persona exists — what it is meant to exercise. */
  purpose: string;
  cycle: CycleProfile;
};

const persona = (p: Omit<Persona, 'email'>): Persona => ({
  ...p,
  email: `${p.key}@${PERSONA_EMAIL_DOMAIN}`,
});

export const PERSONAS: readonly Persona[] = [
  persona({
    key: 'ava',
    fullName: 'Ava Test',
    alias: 'Ava',
    bio: 'Regular cycler. The happy path.',
    purpose: 'Happy path: regular 28-day cycle with 6 months of history; every screen should look complete.',
    cycle: {
      kind: 'cycling',
      cycleLengthDays: 28,
      cycleLengthJitterDays: 1,
      periodLengthDays: 5,
      daysSinceLastPeriodStart: 9,
      historyCycles: 7,
    },
  }),
  persona({
    key: 'bea',
    fullName: 'Bea Test',
    alias: 'Bea',
    bio: 'Irregular cycles, logs everything.',
    purpose: 'Irregular 24–36 day cycles with ovulation tests + basal temperature; exercises observed (signal-based) phases.',
    cycle: {
      kind: 'cycling',
      cycleLengthDays: 30,
      cycleLengthJitterDays: 6,
      periodLengthDays: 6,
      daysSinceLastPeriodStart: 16,
      historyCycles: 6,
      signals: ['ovulation_test', 'basal_body_temperature'],
    },
  }),
  persona({
    key: 'cleo',
    fullName: 'Cleo Test',
    alias: 'Cleo',
    bio: 'Just started tracking.',
    purpose: 'Brand-new user with a single logged period (currently on it); first-week experience with little data.',
    cycle: {
      kind: 'cycling',
      cycleLengthDays: 28,
      cycleLengthJitterDays: 0,
      periodLengthDays: 5,
      daysSinceLastPeriodStart: 2,
      historyCycles: 1,
    },
  }),
  persona({
    key: 'dev',
    fullName: 'Dev Test',
    alias: 'Dev',
    bio: 'Supportive friend, no cycle data.',
    purpose: 'No cycle data at all (e.g. a partner or male friend); exercises the empty / no-data states.',
    cycle: { kind: 'none' },
  }),
  persona({
    key: 'eli',
    fullName: 'Eli Test',
    alias: 'Eli',
    bio: 'Period due any day now.',
    purpose: 'Late luteal / PMS window today; phase-transition posts, reminders and sync-score edge cases.',
    cycle: {
      kind: 'cycling',
      cycleLengthDays: 28,
      cycleLengthJitterDays: 1,
      periodLengthDays: 4,
      daysSinceLastPeriodStart: 25,
      historyCycles: 6,
    },
  }),
  persona({
    key: 'fay',
    fullName: 'Fay Test',
    alias: 'Fay',
    bio: 'New here, no friends yet.',
    purpose: 'Has an incoming friend request from Ava and no friends; exercises the friend-request flows.',
    cycle: {
      kind: 'cycling',
      cycleLengthDays: 31,
      cycleLengthJitterDays: 2,
      periodLengthDays: 5,
      daysSinceLastPeriodStart: 18,
      historyCycles: 5,
    },
  }),
];

// ---- Social graph seeded between personas ---------------------------------

/** Accepted friendships (mutual sharing on). */
export const PERSONA_FRIENDSHIPS: ReadonlyArray<readonly [PersonaKey, PersonaKey]> = [
  ['ava', 'bea'],
  ['ava', 'cleo'],
  ['ava', 'eli'],
  ['ava', 'dev'],
  ['bea', 'eli'],
  ['bea', 'dev'],
];

/** Pending friend requests (from → to). */
export const PERSONA_PENDING_REQUESTS: ReadonlyArray<{ from: PersonaKey; to: PersonaKey }> = [
  { from: 'ava', to: 'fay' },
];

export type PersonaPostSeed = {
  /** Local label so reactions/boops can refer to the post. */
  label: string;
  author: PersonaKey;
  body?: string;
  moodTag?: string;
  hoursAgo: number;
};

export const PERSONA_POSTS: readonly PersonaPostSeed[] = [
  { label: 'ava-cramps', author: 'ava', body: 'Cramps are winning today. Heating pad and tea.', hoursAgo: 30 },
  { label: 'bea-ovulation', author: 'bea', body: 'Positive ovulation test this morning, feeling great.', hoursAgo: 20 },
  { label: 'eli-pms', author: 'eli', body: 'PMS mood: eat everything, talk to no one.', hoursAgo: 6 },
  { label: 'cleo-first', author: 'cleo', body: 'First time tracking! Day 1 was rough.', hoursAgo: 3 },
  { label: 'dev-support', author: 'dev', body: 'Snack deliveries available on request.', hoursAgo: 2 },
  { label: 'eli-boop', author: 'eli', moodTag: 'Boop me', hoursAgo: 1 },
];

export const PERSONA_POST_REACTIONS: ReadonlyArray<{ post: string; from: PersonaKey; emoji: string }> = [
  { post: 'ava-cramps', from: 'bea', emoji: '❤️' },
  { post: 'ava-cramps', from: 'eli', emoji: '😭' },
  { post: 'bea-ovulation', from: 'ava', emoji: '🔥' },
  { post: 'eli-pms', from: 'ava', emoji: '😂' },
  { post: 'cleo-first', from: 'ava', emoji: '👏' },
  { post: 'dev-support', from: 'bea', emoji: '❤️' },
];

export const PERSONA_BOOPS: ReadonlyArray<{ from: PersonaKey; to: PersonaKey; post?: string }> = [
  { from: 'ava', to: 'eli', post: 'eli-boop' },
  { from: 'dev', to: 'ava', post: 'ava-cramps' },
];

// ---- Lookup helpers -------------------------------------------------------

export const getPersona = (key: string): Persona | undefined =>
  PERSONAS.find((p) => p.key === key);

/** Maps a persona login email (e.g. `ava@personas.example.com`) to its persona. */
export const personaFromEmail = (email: string | null | undefined): Persona | undefined => {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return PERSONAS.find((p) => p.email === normalized);
};

// ---- Deterministic Health data generator ----------------------------------

// HKCategoryValueMenstrualFlow raw values (avoids importing the native library here).
const FLOW_LIGHT = 2;
const FLOW_MEDIUM = 3;
const FLOW_HEAVY = 4;
// HKCategoryValueOvulationTestResult raw values.
const OVULATION_NEGATIVE = 1;
const OVULATION_LH_SURGE = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Small deterministic PRNG (mulberry32) so a persona's history is stable across runs. */
const createRng = (seedText: string) => {
  let seed = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const localDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/** A sample logged mid-morning on a given local day (keeps it inside one calendar day). */
const sampleAt = (day: Date, hour = 9) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);

export type PersonaHealthData = {
  flow: RawFlowSample[];
  signals: Record<CycleSignalKind, RawSignalSample[]>;
  /** Local-midnight dates each generated period started on, oldest first. */
  periodStarts: Date[];
};

const emptySignals = (): Record<CycleSignalKind, RawSignalSample[]> => ({
  ovulation_test: [],
  progesterone_test: [],
  cervical_mucus: [],
  basal_body_temperature: [],
});

/**
 * Generates a persona's Apple Health-style cycle history relative to `now`.
 * Deterministic for a given persona + calendar day. Nothing is generated in the future.
 */
export const generatePersonaHealthData = (
  p: Persona,
  now: Date = new Date(),
): PersonaHealthData => {
  const signals = emptySignals();
  if (p.cycle.kind === 'none') {
    return { flow: [], signals, periodStarts: [] };
  }

  const profile = p.cycle;
  const rng = createRng(p.key);
  const today = localDayStart(now);

  // Walk backwards from the most recent period start.
  const periodStarts: Date[] = [addDays(today, -profile.daysSinceLastPeriodStart)];
  for (let i = 1; i < profile.historyCycles; i += 1) {
    const jitter =
      profile.cycleLengthJitterDays > 0
        ? Math.round((rng() * 2 - 1) * profile.cycleLengthJitterDays)
        : 0;
    periodStarts.unshift(addDays(periodStarts[0], -(profile.cycleLengthDays + jitter)));
  }

  const flow: RawFlowSample[] = [];
  periodStarts.forEach((start) => {
    for (let d = 0; d < profile.periodLengthDays; d += 1) {
      const day = addDays(start, d);
      if (day.getTime() > today.getTime()) break;
      const value = d === 0 ? FLOW_HEAVY : d === 1 ? FLOW_MEDIUM : FLOW_LIGHT;
      const at = sampleAt(day);
      flow.push({
        uuid: `persona-${p.key}-flow-${dateKey(day)}`,
        startDate: at,
        endDate: new Date(at.getTime() + 60 * 1000),
        value: value as RawFlowSample['value'],
        metadata: d === 0 ? { HKMenstrualCycleStart: true } : { HKMenstrualCycleStart: false },
      });
    }
  });

  const wanted = new Set(profile.signals ?? []);
  if (wanted.size > 0) {
    // Cycle boundaries: each period start, plus the predicted next one.
    const boundaries = [...periodStarts, addDays(periodStarts[periodStarts.length - 1], profile.cycleLengthDays)];
    for (let c = 0; c < boundaries.length - 1; c += 1) {
      const cycleStart = boundaries[c];
      const nextStart = boundaries[c + 1];
      const ovulationDay = addDays(nextStart, -14);

      if (wanted.has('ovulation_test')) {
        for (let offset = -3; offset <= 0; offset += 1) {
          const day = addDays(ovulationDay, offset);
          if (day.getTime() > today.getTime() || day.getTime() < cycleStart.getTime()) continue;
          const at = sampleAt(day, 8);
          signals.ovulation_test.push({
            uuid: `persona-${p.key}-ovulation-${dateKey(day)}`,
            startDate: at,
            endDate: at,
            value: offset === -1 ? OVULATION_LH_SURGE : OVULATION_NEGATIVE,
          });
        }
      }

      if (wanted.has('basal_body_temperature')) {
        for (let day = cycleStart; day.getTime() < nextStart.getTime(); day = addDays(day, 1)) {
          if (day.getTime() > today.getTime()) break;
          // Only the last ~60 days, like a realistic recent log.
          if (today.getTime() - day.getTime() > 60 * DAY_MS) continue;
          const afterOvulation = day.getTime() > ovulationDay.getTime();
          const base = afterOvulation ? 36.7 : 36.35;
          const noise = Math.round((rng() * 0.1 - 0.05) * 100) / 100;
          const at = sampleAt(day, 6);
          signals.basal_body_temperature.push({
            uuid: `persona-${p.key}-bbt-${dateKey(day)}`,
            startDate: at,
            endDate: at,
            value: Math.round((base + noise) * 100) / 100,
          });
        }
      }
    }
  }

  return { flow, signals, periodStarts };
};
