-- Friend requests are the consent boundary for cycle data: friend_cycle_summaries,
-- shared_cycle_events and ensure_friend_sharing all trust status = 'accepted'.
-- The old policies let a client forge that status without the other person agreeing:
--   * insert only checked auth.uid() = from_user_id, so a sender could insert 'accepted'.
--   * update only checked auth.uid() = to_user_id, so a recipient could change
--     from_user_id to anyone and set 'accepted'.
-- This migration requires new requests to be pending and not to yourself, and limits
-- client updates to the status column. Client writes are unchanged: inserts already
-- send 'pending' and updates only set status. Declining deletes the row in every
-- build since at least 1.0.7. SECURITY DEFINER functions and the service role are not
-- affected. Safe to re-run.

drop policy if exists friend_requests_insert_own on public.friend_requests;
create policy friend_requests_insert_own
on public.friend_requests for insert
with check (
  auth.uid() = from_user_id
  and status = 'pending'
  and from_user_id <> to_user_id
);

drop policy if exists friend_requests_update_recipient on public.friend_requests;
create policy friend_requests_update_recipient
on public.friend_requests for update
using (auth.uid() = to_user_id)
with check (
  auth.uid() = to_user_id
  and status in ('pending', 'accepted')
);

revoke update on table public.friend_requests from anon, authenticated;
grant update (status) on table public.friend_requests to authenticated;

-- NOT VALID: applies to new and updated rows without failing on any existing self-request.
alter table public.friend_requests
  drop constraint if exists friend_requests_not_self;
alter table public.friend_requests
  add constraint friend_requests_not_self check (from_user_id <> to_user_id) not valid;
