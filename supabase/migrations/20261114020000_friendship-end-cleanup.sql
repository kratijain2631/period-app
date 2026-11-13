-- Ending a friendship any way other than remove_friend left its friend_sharing rows on.
-- Either person can delete an accepted request directly, and the recipient can set it
-- back to pending; both happened on staging (2026-11-13). Access already follows
-- accepted requests (20261111180000_friend-rule.sql), but the nightly
-- friend-recommendations job, notifications-handler and older app builds still read
-- friend_sharing, so the job kept writing advice about the ex-friend's cycle.
-- Stored recommendations about an ex-friend also stayed readable, even after
-- remove_friend.
--
-- Now, whenever an accepted request is deleted or stops being accepted, both sharing
-- rows and both recommendation rows for the pair are deleted. A one-time cleanup removes
-- rows left from earlier. Safe to re-run.

create or replace function public.friend_requests_end_friendship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_sharing
   where (user_id = old.from_user_id and friend_id = old.to_user_id)
      or (user_id = old.to_user_id and friend_id = old.from_user_id);
  delete from public.friend_recommendations
   where (user_id = old.from_user_id and friend_id = old.to_user_id)
      or (user_id = old.to_user_id and friend_id = old.from_user_id);
  return null;
end;
$$;

drop trigger if exists friend_requests_end_friendship_delete on public.friend_requests;
create trigger friend_requests_end_friendship_delete
after delete on public.friend_requests
for each row
when (old.status = 'accepted')
execute function public.friend_requests_end_friendship();

drop trigger if exists friend_requests_end_friendship_update on public.friend_requests;
create trigger friend_requests_end_friendship_update
after update of status on public.friend_requests
for each row
when (old.status = 'accepted' and new.status is distinct from 'accepted')
execute function public.friend_requests_end_friendship();

-- Trigger function only; nobody calls it directly.
revoke all on function public.friend_requests_end_friendship() from public, anon, authenticated;

-- One-time cleanup: rows for pairs with no accepted request.
delete from public.friend_sharing fs
 where not exists (
   select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and ((fr.from_user_id = fs.user_id and fr.to_user_id = fs.friend_id)
        or (fr.from_user_id = fs.friend_id and fr.to_user_id = fs.user_id))
 );
delete from public.friend_recommendations rec
 where not exists (
   select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and ((fr.from_user_id = rec.user_id and fr.to_user_id = rec.friend_id)
        or (fr.from_user_id = rec.friend_id and fr.to_user_id = rec.user_id))
 );
