create table if not exists public.cycle_guidance (
  user_id uuid not null references auth.users (id) on delete cascade,
  phase text,
  dos jsonb not null default '[]'::jsonb,
  donts jsonb not null default '[]'::jsonb,
  friend_suggestions jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (user_id)
);

create index if not exists idx_cycle_guidance_generated_at
  on public.cycle_guidance (generated_at);

alter table public.cycle_guidance enable row level security;

drop policy if exists cycle_guidance_select_own on public.cycle_guidance;
create policy cycle_guidance_select_own
on public.cycle_guidance for select
using (auth.uid() = user_id);

drop policy if exists cycle_guidance_insert_service on public.cycle_guidance;
create policy cycle_guidance_insert_service
on public.cycle_guidance for insert
with check (auth.role() = 'service_role');

drop policy if exists cycle_guidance_update_service on public.cycle_guidance;
create policy cycle_guidance_update_service
on public.cycle_guidance for update
using (auth.role() = 'service_role');
