-- Existing accounts do not appear on either global board until they opt in.
alter table public.users add column if not exists community_rankings_enabled boolean not null default false;

create or replace function public.circle_community_top(board text)
returns table(member_id uuid, alias text, score bigint)
language sql stable security definer set search_path = '' as $$
  with members as (
    select u.id,u.alias from public.users u where u.community_rankings_enabled and nullif(trim(u.alias),'') is not null
  ), edges as (
    select from_user_id as id,to_user_id as peer from public.friend_requests where board='friends' and status='accepted'
    union select to_user_id,from_user_id from public.friend_requests where board='friends' and status='accepted'
  ), scores as (
    select m.id,m.alias,count(e.peer) as score from members m join edges e on e.id=m.id and e.peer<>m.id group by m.id,m.alias
    union all
    select m.id,m.alias,count(*) from members m join public.posts p on p.user_id=m.id
    where board='posts' and p.created_at >= (date_trunc('month', now() at time zone 'UTC') at time zone 'UTC') and p.created_at <= now() group by m.id,m.alias
  )
  select s.id,s.alias,s.score from scores s where (select auth.uid()) is not null order by s.score desc,lower(s.alias),s.id limit 10
$$;

-- A comment has the same audience as its parent post. Only its author may remove it.
create table public.post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
 alias text, body text not null check(length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index post_comments_thread on public.post_comments(post_id,created_at,id);
alter table public.post_comments enable row level security;
revoke all on public.post_comments from public,anon,authenticated;
grant select,delete on public.post_comments to authenticated;
grant insert(post_id,body) on public.post_comments to authenticated;
grant all on public.post_comments to service_role;
create policy comments_read_post on public.post_comments for select to authenticated using (
 exists(select 1 from public.posts p where p.id=post_comments.post_id and (p.user_id=(select auth.uid()) or public.is_friend(p.user_id)))
);
create policy comments_write_post on public.post_comments for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_comments.post_id and (p.user_id=(select auth.uid()) or public.is_friend(p.user_id)))
);
create policy comments_delete_own on public.post_comments for delete to authenticated using(user_id=(select auth.uid()));
create function public.stamp_comment_alias() returns trigger language plpgsql security invoker set search_path='' as $$
begin select u.alias into new.alias from public.users u where u.id=new.user_id; return new; end $$;
revoke all on function public.stamp_comment_alias() from public,anon,authenticated;
create trigger comment_identity before insert on public.post_comments for each row execute function public.stamp_comment_alias();

-- Only the recipient can see their own ranking; RLS still applies to all reads.
create or replace function public.my_circle_support()
returns table(member_id uuid,reactions bigint,boops bigint,comments bigint)
language sql stable security invoker set search_path = '' as $$
  with received as (
    select r.user_id as id, 1 as r, 0 as b, 0 as c from public.post_reactions r join public.posts p on p.id=r.post_id
    where p.user_id=(select auth.uid()) and r.created_at>=now()-interval '30 days'
    union all
    select r.user_id,1,0,0 from public.event_reactions r join public.cycle_events e on e.id=r.event_id
    where e.user_id=(select auth.uid()) and r.created_at>=now()-interval '30 days'
    union all
    select b.from_user_id,0,1,0 from public.boops b where b.to_user_id=(select auth.uid()) and b.created_at>=now()-interval '30 days'
      and (b.post_id is null or exists(select 1 from public.posts p where p.id=b.post_id and p.user_id=b.to_user_id))
    union all
    select c.user_id,0,0,1 from public.post_comments c join public.posts p on p.id=c.post_id
    where p.user_id=(select auth.uid()) and c.created_at>=now()-interval '30 days'
  )
  select s.id,sum(s.r),sum(s.b),sum(s.c) from received s where public.is_friend(s.id)
  group by s.id order by count(*) desc,s.id limit 5
$$;

-- Search already exposes aliases. Only self/accepted friends may see the extended identity.
create or replace function public.circle_member_profile(subject uuid)
returns table(member_id uuid,alias text,full_name text,bio text,avatar_url text,has_access boolean)
language sql stable security definer set search_path = '' as $$
  select u.id,u.alias,case when a.can_read then u.full_name end,case when a.can_read then u.bio end,
         case when a.can_read then u.avatar_url end,a.can_read
  from public.users u cross join lateral (select (u.id=(select auth.uid()) or public.is_friend(u.id)) as can_read) a
  where (select auth.uid()) is not null and u.id=subject and (u.alias is not null or a.can_read)
$$;
revoke all on function public.circle_member_profile(uuid), public.my_circle_support(), public.circle_community_top(text) from public,anon;
grant execute on function public.circle_member_profile(uuid), public.my_circle_support(), public.circle_community_top(text) to authenticated;

-- Literal prefix search, capped like search_users; never return contact identifiers.
create or replace function public.circle_search_members(term text)
returns table(id uuid,alias text,full_name text)
language sql stable security definer set search_path = '' as $$
 select u.id,u.alias,u.full_name from public.users u
 where (select auth.uid()) is not null and u.id<>(select auth.uid()) and u.alias is not null
 and length(trim(term)) between 2 and 80
 and (starts_with(lower(u.alias),lower(trim(term))) or starts_with(lower(u.full_name),lower(trim(term))))
 order by lower(u.alias),u.id limit 8
$$;
revoke all on function public.circle_search_members(text) from public,anon;
grant execute on function public.circle_search_members(text) to authenticated;
