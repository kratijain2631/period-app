-- Additive manual-refresh path. Existing clients/RPCs and cron jobs are unchanged.
create or replace function public.claim_cycle_guidance_refresh(p_phase text, p_phase_start text)
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
  -- Keep explicit refresh affordable, even after successful completion deletes
  -- the lease. Normal page opens still use the original cache-preserving RPC.
  if exists (select 1 from public.cycle_guidance
    where user_id = v_user and generated_at > now() - interval '2 minutes') then
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

revoke all on function public.claim_cycle_guidance_refresh(text, text) from public, anon;
grant execute on function public.claim_cycle_guidance_refresh(text, text) to authenticated, service_role;
