/**
 * Checks that friend requests can't be forged, signed in as personas with the public
 * key, so every write goes through the same row-level security as the app. Staging only.
 *
 *   npm run test-accounts:rls
 *
 * Uses only the cleo/fay/dev pairs, which have no seeded requests between them
 * (dev is seeded with no request to fay or cleo), and removes what it creates.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPersona } from '../../packages/domain/testing/personas';
import { createAnonClient, createServiceClient, loadStagingEnv, requirePersonaPassword } from './stagingEnv';

type RequestRow = { id: string; from_user_id: string; to_user_id: string; status: string };

export const main = async () => {
  const env = loadStagingEnv();
  const password = requirePersonaPassword(env);
  const admin = createServiceClient(env);

  const signIn = async (key: string) => {
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
  const record = (name: string, pass: boolean, detail?: string) => {
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

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length) throw new Error('Friend-request checks failed.');
};
