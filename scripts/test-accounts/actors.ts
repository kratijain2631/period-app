/**
 * Plays test personas against STAGING, signed in with their normal password, so
 * every action goes through the same API + row-level security as the app. Keep the
 * simulator signed in as one persona and watch the others interact with it.
 *
 *   npm run test-accounts:actors -- list
 *   npm run test-accounts:actors -- post ava "Cramps again"
 *   npm run test-accounts:actors -- react bea ❤️ ava        # bea reacts to ava's latest post
 *   npm run test-accounts:actors -- boop eli ava
 *   npm run test-accounts:actors -- request fay cleo
 *   npm run test-accounts:actors -- accept cleo             # accept all of cleo's pending requests
 *   npm run test-accounts:actors -- scenario cramps-thread [--delay 3]
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PERSONAS, getPersona, type Persona } from '../../packages/domain/testing/personas';
import { createAnonClient, loadStagingEnv, requirePersonaPassword, type StagingEnv } from './stagingEnv';

type Session = { persona: Persona; client: SupabaseClient; userId: string };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fail = (message: string): never => {
  throw new Error(message);
};

const check = <T extends { error: { message: string } | null }>(result: T, what: string): T => {
  if (result.error) fail(`${what}: ${result.error.message}`);
  return result;
};

class Cast {
  private sessions = new Map<string, Session>();

  constructor(private env: StagingEnv, private password: string) {}

  async as(key: string): Promise<Session> {
    const cached = this.sessions.get(key);
    if (cached) return cached;
    const persona = getPersona(key) ?? fail(`Unknown persona "${key}". Try: ${PERSONAS.map((p) => p.key).join(', ')}`);
    const client = createAnonClient(this.env);
    const { data, error } = await client.auth.signInWithPassword({ email: persona.email, password: this.password });
    if (error || !data.user) {
      fail(`Sign-in failed for ${persona.email}: ${error?.message ?? 'no user'}. Has the seed run?`);
    }
    const session = { persona, client, userId: data.user!.id };
    this.sessions.set(key, session);
    return session;
  }

  async post(key: string, body: string, moodTag?: string) {
    const me = await this.as(key);
    const { data } = check(
      await me.client
        .from('posts')
        .insert({ user_id: me.userId, alias: me.persona.alias, body: body.trim() || null, mood_tag: moodTag ?? null })
        .select('id')
        .single(),
      `${key} post`,
    );
    console.log(`📝 ${key} posted: "${body}"`);
    return (data as { id: string }).id;
  }

  /** Latest post by `author` that `viewerKey` can see (RLS: friends only). */
  async latestPostOf(viewerKey: string, author: string): Promise<string> {
    const viewer = await this.as(viewerKey);
    const target = await this.as(author);
    const { data } = check(
      await viewer.client
        .from('posts')
        .select('id')
        .eq('user_id', target.userId)
        .order('created_at', { ascending: false })
        .limit(1),
      `find ${author}'s latest post`,
    );
    const row = (data as Array<{ id: string }>)[0];
    return row?.id ?? fail(`${viewerKey} can't see any post by ${author} (are they friends?)`);
  }

  async react(key: string, emoji: string, author: string) {
    const me = await this.as(key);
    const postId = await this.latestPostOf(key, author);
    const result = await me.client.from('post_reactions').insert({ post_id: postId, user_id: me.userId, emoji });
    if (result.error && result.error.code !== '23505') fail(`${key} react: ${result.error.message}`);
    console.log(`${emoji} ${key} reacted to ${author}'s latest post`);
  }

  async boop(key: string, to: string) {
    const me = await this.as(key);
    const target = await this.as(to);
    check(
      await me.client.from('boops').insert({ from_user_id: me.userId, to_user_id: target.userId }),
      `${key} boop ${to}`,
    );
    console.log(`👉 ${key} booped ${to}`);
  }

  async request(key: string, to: string) {
    const me = await this.as(key);
    const target = await this.as(to);
    check(
      await me.client
        .from('friend_requests')
        .insert({ from_user_id: me.userId, to_user_id: target.userId, status: 'pending' }),
      `${key} friend request to ${to}`,
    );
    console.log(`🤝 ${key} sent a friend request to ${to}`);
  }

  async accept(key: string) {
    const me = await this.as(key);
    const { data } = check(
      await me.client.from('friend_requests').select('id').eq('to_user_id', me.userId).eq('status', 'pending'),
      `${key} pending requests`,
    );
    const ids = (data as Array<{ id: string }>).map((r) => r.id);
    if (!ids.length) {
      console.log(`(${key} has no pending friend requests)`);
      return;
    }
    check(await me.client.from('friend_requests').update({ status: 'accepted' }).in('id', ids), `${key} accept`);
    check(await me.client.rpc('ensure_friend_sharing', { request_ids: ids }), `${key} ensure sharing`);
    console.log(`✅ ${key} accepted ${ids.length} friend request(s)`);
  }

  // Local sign-out only: a global sign-out would also end the simulator's session
  // when it is signed in as the same persona.
  async signOutAll() {
    await Promise.all([...this.sessions.values()].map((s) => s.client.auth.signOut({ scope: 'local' })));
  }
}

type Scenario = { description: string; run: (cast: Cast, pause: () => Promise<void>) => Promise<void> };

const SCENARIOS: Record<string, Scenario> = {
  'cramps-thread': {
    description: 'Ava posts about cramps; Bea and Eli react; Bea boops Ava. Watch as ava.',
    run: async (cast, pause) => {
      await cast.post('ava', 'Day 2 cramps are no joke today.');
      await pause();
      await cast.react('bea', '❤️', 'ava');
      await pause();
      await cast.react('eli', '😭', 'ava');
      await pause();
      await cast.boop('bea', 'ava');
    },
  },
  'new-friend': {
    description: 'Fay sends Cleo a friend request, then Cleo accepts it. Watch as cleo or fay.',
    run: async (cast, pause) => {
      await cast.request('fay', 'cleo');
      await pause();
      await cast.accept('cleo');
    },
  },
  'busy-feed': {
    description: 'Every cycling persona posts a quick update, then Ava reacts to each friend. Watch as ava.',
    run: async (cast, pause) => {
      await cast.post('bea', 'BBT jumped this morning, called it.');
      await pause();
      await cast.post('cleo', 'Still figuring this tracking thing out.');
      await pause();
      await cast.post('eli', 'Snacks. Now.');
      await pause();
      for (const friend of ['bea', 'cleo', 'eli']) {
        await cast.react('ava', '🔥', friend);
        await pause();
      }
    },
  },
};

const printHelp = () => {
  console.log('Personas:');
  PERSONAS.forEach((p) => console.log(`  ${p.key.padEnd(5)} ${p.email.padEnd(28)} ${p.purpose}`));
  console.log('\nScenarios:');
  Object.entries(SCENARIOS).forEach(([name, s]) => console.log(`  ${name.padEnd(14)} ${s.description}`));
  console.log('\nCommands: list | post <who> <text> | react <who> <emoji> <author> | boop <who> <to>');
  console.log('          request <who> <to> | accept <who> | scenario <name> [--delay seconds]');
};

export const main = async (args: string[]) => {
  const [command, ...rest] = args;
  if (!command || command === 'list' || command === 'help') {
    printHelp();
    return;
  }

  const env = loadStagingEnv();
  const cast = new Cast(env, requirePersonaPassword(env));
  try {
    switch (command) {
      case 'post':
        if (rest.length < 2) fail('Usage: post <who> <text>');
        await cast.post(rest[0], rest.slice(1).join(' '));
        break;
      case 'react':
        if (rest.length < 3) fail('Usage: react <who> <emoji> <author>');
        await cast.react(rest[0], rest[1], rest[2]);
        break;
      case 'boop':
        if (rest.length < 2) fail('Usage: boop <who> <to>');
        await cast.boop(rest[0], rest[1]);
        break;
      case 'request':
        if (rest.length < 2) fail('Usage: request <who> <to>');
        await cast.request(rest[0], rest[1]);
        break;
      case 'accept':
        if (rest.length < 1) fail('Usage: accept <who>');
        await cast.accept(rest[0]);
        break;
      case 'scenario': {
        const scenario = SCENARIOS[rest[0]] ?? fail(`Unknown scenario "${rest[0] ?? ''}". Run "list" to see them.`);
        const delayIndex = rest.indexOf('--delay');
        const delaySeconds = delayIndex >= 0 ? Number(rest[delayIndex + 1]) : 2;
        const pause = () => sleep((Number.isFinite(delaySeconds) ? delaySeconds : 2) * 1000);
        console.log(`▶ ${rest[0]}: ${scenario.description}\n`);
        await scenario.run(cast, pause);
        break;
      }
      default:
        fail(`Unknown command "${command}". Run "list" for help.`);
    }
  } finally {
    await cast.signOutAll();
  }
};
