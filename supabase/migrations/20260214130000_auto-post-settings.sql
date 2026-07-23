alter table public.users
  add column if not exists auto_post_period_days boolean not null default true;

alter table public.users
  add column if not exists auto_post_period_start_only boolean not null default false;

alter table public.users
  add column if not exists auto_post_phase_transitions boolean not null default true;
