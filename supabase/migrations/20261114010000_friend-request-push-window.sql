-- A re-sent friend request from the same person now pushes again after 5 minutes,
-- instead of a day. The window still stops someone buzzing another person's phone
-- by cancelling and re-sending over and over. Only the interval changes; the rest
-- of push_for_friend_request is as in 20261113230000. Safe to re-run.

create or replace function public.push_for_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target uuid;
  kind text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    actor := new.from_user_id;
    target := new.to_user_id;
    kind := 'friend_request';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    actor := new.to_user_id;
    target := new.from_user_id;
    kind := 'friend_request_accepted';
  else
    return new;
  end if;
  perform public.enqueue_push(
    target,
    actor,
    kind,
    jsonb_build_object(
      'type', kind,
      'request_id', new.id,
      'actor_id', actor,
      'actor_alias', (select alias from public.users where id = actor)
    ),
    null,
    case when kind = 'friend_request' then interval '5 minutes' end
  );
  return new;
exception
  when others then
    return new;
end;
$$;
revoke all on function public.push_for_friend_request() from public, anon, authenticated;
