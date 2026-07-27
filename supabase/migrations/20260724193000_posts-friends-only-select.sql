-- Restrict post visibility to the author and their accepted friends.
--
-- Before: `posts_select_all` used `auth.role() = 'authenticated'`, so ANY
-- signed-in user could read EVERY post. A brand-new account therefore saw
-- everyone's posts (and the demo seed rows) in its feed — a privacy leak
-- (BUGS.md #1).
--
-- After: a user can read their own posts, or a post by anyone they have an
-- *accepted* friendship with (a `friend_requests` row with status 'accepted'
-- in either direction). This is the looser, "social feed" model: posts are
-- visible to any accepted friend, independent of the cycle-data sharing toggle
-- (`friend_sharing.has_shared`). Non-friends still see nothing.
--
-- (Cycle events/snapshots stay on the stricter *mutual-sharing* gate — those
-- are the sensitive health rows; a text post is treated as lighter social
-- content.)
--
-- Enforced server-side, so it takes effect as soon as it's applied — no app
-- rebuild required. Reactions/boops are unaffected because the app only ever
-- queries them for post ids returned by this (now-scoped) posts read.

drop policy if exists posts_select_all on public.posts;
drop policy if exists posts_select_own_or_friends on public.posts;
create policy posts_select_own_or_friends
on public.posts for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.from_user_id = auth.uid() and fr.to_user_id = public.posts.user_id)
        or (fr.from_user_id = public.posts.user_id and fr.to_user_id = auth.uid())
      )
  )
);
