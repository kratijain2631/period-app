create table if not exists public.boops (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  to_user_id uuid not null,
  event_id uuid null references public.cycle_events(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_boops_from_user_id on public.boops (from_user_id);
create index if not exists idx_boops_to_user_id on public.boops (to_user_id);
alter table public.boops enable row level security;
drop policy if exists boops_select_participants on public.boops;
create policy boops_select_participants
on public.boops for select
using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists boops_insert_own on public.boops;
create policy boops_insert_own
on public.boops for insert
with check (auth.uid() = from_user_id);
