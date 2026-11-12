// In-memory SQL/control-flow test; never connects to staging or production.
// Pass the path to a temporary @electric-sql/pglite/dist/index.js if not installed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
try {
  // pg_cron is stubbed locally; the migration itself runs as real PL/pgSQL.
  await db.exec(`
    create schema cron;
    create table cron.job(jobid bigint primary key, jobname text, schedule text, active boolean);
    create function cron.unschedule(bigint) returns boolean language plpgsql as $$
    begin delete from cron.job where jobid=$1; return found; end; $$;
    insert into cron.job values
      (1,'nightly-cycle-guidance','0 3 * * *',true),
      (2,'daily-phase-change-reminder','0 15 * * *',true),
      (3,'unrelated-job','0 1 * * *',false);
    create table public.cycle_guidance(id int, dos jsonb);
    insert into public.cycle_guidance values (1,'["Saved advice"]');
  `);
  const sql = fs.readFileSync(new URL('../../supabase/migrations/20261111211000_retire-nightly-cycle-guidance.sql', import.meta.url), 'utf8');
  const before = (await db.query("select * from cron.job where jobname <> 'nightly-cycle-guidance' order by jobid")).rows;
  await db.exec(sql);
  assert.deepEqual((await db.query('select * from cron.job order by jobid')).rows, before);
  assert.equal((await db.query('select dos->>0 as advice from public.cycle_guidance')).rows[0].advice, 'Saved advice');
  await db.exec(sql);
  assert.deepEqual((await db.query('select * from cron.job order by jobid')).rows, before);
  console.log('PASS: only nightly-cycle-guidance removed; daily reminder/unrelated schedules and saved tips retained; rerun safe.');
} finally { await db.close(); }
