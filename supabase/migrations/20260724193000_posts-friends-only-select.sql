-- Restrict post visibility to the author and mutually-sharing friends.
--
-- Before: `posts_select_all` used `auth.role() = 'authenticated'`, so ANY
-- signed-in user could read EVERY post. A brand-new account therefore saw
-- everyone's posts (and the demo seed rows) in its feed — a privacy leak
-- (BUGS.md #1).
--
-- After: a user can read their own posts, or a friend's posts only when the
-- two have *mutually* shared (`friend_sharing.has_shared = true` in both
-- directions). This mirrors the gate already used by cycle_events and
-- cycle_snapshots, so the feed is consistently consent-scoped.
--
-- This is enforced server-side, so it takes effect as soon as it's applied —
-- no app rebuild required. Reactions/boops are unaffected because the app only
-- ever queries them for post ids returned by this (now-scoped) posts read.

drop policy if exists posts_select_all on public.posts;
drop policy if exists posts_select_own_or_friends on public.posts;
create policy posts_select_own_or_friends
on public.posts for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1 from public.friend_sharing fs
      where fs.user_id = public.posts.user_id
        and fs.friend_id = auth.uid()
        and fs.has_shared = true
    )
    and exists (
      select 1 from public.friend_sharing fs2
      where fs2.user_id = auth.uid()
        and fs2.friend_id = public.posts.user_id
        and fs2.has_shared = true
    )
  )
);
