-- Two people could each hold a request to the other: both pending (sent at the same
-- moment, or through the API), or a new pending one alongside an existing friendship.
-- Accepting one left the other pending, so the app could offer Accept for someone who
-- was already a friend. The unique key only covers one direction, and the app's and
-- send_friend_request_by_email's checks run before the insert, so neither stops a race.
--
-- Now a pair holds at most one request:
--   * a new request is refused when the other person already requested you or is
--     already your friend (the pair is locked first, so two at once can't both pass);
--   * accepting a request deletes any pending one in the other direction;
--   * pending requests from existing friends are removed once.
-- Safe to re-run.

create or replace function public.friend_requests_one_per_pair()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reverse_status text;
begin
  -- Serialise inserts for this pair, in either direction, until the transaction ends.
  perform pg_advisory_xact_lock(
    hashtextextended(least(new.from_user_id, new.to_user_id)::text || greatest(new.from_user_id, new.to_user_id)::text, 0)
  );
  select status into reverse_status
    from public.friend_requests
   where from_user_id = new.to_user_id
     and to_user_id = new.from_user_id;
  if reverse_status = 'accepted' then
    raise exception 'You''re already friends.' using errcode = 'unique_violation';
  elsif reverse_status = 'pending' then
    raise exception 'They already sent you a request.' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists friend_requests_one_per_pair on public.friend_requests;
create trigger friend_requests_one_per_pair
before insert on public.friend_requests
for each row execute function public.friend_requests_one_per_pair();

create or replace function public.friend_requests_clear_reverse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_requests
   where from_user_id = new.to_user_id
     and to_user_id = new.from_user_id
     and status = 'pending';
  return null;
end;
$$;

drop trigger if exists friend_requests_clear_reverse on public.friend_requests;
create trigger friend_requests_clear_reverse
after insert or update of status on public.friend_requests
for each row
when (new.status = 'accepted')
execute function public.friend_requests_clear_reverse();

-- Trigger functions only; nobody calls them directly.
revoke all on function public.friend_requests_one_per_pair() from public, anon, authenticated;
revoke all on function public.friend_requests_clear_reverse() from public, anon, authenticated;

-- One-time cleanup: pending requests from someone who is already a friend.
delete from public.friend_requests pending
 where pending.status = 'pending'
   and exists (
     select 1 from public.friend_requests accepted
      where accepted.status = 'accepted'
        and accepted.from_user_id = pending.to_user_id
        and accepted.to_user_id = pending.from_user_id
   );
