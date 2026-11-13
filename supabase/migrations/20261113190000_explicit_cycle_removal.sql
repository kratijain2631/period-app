-- Absence of a preference preserves the existing sync behavior on every client.
create table private.cycle_sync_withdrawals (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.cycle_sync_withdrawals from public, anon, authenticated;

create function public.cycle_sync_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and not exists
    (select from private.cycle_sync_withdrawals where user_id = auth.uid())
$$;
revoke all on function public.cycle_sync_enabled() from public, anon;
grant execute on function public.cycle_sync_enabled() to authenticated;

-- A write already in flight commits before erasure, or observes the withdrawal.
-- Applies to older app builds and background jobs as well as the Settings device.
create function private.guard_cycle_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  subjects uuid[] := array[new.user_id];
  subject uuid;
begin
  if tg_table_name = 'friend_recommendations' then
    subjects := subjects || new.friend_id;
  end if;
  for subject in select distinct id from unnest(subjects) id order by id loop
    perform pg_advisory_xact_lock_shared(hashtextextended(subject::text, 821));
    if exists (select from private.cycle_sync_withdrawals w where w.user_id = subject) then
      raise exception using errcode='42501', message='Cycle sync is turned off.';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.guard_cycle_write() from public, anon, authenticated;
create trigger guard_cycle_write before insert or update on public.cycle_snapshots for each row execute function private.guard_cycle_write();
create trigger guard_cycle_write before insert or update on public.cycle_events for each row execute function private.guard_cycle_write();
create trigger guard_cycle_write before insert or update on public.cycle_guidance for each row execute function private.guard_cycle_write();
create trigger guard_cycle_write before insert or update on public.cycle_guidance_requests for each row execute function private.guard_cycle_write();
create trigger guard_cycle_write before insert or update on public.friend_recommendations for each row execute function private.guard_cycle_write();

-- These foreign keys historically set event_id to null, leaving the notification
-- payload (phase and dates) or boop behind. Remove them before that happens.
create function private.erase_cycle_event_dependents()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where event_id = old.id;
  delete from public.boops where event_id = old.id;
  return old;
end;
$$;
revoke all on function private.erase_cycle_event_dependents() from public, anon, authenticated;
create trigger erase_cycle_event_dependents before delete on public.cycle_events
  for each row execute function private.erase_cycle_event_dependents();

-- A legacy inbox row may already lack its event. Remove that copy before
-- account deletion clears the sender ID that identifies whose cycle it was.
create function private.erase_legacy_cycle_notices_on_account_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where friend_id = old.id and event_id is null
    and payload ->> 'event_type' in ('menstrual_flow', 'phase_transition');
  return old;
end;
$$;
revoke all on function private.erase_legacy_cycle_notices_on_account_delete() from public, anon, authenticated;
create trigger erase_legacy_cycle_notices before delete on auth.users
  for each row execute function private.erase_legacy_cycle_notices_on_account_delete();

create function public.set_cycle_sync_enabled(expected_user_id uuid, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  subject uuid := auth.uid();
begin
  if subject is null or expected_user_id is distinct from subject or enabled is null then raise exception 'Signed-in account and choice required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(subject::text, 821));
  if enabled then
    delete from private.cycle_sync_withdrawals where user_id = subject;
    return;
  end if;
  insert into private.cycle_sync_withdrawals values (subject) on conflict do nothing;
  delete from public.cycle_snapshots where user_id = subject;
  delete from public.cycle_events where user_id = subject;
  -- Older deletions could leave a phase and date in an inbox without an event reference.
  delete from public.notifications where friend_id = subject and event_id is null
    and payload ->> 'event_type' in ('menstrual_flow', 'phase_transition');
  delete from public.cycle_guidance_requests where user_id = subject;
  delete from public.cycle_guidance where user_id = subject;
  delete from public.friend_recommendations where user_id = subject or friend_id = subject;
end;
$$;
revoke all on function public.set_cycle_sync_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_cycle_sync_enabled(uuid, boolean) to authenticated;
