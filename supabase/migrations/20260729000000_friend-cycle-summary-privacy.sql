-- Friendship is the consent boundary for the core social cycle experience.
-- Friends can read phase/calendar summaries and deliberately published cycle
-- events without exposing HealthKit metadata, flow intensity, symptoms, or
-- signal samples (BBT, cervical mucus, ovulation/progesterone tests) through
-- the projection RPCs.

-- This migration was applied manually on 2026-07-29 before it was committed
-- to main. Preserve its behavior in history; the 20260806000000 follow-up restores
-- legacy read policies for backward compatibility with already-shipped builds.
insert into public.friend_sharing (user_id, friend_id, has_shared)
select fr.from_user_id, fr.to_user_id, true
  from public.friend_requests fr
 where fr.status = 'accepted'
on conflict (user_id, friend_id) do update set has_shared = true;

insert into public.friend_sharing (user_id, friend_id, has_shared)
select fr.to_user_id, fr.from_user_id, true
  from public.friend_requests fr
 where fr.status = 'accepted'
on conflict (user_id, friend_id) do update set has_shared = true;

drop policy if exists cycle_snapshots_select_own_or_friends on public.cycle_snapshots;
create policy cycle_snapshots_select_own
on public.cycle_snapshots for select
using (auth.uid() = user_id);

drop policy if exists cycle_events_select_own_or_friends on public.cycle_events;
create policy cycle_events_select_own
on public.cycle_events for select
using (auth.uid() = user_id);

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
        'latestSampleStart', cs.snapshot -> 'latestSampleStart',
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

create or replace function public.shared_cycle_events(max_rows integer default 40)
returns table (
  id uuid,
  user_id uuid,
  event_type text,
  phase text,
  symptoms jsonb,
  starts_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ce.id,
    ce.user_id,
    ce.event_type,
    ce.phase,
    case
      when ce.symptoms ? 'phase_source'
        then jsonb_build_object('phase_source', ce.symptoms -> 'phase_source')
      else null
    end as symptoms,
    ce.starts_at,
    ce.created_at
  from public.cycle_events ce
  where ce.user_id = auth.uid()
     or exists (
       select 1
         from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.from_user_id = auth.uid() and fr.to_user_id = ce.user_id)
            or (fr.to_user_id = auth.uid() and fr.from_user_id = ce.user_id)
          )
     )
  order by ce.starts_at desc
  limit least(greatest(coalesce(max_rows, 40), 1), 200);
$$;

revoke all on function public.shared_cycle_events(integer) from public;
grant execute on function public.shared_cycle_events(integer) to authenticated;
