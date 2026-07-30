-- Add a read/unread state to notifications and let a user mark their own read.
--
-- Context: the notifications table previously had only a SELECT (own) and an
-- INSERT (service_role) policy — no UPDATE — so there was no way to mark a
-- notification read. This adds a nullable read_at timestamp (null = unread) and
-- an UPDATE policy scoped to the owner, powering the dedicated notifications
-- page's new-vs-read distinction. Additive and idempotent.

alter table public.notifications
  add column if not exists read_at timestamptz;

-- Owner can update their own notification rows (used to set read_at).
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Speeds up "my unread notifications" lookups.
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id)
  where read_at is null;
