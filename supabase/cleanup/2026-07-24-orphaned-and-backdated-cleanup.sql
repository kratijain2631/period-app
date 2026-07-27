-- One-time data cleanup — 2026-07-24
--
-- Run this MANUALLY in the Supabase SQL editor. It is NOT a migration (it
-- lives outside supabase/migrations so it never auto-runs). It is safe to
-- re-run: every statement only targets rows that still match.
--
-- It cleans up two messes:
--   1. Rows orphaned by account deletions that happened BEFORE the
--      delete-account edge function was fixed to remove them
--      (posts / post_reactions / event_reactions / boops whose user_id no
--      longer exists in auth.users).  NOTE: this also removes the demo
--      *seed* rows (seed-posts.sql), because their user_ids
--      (1111…, 2222…, …) are not real auth.users — see BUGS.md #1.
--   2. Backdated "flood" posts: menstrual_flow cycle_events that were
--      auto-posted with a starts_at BEFORE the owner's account was created
--      (the pre-fix behaviour that flooded new accounts' feeds).
--
-- ---------------------------------------------------------------------------
-- STEP 1 — PREVIEW (read-only). Run these first to see what will be removed.
-- ---------------------------------------------------------------------------

-- Orphaned rows (owner no longer in auth.users):
select 'post_reactions (orphaned)' as what,
       count(*) from public.post_reactions pr
       where not exists (select 1 from auth.users u where u.id = pr.user_id)
union all
select 'event_reactions (orphaned)',
       count(*) from public.event_reactions er
       where not exists (select 1 from auth.users u where u.id = er.user_id)
union all
select 'posts (orphaned, incl. demo seed)',
       count(*) from public.posts p
       where not exists (select 1 from auth.users u where u.id = p.user_id)
union all
select 'boops (orphaned)',
       count(*) from public.boops b
       where not exists (select 1 from auth.users u where u.id = b.from_user_id)
          or (b.to_user_id is not null
              and not exists (select 1 from auth.users u where u.id = b.to_user_id))
union all
-- Backdated menstrual_flow events (dated before the owner's account creation):
select 'cycle_events (backdated menstrual_flow)',
       count(*) from public.cycle_events ce
       join auth.users u on u.id = ce.user_id
       where ce.event_type = 'menstrual_flow'
         and ce.starts_at < u.created_at;

-- ---------------------------------------------------------------------------
-- STEP 2 — DELETE. Review the preview above, then run this block.
-- Wrapped in a transaction: if anything looks wrong, ROLLBACK instead of COMMIT.
-- ---------------------------------------------------------------------------

begin;

-- 1a. Orphaned reactions first (post_reactions on deleted posts would also
--     cascade when the post is removed below, but this clears cross-user
--     reactions left by deleted authors too).
delete from public.post_reactions pr
 where not exists (select 1 from auth.users u where u.id = pr.user_id);

delete from public.event_reactions er
 where not exists (select 1 from auth.users u where u.id = er.user_id);

-- 1b. Orphaned boops (either side of the boop belongs to a deleted user).
delete from public.boops b
 where not exists (select 1 from auth.users u where u.id = b.from_user_id)
    or (b.to_user_id is not null
        and not exists (select 1 from auth.users u where u.id = b.to_user_id));

-- 1c. Orphaned posts (incl. demo seed rows). Any remaining post_reactions on
--     these cascade automatically (post_reactions.post_id … on delete cascade).
delete from public.posts p
 where not exists (select 1 from auth.users u where u.id = p.user_id);

-- 2. Backdated menstrual_flow events (predate the owner's account creation).
--    event_reactions on these cascade automatically
--    (event_reactions.event_id … on delete cascade).
delete from public.cycle_events ce
 using auth.users u
 where ce.user_id = u.id
   and ce.event_type = 'menstrual_flow'
   and ce.starts_at < u.created_at;

commit;

-- ---------------------------------------------------------------------------
-- STEP 3 — VERIFY. Re-run STEP 1; every count should now be 0.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- STEP 4 — Purge SOFT-DELETED accounts (deleted before the hard-delete fix).
--
-- Accounts deleted before 2026-07-26 were only *soft*-deleted: their row still
-- exists in auth.users (with deleted_at set), so nothing cascaded and they
-- still appear in friends' lists and their posts still show. This purges them.
-- ===========================================================================

-- PREVIEW (read-only): who is soft-deleted, and what data lingers.
select u.id, u.email, u.deleted_at,
       (select count(*) from public.posts p where p.user_id = u.id) as posts,
       (select count(*) from public.friend_requests fr
          where fr.from_user_id = u.id or fr.to_user_id = u.id) as friend_links,
       (select count(*) from public.friend_sharing fs
          where fs.user_id = u.id or fs.friend_id = u.id) as sharing_rows
from auth.users u
where u.deleted_at is not null
order by u.deleted_at desc;

-- DELETE: run after reviewing the preview. ROLLBACK instead of COMMIT if unsure.
begin;

-- Non-cascading tables first (by the soft-deleted user ids).
delete from public.post_reactions
 where user_id in (select id from auth.users where deleted_at is not null);
delete from public.event_reactions
 where user_id in (select id from auth.users where deleted_at is not null);
delete from public.posts
 where user_id in (select id from auth.users where deleted_at is not null);
delete from public.boops
 where from_user_id in (select id from auth.users where deleted_at is not null)
    or to_user_id   in (select id from auth.users where deleted_at is not null);

-- Hard-delete the auth rows → cascades users, cycle_events, cycle_snapshots,
-- notifications, device_tokens, friend_requests, friend_sharing,
-- friend_recommendations (removing them from everyone's friend lists).
delete from auth.users where deleted_at is not null;

commit;

-- VERIFY: should be 0.
select count(*) as remaining_soft_deleted from auth.users where deleted_at is not null;
