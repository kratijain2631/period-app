-- Populate the notifications table on engagement: when someone reacts to your
-- post/event or boops you, insert a notification for the content owner. This is
-- the in-app half of "notifications" (the push half still needs the
-- notifications-handler edge function + an Expo push token — see TODO).
--
-- Safety: each trigger function is AFTER INSERT, SECURITY DEFINER (so it can
-- write notifications despite the service_role-only insert policy), pins
-- search_path, skips self-actions, and swallows any error — so a failure to
-- create the notification can NEVER block the underlying reaction/boop insert.

-- Reaction to your post ------------------------------------------------------
create or replace function public.notify_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  actor_alias text;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then
    return new; -- no owner, or you reacted to your own post
  end if;
  select alias into actor_alias from public.users where id = new.user_id;
  insert into public.notifications (user_id, friend_id, payload)
  values (
    owner_id,
    new.user_id,
    jsonb_build_object(
      'type', 'post_reaction',
      'event_type', 'post_reaction',
      'post_id', new.post_id,
      'actor_id', new.user_id,
      'actor_alias', actor_alias,
      'emoji', new.emoji
    )
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists post_reactions_notify on public.post_reactions;
create trigger post_reactions_notify
after insert on public.post_reactions
for each row execute function public.notify_post_reaction();

-- Reaction to your cycle event ----------------------------------------------
create or replace function public.notify_event_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  actor_alias text;
begin
  select user_id into owner_id from public.cycle_events where id = new.event_id;
  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;
  select alias into actor_alias from public.users where id = new.user_id;
  insert into public.notifications (user_id, friend_id, event_id, payload)
  values (
    owner_id,
    new.user_id,
    new.event_id,
    jsonb_build_object(
      'type', 'event_reaction',
      'event_type', 'event_reaction',
      'actor_id', new.user_id,
      'actor_alias', actor_alias,
      'emoji', new.emoji
    )
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists event_reactions_notify on public.event_reactions;
create trigger event_reactions_notify
after insert on public.event_reactions
for each row execute function public.notify_event_reaction();

-- Someone booped you ---------------------------------------------------------
create or replace function public.notify_boop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_alias text;
begin
  if new.to_user_id is null or new.to_user_id = new.from_user_id then
    return new;
  end if;
  select alias into actor_alias from public.users where id = new.from_user_id;
  insert into public.notifications (user_id, friend_id, event_id, payload)
  values (
    new.to_user_id,
    new.from_user_id,
    new.event_id,
    jsonb_build_object(
      'type', 'boop',
      'event_type', 'boop',
      'actor_id', new.from_user_id,
      'actor_alias', actor_alias
    )
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists boops_notify on public.boops;
create trigger boops_notify
after insert on public.boops
for each row execute function public.notify_boop();
