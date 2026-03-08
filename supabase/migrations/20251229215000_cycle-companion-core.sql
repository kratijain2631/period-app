create extension if not exists "pgcrypto";
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
create table if not exists public.cycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  phase text,
  symptoms jsonb,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cycle_events_user_id_starts_at_event_type_key'
  ) then
    alter table public.cycle_events
      add constraint cycle_events_user_id_starts_at_event_type_key unique (user_id, starts_at, event_type);
  end if;
end $$;
create index if not exists idx_cycle_events_user_id on public.cycle_events (user_id);
create index if not exists idx_cycle_events_starts_at on public.cycle_events (starts_at);
create table if not exists public.cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  last_synced_at timestamptz not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cycle_snapshots_user_id_key'
  ) then
    alter table public.cycle_snapshots
      add constraint cycle_snapshots_user_id_key unique (user_id);
  end if;
end $$;
create index if not exists idx_cycle_snapshots_user_id on public.cycle_snapshots (user_id);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.cycle_events (id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);
create index if not exists idx_device_tokens_user_id on public.device_tokens (user_id);
drop trigger if exists device_tokens_updated_at on public.device_tokens;
create trigger device_tokens_updated_at
before update on public.device_tokens
for each row execute procedure public.handle_updated_at();
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);
create index if not exists idx_friend_requests_to_user_id on public.friend_requests (to_user_id);
drop trigger if exists friend_requests_updated_at on public.friend_requests;
create trigger friend_requests_updated_at
before update on public.friend_requests
for each row execute procedure public.handle_updated_at();
create table if not exists public.friend_sharing (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  has_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
create index if not exists idx_friend_sharing_friend_id on public.friend_sharing (friend_id);
drop trigger if exists friend_sharing_updated_at on public.friend_sharing;
create trigger friend_sharing_updated_at
before update on public.friend_sharing
for each row execute procedure public.handle_updated_at();
alter table public.cycle_events enable row level security;
alter table public.cycle_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.device_tokens enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friend_sharing enable row level security;
drop policy if exists cycle_events_select_own_or_friends on public.cycle_events;
create policy cycle_events_select_own_or_friends
on public.cycle_events for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1 from public.friend_sharing fs
      where fs.user_id = public.cycle_events.user_id
        and fs.friend_id = auth.uid()
        and fs.has_shared = true
    )
    and exists (
      select 1 from public.friend_sharing fs2
      where fs2.user_id = auth.uid()
        and fs2.friend_id = public.cycle_events.user_id
        and fs2.has_shared = true
    )
  )
);
drop policy if exists cycle_events_insert_own on public.cycle_events;
create policy cycle_events_insert_own
on public.cycle_events for insert
with check (auth.uid() = user_id);
drop policy if exists cycle_events_update_own on public.cycle_events;
create policy cycle_events_update_own
on public.cycle_events for update
using (auth.uid() = user_id);
drop policy if exists cycle_snapshots_select_own_or_friends on public.cycle_snapshots;
create policy cycle_snapshots_select_own_or_friends
on public.cycle_snapshots for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1 from public.friend_sharing fs
      where fs.user_id = public.cycle_snapshots.user_id
        and fs.friend_id = auth.uid()
        and fs.has_shared = true
    )
    and exists (
      select 1 from public.friend_sharing fs2
      where fs2.user_id = auth.uid()
        and fs2.friend_id = public.cycle_snapshots.user_id
        and fs2.has_shared = true
    )
  )
);
drop policy if exists cycle_snapshots_insert_own on public.cycle_snapshots;
create policy cycle_snapshots_insert_own
on public.cycle_snapshots for insert
with check (auth.uid() = user_id);
drop policy if exists cycle_snapshots_update_own on public.cycle_snapshots;
create policy cycle_snapshots_update_own
on public.cycle_snapshots for update
using (auth.uid() = user_id);
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select
using (auth.uid() = user_id);
drop policy if exists notifications_insert_service on public.notifications;
create policy notifications_insert_service
on public.notifications for insert
with check (auth.role() = 'service_role');
drop policy if exists device_tokens_select_own on public.device_tokens;
create policy device_tokens_select_own
on public.device_tokens for select
using (auth.uid() = user_id);
drop policy if exists device_tokens_insert_own on public.device_tokens;
create policy device_tokens_insert_own
on public.device_tokens for insert
with check (auth.uid() = user_id);
drop policy if exists device_tokens_update_own on public.device_tokens;
create policy device_tokens_update_own
on public.device_tokens for update
using (auth.uid() = user_id);
drop policy if exists device_tokens_delete_own on public.device_tokens;
create policy device_tokens_delete_own
on public.device_tokens for delete
using (auth.uid() = user_id);
drop policy if exists friend_requests_select_participants on public.friend_requests;
create policy friend_requests_select_participants
on public.friend_requests for select
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists friend_requests_insert_own on public.friend_requests;
create policy friend_requests_insert_own
on public.friend_requests for insert
with check (auth.uid() = from_user_id);
drop policy if exists friend_requests_update_recipient on public.friend_requests;
create policy friend_requests_update_recipient
on public.friend_requests for update
using (auth.uid() = to_user_id);
drop policy if exists friend_requests_delete_participants on public.friend_requests;
create policy friend_requests_delete_participants
on public.friend_requests for delete
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists friend_sharing_select_participants on public.friend_sharing;
create policy friend_sharing_select_participants
on public.friend_sharing for select
using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists friend_sharing_insert_own on public.friend_sharing;
create policy friend_sharing_insert_own
on public.friend_sharing for insert
with check (auth.uid() = user_id);
drop policy if exists friend_sharing_update_own on public.friend_sharing;
create policy friend_sharing_update_own
on public.friend_sharing for update
using (auth.uid() = user_id);
