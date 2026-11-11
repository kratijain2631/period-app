// Run with an optional path to PGlite's dist/index.js (installed in a temp folder).
// This creates an in-memory PostgreSQL fixture; it never connects to a backend.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
const read = (file) => fs.readFileSync(new URL('../../supabase/migrations/' + file, import.meta.url), 'utf8');
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create table public.cycle_snapshots(user_id uuid primary key references auth.users, snapshot jsonb);
    grant usage on schema public,auth to authenticated,anon;
    grant execute on function auth.uid(),auth.role() to authenticated,anon;
  `);
  await db.exec(read('20260124190446_cycle_guidance.sql'));
  await db.exec(read('20261106190000_capture-hand-applied-guidance.sql'));
  const migration = read('20261111180000_manual-guidance-refresh.sql');
  await db.exec(migration);
  await db.exec(migration); // safe to re-run
  await db.exec('grant select on public.cycle_guidance to authenticated');
  const self = '00000000-0000-0000-0000-000000000001';
  const other = '00000000-0000-0000-0000-000000000002';
  await db.query('insert into auth.users values ($1),($2)', [self, other]);
  await db.query(`insert into public.cycle_snapshots values ($1,'{"currentPhase":"luteal","currentPhaseStart":"start"}'),($2,'{"currentPhase":"pms","currentPhaseStart":"next"}')`, [self, other]);
  await db.query(`insert into public.cycle_guidance(user_id,phase,phase_started_at,dos,donts,generated_at) values ($1,'luteal','start','["Old do"]','["Old dont"]',now()-interval '1 hour')`, [self]);
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${self}',false)`);
  assert.equal(await scalar("select public.claim_cycle_guidance('luteal','start')"), null);
  const lease = await scalar("select public.claim_cycle_guidance_refresh('luteal','start')");
  assert.ok(lease);
  assert.equal(await scalar("select public.claim_cycle_guidance_refresh('luteal','start')"), null);
  assert.equal(await scalar("select dos->>0 from public.cycle_guidance"), 'Old do');
  await assert.rejects(db.query("select public.claim_cycle_guidance_refresh('pms','next')"));
  await assert.rejects(db.query('select * from public.cycle_guidance_requests'));
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  assert.equal(await scalar(`select public.complete_cycle_guidance($1,'["X"]','["Y"]','[]')`, [lease]), false);
  assert.equal(await scalar('select count(*)::int from public.cycle_guidance'), 0);
  await db.exec(`select set_config('request.jwt.claim.sub','${self}',false)`);
  assert.equal(await scalar(`select public.complete_cycle_guidance($1,'["New"]','["Less"]','[]')`, [lease]), true);
  assert.equal(await scalar("select public.claim_cycle_guidance_refresh('luteal','start')"), null);
  // Simulate the passage of the cooldown, without sleeping or touching live rows.
  await db.exec("reset role; update public.cycle_guidance set generated_at=now()-interval '3 minutes'; set role authenticated");
  const newLease = await scalar("select public.claim_cycle_guidance_refresh('luteal','start')");
  assert.ok(newLease);
  await db.exec(`reset role; update public.cycle_snapshots set snapshot='{"currentPhase":"pms","currentPhaseStart":"next"}' where user_id='${self}'; set role authenticated`);
  assert.equal(await scalar(`select public.complete_cycle_guidance($1,'["Stale"]','["Stale"]','[]')`, [newLease]), false);
  assert.equal(await scalar("select dos->>0 from public.cycle_guidance"), 'New');
  await db.exec("reset role; set role anon; select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(db.query("select public.claim_cycle_guidance_refresh('luteal','start')"));
  console.log('PASS: refresh bypasses cache, shares leases, retains tips, enforces cooldown after success, rejects stale/account/anonymous requests, and migration is idempotent.');
} finally {
  await db.close();
}
