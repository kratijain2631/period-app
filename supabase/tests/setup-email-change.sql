-- Verify the server boundary independently of which screen or client sends the request.
begin;
insert into auth.users(id,email,email_confirmed_at) values ('aa75121d-337f-435e-b652-c23a17eaab52','old@example.invalid',now());
insert into auth.sessions(id,user_id,created_at) values ('2139d1cc-9374-45f3-96d2-228fe5f10ebb','aa75121d-337f-435e-b652-c23a17eaab52',now() - interval '1 day');
select set_config('request.jwt.claims','{"sub":"aa75121d-337f-435e-b652-c23a17eaab52","session_id":"2139d1cc-9374-45f3-96d2-228fe5f10ebb"}',true);
do $$
begin
  begin
    perform public.authorize_setup_email_change('next@example.invalid');
    raise exception 'Accepted a stale session';
  exception when raise_exception then
    if sqlerrm <> 'Sign in again to change your email.' then raise; end if;
  end;
end $$;
update auth.sessions set created_at=now() where id='2139d1cc-9374-45f3-96d2-228fe5f10ebb';
do $$
declare
  member uuid := 'aa75121d-337f-435e-b652-c23a17eaab52';
begin
  perform public.authorize_setup_email_change('Next@example.invalid');
  begin
    update auth.users set email_change='wrong@example.invalid' where id=member;
    raise exception 'Accepted another destination';
  exception when check_violation then null; end;
  update auth.users set email_change='next@example.invalid' where id=member;
  assert (select email='old@example.invalid' from public.users where id=member);
  perform public.cancel_setup_email_change();
  assert (select email_change='' and email='old@example.invalid' from auth.users where id=member);
  perform public.authorize_setup_email_change('next@example.invalid');
  update auth.users set email_change='next@example.invalid' where id=member;
  update auth.users set email=email_change, email_change='' where id=member;
  assert (select email='next@example.invalid' from public.users where id=member);
  perform public.authorize_setup_email_change('later@example.invalid');
  update auth.users set email_change='later@example.invalid' where id=member;
  update public.users set alias='Setup email SQL example' where id=member;
  update public.users set alias=null where id=member;
  begin
    update auth.users set email=email_change, email_change='' where id=member;
    raise exception 'Allowed old confirmation after setup';
  exception when check_violation then null; end;
  begin
    perform public.authorize_setup_email_change('later@example.invalid');
    raise exception 'Clearing an alias reopened setup';
  exception when raise_exception then
    if sqlerrm <> 'Email changes are only available during first-time setup.' then raise; end if;
  end;
end $$;
rollback;
