/**
 * Attack matrix engine (layer B of docs/design/security-test-suite.md). Each row says who
 * acts, what they try and what must happen. The engine signs in as that persona with the
 * public key and makes the real API call, the same as an attacker would. Outcomes are read
 * back with the service key, because a blocked UPDATE or DELETE reports success with zero
 * rows. Anything a row changes is put back afterwards.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, loadStagingEnv, requirePersonaPassword } from '../../scripts/test-accounts/stagingEnv';

/**
 * Who acts, relative to the victim (bea), using the seeded relationships:
 * ava and bea are friends; cleo has no relationship with bea; fay has a pending request
 * from ava. For friend_requests rows, `pendingSender` and `pendingRecipient` are ava and fay.
 */
export type Actor = 'owner' | 'friend' | 'stranger' | 'pendingSender' | 'pendingRecipient' | 'anon';
export type Expect = 'allowed' | 'denied' | 'hidden';

const PERSONA_FOR: Record<Exclude<Actor, 'anon'>, string> = {
  owner: 'bea',
  friend: 'ava',
  stranger: 'cleo',
  pendingSender: 'ava',
  pendingRecipient: 'fay',
};

/**
 * Values in a row that are filled in at run time: 'self', 'victim', 'stranger', an actor
 * name, `{ rowOf: 'posts' }` for the id of the victim's first row in that table, or a list
 * of any of these.
 */
export type Ref = 'self' | 'victim' | 'stranger' | Actor | { rowOf: string } | Ref[];

export type Row =
  | { name: string; as: Actor; op: 'select'; table: string; owner: string; target?: Actor; expect: 'allowed' | 'hidden' }
  | { name: string; as: Actor; op: 'insert'; table: string; row: Record<string, unknown>; expect: 'allowed' | 'denied' }
  | {
      name: string;
      as: Actor;
      op: 'update' | 'delete';
      table: string;
      /** Picks the row to attack, as column filters with the victim's or another actor's id. */
      where: Record<string, unknown>;
      set?: Record<string, unknown>;
      expect: 'allowed' | 'hidden';
    }
  | {
      name: string;
      as: Actor;
      op: 'rpc';
      fn: string;
      args?: Record<string, unknown>;
      /** For "hidden": the result must not include a row whose `field` is the victim's id. */
      field?: string;
      expect: Expect;
    };

type Context = {
  admin: SupabaseClient;
  ids: Record<string, string>;
  as: (actor: Actor) => Promise<{ client: SupabaseClient; id: string | null }>;
  done: () => Promise<void>;
};

let shared: Promise<Context> | null = null;

export const context = (): Promise<Context> => {
  shared ??= (async () => {
    const env = loadStagingEnv();
    const password = requirePersonaPassword(env);
    const admin = createServiceClient(env);
    const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;
    const ids: Record<string, string> = {};
    const clients = new Map<string, SupabaseClient>();
    const signIn = async (key: string) => {
      if (!clients.has(key)) {
        const client = createClient(env.url, env.anonKey, noSession);
        const { data, error } = await client.auth.signInWithPassword({ email: `${key}@personas.example.com`, password });
        if (error || !data.user) throw new Error(`Sign-in failed for ${key}: ${error?.message ?? 'no user'}`);
        ids[key] = data.user.id;
        clients.set(key, client);
      }
      return clients.get(key)!;
    };
    await Promise.all(['ava', 'bea', 'cleo', 'fay'].map(signIn));
    const anon = createClient(env.url, env.anonKey, noSession);
    return {
      admin,
      ids,
      as: async (actor) =>
        actor === 'anon' ? { client: anon, id: null } : { client: await signIn(PERSONA_FOR[actor]), id: ids[PERSONA_FOR[actor]] },
      done: async () => {
        await Promise.all([...clients.values()].map((client) => client.auth.signOut()));
      },
    };
  })();
  return shared;
};

const idOf = (ctx: Context, actor: Actor) => (actor === 'anon' ? null : ctx.ids[PERSONA_FOR[actor]]);

// Tables whose victim rows `{ rowOf }` can point at, with the column that says who owns them.
const OWNER_COLUMN: Record<string, string> = { posts: 'user_id', cycle_events: 'user_id' };

const resolve = async (ctx: Context, self: string | null, value: unknown): Promise<unknown> => {
  if (Array.isArray(value)) return Promise.all(value.map((item) => resolve(ctx, self, item)));
  if (value === 'self') return self;
  if (value === 'victim') return ctx.ids.bea;
  if (value === 'stranger') return ctx.ids.cleo;
  if (typeof value === 'string' && value in PERSONA_FOR) return idOf(ctx, value as Actor);
  if (value && typeof value === 'object' && 'rowOf' in value) {
    const table = (value as { rowOf: string }).rowOf;
    const { data } = await ctx.admin.from(table).select('id').eq(OWNER_COLUMN[table], ctx.ids.bea).limit(1);
    const found = (data ?? [])[0] as { id: string } | undefined;
    if (!found) throw new Error(`The victim has no ${table} row to point at.`);
    return found.id;
  }
  return value;
};

const resolveRow = async (ctx: Context, self: string | null, row: Record<string, unknown>) =>
  Object.fromEntries(await Promise.all(Object.entries(row).map(async ([key, value]) => [key, await resolve(ctx, self, value)])));

/** Runs one row and returns what actually happened. */
export const run = async (row: Row): Promise<{ outcome: Expect; detail: string }> => {
  const ctx = await context();
  const { client, id: self } = await ctx.as(row.as);

  if (row.op === 'select') {
    const target = idOf(ctx, row.target ?? 'owner');
    const { data, error } = await client.from(row.table).select('*').eq(row.owner, target);
    const count = (data ?? []).length;
    if (error) return { outcome: 'hidden', detail: error.message };
    return { outcome: count > 0 ? 'allowed' : 'hidden', detail: `${count} row(s)` };
  }

  if (row.op === 'insert') {
    const values = await resolveRow(ctx, self, row.row);
    const { error } = await client.from(row.table).insert(values);
    let filter = ctx.admin.from(row.table).select('*');
    for (const [key, value] of Object.entries(values)) filter = filter.eq(key, value as string);
    const { data: stored } = await filter;
    const made = (stored ?? []) as Array<Record<string, unknown>>;
    if (made.length) {
      let cleanup = ctx.admin.from(row.table).delete();
      for (const [key, value] of Object.entries(values)) cleanup = cleanup.eq(key, value as string);
      await cleanup;
    }
    if (error && !made.length) return { outcome: 'denied', detail: error.code ?? error.message };
    return { outcome: made.length ? 'allowed' : 'denied', detail: error ? `error ${error.code} but stored` : 'stored' };
  }

  if (row.op === 'update' || row.op === 'delete') {
    const where = await resolveRow(ctx, self, row.where);
    let pick = ctx.admin.from(row.table).select('*');
    for (const [key, value] of Object.entries(where)) pick = pick.eq(key, value as string);
    const { data: before } = await pick.limit(1);
    const original = (before ?? [])[0] as Record<string, unknown> | undefined;
    if (!original) throw new Error(`No ${row.table} row matches ${JSON.stringify(row.where)} to attack.`);
    const key = 'id' in original ? 'id' : null;
    const match = (query: any) => (key ? query.eq('id', original.id) : Object.entries(where).reduce((q: any, [k, v]) => q.eq(k, v), query));

    if (row.op === 'update') {
      const set = await resolveRow(ctx, self, row.set ?? {});
      await match(client.from(row.table).update(set));
      const { data: after } = await match(ctx.admin.from(row.table).select('*'));
      const now = ((after ?? [])[0] ?? {}) as Record<string, unknown>;
      const changed = Object.keys(set).some((column) => JSON.stringify(now[column]) !== JSON.stringify(original[column]));
      if (changed) await match(ctx.admin.from(row.table).update(original));
      return { outcome: changed ? 'allowed' : 'hidden', detail: changed ? 'row changed' : 'row unchanged' };
    }

    await match(client.from(row.table).delete());
    const { data: after } = await match(ctx.admin.from(row.table).select('*'));
    const gone = (after ?? []).length === 0;
    if (gone) await ctx.admin.from(row.table).insert(original);
    return { outcome: gone ? 'allowed' : 'hidden', detail: gone ? 'row deleted' : 'row still there' };
  }

  const { data, error } = await client.rpc(row.fn, await resolveRow(ctx, self, row.args ?? {}));
  if (error) return { outcome: 'denied', detail: error.code ?? error.message };
  if (row.field) {
    const rows = (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;
    const seen = rows.some((item) => item?.[row.field!] === ctx.ids.bea);
    return { outcome: seen ? 'allowed' : 'hidden', detail: `${rows.length} row(s)` };
  }
  return { outcome: 'allowed', detail: 'ok' };
};
