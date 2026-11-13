-- Automatic feed updates keep their existing cycle-event audience and identity.
create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cycle_events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  alias text,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index event_comments_thread on public.event_comments(event_id, created_at, id);
alter table public.event_comments enable row level security;
revoke all on public.event_comments from public, anon, authenticated;
grant select, delete on public.event_comments to authenticated;
grant insert(event_id, body) on public.event_comments to authenticated;
grant all on public.event_comments to service_role;

create policy event_comments_read_visible on public.event_comments for select to authenticated
  using (public.cycle_event_visible(event_id));
create policy event_comments_insert_own on public.event_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.cycle_event_visible(event_id));
create policy event_comments_delete_own on public.event_comments for delete to authenticated
  using (user_id = (select auth.uid()));
create trigger event_comment_identity before insert on public.event_comments
  for each row execute function public.stamp_comment_alias();

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
    union all
    select c.user_id,0,0,1 from public.event_comments c join public.cycle_events e on e.id=c.event_id
    where e.user_id=(select auth.uid()) and c.created_at>=now()-interval '30 days'
  )
  select s.id,sum(s.r),sum(s.b),sum(s.c) from received s where public.is_friend(s.id)
  group by s.id order by count(*) desc,s.id limit 5
$$;
