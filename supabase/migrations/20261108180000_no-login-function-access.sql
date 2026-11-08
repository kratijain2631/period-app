-- Nothing in the app calls a database function before login, but several functions could
-- be called with only the public key, and staging and production disagreed on which. This
-- sets one state for both: no-login callers can't run any function, logged-in users can run
-- the ones the app uses, and the service role can run everything. Trigger functions are
-- left alone, because they can't be called directly. Safe to re-run.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.prorettype <> 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end;
$$;

-- What the app calls once logged in. cron_secret_matches, due_phase_reminders and
-- mark_phase_reminded stay server-only.
grant execute on function public.claim_cycle_guidance(text, text) to authenticated;
grant execute on function public.complete_cycle_guidance(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.contact_friend_matches(text[], integer) to authenticated;
grant execute on function public.cycle_event_belongs_to(uuid, uuid) to authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.ensure_friend_sharing(uuid[]) to authenticated;
grant execute on function public.friend_cycle_summaries() to authenticated;
grant execute on function public.friend_profiles(uuid[]) to authenticated;
grant execute on function public.friend_request_profiles(uuid[]) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.search_users(text, integer) to authenticated;
grant execute on function public.send_friend_request_by_email(text) to authenticated;
grant execute on function public.shared_cycle_events(integer) to authenticated;
grant execute on function public."sync-score"(uuid) to authenticated;

-- New functions: Postgres lets everyone run them by default, and Supabase adds anon on top.
-- Stop both, so a new function is only callable by logged-in users and the service role
-- until a migration says otherwise.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
