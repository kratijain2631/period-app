-- The feed needs only display identity, scoped exactly to self and accepted friends.
create function public.activity_author_profiles(member_ids uuid[])
returns table(member_id uuid, full_name text, alias text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.full_name, u.alias, u.avatar_url
  from public.users u
  where (select auth.uid()) is not null and u.id = any(member_ids)
    and (u.id = (select auth.uid()) or public.is_friend(u.id))
$$;
revoke all on function public.activity_author_profiles(uuid[]) from public, anon;
grant execute on function public.activity_author_profiles(uuid[]) to authenticated;
