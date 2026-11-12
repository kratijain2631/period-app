/**
 * Coverage guard (layer C of docs/design/security-test-suite.md). Every table operation that
 * an RLS policy lets anon or logged-in users attempt, and every function they can execute,
 * must have at least one attack matrix row, or an entry in coverage.json saying why not.
 * A pull request that adds a table, policy or function without rows fails here.
 *
 * Reads the catalog of the local database (DB_URL), so it only runs with
 * TEST_ACCOUNTS_TARGET=local, as in `npm run test:security`.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { allRows as rows } from './matrix';

const notApplicable: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'coverage.json'), 'utf8'),
).notApplicable;

const dbUrl = process.env.DB_URL ?? '';
const local = process.env.TEST_ACCOUNTS_TARGET === 'local' && /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(dbUrl);

const catalog = (sql: string): string[] =>
  execFileSync('psql', [dbUrl, '-Atq', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

(local ? describe : describe.skip)('coverage guard', () => {
  const STORAGE_OP = { read: 'select', upload: 'insert', update: 'update', delete: 'delete' } as const;
  const covered = new Set(
    rows.map((row) =>
      'table' in row ? `${row.table}.${row.op}` : 'bucket' in row ? `storage:${row.bucket}.${STORAGE_OP[row.action]}` : `rpc.${row.fn}`,
    ),
  );

  it('every operation a policy allows has a matrix row', () => {
    const reachable = catalog(`
      select distinct c.relname || '.' || op
        from pg_policy po
        join pg_class c on c.oid = po.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral unnest(case po.polcmd when 'r' then array['select'] when 'a' then array['insert']
             when 'w' then array['update'] when 'd' then array['delete']
             else array['select', 'insert', 'update', 'delete'] end) as op
       where n.nspname = 'public'
         and (po.polroles = '{0}' or po.polroles && array(select oid from pg_roles where rolname in ('anon', 'authenticated')))`);
    const missing = reachable.filter((cell) => !covered.has(cell) && !notApplicable[cell]);
    expect(missing).toEqual([]);
  });

  it('every storage operation a policy allows has a matrix row', () => {
    // Policies on storage.objects name their bucket as bucket_id = '<name>'.
    const reachable = catalog(`
      select distinct 'storage:' || substring(coalesce(pg_get_expr(po.polqual, po.polrelid), pg_get_expr(po.polwithcheck, po.polrelid))
               from 'bucket_id = ''([^'']+)''') || '.' || op
        from pg_policy po
        cross join lateral unnest(case po.polcmd when 'r' then array['select'] when 'a' then array['insert']
             when 'w' then array['update'] when 'd' then array['delete']
             else array['select', 'insert', 'update', 'delete'] end) as op
       where po.polrelid = 'storage.objects'::regclass
         and (po.polroles = '{0}' or po.polroles && array(select oid from pg_roles where rolname in ('anon', 'authenticated')))`);
    expect(reachable.length).toBeGreaterThan(0);
    const missing = reachable.filter((cell) => !covered.has(cell) && !notApplicable[cell]);
    expect(missing).toEqual([]);
  });

  it('every function a caller can run has a matrix row', () => {
    const callable = catalog(`
      select 'rpc.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
    const missing = callable.filter((cell) => !covered.has(cell) && !notApplicable[cell]);
    expect(missing).toEqual([]);
  });

  it('coverage.json has no stale entries', () => {
    const tables = new Set(catalog(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`));
    const functions = new Set(catalog(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`));
    const stale = Object.keys(notApplicable).filter((cell) => {
      const [scope, name] = cell.split('.');
      if (scope.startsWith('storage:')) return covered.has(cell);
      return scope === 'rpc' ? !functions.has(name) : !tables.has(scope) || covered.has(cell);
    });
    expect(stale).toEqual([]);
  });
});
