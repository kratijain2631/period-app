-- Makes aliases unique, ignoring case and surrounding spaces, and stops a post carrying a
-- name other than its author's. The post's alias is now set by the database for client
-- writes, and no longer falls back to the author's email. Server-side writes have no
-- auth.uid() and can still set it, which the test seed uses. Create the index only after
-- any duplicates are resolved, or it fails. Safe to re-run.

create unique index if not exists users_alias_unique
  on public.users (lower(trim(alias)))
  where alias is not null and trim(alias) <> '';

create or replace function public.populate_post_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null or new.alias is null then
    select coalesce(u.alias, u.full_name, 'Anonymous')
      into new.alias
      from public.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.populate_post_alias() from public, anon, authenticated;

drop trigger if exists posts_set_alias on public.posts;
create trigger posts_set_alias
before insert or update of alias on public.posts
for each row execute function public.populate_post_alias();
