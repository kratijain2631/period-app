create or replace function public.remove_friend(target_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_friend_id is null then
    raise exception 'target_friend_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;

  update public.friend_sharing
     set has_shared = false
   where user_id = auth.uid()
     and friend_id = target_friend_id;

  update public.friend_sharing
     set has_shared = false
   where user_id = target_friend_id
     and friend_id = auth.uid();

  delete from public.friend_requests
   where (from_user_id = auth.uid() and to_user_id = target_friend_id)
      or (from_user_id = target_friend_id and to_user_id = auth.uid());
end;
$$;

revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;;
