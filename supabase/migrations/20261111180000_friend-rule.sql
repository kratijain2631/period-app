-- Friends' data and the friends list followed different rules. Posts, cycle events, cycle
-- summaries, reactions and boops followed accepted friend requests, while the friends list
-- and names followed friend_sharing in both directions, so someone could see your data
-- without being in your list. Now one rule decides everything: an accepted friend request,
-- in either direction. Friends see everything, and removing a friend is the only way to
-- stop sharing. friend_sharing no longer controls access; it's kept in step with friend
-- requests only so app builds that read it still show the right friends list. Safe to re-run.

create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and other is not null
     and other <> auth.uid()
     and exists (
       select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and ((fr.from_user_id = auth.uid() and fr.to_user_id = other)
            or (fr.from_user_id = other and fr.to_user_id = auth.uid()))
     );
$$;
revoke all on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated, service_role;

-- cycle_events can only be read by their owner, so policies on other tables need this.
create or replace function public.cycle_event_visible(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cycle_events ce
     where ce.id = target_event
       and (ce.user_id = auth.uid() or public.is_friend(ce.user_id))
  );
$$;
revoke all on function public.cycle_event_visible(uuid) from public, anon;
grant execute on function public.cycle_event_visible(uuid) to authenticated, service_role;

-- Posts. Reacting to a post needs to see it, so post_reactions_insert_own follows this.
drop policy if exists posts_select_own_or_friends on public.posts;
create policy posts_select_own_or_friends
on public.posts for select
using (auth.uid() = user_id or public.is_friend(user_id));

-- Reactions: yours, ones on your posts, and ones by your friends.
drop policy if exists post_reactions_select_visible on public.post_reactions;
create policy post_reactions_select_visible
on public.post_reactions for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.posts p where p.id = post_reactions.post_id and p.user_id = auth.uid())
  or public.is_friend(user_id)
);

drop policy if exists event_reactions_select_visible on public.event_reactions;
create policy event_reactions_select_visible
on public.event_reactions for select
using (public.cycle_event_visible(event_id));

-- Previously anyone could react to any cycle event.
drop policy if exists event_reactions_insert_own on public.event_reactions;
create policy event_reactions_insert_own
on public.event_reactions for insert
to authenticated
with check (auth.uid() = user_id and public.cycle_event_visible(event_id));

-- Boops: you can only boop a friend, on their own post or event.
drop policy if exists boops_insert_own on public.boops;
create policy boops_insert_own
on public.boops for insert
to authenticated
with check (
  auth.uid() = from_user_id
  and public.is_friend(to_user_id)
  and (post_id is null or exists (
    select 1 from public.posts p where p.id = boops.post_id and p.user_id = boops.to_user_id
  ))
  and (event_id is null or public.cycle_event_belongs_to(boops.event_id, boops.to_user_id))
);

drop policy if exists boops_select_posts on public.boops;
create policy boops_select_posts
on public.boops for select
to authenticated
using (
  post_id is not null
  and (
    exists (select 1 from public.posts p where p.id = boops.post_id and p.user_id = auth.uid())
    or public.is_friend(from_user_id)
  )
);

drop policy if exists boops_select_events on public.boops;
create policy boops_select_events
on public.boops for select
using (event_id is not null and public.cycle_event_visible(event_id));

-- Feed, cycle summaries and friend names.
create or replace function public.shared_cycle_events(max_rows integer default 40)
returns table(id uuid, user_id uuid, event_type text, phase text, symptoms jsonb, starts_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    ce.id,
    ce.user_id,
    ce.event_type,
    ce.phase,
    case
      when ce.symptoms ? 'phase_source'
        then jsonb_build_object('phase_source', ce.symptoms -> 'phase_source')
      else null
    end as symptoms,
    ce.starts_at,
    ce.created_at
  from public.cycle_events ce
  where ce.user_id = auth.uid() or public.is_friend(ce.user_id)
  order by ce.starts_at desc
  limit least(greatest(coalesce(max_rows, 40), 1), 200);
$$;

create or replace function public.friend_cycle_summaries()
returns table(user_id uuid, last_synced_at timestamptz, snapshot jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select
    cs.user_id,
    cs.last_synced_at,
    jsonb_strip_nulls(
      jsonb_build_object(
        'syncedAt', cs.snapshot -> 'syncedAt',
        'currentPhase', cs.snapshot -> 'currentPhase',
        'phaseSource', cs.snapshot -> 'phaseSource',
        'cycleLengthDays', cs.snapshot -> 'cycleLengthDays',
        'lutealLengthDays', cs.snapshot -> 'lutealLengthDays',
        'periodLengthDays', cs.snapshot -> 'periodLengthDays',
        'latestSampleStart', cs.snapshot -> 'latestSampleStart',
        'currentPhaseStart', cs.snapshot -> 'currentPhaseStart',
        'nextPhaseStart', cs.snapshot -> 'nextPhaseStart',
        'nextPhase', cs.snapshot -> 'nextPhase',
        'samples', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', concat('shared-', sample.ordinality),
                'flowValue', 1,
                'startDate', sample.value -> 'startDate',
                'endDate', sample.value -> 'endDate'
              )
              order by sample.ordinality
            )
              from jsonb_array_elements(coalesce(cs.snapshot -> 'samples', '[]'::jsonb))
                   with ordinality as sample(value, ordinality)
          ),
          '[]'::jsonb
        )
      )
    ) as snapshot
  from public.cycle_snapshots cs
  where cs.user_id = auth.uid() or public.is_friend(cs.user_id);
$$;

create or replace function public.friend_profiles(friend_ids uuid[])
returns table(friend_id uuid, alias text, full_name text)
language sql
security definer
set search_path = public
as $$
  select u.id as friend_id, u.alias, u.full_name
    from public.users u
   where u.id = any(friend_ids)
     and public.is_friend(u.id);
$$;

-- Keeps friend_sharing in step with accepted requests, for app builds that read it.
create or replace function public.ensure_friend_sharing(request_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if request_ids is null or array_length(request_ids, 1) is null then
    return;
  end if;
  insert into public.friend_sharing (user_id, friend_id, has_shared)
  select pair.user_id, pair.friend_id, true
    from public.friend_requests fr
   cross join lateral (values (fr.from_user_id, fr.to_user_id), (fr.to_user_id, fr.from_user_id))
         as pair(user_id, friend_id)
   where fr.id = any(request_ids)
     and fr.status = 'accepted'
     and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid())
  on conflict (user_id, friend_id) do update set has_shared = true;
end;
$$;

-- Removing a friend is the only off switch: it deletes the request and both sharing rows,
-- so access ends both ways and re-adding them later starts fresh.
create or replace function public.remove_friend(target_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_friend_id is null then
    raise exception 'target_friend_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'auth.uid() is required';
  end if;
  delete from public.friend_sharing
   where (user_id = auth.uid() and friend_id = target_friend_id)
      or (user_id = target_friend_id and friend_id = auth.uid());
  delete from public.friend_requests
   where (from_user_id = auth.uid() and to_user_id = target_friend_id)
      or (from_user_id = target_friend_id and to_user_id = auth.uid());
end;
$$;

-- Keep the access set by 20261108180000: logged-in users and the service role only.
revoke all on function public.shared_cycle_events(integer) from public, anon;
revoke all on function public.friend_cycle_summaries() from public, anon;
revoke all on function public.friend_profiles(uuid[]) from public, anon;
revoke all on function public.ensure_friend_sharing(uuid[]) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.shared_cycle_events(integer) to authenticated, service_role;
grant execute on function public.friend_cycle_summaries() to authenticated, service_role;
grant execute on function public.friend_profiles(uuid[]) to authenticated, service_role;
grant execute on function public.ensure_friend_sharing(uuid[]) to authenticated, service_role;
grant execute on function public.remove_friend(uuid) to authenticated, service_role;

-- One-time repair so friend_sharing matches accepted requests: every friendship gets rows
-- in both directions, switched on, so app builds that read friend_sharing list every
-- friend.
insert into public.friend_sharing (user_id, friend_id, has_shared)
select pair.user_id, pair.friend_id, true
  from public.friend_requests fr
 cross join lateral (values (fr.from_user_id, fr.to_user_id), (fr.to_user_id, fr.from_user_id))
       as pair(user_id, friend_id)
 where fr.status = 'accepted'
on conflict (user_id, friend_id) do update set has_shared = true
 where not public.friend_sharing.has_shared;

-- Rows with no accepted request behind them would list a non-friend in those builds, and
-- in the nightly guidance job, so remove them.
delete from public.friend_sharing fs
 where not exists (
   select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and ((fr.from_user_id = fs.user_id and fr.to_user_id = fs.friend_id)
        or (fr.from_user_id = fs.friend_id and fr.to_user_id = fs.user_id))
 );
