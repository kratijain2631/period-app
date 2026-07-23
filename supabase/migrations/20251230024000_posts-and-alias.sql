alter table public.users add column if not exists alias text;
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  alias text,
  body text,
  mood_tag text,
  created_at timestamptz not null default now()
);
create index if not exists idx_posts_user_id on public.posts (user_id);
create index if not exists idx_posts_created_at on public.posts (created_at desc);
alter table public.posts enable row level security;
create or replace function public.populate_post_alias()
returns trigger as $$
declare
  resolved_alias text;
begin
  if new.alias is null then
    select coalesce(u.alias, u.full_name, u.email, 'Anonymous')
      into resolved_alias
      from public.users u
     where u.id = new.user_id;
    new.alias := resolved_alias;
  end if;
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists posts_set_alias on public.posts;
create trigger posts_set_alias
before insert on public.posts
for each row execute procedure public.populate_post_alias();
drop policy if exists posts_select_all on public.posts;
create policy posts_select_all
on public.posts for select
using (auth.role() = 'authenticated');
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts for insert
with check (auth.uid() = user_id);
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts for update
using (auth.uid() = user_id);
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
on public.posts for delete
using (auth.uid() = user_id);
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null,
  emoji text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_post_reactions_unique
on public.post_reactions (post_id, user_id, emoji);
alter table public.post_reactions enable row level security;
drop policy if exists post_reactions_select_all on public.post_reactions;
create policy post_reactions_select_all
on public.post_reactions for select
using (auth.role() = 'authenticated');
drop policy if exists post_reactions_insert_own on public.post_reactions;
create policy post_reactions_insert_own
on public.post_reactions for insert
with check (auth.uid() = user_id);
drop policy if exists post_reactions_delete_own on public.post_reactions;
create policy post_reactions_delete_own
on public.post_reactions for delete
using (auth.uid() = user_id);
alter table public.boops add column if not exists post_id uuid;
create index if not exists idx_boops_post_id on public.boops (post_id);
drop policy if exists boops_select_posts on public.boops;
create policy boops_select_posts
on public.boops for select
using (post_id is not null and auth.role() = 'authenticated');
