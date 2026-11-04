/**
 * Creates (or resets) every test persona on the STAGING Supabase project:
 * login, profile, generated cycle history + snapshot, friendships, posts,
 * reactions and boops. Safe to re-run: each run returns personas to the same
 * known state. Refuses to run against production.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deriveSnapshot,
  normalizeFlowSamples,
  normalizeSignalSamples,
  type CycleSignalKind,
} from '../../packages/domain/cycles/models';
import {
  PERSONAS,
  PERSONA_BOOPS,
  PERSONA_FRIENDSHIPS,
  PERSONA_PENDING_REQUESTS,
  PERSONA_POSTS,
  PERSONA_POST_REACTIONS,
  generatePersonaHealthData,
  type Persona,
  type PersonaKey,
} from '../../packages/domain/testing/personas';
import {
  createServiceClient,
  findUsersByEmail,
  loadStagingEnv,
  requirePersonaPassword,
} from './stagingEnv';

/** Feed events are seeded for flow days in this window (older history lives only in the snapshot). */
const FEED_EVENT_WINDOW_DAYS = 35;

const check = <T extends { error: { message: string } | null }>(result: T, what: string): T => {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result;
};

const ensureLogin = async (
  admin: SupabaseClient,
  persona: Persona,
  password: string,
  existingId: string | undefined,
): Promise<string> => {
  const attributes = {
    password,
    email_confirm: true,
    user_metadata: { test_persona: persona.key, full_name: persona.fullName },
  };
  if (existingId) {
    check(await admin.auth.admin.updateUserById(existingId, attributes), `update login ${persona.email}`);
    return existingId;
  }
  const created = check(
    await admin.auth.admin.createUser({ email: persona.email, ...attributes }),
    `create login ${persona.email}`,
  );
  if (!created.data.user) throw new Error(`create login ${persona.email}: no user returned`);
  return created.data.user.id;
};

/** Deletes every row involving a persona so the run starts from a clean slate. */
const wipePersonaData = async (admin: SupabaseClient, ids: string[]) => {
  const steps: Array<[string, string]> = [
    ['post_reactions', 'user_id'],
    ['event_reactions', 'user_id'],
    ['boops', 'from_user_id'],
    ['boops', 'to_user_id'],
    ['notifications', 'user_id'],
    ['notifications', 'friend_id'],
    ['posts', 'user_id'],
    ['friend_requests', 'from_user_id'],
    ['friend_requests', 'to_user_id'],
    ['friend_sharing', 'user_id'],
    ['friend_sharing', 'friend_id'],
    ['cycle_events', 'user_id'],
    ['cycle_snapshots', 'user_id'],
  ];
  for (const [table, column] of steps) {
    check(await admin.from(table).delete().in(column, ids), `clear ${table}.${column}`);
  }
};

const seedProfile = async (admin: SupabaseClient, persona: Persona, userId: string) => {
  check(
    await admin
      .from('users')
      .update({
        full_name: persona.fullName,
        alias: persona.alias,
        bio: persona.bio,
        auto_post_period_days: true,
        auto_post_period_start_only: false,
        auto_post_phase_transitions: true,
        discoverable_by_contacts: false,
      })
      .eq('id', userId),
    `profile ${persona.key}`,
  );
};

const seedCycle = async (admin: SupabaseClient, persona: Persona, userId: string, now: Date) => {
  const data = generatePersonaHealthData(persona, now);
  if (data.flow.length === 0) {
    return { phase: 'none', samples: 0 };
  }
  const samples = normalizeFlowSamples(data.flow);
  const signals = (Object.keys(data.signals) as CycleSignalKind[]).flatMap((kind) =>
    normalizeSignalSamples(data.signals[kind], kind),
  );
  const snapshot = deriveSnapshot(samples, now.toISOString(), signals);

  check(
    await admin
      .from('cycle_snapshots')
      .upsert({ user_id: userId, last_synced_at: snapshot.syncedAt, snapshot }, { onConflict: 'user_id' }),
    `snapshot ${persona.key}`,
  );

  // Mirror what the app's sync posts to the feed for recent period days.
  const windowStart = now.getTime() - FEED_EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const phaseMetadata = {
    phase_source: snapshot.phaseSource ?? 'unknown',
    cycle_length_days: snapshot.cycleLengthDays ?? null,
    luteal_length_days: snapshot.lutealLengthDays ?? null,
  };
  const events = samples
    .filter((s) => new Date(s.startDate).getTime() >= windowStart)
    .map((s) => ({
      user_id: userId,
      event_type: 'menstrual_flow',
      phase: 'menstruation',
      symptoms: { ...(s.metadata ?? {}), ...phaseMetadata },
      starts_at: s.startDate,
    }));
  if (events.length) {
    check(
      await admin.from('cycle_events').upsert(events, { onConflict: 'user_id,starts_at,event_type' }),
      `cycle events ${persona.key}`,
    );
  }
  return { phase: snapshot.currentPhase, samples: samples.length };
};

const seedSocialGraph = async (admin: SupabaseClient, idOf: (key: PersonaKey) => string, now: Date) => {
  for (const [a, b] of PERSONA_FRIENDSHIPS) {
    check(
      await admin
        .from('friend_requests')
        .insert({ from_user_id: idOf(a), to_user_id: idOf(b), status: 'accepted' }),
      `friendship ${a}↔${b}`,
    );
    check(
      await admin.from('friend_sharing').upsert(
        [
          { user_id: idOf(a), friend_id: idOf(b), has_shared: true },
          { user_id: idOf(b), friend_id: idOf(a), has_shared: true },
        ],
        { onConflict: 'user_id,friend_id' },
      ),
      `sharing ${a}↔${b}`,
    );
  }
  for (const { from, to } of PERSONA_PENDING_REQUESTS) {
    check(
      await admin.from('friend_requests').insert({ from_user_id: idOf(from), to_user_id: idOf(to), status: 'pending' }),
      `request ${from}→${to}`,
    );
  }

  const postIds = new Map<string, string>();
  for (const post of PERSONA_POSTS) {
    const persona = PERSONAS.find((p) => p.key === post.author)!;
    const inserted = check(
      await admin
        .from('posts')
        .insert({
          user_id: idOf(post.author),
          alias: persona.alias,
          body: post.body ?? null,
          mood_tag: post.moodTag ?? null,
          created_at: new Date(now.getTime() - post.hoursAgo * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single(),
      `post ${post.label}`,
    );
    postIds.set(post.label, (inserted.data as { id: string }).id);
  }

  for (const reaction of PERSONA_POST_REACTIONS) {
    check(
      await admin
        .from('post_reactions')
        .insert({ post_id: postIds.get(reaction.post), user_id: idOf(reaction.from), emoji: reaction.emoji }),
      `reaction ${reaction.from} on ${reaction.post}`,
    );
  }
  for (const boop of PERSONA_BOOPS) {
    check(
      await admin.from('boops').insert({
        from_user_id: idOf(boop.from),
        to_user_id: idOf(boop.to),
        post_id: boop.post ? postIds.get(boop.post) : null,
      }),
      `boop ${boop.from}→${boop.to}`,
    );
  }
};

export const main = async (_args: string[]) => {
  const env = loadStagingEnv();
  const password = requirePersonaPassword(env);
  const admin = createServiceClient(env);
  const now = new Date();

  console.log(`Seeding ${PERSONAS.length} test personas on ${env.url}\n`);

  const existing = await findUsersByEmail(admin, PERSONAS.map((p) => p.email));
  const ids = new Map<PersonaKey, string>();
  for (const persona of PERSONAS) {
    ids.set(persona.key, await ensureLogin(admin, persona, password, existing.get(persona.email)));
  }
  const idOf = (key: PersonaKey) => {
    const id = ids.get(key);
    if (!id) throw new Error(`No user id for persona ${key}`);
    return id;
  };

  await wipePersonaData(admin, [...ids.values()]);

  const rows: Array<Record<string, string | number>> = [];
  for (const persona of PERSONAS) {
    const userId = idOf(persona.key);
    await seedProfile(admin, persona, userId);
    const cycle = await seedCycle(admin, persona, userId, now);
    rows.push({ persona: persona.key, email: persona.email, phase: cycle.phase, flowSamples: cycle.samples });
  }

  await seedSocialGraph(admin, idOf, now);

  console.table(rows);
  console.log(
    `\n✔ Seeded ${PERSONAS.length} personas, ${PERSONA_FRIENDSHIPS.length} friendships, ` +
      `${PERSONA_POSTS.length} posts. Sign in with any persona email and TEST_PERSONA_PASSWORD from .env.staging.`,
  );
};
