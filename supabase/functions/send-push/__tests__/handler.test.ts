/**
 * @jest-environment node
 */
import { createSendPushHandler } from '../handler';

type Call = { table: string; op: string; args: unknown[] };

// A stand-in for the service-role client: each table returns canned data and
// records what was written.
const fakeSupabase = (tables: Record<string, unknown>, claimed: unknown[]) => {
  const calls: Call[] = [];
  const query = (table: string) => {
    const chain: Record<string, unknown> = {};
    const result = () => {
      const value = tables[table];
      return Promise.resolve(typeof value === 'function' ? value() : value ?? { data: null, error: null });
    };
    for (const op of ['select', 'eq', 'is', 'in', 'update', 'delete']) {
      chain[op] = (...args: unknown[]) => {
        calls.push({ table, op, args });
        return chain;
      };
    }
    chain.maybeSingle = result;
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => result().then(resolve, reject);
    return chain;
  };
  return {
    calls,
    client: {
      from: query,
      rpc: jest.fn().mockResolvedValue({ data: claimed, error: null }),
    } as never,
  };
};

const row = {
  id: 'outbox-1',
  user_id: 'bea',
  actor_id: 'ava',
  type: 'friend_request',
  payload: { actor_alias: 'ava', request_id: 'req-1' },
  notification_id: null,
};
const request = (body: unknown) => new Request('http://local/send-push', { method: 'POST', body: JSON.stringify(body) });
const allow = async () => null;
const expoReply = (tickets: unknown[]) =>
  jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: tickets }), { status: 200 }));

it('rejects callers that are not the database', async () => {
  const { client } = fakeSupabase({}, [row]);
  const handler = createSendPushHandler({
    supabase: client,
    authorize: async () => new Response('no', { status: 401 }),
  });
  expect((await handler(request({ id: 'outbox-1' }))).status).toBe(401);
});

it('sends to every device, sets the badge and removes dead tokens', async () => {
  const { client, calls } = fakeSupabase(
    {
      notification_preferences: { data: null, error: null },
      device_tokens: { data: [{ token: 'ExponentPushToken[a]' }, { token: 'ExponentPushToken[b]' }, { token: 'junk' }], error: null },
      notifications: { count: 2, error: null },
      friend_requests: { count: 1, error: null },
      push_outbox: { data: null, error: null },
    },
    [row],
  );
  const fetchImpl = expoReply([{ status: 'ok', id: 't1' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }]);
  const handler = createSendPushHandler({ supabase: client, authorize: allow, fetchImpl });

  const response = await handler(request({ id: 'outbox-1' }));
  expect(response.status).toBe(200);
  expect((client as { rpc: jest.Mock }).rpc).toHaveBeenCalledWith('claim_pushes', { target: 'outbox-1' });

  const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(sent).toEqual([
    expect.objectContaining({ to: 'ExponentPushToken[a]', body: '@ava sent you a friend request', badge: 3 }),
    expect.objectContaining({ to: 'ExponentPushToken[b]' }),
  ]);
  expect(sent[0].data).toEqual({ type: 'friend_request', outbox_id: 'outbox-1', actor_id: 'ava', request_id: 'req-1' });
  expect(calls).toContainEqual({ table: 'device_tokens', op: 'in', args: ['token', ['ExponentPushToken[b]']] });
  const update = calls.find((c) => c.table === 'push_outbox' && c.op === 'update')!.args[0] as Record<string, unknown>;
  expect(update.sent_at).toBeTruthy();
  expect(update.result).toMatchObject({ status: 'sent', sent: 1, removed_tokens: 1 });
});

it('skips a type the user turned off without contacting Expo', async () => {
  const { client, calls } = fakeSupabase(
    { notification_preferences: { data: { friend_requests: false }, error: null }, push_outbox: { data: null, error: null } },
    [row],
  );
  const fetchImpl = jest.fn();
  await createSendPushHandler({ supabase: client, authorize: allow, fetchImpl })(request({}));
  expect(fetchImpl).not.toHaveBeenCalled();
  const update = calls.find((c) => c.op === 'update')!.args[0] as Record<string, unknown>;
  expect(update).toMatchObject({ result: { status: 'skipped' } });
  expect(update.sent_at).toBeTruthy();
});

it('leaves the row for a retry when Expo is down', async () => {
  const { client, calls } = fakeSupabase(
    {
      device_tokens: { data: [{ token: 'ExponentPushToken[a]' }], error: null },
      notifications: { count: 0, error: null },
      friend_requests: { count: 0, error: null },
    },
    [row],
  );
  const fetchImpl = jest.fn().mockResolvedValue(new Response('busy', { status: 503 }));
  await createSendPushHandler({ supabase: client, authorize: allow, fetchImpl })(request({}));
  const update = calls.find((c) => c.op === 'update')!.args[0] as Record<string, unknown>;
  expect(update.sent_at).toBeUndefined();
  expect(update.result).toMatchObject({ status: 'error', http: 503 });
});
