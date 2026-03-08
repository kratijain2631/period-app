create table if not exists public.friend_recommendations (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  recommendations jsonb not null,
  score integer,
  generated_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create index if not exists idx_friend_recommendations_friend_id
  on public.friend_recommendations (friend_id);

alter table public.friend_recommendations enable row level security;

drop policy if exists friend_recommendations_select_own on public.friend_recommendations;
create policy friend_recommendations_select_own
on public.friend_recommendations for select
using (auth.uid() = user_id);

drop policy if exists friend_recommendations_insert_service on public.friend_recommendations;
create policy friend_recommendations_insert_service
on public.friend_recommendations for insert
with check (auth.role() = 'service_role');

drop policy if exists friend_recommendations_update_service on public.friend_recommendations;
create policy friend_recommendations_update_service
on public.friend_recommendations for update
using (auth.role() = 'service_role');
;
