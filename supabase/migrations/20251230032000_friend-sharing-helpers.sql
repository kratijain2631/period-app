create or replace function public.ensure_friend_sharing(request_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if request_ids is null or array_length(request_ids, 1) is null then
    return;
  end if;

  insert into public.friend_sharing (user_id, friend_id, has_shared)
  select fr.from_user_id, fr.to_user_id, true
    from public.friend_requests fr
   where fr.id = any(request_ids)
     and fr.status = 'accepted'
     and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
  on conflict (user_id, friend_id) do update
    set has_shared = excluded.has_shared;

  insert into public.friend_sharing (user_id, friend_id, has_shared)
  select fr.to_user_id, fr.from_user_id, true
    from public.friend_requests fr
   where fr.id = any(request_ids)
     and fr.status = 'accepted'
     and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
  on conflict (user_id, friend_id) do update
    set has_shared = excluded.has_shared;
end;
$$;
revoke all on function public.ensure_friend_sharing(uuid[]) from public;
grant execute on function public.ensure_friend_sharing(uuid[]) to authenticated;
create or replace function public.friend_profiles(friend_ids uuid[])
returns table (friend_id uuid, alias text, full_name text)
language sql
security definer
set search_path = public
as $$
  select u.id as friend_id, u.alias, u.full_name
    from public.users u
   where u.id = any(friend_ids)
     and exists (
       select 1
         from public.friend_sharing fs
        where fs.user_id = auth.uid()
          and fs.friend_id = u.id
          and fs.has_shared = true
     )
     and exists (
       select 1
         from public.friend_sharing fs2
        where fs2.user_id = u.id
          and fs2.friend_id = auth.uid()
          and fs2.has_shared = true
     );
$$;
revoke all on function public.friend_profiles(uuid[]) from public;
grant execute on function public.friend_profiles(uuid[]) to authenticated;
