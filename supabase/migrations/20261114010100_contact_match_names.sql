-- Preserve the verified-identifier checks and shared lookup budget for older clients.
create function public.contact_friend_matches_v3(identifiers text[])
returns table (id uuid, alias text, full_name text, match_hash text)
language sql security definer set search_path = '' as $$
  select m.id, m.alias, u.full_name, m.match_hash
  from public.contact_friend_matches_v2(identifiers) m
  join public.users u on u.id = m.id;
$$;
revoke all on function public.contact_friend_matches_v3(text[]) from public, anon;
grant execute on function public.contact_friend_matches_v3(text[]) to authenticated;
