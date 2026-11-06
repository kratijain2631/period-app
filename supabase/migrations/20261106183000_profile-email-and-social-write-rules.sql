-- Stops a user claiming someone else's email on their profile, and stops strangers
-- reacting to or booping people. Applied by hand to staging and production on 2026-11-06.
-- Safe to re-run.

-- The app writes email on every profile upsert, so this overrides the value instead of
-- revoking the column, which would break shipped builds. Server-side writes have no
-- auth.uid() and are left alone.
create or replace function public.enforce_users_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    select au.email into new.email from auth.users au where au.id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_users_email() from public, anon, authenticated;

drop trigger if exists users_enforce_email on public.users;
create trigger users_enforce_email
before insert or update on public.users
for each row execute function public.enforce_users_email();

-- You can only react to a post you can see. The posts policy limits this to your own
-- posts and your friends' posts.
drop policy if exists post_reactions_insert_own on public.post_reactions;
create policy post_reactions_insert_own
on public.post_reactions for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (select 1 from public.posts p where p.id = post_reactions.post_id)
);

-- cycle_events can only be read by their owner, so the boop rule needs this helper.
create or replace function public.cycle_event_belongs_to(target_event uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.cycle_events ce where ce.id = target_event and ce.user_id = target_user
  );
$$;
revoke all on function public.cycle_event_belongs_to(uuid, uuid) from public, anon;
grant execute on function public.cycle_event_belongs_to(uuid, uuid) to authenticated;

-- You can only boop a friend, and a boop on a post or event must be on that friend's own.
drop policy if exists boops_insert_own on public.boops;
create policy boops_insert_own
on public.boops for insert
to authenticated
with check (
  auth.uid() = from_user_id
  and exists (
    select 1 from public.friend_requests fr
     where fr.status = 'accepted'
       and (
         (fr.from_user_id = auth.uid() and fr.to_user_id = boops.to_user_id)
         or (fr.from_user_id = boops.to_user_id and fr.to_user_id = auth.uid())
       )
  )
  and (post_id is null or exists (
    select 1 from public.posts p where p.id = boops.post_id and p.user_id = boops.to_user_id
  ))
  and (event_id is null or public.cycle_event_belongs_to(boops.event_id, boops.to_user_id))
);
