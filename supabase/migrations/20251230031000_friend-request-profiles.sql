create or replace function public.friend_request_profiles(request_ids uuid[])
returns table (request_id uuid, other_user_id uuid, alias text, full_name text)
language sql
security definer
set search_path = public
as $$
  select
    fr.id as request_id,
    case
      when fr.from_user_id = auth.uid() then fr.to_user_id
      else fr.from_user_id
    end as other_user_id,
    u.alias,
    u.full_name
  from public.friend_requests fr
  join public.users u
    on u.id = case
      when fr.from_user_id = auth.uid() then fr.to_user_id
      else fr.from_user_id
    end
  where fr.id = any(request_ids)
    and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid());
$$;

revoke all on function public.friend_request_profiles(uuid[]) from public;
grant execute on function public.friend_request_profiles(uuid[]) to authenticated;
