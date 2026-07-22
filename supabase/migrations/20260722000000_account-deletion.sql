-- Account self-deletion.
-- Lets a signed-in user permanently delete their own account and all associated data.
-- Runs as SECURITY DEFINER so it can remove the auth.users row after clearing app data.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Tables without a cascading foreign key to auth.users must be cleared explicitly.
  delete from public.post_reactions where user_id = uid;
  delete from public.posts where user_id = uid;
  delete from public.boops where from_user_id = uid or to_user_id = uid;

  -- Deleting the auth user cascades to: users, cycle_events, cycle_snapshots,
  -- notifications, device_tokens, friend_requests, friend_sharing.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
