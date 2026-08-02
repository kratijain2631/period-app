-- Server-side scheduled "your phase is changing — open to share" reminder.
--
-- Design: the app already uploads its cycle snapshot (incl. the predicted
-- nextPhaseStart / nextPhase, stored in the snapshot jsonb) to cycle_snapshots.
-- A daily cron invokes the `phase-change-reminder` edge function, which pushes a
-- notification to users whose predicted transition is *today* — so the nudge
-- fires even if they never open the app. It is a NUDGE (notify-to-confirm), not a
-- silent post: opening the app is what actually posts, with the user in the loop.
--
-- To avoid double-notifying, the server only targets INACTIVE users (no sync in
-- 2+ days); active users already get the on-device scheduled local reminder.

alter table public.cycle_snapshots
  add column if not exists last_reminded_phase_start timestamptz;

-- Users due for a phase-change reminder today (dedup via last_reminded_phase_start,
-- and only inactive users so we don't double up with the on-device reminder).
create or replace function public.due_phase_reminders()
returns table (user_id uuid, next_phase text, next_phase_start timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    cs.user_id,
    cs.snapshot->>'nextPhase' as next_phase,
    (cs.snapshot->>'nextPhaseStart')::timestamptz as next_phase_start
  from public.cycle_snapshots cs
  where cs.snapshot ? 'nextPhaseStart'
    and cs.snapshot->>'nextPhaseStart' is not null
    and cs.snapshot->>'nextPhase' is not null
    and (cs.snapshot->>'nextPhaseStart')::timestamptz::date = current_date
    and cs.last_synced_at < now() - interval '2 days'
    and (
      cs.last_reminded_phase_start is null
      or cs.last_reminded_phase_start <> (cs.snapshot->>'nextPhaseStart')::timestamptz
    );
$$;

-- Mark a user reminded for a given predicted transition (dedupe key).
create or replace function public.mark_phase_reminded(target_user uuid, phase_start timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cycle_snapshots
  set last_reminded_phase_start = phase_start
  where user_id = target_user;
$$;

-- Daily at 15:00 UTC (mid-morning across the US), nudge users whose predicted
-- phase transition is today. Mirrors the existing schedule-* cron pattern.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

select cron.unschedule('daily-phase-change-reminder')
where exists (select 1 from cron.job where jobname = 'daily-phase-change-reminder');

select
  cron.schedule(
    'daily-phase-change-reminder',
    '0 15 * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/phase-change-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
        ),
        body := jsonb_build_object('scheduled_at', now()),
        timeout_milliseconds := 10000
      ) as request_id;
    $$
  );
