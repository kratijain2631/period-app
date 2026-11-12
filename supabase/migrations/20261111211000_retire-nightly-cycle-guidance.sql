-- HOLD: merge only after an on-demand-capable client (>= 1.0.13/build 34)
-- is available and active testers have updated. Older clients cannot request
-- new guidance themselves. Apple agreement failures currently block that rollout.
-- Remove only this named job; preserve cache/RPCs/function and daily reminders.
-- Idempotent; a rollback must be a new migration restoring the scheduler-secret
-- job definition from 20261107013000, not an edit to migration history.
do $$
declare
  guidance_job record;
begin
  for guidance_job in
    select jobid from cron.job where jobname = 'nightly-cycle-guidance'
  loop
    perform cron.unschedule(guidance_job.jobid);
  end loop;
end;
$$;
