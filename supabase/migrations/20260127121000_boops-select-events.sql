drop policy if exists boops_select_events on public.boops;
create policy boops_select_events
on public.boops for select
using (
  event_id is not null
  and exists (
    select 1 from public.cycle_events ce
    where ce.id = event_id
      and (
        auth.uid() = ce.user_id
        or (
          exists (
            select 1 from public.friend_sharing fs
            where fs.user_id = ce.user_id
              and fs.friend_id = auth.uid()
              and fs.has_shared = true
          )
          and exists (
            select 1 from public.friend_sharing fs2
            where fs2.user_id = auth.uid()
              and fs2.friend_id = ce.user_id
              and fs2.has_shared = true
          )
        )
      )
  )
);
