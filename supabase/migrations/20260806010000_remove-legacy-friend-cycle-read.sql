-- Development builds are required to update together, so the temporary raw
-- table compatibility policies are unnecessary. Friends must use the sanitized
-- projection RPCs; raw cycle rows remain owner-only.

drop policy if exists cycle_snapshots_select_own_or_friends on public.cycle_snapshots;
drop policy if exists cycle_snapshots_select_own on public.cycle_snapshots;
create policy cycle_snapshots_select_own
on public.cycle_snapshots for select
using (auth.uid() = user_id);

drop policy if exists cycle_events_select_own_or_friends on public.cycle_events;
drop policy if exists cycle_events_select_own on public.cycle_events;
create policy cycle_events_select_own
on public.cycle_events for select
using (auth.uid() = user_id);
