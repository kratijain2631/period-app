-- search_users treated the caller's text as a LIKE pattern and had no result cap, so
-- any signed-in user could list everyone with search = '%' and max_results = null.
-- It now does a literal prefix match on at least 2 characters, returns at most 20 rows,
-- needs a login and leaves out the caller. The signature and return columns are
-- unchanged, so app builds keep working: the Circle screen already waits for 2
-- characters and asks for 8 results. Safe to re-run.

create or replace function public.search_users(search text, max_results int default 5)
returns table (id uuid, alias text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  term text := trim(coalesce(search, ''));
begin
  if auth.uid() is null or char_length(term) < 2 then
    return;
  end if;

  return query
    select u.id, u.alias, u.full_name
      from public.users u
     where u.alias is not null
       and u.id <> auth.uid()
       and u.alias ilike replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
     order by u.alias
     limit greatest(least(coalesce(max_results, 20), 20), 0);
end;
$$;

revoke all on function public.search_users(text, int) from public, anon;
grant execute on function public.search_users(text, int) to authenticated;
