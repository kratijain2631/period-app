-- Push notifications, phase 1 (docs/design/push-notifications.md).
--
-- Things that should reach a phone go into push_outbox: new rows in notifications
-- (reactions, boops) and friend requests (sent and accepted). Each new outbox row
-- calls the send-push edge function right away through pg_net, and a cron retries
-- anything that didn't send. The outbox is server-only, so older builds that read
-- notifications never see the friend-request entries twice.
--
-- Also fixes device tokens following the wrong account: a token now belongs to
-- whoever registered it last, so a shared phone only gets the signed-in account's
-- pushes. Additive and safe to re-run.

-- Device tokens -------------------------------------------------------------

-- Keep only the newest registration of each token.
delete from public.device_tokens d
 using public.device_tokens newer
 where newer.token = d.token
   and (newer.updated_at, newer.id) > (d.updated_at, d.id);

-- Older builds upsert on (user_id, token), which doesn't remove another account's
-- copy, so the database does it. Runs before the conflict check, so upserts work.
create or replace function public.claim_device_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.device_tokens where token = new.token and user_id <> new.user_id;
  return new;
end;
$$;
revoke all on function public.claim_device_token() from public, anon, authenticated;

drop trigger if exists device_tokens_claim on public.device_tokens;
create trigger device_tokens_claim
before insert or update of token, user_id on public.device_tokens
for each row execute function public.claim_device_token();

create unique index if not exists device_tokens_token_key on public.device_tokens (token);

-- Preferences ---------------------------------------------------------------

-- One row per user, written by the settings screen (phase 2). No row means the
-- defaults below. Turning notifications off in iOS still overrides all of this.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  friend_requests boolean not null default true,
  reactions boolean not null default true,
  boops boolean not null default true,
  comments boolean not null default true,
  phase_reminders boolean not null default true,
  friend_cycle_updates boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row execute procedure public.handle_updated_at();

-- Outbox --------------------------------------------------------------------

create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  notification_id uuid references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempts integer not null default 0,
  sent_at timestamptz,
  result jsonb
);
create index if not exists push_outbox_unsent on public.push_outbox (created_at) where sent_at is null;
create index if not exists push_outbox_recent on public.push_outbox (user_id, actor_id, type, created_at);
-- Server-only: RLS on with no policies, and no grants for app users.
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from public, anon, authenticated;
grant all on public.push_outbox to service_role;

-- Queue a push. Skips self-actions, and repeats from the same person within
-- `quiet` (re-sent friend requests, boop bursts).
create or replace function public.enqueue_push(
  target uuid,
  actor uuid,
  kind text,
  details jsonb,
  source_notification uuid default null,
  quiet interval default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target is null or target = actor then
    return;
  end if;
  if quiet is not null and exists (
    select 1 from public.push_outbox
     where user_id = target and actor_id is not distinct from actor and type = kind
       and created_at > now() - quiet
  ) then
    return;
  end if;
  insert into public.push_outbox (user_id, actor_id, type, payload, notification_id)
  values (target, actor, kind, coalesce(details, '{}'::jsonb), source_notification);
end;
$$;
revoke all on function public.enqueue_push(uuid, uuid, text, jsonb, uuid, interval) from public, anon, authenticated;
grant execute on function public.enqueue_push(uuid, uuid, text, jsonb, uuid, interval) to service_role;

-- Ask send-push to deliver one outbox row now. If the vault isn't set up (local
-- databases) the row just waits for the retry job. Never blocks the insert.
create or replace function public.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  api_key text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'publishable_key';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base_url is null or api_key is null or secret is null then
    return new;
  end if;
  -- Same headers as the other scheduled functions: the public key gets through the
  -- gateway, and the secret is what send-push actually checks.
  perform net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_key,
      'x-cron-secret', secret
    ),
    body := jsonb_build_object('id', new.id),
    timeout_milliseconds := 10000
  );
  return new;
exception
  when others then
    return new;
end;
$$;
revoke all on function public.dispatch_push() from public, anon, authenticated;

drop trigger if exists push_outbox_dispatch on public.push_outbox;
create trigger push_outbox_dispatch
after insert on public.push_outbox
for each row execute function public.dispatch_push();

-- Hand send-push the rows to deliver, marking them so a retry running at the same
-- time can't send them twice. With an id, that row; without, every row due a retry.
create or replace function public.claim_pushes(target uuid default null)
returns setof public.push_outbox
language sql
security definer
set search_path = public
as $$
  update public.push_outbox o
     set claimed_at = now(), attempts = o.attempts + 1
   where o.id in (
     select id from public.push_outbox
      where sent_at is null
        and attempts < 3
        and created_at > now() - interval '1 day'
        and (claimed_at is null or claimed_at < now() - interval '2 minutes')
        and (target is null or id = target)
      order by created_at
      limit 100
      for update skip locked
   )
  returning o.*;
$$;
revoke all on function public.claim_pushes(uuid) from public, anon, authenticated;
grant execute on function public.claim_pushes(uuid) to service_role;

-- Producers -----------------------------------------------------------------

-- Notification rows the push text knows how to describe. Others stay in-app only.
create or replace function public.push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text := new.payload->>'type';
begin
  if kind in ('post_reaction', 'event_reaction', 'boop') then
    perform public.enqueue_push(
      new.user_id,
      coalesce((new.payload->>'actor_id')::uuid, new.friend_id),
      kind,
      new.payload,
      new.id,
      case when kind = 'boop' then interval '10 minutes' end
    );
  end if;
  return new;
exception
  when others then
    return new;
end;
$$;
revoke all on function public.push_for_notification() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
after insert on public.notifications
for each row execute function public.push_for_notification();

-- Friend requests: tell the recipient about a new one, and the sender when it's
-- accepted. Declining deletes the row, and nobody is told.
create or replace function public.push_for_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target uuid;
  kind text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    actor := new.from_user_id;
    target := new.to_user_id;
    kind := 'friend_request';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    actor := new.to_user_id;
    target := new.from_user_id;
    kind := 'friend_request_accepted';
  else
    return new;
  end if;
  perform public.enqueue_push(
    target,
    actor,
    kind,
    jsonb_build_object(
      'type', kind,
      'request_id', new.id,
      'actor_id', actor,
      'actor_alias', (select alias from public.users where id = actor)
    ),
    null,
    case when kind = 'friend_request' then interval '1 day' end
  );
  return new;
exception
  when others then
    return new;
end;
$$;
revoke all on function public.push_for_friend_request() from public, anon, authenticated;

drop trigger if exists friend_requests_push on public.friend_requests;
create trigger friend_requests_push
after insert or update of status on public.friend_requests
for each row execute function public.push_for_friend_request();

-- Retries and cleanup -------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

select cron.unschedule('push-outbox-retry')
where exists (select 1 from cron.job where jobname = 'push-outbox-retry');
select cron.schedule(
  'push-outbox-retry',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  where exists (select 1 from public.push_outbox where sent_at is null and attempts < 3 and created_at > now() - interval '1 day');
  $$
);

select cron.unschedule('push-outbox-cleanup')
where exists (select 1 from cron.job where jobname = 'push-outbox-cleanup');
select cron.schedule(
  'push-outbox-cleanup',
  '30 3 * * *',
  $$ delete from public.push_outbox where created_at < now() - interval '30 days' $$
);
