-- Owner decided on 2026-11-07 to leave the nightly friend-recommendations job off, which
-- matches staging and production. The app falls back to its built-in suggestions. This
-- keeps a database built from migrations the same. Safe to re-run.

select cron.unschedule('nightly-friend-recommendations')
 where exists (select 1 from cron.job where jobname = 'nightly-friend-recommendations');
