-- Keep the original email RPC available to older builds.
create schema if not exists private;
create table private.contact_lookup_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  identifiers_checked integer not null
);
revoke all on private.contact_lookup_usage from public, anon, authenticated;

create function public.contact_friend_matches_v2(identifiers text[])
returns table (id uuid, alias text, match_hash text)
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  amount integer := cardinality(identifiers);
begin
  if caller is null then raise exception 'Sign in required'; end if;
  if coalesce(amount, 0) = 0 then return; end if;
  if amount > 200 then raise exception 'Too many identifiers'; end if;

  insert into private.contact_lookup_usage as usage values (caller, now(), amount)
  on conflict (user_id) do update set
    window_start = case when usage.window_start <= now() - interval '1 hour' then now() else usage.window_start end,
    identifiers_checked = case when usage.window_start <= now() - interval '1 hour' then amount else usage.identifiers_checked + amount end
  where usage.window_start <= now() - interval '1 hour' or usage.identifiers_checked + amount <= 20000;
  if not found then raise exception 'Contact search limit reached. Try again in an hour.'; end if;

  return query
    select distinct on (u.id) u.id, u.alias, h.value
    from public.users u join auth.users a on a.id = u.id
    cross join lateral (values
      (case when a.email_confirmed_at is not null then lower(trim(a.email)) end),
      (case when a.phone_confirmed_at is not null and a.phone ~ '^\+?[1-9][0-9]{6,14}$'
            then '+' || ltrim(a.phone, '+') end)
    ) v(identifier)
    cross join lateral (select encode(extensions.digest(v.identifier, 'sha256'), 'hex') as value) h
    where u.id <> caller and u.discoverable_by_contacts and h.value = any(identifiers)
    order by u.id, h.value limit 100;
end;
$$;
revoke all on function public.contact_friend_matches_v2(text[]) from public, anon;
grant execute on function public.contact_friend_matches_v2(text[]) to authenticated;
