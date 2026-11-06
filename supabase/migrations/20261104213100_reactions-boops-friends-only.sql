-- Any signed-in user could read every post reaction and every boop on a post. A viewer
-- now sees one only if they made it, wrote the post, or are friends with the person who
-- made it (an accepted friend request in either direction). Boop senders and recipients
-- keep access through boops_select_participants, and boops on cycle events keep
-- boops_select_events. Counts can now differ between viewers, which is intended. Safe to re-run.

drop policy if exists post_reactions_select_all on public.post_reactions;
drop policy if exists post_reactions_select_visible on public.post_reactions;
create policy post_reactions_select_visible
on public.post_reactions for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
      from public.posts p
     where p.id = post_reactions.post_id
       and p.user_id = auth.uid()
  )
  or exists (
    select 1
      from public.friend_requests fr
     where fr.status = 'accepted'
       and (
         (fr.from_user_id = auth.uid() and fr.to_user_id = post_reactions.user_id)
         or (fr.from_user_id = post_reactions.user_id and fr.to_user_id = auth.uid())
       )
  )
);

drop policy if exists boops_select_posts on public.boops;
create policy boops_select_posts
on public.boops for select
to authenticated
using (
  post_id is not null
  and (
    exists (
      select 1
        from public.posts p
       where p.id = boops.post_id
         and p.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.friend_requests fr
       where fr.status = 'accepted'
         and (
           (fr.from_user_id = auth.uid() and fr.to_user_id = boops.from_user_id)
           or (fr.from_user_id = boops.from_user_id and fr.to_user_id = auth.uid())
         )
    )
  )
);
