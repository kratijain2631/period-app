-- Keep shipped builds working while new clients migrate to the safe projection
-- RPCs. Builds through 1.0.10 still select cycle_snapshots / cycle_events
-- directly. Do not remove these legacy policies until those builds are retired.

drop policy if exists cycle_snapshots_select_own on public.cycle_snapshots;
drop policy if exists cycle_snapshots_select_own_or_friends on public.cycle_snapshots;
create policy cycle_snapshots_select_own_or_friends
on public.cycle_snapshots for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1 from public.friend_sharing fs
      where fs.user_id = public.cycle_snapshots.user_id
        and fs.friend_id = auth.uid()
        and fs.has_shared = true
    )
    and exists (
      select 1 from public.friend_sharing fs2
      where fs2.user_id = auth.uid()
        and fs2.friend_id = public.cycle_snapshots.user_id
        and fs2.has_shared = true
    )
  )
);

drop policy if exists cycle_events_select_own on public.cycle_events;
drop policy if exists cycle_events_select_own_or_friends on public.cycle_events;
create policy cycle_events_select_own_or_friends
on public.cycle_events for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1 from public.friend_sharing fs
      where fs.user_id = public.cycle_events.user_id
        and fs.friend_id = auth.uid()
        and fs.has_shared = true
    )
    and exists (
      select 1 from public.friend_sharing fs2
      where fs2.user_id = auth.uid()
        and fs2.friend_id = public.cycle_events.user_id
        and fs2.has_shared = true
    )
  )
);

-- Refresh the safe summary projection with cycle fields added after the
-- original 2026-07-29 deployment. Raw samples are still reduced to date-only,
-- intensity-free records and signalSamples / metadata remain excluded.
create or replace function public.friend_cycle_summaries()
returns table (user_id uuid, last_synced_at timestamptz, snapshot jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select
    cs.user_id,
    cs.last_synced_at,
    jsonb_strip_nulls(
      jsonb_build_object(
        'syncedAt', cs.snapshot -> 'syncedAt',
        'currentPhase', cs.snapshot -> 'currentPhase',
        'phaseSource', cs.snapshot -> 'phaseSource',
        'cycleLengthDays', cs.snapshot -> 'cycleLengthDays',
        'lutealLengthDays', cs.snapshot -> 'lutealLengthDays',
        'periodLengthDays', cs.snapshot -> 'periodLengthDays',
        'latestSampleStart', cs.snapshot -> 'latestSampleStart',
        'currentPhaseStart', cs.snapshot -> 'currentPhaseStart',
        'nextPhaseStart', cs.snapshot -> 'nextPhaseStart',
        'nextPhase', cs.snapshot -> 'nextPhase',
        'samples', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', concat('shared-', sample.ordinality),
                'flowValue', 1,
                'startDate', sample.value -> 'startDate',
                'endDate', sample.value -> 'endDate'
              )
              order by sample.ordinality
            )
              from jsonb_array_elements(coalesce(cs.snapshot -> 'samples', '[]'::jsonb))
                   with ordinality as sample(value, ordinality)
          ),
          '[]'::jsonb
        )
      )
    ) as snapshot
  from public.cycle_snapshots cs
  where cs.user_id = auth.uid()
     or exists (
       select 1
         from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.from_user_id = auth.uid() and fr.to_user_id = cs.user_id)
            or (fr.to_user_id = auth.uid() and fr.from_user_id = cs.user_id)
          )
     );
$$;

revoke all on function public.friend_cycle_summaries() from public;
grant execute on function public.friend_cycle_summaries() to authenticated;

