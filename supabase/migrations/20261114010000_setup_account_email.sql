-- An enrollment exists only until the member first saves an alias. Clients cannot recreate it.
create table private.setup_email_changes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  destination text,
  expires_at timestamptz
);
revoke all on private.setup_email_changes from public, anon, authenticated;

create function private.open_email_setup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.setup_email_changes(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.open_email_setup() from public, anon, authenticated;
create trigger open_email_setup after insert on auth.users
for each row execute function private.open_email_setup();

create function private.finish_email_setup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.setup_email_changes where user_id = new.id;
  return new;
end;
$$;
revoke all on function private.finish_email_setup() from public, anon, authenticated;
create trigger finish_email_setup after insert or update of alias on public.users
for each row when (nullif(btrim(new.alias), '') is not null) execute function private.finish_email_setup();
insert into private.setup_email_changes(user_id)
select id from public.users where nullif(btrim(alias), '') is null on conflict do nothing;

-- Auth updates do not carry PostgREST claims. Bind the destination to a recently
-- authenticated, still-valid session before asking Auth to issue its own codes.
create function public.authorize_setup_email_change(new_address text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  address text := lower(btrim(new_address));
begin
  if caller is null or not exists (
    select 1 from auth.sessions s
    where s.id = (auth.jwt()->>'session_id')::uuid and s.user_id = caller
      and s.created_at >= now() - interval '10 minutes'
      and (s.not_after is null or s.not_after > now())
  ) then
    raise exception 'Sign in again to change your email.';
  end if;
  if address is null or length(address) > 254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  update private.setup_email_changes set destination = address, expires_at = now() + interval '1 hour'
    where user_id = caller;
  if not found then raise exception 'Email changes are only available during first-time setup.'; end if;
end;
$$;
revoke all on function public.authorize_setup_email_change(text) from public, anon, authenticated;
grant execute on function public.authorize_setup_email_change(text) to authenticated;

-- Withdraw a pending change before continuing with the existing address. Lock in the
-- same order as Auth confirmation so concurrent requests observe one final address.
create function public.cancel_setup_email_change() returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in required.'; end if;
  perform 1 from auth.users where id = caller for update;
  update private.setup_email_changes set destination = null, expires_at = null where user_id = caller;
  if not found then raise exception 'Email setup has finished.'; end if;
  update auth.users set email_change = '', email_change_token_current = '', email_change_token_new = '',
    email_change_sent_at = null, email_change_confirm_status = 0 where id = caller;
  delete from auth.one_time_tokens where user_id = caller
    and token_type in ('email_change_token_current', 'email_change_token_new');
end;
$$;
revoke all on function public.cancel_setup_email_change() from public, anon, authenticated;
grant execute on function public.cancel_setup_email_change() to authenticated;

-- Keep the existing Auth trigger and its fail-closed behavior for older clients.
create or replace function public.reject_account_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target text;
  finishing boolean := new.email is distinct from old.email;
begin
  if finishing then
    target := lower(new.email);
    if target is distinct from lower(nullif(old.email_change, '')) or coalesce(new.email_change, '') <> '' then
      raise exception using errcode = '23514', message = 'Account email changes are temporarily disabled.';
    end if;
  else
    target := lower(new.email_change);
  end if;
  perform 1 from private.setup_email_changes where user_id = new.id and destination = target and expires_at > now() for update;
  if not found then raise exception using errcode = '23514', message = 'Account email changes are temporarily disabled.'; end if;
  if finishing then
    update private.setup_email_changes set destination = null, expires_at = null where user_id = new.id;
  end if;
  return new;
end;
$$;

-- Legacy discovery reads the profile email. Current discovery reads Auth. Update both in one transaction.
create function private.sync_confirmed_account_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.users set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end;
$$;
revoke all on function private.sync_confirmed_account_email() from public, anon, authenticated;
create trigger sync_confirmed_account_email after update of email on auth.users
for each row when (old.email is distinct from new.email and new.email_confirmed_at is not null)
execute function private.sync_confirmed_account_email();
update public.users u set email = a.email from auth.users a
where a.id = u.id and a.email_confirmed_at is not null and u.email is distinct from a.email;
