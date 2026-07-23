create table if not exists public.event_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cycle_events(id) on delete cascade,
  user_id uuid not null,
  emoji text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_event_reactions_unique
on public.event_reactions (event_id, user_id, emoji);

create index if not exists idx_event_reactions_event_id
on public.event_reactions (event_id);

alter table public.event_reactions enable row level security;

drop policy if exists event_reactions_select_visible on public.event_reactions;
create policy event_reactions_select_visible
on public.event_reactions for select
using (
  exists (
    select 1 from public.cycle_events ce
    where ce.id = event_id
      and (
        auth.uid() = ce.user_id
        or (
          exists (
            select 1 from public.friend_sharing fs
            where fs.user_id = ce.user_id
              and fs.friend_id = auth.uid()
              and fs.has_shared = true
          )
          and exists (
            select 1 from public.friend_sharing fs2
            where fs2.user_id = auth.uid()
              and fs2.friend_id = ce.user_id
              and fs2.has_shared = true
          )
        )
      )
  )
);

drop policy if exists event_reactions_insert_own on public.event_reactions;
create policy event_reactions_insert_own
on public.event_reactions for insert
with check (auth.uid() = user_id);

drop policy if exists event_reactions_delete_own on public.event_reactions;
create policy event_reactions_delete_own
on public.event_reactions for delete
using (auth.uid() = user_id);
