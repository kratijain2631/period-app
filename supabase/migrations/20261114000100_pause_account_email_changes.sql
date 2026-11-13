-- Applies to Auth requests from every client, including codes issued before the pause.
create or replace function public.reject_account_email_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '23514', message = 'Account email changes are temporarily disabled.';
end;
$$;

revoke all on function public.reject_account_email_change() from public, anon, authenticated;
drop trigger if exists pause_account_email_changes on auth.users;
create trigger pause_account_email_changes before update on auth.users
for each row when (
  new.email is distinct from old.email
  or (coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change)
)
execute function public.reject_account_email_change();
