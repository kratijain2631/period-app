-- Deliver new posts and notifications over Realtime, so a friend's post reaches
-- the feed and a reaction, comment or boop reaches the bell within seconds
-- instead of waiting for the 60s poll. The app already listens for notification
-- inserts; nothing was delivered because the table wasn't published.
-- RLS still scopes delivered rows: posts to the author and their friends,
-- notifications to their owner. Additive + idempotent.

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception
  when duplicate_object then null; -- already part of the publication
  when undefined_object then null; -- publication missing (shouldn't happen on Supabase)
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
