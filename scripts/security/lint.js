#!/usr/bin/env node
/**
 * Rules lint (layer A of docs/design/security-test-suite.md). Read-only queries against the
 * database catalog, each one a rule. Anything a rule flags fails the run unless
 * supabase/security/allowlist.json lists it with a reason.
 *
 *   DB_URL=postgresql://... node scripts/security/lint.js
 *
 * Only a localhost DB_URL is accepted, so this runs against the throwaway database built by
 * scripts/db/start-local.sh.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(dbUrl)) {
  console.error('The rules lint only runs against a local database.');
  process.exit(1);
}

const allowlistPath = path.join(__dirname, '../../supabase/security/allowlist.json');
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));

const query = (sql) => {
  const out = execFileSync('psql', [dbUrl, '-Atq', '-v', 'ON_ERROR_STOP=1', '-c', `select coalesce(json_agg(t), '[]') from (${sql}) t`], {
    encoding: 'utf8',
  });
  return JSON.parse(out.trim() || '[]');
};

const callable = `
  select p.oid, p.proname as name, p.prosrc, p.prosecdef, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'`;

// Names that mean "this checks who the caller is", directly or through a helper.
const CALLER_CHECK = String.raw`auth\.(uid|role)\(\)|is_friend|cycle_event_visible|cycle_event_belongs_to`;

// Columns that say who owns a row or who agreed to something. An UPDATE must not be able to
// rewrite them freely. On users, id is the owner; elsewhere it's only the row's key.
const OWNERSHIP_COLUMNS = ['user_id', 'from_user_id', 'to_user_id', 'friend_id', 'status'];

const rules = [
  {
    id: 'rls-enabled',
    title: 'Every public table has row-level security on',
    hint: 'alter table ... enable row level security, then add policies.',
    find: () => query(`
      select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`),
  },
  {
    id: 'no-login-function',
    title: 'No function can be run without a login',
    hint: 'revoke execute on function ... from public, anon (see 20261108180000).',
    find: () => query(`
      select name from (${callable}) f
       where (select prorettype from pg_proc where oid = f.oid) <> 'trigger'::regtype
         and has_function_privilege('anon', f.oid, 'execute')`),
  },
  {
    id: 'signed-in-function-ignores-caller',
    title: 'Functions logged-in users can run check who is calling',
    hint: 'use auth.uid() (or is_friend) in the function, or revoke execute from authenticated.',
    find: () => query(`
      select name from (${callable}) f
       where (select prorettype from pg_proc where oid = f.oid) <> 'trigger'::regtype
         and has_function_privilege('authenticated', f.oid, 'execute')
         and f.prosrc !~ '${CALLER_CHECK}'`),
  },
  {
    id: 'definer-search-path',
    title: 'SECURITY DEFINER functions set search_path',
    hint: 'add "set search_path = public" to the function definition.',
    find: () => query(`
      select name from (${callable}) f
       where f.prosecdef
         and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%')`),
  },
  {
    id: 'policy-checks-caller',
    title: 'Every policy checks who is calling',
    hint: 'compare against auth.uid() or auth.role(), or allowlist the policy if it is meant to be open.',
    find: () => query(`
      select c.relname || '.' || po.polname as name
        from pg_policy po join pg_class c on c.oid = po.polrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and coalesce(pg_get_expr(po.polqual, po.polrelid), '') || coalesce(pg_get_expr(po.polwithcheck, po.polrelid), '')
             !~ '${CALLER_CHECK}'`),
  },
  {
    id: 'ownership-columns-pinned',
    title: 'UPDATE policies pin ownership and consent columns',
    hint: 'mention the column in the policy check (WITH CHECK, or USING when there is none), or revoke UPDATE on that column.',
    // Postgres reuses USING as the check for the new row when WITH CHECK is absent.
    find: () => query(`
      select c.relname || '.' || col.attname || ' (' || po.polname || ')' as name
        from pg_policy po
        join pg_class c on c.oid = po.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute col on col.attrelid = c.oid and col.attnum > 0 and not col.attisdropped
       where n.nspname = 'public'
         and po.polcmd in ('w', '*')
         and (col.attname = any (array[${OWNERSHIP_COLUMNS.map((name) => `'${name}'`).join(', ')}])
              or (c.relname = 'users' and col.attname = 'id'))
         and has_column_privilege('authenticated', c.oid, col.attname, 'UPDATE')
         and coalesce(pg_get_expr(po.polwithcheck, po.polrelid), pg_get_expr(po.polqual, po.polrelid), '')
             !~ ('\\m' || col.attname || '\\M')
         and coalesce(pg_get_expr(po.polqual, po.polrelid), '') !~ 'service_role'`),
  },
];

let failures = 0;
const usedAllowlist = new Set();
for (const rule of rules) {
  const allowed = allowlist[rule.id] ?? {};
  const found = rule.find().map((row) => row.name);
  const unexplained = found.filter((name) => !allowed[name]);
  found.filter((name) => allowed[name]).forEach((name) => usedAllowlist.add(`${rule.id}:${name}`));
  if (unexplained.length) {
    failures += unexplained.length;
    console.log(`❌ ${rule.title}`);
    unexplained.forEach((name) => console.log(`   ${name}: ${rule.hint}`));
  } else {
    const note = found.length ? ` (${found.length} allowlisted)` : '';
    console.log(`✅ ${rule.title}${note}`);
  }
}

// An allowlist entry that no longer matches anything is stale; drop it so it can't hide a
// future problem with the same name.
const stale = Object.entries(allowlist)
  .filter(([key]) => !key.startsWith('$'))
  .flatMap(([ruleId, entries]) => Object.keys(entries).map((name) => `${ruleId}:${name}`))
  .filter((key) => !usedAllowlist.has(key));
if (stale.length) {
  failures += stale.length;
  console.log('❌ Allowlist entries that match nothing (remove them):');
  stale.forEach((key) => console.log(`   ${key}`));
}

console.log(`\nRules lint: ${failures === 0 ? 'passed' : `${failures} problem(s)`}.`);
process.exit(failures === 0 ? 0 : 1);
