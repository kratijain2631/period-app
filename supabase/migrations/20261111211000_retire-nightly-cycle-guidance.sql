-- Rollout gate met 2026-11-12: owner confirms all important users on 1.0.15
-- and successful refresh. Owner accepts stale/missing tips for older clients.
-- Builds <=1.0.12 cannot request new guidance themselves; minimum path is 1.0.13/34.
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
