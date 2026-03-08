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

  if position('@' in search) > 0 then
    return query
      select u.id, u.alias, u.full_name
        from public.users u
       where lower(u.email) = lower(search)
       limit max_results;
  else
    return query
      select u.id, u.alias, u.full_name
        from public.users u
       where lower(u.alias) = lower(search)
       limit max_results;
  end if;
end;
$$;
revoke all on function public.search_users(text, int) from public;
grant execute on function public.search_users(text, int) to authenticated;
