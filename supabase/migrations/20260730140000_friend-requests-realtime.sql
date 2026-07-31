-- Deliver friend_requests changes over Realtime so the notifications bell/page
-- can refresh sub-second (new inbound request, or your outbound one accepted)
-- instead of waiting for the 60s poll. RLS still scopes delivered rows to the
-- participants. Additive + idempotent (ignores "already in publication").

do $$
begin
  alter publication supabase_realtime add table public.friend_requests;
exception
  when duplicate_object then null; -- already part of the publication
  when undefined_object then null; -- publication missing (shouldn't happen on Supabase)
end $$;
