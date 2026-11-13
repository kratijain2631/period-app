begin;
insert into auth.users(id, email, email_change) values
  ('d65cdaf1-897f-42bf-a9ad-773876243f77', 'original@example.invalid', 'pending@example.invalid');

do $$
declare
  target uuid := 'd65cdaf1-897f-42bf-a9ad-773876243f77';
begin
  begin
    update auth.users set email_change = 'another@example.invalid' where id = target;
    raise exception 'Allowed new change request';
  exception when check_violation then
    if sqlerrm <> 'Account email changes are temporarily disabled.' then raise; end if;
  end;
  begin
    update auth.users set email = email_change, email_change = '' where id = target;
    raise exception 'Allowed pending confirmation';
  exception when check_violation then
    if sqlerrm <> 'Account email changes are temporarily disabled.' then raise; end if;
  end;
  update auth.users set email_change = '', last_sign_in_at = now() where id = target;
end;
$$;
rollback;
