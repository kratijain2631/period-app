-- RLS smoke checks for Cycle Companion tables.
-- Uses the provided auth.users IDs for the current project.

-- Set authenticated user A
select set_config('request.jwt.claim.sub', '323785c7-0012-4826-bd93-e17a1a7d3b86', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Insert a cycle event as user A
insert into public.cycle_events (user_id, event_type, phase, starts_at)
values ('323785c7-0012-4826-bd93-e17a1a7d3b86', 'menstrual_flow', 'menstruation', now())
on conflict do nothing;

-- User A should see their own event
select count(*) as user_a_events
from public.cycle_events
where user_id = '323785c7-0012-4826-bd93-e17a1a7d3b86';

-- Set authenticated user B (no sharing yet)
select set_config('request.jwt.claim.sub', 'e267c05f-8170-43f7-a370-4207e4f2a834', true);

-- User B should NOT see user A events without mutual share
select count(*) as user_b_events
from public.cycle_events
where user_id = '323785c7-0012-4826-bd93-e17a1a7d3b86';

-- Enable mutual sharing
insert into public.friend_sharing (user_id, friend_id, has_shared)
values
  ('323785c7-0012-4826-bd93-e17a1a7d3b86', 'e267c05f-8170-43f7-a370-4207e4f2a834', true),
  ('e267c05f-8170-43f7-a370-4207e4f2a834', '323785c7-0012-4826-bd93-e17a1a7d3b86', true)
on conflict (user_id, friend_id) do update set has_shared = excluded.has_shared;

-- User B should now see user A events
select count(*) as user_b_events_after_share
from public.cycle_events
where user_id = '323785c7-0012-4826-bd93-e17a1a7d3b86';

-- Set anon role
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

-- Anon should not see any user events
select count(*) as anon_events
from public.cycle_events;
