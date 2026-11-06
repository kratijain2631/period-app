/**
 * Checks that friend requests can't be forged, signed in as personas with the public
 * key, so every write goes through the same row-level security as the app. Staging only.
 *
 *   npm run test-accounts:rls
 *
 * The request checks use only the cleo/fay/dev pairs, which have no seeded requests
 * between them. The visibility checks rely on the seeded friendships: ava is friends
 * with bea, cleo and eli, bea is friends with eli, and fay has only a pending request.
 * Everything created here is removed afterwards.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPersona } from '../../packages/domain/testing/personas';
import { createAnonClient, createServiceClient, loadStagingEnv, requirePersonaPassword } from './stagingEnv';

type RequestRow = { id: string; from_user_id: string; to_user_id: string; status: string };

type Persona = { client: SupabaseClient; id: string };
type Record = (name: string, pass: boolean, detail?: string) => void;

const checkSearch = async (signIn: (key: string) => Promise<Persona>, anon: SupabaseClient, record: Record) => {
  const fay = await signIn('fay');
  const search = async (client: SupabaseClient, term: string, maxResults?: number | null) => {
    const { data, error } = await client.rpc('search_users', {
      search: term,
      ...(maxResults === undefined ? {} : { max_results: maxResults }),
    });
    return { rows: (data ?? []) as Array<{ id: string; alias: string }>, error };
  };

  record('search with no login is rejected', Boolean((await search(anon, 'Bea')).error));
  const normal = await search(fay.client, 'Be');
  record('friend search finds people by alias prefix', normal.rows.some((row) => row.alias === 'Bea'), normal.error?.message);
  record('friend search ignores case', (await search(fay.client, 'bea')).rows.some((row) => row.alias === 'Bea'));
  record('search leaves out the caller', (await search(fay.client, 'Fa')).rows.every((row) => row.id !== fay.id));
  record('a one-letter search returns nothing', (await search(fay.client, 'B')).rows.length === 0);
  record('"%" as a search term lists nobody', (await search(fay.client, '%%', null)).rows.length === 0);
  record('"_" as a wildcard matches nobody', (await search(fay.client, '__', null)).rows.length === 0);
  record('a wildcard inside the term matches nobody', (await search(fay.client, 'B%', null)).rows.length === 0);
  record('a search with no limit still works', (await search(fay.client, 'Be', null)).rows.length > 0);
  await fay.client.auth.signOut();
};

const checkReactionsAndBoops = async (
  signIn: (key: string) => Promise<Persona>,
  anon: SupabaseClient,
  admin: SupabaseClient,
  record: Record,
) => {
  const [ava, bea, cleo, eli, fay] = await Promise.all(['ava', 'bea', 'cleo', 'eli', 'fay'].map(signIn));
  const startedAt = new Date().toISOString();
  const posted = await ava.client.from('posts').insert({ user_id: ava.id, body: 'RLS check' }).select('id').single();
  if (posted.error) throw new Error(`RLS check post failed: ${posted.error.message}`);
  const postId = (posted.data as { id: string }).id;

  const reactionUsers = async (client: SupabaseClient) => {
    const { data } = await client.from('post_reactions').select('user_id').eq('post_id', postId);
    return ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
  };
  const boopSenders = async (client: SupabaseClient) => {
    const { data } = await client.from('boops').select('from_user_id').eq('post_id', postId);
    return ((data ?? []) as Array<{ from_user_id: string }>).map((row) => row.from_user_id);
  };

  try {
    const made = await Promise.all([
      bea.client.from('post_reactions').insert({ post_id: postId, user_id: bea.id, emoji: '🔒' }),
      bea.client.from('boops').insert({ from_user_id: bea.id, to_user_id: ava.id, post_id: postId }),
      cleo.client.from('boops').insert({ from_user_id: cleo.id, to_user_id: eli.id, post_id: postId }),
    ]);
    const madeError = made.find((result) => result.error)?.error;
    if (madeError) throw new Error(`RLS check setup failed: ${madeError.message}`);

    record('the person who reacted sees their reaction', (await reactionUsers(bea.client)).includes(bea.id));
    record('the post author sees reactions on their post', (await reactionUsers(ava.client)).includes(bea.id));
    record("a reactor's friend sees the reaction", (await reactionUsers(eli.client)).includes(bea.id));
    record('a friend of a friend does not see the reaction', !(await reactionUsers(cleo.client)).includes(bea.id));
    record('a stranger with only a pending request sees no reactions', (await reactionUsers(fay.client)).length === 0);
    record('no login sees no reactions', (await reactionUsers(anon)).length === 0);

    record('the booper sees their boop', (await boopSenders(bea.client)).includes(bea.id));
    record('the post author sees boops on their post', (await boopSenders(ava.client)).includes(cleo.id));
    record('the boop recipient sees the boop', (await boopSenders(eli.client)).includes(cleo.id));
    record("a booper's friend sees the boop", (await boopSenders(eli.client)).includes(bea.id));
    record('a friend of a friend does not see the boop', !(await boopSenders(bea.client)).includes(cleo.id));
    record('a stranger with only a pending request sees no boops', (await boopSenders(fay.client)).length === 0);
    record('no login sees no boops', (await boopSenders(anon)).length === 0);
  } finally {
    await admin.from('post_reactions').delete().eq('post_id', postId);
    await admin.from('boops').delete().eq('post_id', postId);
    await admin.from('posts').delete().eq('id', postId);
    await admin
      .from('notifications')
      .delete()
      .in('user_id', [ava.id, eli.id])
      .gte('created_at', startedAt);
    await Promise.all([ava, bea, cleo, eli, fay].map(({ client }) => client.auth.signOut()));
  }
};

export const main = async () => {
  const env = loadStagingEnv();
  const password = requirePersonaPassword(env);
  const admin = createServiceClient(env);

  const signIn = async (key: string): Promise<Persona> => {
    const client = createAnonClient(env);
    const { data, error } = await client.auth.signInWithPassword({ email: getPersona(key)!.email, password });
    if (error || !data.user) throw new Error(`Sign-in failed for ${key}: ${error?.message ?? 'no user'}`);
    return { client, id: data.user.id };
  };
  const [cleo, fay, dev] = await Promise.all([signIn('cleo'), signIn('fay'), signIn('dev')]);
  const ids = [cleo.id, fay.id, dev.id];

  const cleanUp = async () => {
    await admin.from('friend_requests').delete().in('from_user_id', ids).in('to_user_id', ids);
    await admin.from('friend_sharing').delete().in('user_id', ids).in('friend_id', ids);
  };
  const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
  const record: Record = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` (${detail})` : ''}`);
  };
  const insertAs = (client: SupabaseClient, from: string, to: string, status: string) =>
    client.from('friend_requests').insert({ from_user_id: from, to_user_id: to, status }).select('id').single();
  const rowById = async (id: string) =>
    (await admin.from('friend_requests').select('id, from_user_id, to_user_id, status').eq('id', id).single())
      .data as RequestRow;
  const canSee = async (client: SupabaseClient, userId: string) => {
    const { data, error } = await client.rpc('friend_cycle_summaries');
    if (error) throw new Error(`friend_cycle_summaries: ${error.message}`);
    return ((data ?? []) as Array<{ user_id: string }>).some((row) => row.user_id === userId);
  };

  await cleanUp();
  try {
    const accepted = await insertAs(cleo.client, cleo.id, fay.id, 'accepted');
    record('inserting an already-accepted request is rejected', Boolean(accepted.error));
    await cleanUp();

    const self = await insertAs(cleo.client, cleo.id, cleo.id, 'pending');
    record('requesting yourself is rejected', Boolean(self.error));
    await cleanUp();

    const pending = await insertAs(dev.client, dev.id, cleo.id, 'pending');
    if (pending.error) throw new Error(`Normal pending insert failed: ${pending.error.message}`);
    const requestId = (pending.data as { id: string }).id;

    await cleo.client.from('friend_requests').update({ from_user_id: fay.id, status: 'accepted' }).eq('id', requestId);
    const afterForge = await rowById(requestId);
    record(
      'a recipient cannot change who sent a request',
      afterForge.from_user_id === dev.id && afterForge.status === 'pending',
    );
    await cleanUp();

    const again = await insertAs(dev.client, dev.id, cleo.id, 'pending');
    if (again.error) throw new Error(`Normal pending insert failed: ${again.error.message}`);
    const retryId = (again.data as { id: string }).id;
    await cleo.client.from('friend_requests').update({ to_user_id: fay.id }).eq('id', retryId);
    record('a recipient cannot redirect a request to someone else', (await rowById(retryId)).to_user_id === cleo.id);

    await dev.client.from('friend_requests').update({ status: 'accepted' }).eq('id', retryId);
    record('a sender cannot accept their own request', (await rowById(retryId)).status === 'pending');
    await cleanUp();

    const normal = await insertAs(fay.client, fay.id, cleo.id, 'pending');
    record('a normal pending request can be sent', !normal.error, normal.error?.message);
    if (!normal.error) {
      const normalId = (normal.data as { id: string }).id;
      record('the sender cannot see the recipient yet', !(await canSee(fay.client, cleo.id)));
      const accept = await cleo.client.from('friend_requests').update({ status: 'accepted' }).eq('id', normalId);
      record('the recipient can accept', !accept.error && (await rowById(normalId)).status === 'accepted', accept.error?.message);
      const sharing = await cleo.client.rpc('ensure_friend_sharing', { request_ids: [normalId] });
      record('accepting turns on sharing', !sharing.error, sharing.error?.message);
      record('both people can then see each other', (await canSee(fay.client, cleo.id)) && (await canSee(cleo.client, fay.id)));
      const removed = await fay.client.rpc('remove_friend', { target_friend_id: cleo.id });
      record('remove_friend still works', !removed.error, removed.error?.message);
      record('removing a friend ends access', !(await canSee(fay.client, cleo.id)));
    }
  } finally {
    await cleanUp();
    await Promise.all([cleo, fay, dev].map(({ client }) => client.auth.signOut()));
  }

  await checkSearch(signIn, createAnonClient(env), record);
  await checkReactionsAndBoops(signIn, createAnonClient(env), admin, record);

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length) throw new Error('Friend-request checks failed.');
};
