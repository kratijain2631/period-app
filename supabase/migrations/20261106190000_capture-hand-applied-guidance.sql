-- Captures objects that were applied by hand and never added to a migration, so a database
-- built from the repo matches the live ones. Definitions were read from staging. When
-- adopting `supabase db push`, mark this as applied on existing databases rather than
-- running it. Safe to re-run.

alter table public.cycle_guidance
  add column if not exists phase_started_at text;

create table if not exists public.cycle_guidance_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_id uuid not null,
  phase text not null,
  phase_started_at text,
  requested_at timestamptz not null default now()
);
alter table public.cycle_guidance_requests enable row level security;
revoke all on table public.cycle_guidance_requests from anon, authenticated, service_role;
grant delete, truncate, references, trigger on table public.cycle_guidance_requests to service_role;

create or replace function public.claim_cycle_guidance(p_phase text, p_phase_start text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_snapshot jsonb;
  v_request uuid := gen_random_uuid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  -- Serialize claims for this account, and use the server snapshot as authority.
  select snapshot into v_snapshot from public.cycle_snapshots
    where user_id = v_user for update;
  if not found or p_phase not in ('menstruation','follicular','ovulation','luteal','pms')
    or (v_snapshot ->> 'currentPhase') is distinct from p_phase
    or (v_snapshot ->> 'currentPhaseStart') is distinct from p_phase_start then
    raise exception 'Cycle snapshot changed; sync and retry';
  end if;
  if exists (select 1 from public.cycle_guidance
    where user_id = v_user and phase = p_phase
      and phase_started_at is not distinct from p_phase_start
      and jsonb_array_length(dos) > 0 and jsonb_array_length(donts) > 0) then
    return null;
  end if;
  -- A failed request cools down too; repeatedly opening the page cannot hammer AI.
  insert into public.cycle_guidance_requests as requests
    (user_id, request_id, phase, phase_started_at, requested_at)
    values (v_user, v_request, p_phase, p_phase_start, now())
    on conflict (user_id) do update set
      request_id = excluded.request_id, phase = excluded.phase,
      phase_started_at = excluded.phase_started_at, requested_at = excluded.requested_at
    where requests.requested_at < now() - interval '2 minutes';
  if not found then return null; end if;
  return v_request;
end;
$$;

create or replace function public.complete_cycle_guidance(
  p_request_id uuid,
  p_dos jsonb,
  p_donts jsonb,
  p_friend_suggestions jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_snapshot jsonb;
  v_request public.cycle_guidance_requests%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select snapshot into v_snapshot from public.cycle_snapshots
    where user_id = v_user for update;
  select * into v_request from public.cycle_guidance_requests
    where user_id = v_user and request_id = p_request_id for update;
  if not found
    or (v_snapshot ->> 'currentPhase') is distinct from v_request.phase
    or (v_snapshot ->> 'currentPhaseStart') is distinct from v_request.phase_started_at then
    return false;
  end if;
  if jsonb_typeof(p_dos) is distinct from 'array'
    or jsonb_typeof(p_donts) is distinct from 'array'
    or jsonb_typeof(p_friend_suggestions) is distinct from 'array' then
    raise exception 'Invalid guidance';
  end if;
  if jsonb_array_length(p_dos) = 0 or jsonb_array_length(p_donts) = 0 then
    raise exception 'Empty guidance';
  end if;
  insert into public.cycle_guidance
    (user_id, phase, phase_started_at, dos, donts, friend_suggestions, generated_at)
    values (v_user, v_request.phase, v_request.phase_started_at,
      p_dos, p_donts, p_friend_suggestions, now())
    on conflict (user_id) do update set
      phase = excluded.phase, phase_started_at = excluded.phase_started_at,
      dos = excluded.dos, donts = excluded.donts,
      friend_suggestions = excluded.friend_suggestions, generated_at = excluded.generated_at;
  delete from public.cycle_guidance_requests where user_id = v_user;
  return true;
end;
$$;

revoke all on function public.claim_cycle_guidance(text, text) from public, anon;
revoke all on function public.complete_cycle_guidance(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.claim_cycle_guidance(text, text) to authenticated, service_role;
grant execute on function public.complete_cycle_guidance(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
