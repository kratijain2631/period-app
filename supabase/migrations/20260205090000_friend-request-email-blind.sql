create or replace function public.search_users(search text, max_results int default 5)
returns table (id uuid, alias text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if search is null or length(trim(search)) = 0 then
    return;
  end if;

  return query
    select u.id, u.alias, u.full_name
      from public.users u
     where u.alias is not null
       and u.alias ilike trim(search) || '%'
     limit max_results;
end;
$$;

revoke all on function public.search_users(text, int) from public;
grant execute on function public.search_users(text, int) to authenticated;

create or replace function public.send_friend_request_by_email(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if target_email is null or length(trim(target_email)) = 0 then
    return;
  end if;

  if auth.uid() is null then
    return;
  end if;

  select u.id
    into target_id
    from public.users u
   where lower(u.email) = lower(trim(target_email))
   limit 1;

  if target_id is null or target_id = auth.uid() then
    return;
  end if;

  if exists (
    select 1
      from public.friend_requests fr
     where fr.status = 'accepted'
       and (
         (fr.from_user_id = auth.uid() and fr.to_user_id = target_id)
         or (fr.from_user_id = target_id and fr.to_user_id = auth.uid())
       )
  ) then
    return;
  end if;

  if exists (
    select 1
      from public.friend_requests fr
     where fr.status = 'pending'
       and fr.from_user_id = target_id
       and fr.to_user_id = auth.uid()
  ) then
    return;
  end if;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (auth.uid(), target_id, 'pending')
  on conflict (from_user_id, to_user_id)
  do update set status = 'pending', updated_at = now();
exception
  when others then
    return;
end;
$$;

revoke all on function public.send_friend_request_by_email(text) from public;
grant execute on function public.send_friend_request_by_email(text) to authenticated;
