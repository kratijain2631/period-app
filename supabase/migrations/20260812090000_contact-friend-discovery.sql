alter table public.users
  add column if not exists discoverable_by_contacts boolean not null default false;

create or replace function public.contact_friend_matches(
  email_hashes text[],
  max_results int default 50
)
returns table (id uuid, alias text, email_hash text)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select
    u.id,
    u.alias,
    encode(digest(lower(trim(u.email)), 'sha256'), 'hex') as email_hash
  from public.users u
  where auth.uid() is not null
    and u.id <> auth.uid()
    and u.discoverable_by_contacts = true
    and u.email is not null
    and encode(digest(lower(trim(u.email)), 'sha256'), 'hex') = any(email_hashes)
  order by u.created_at asc
  limit greatest(0, least(coalesce(max_results, 50), 100));
$$;

revoke all on function public.contact_friend_matches(text[], int) from public;
grant execute on function public.contact_friend_matches(text[], int) to authenticated;

comment on column public.users.discoverable_by_contacts is
  'Independent opt-in allowing an account email hash to match a contact lookup.';
