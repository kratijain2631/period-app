-- Throwaway local stack only. Exercise the RPC as the actual authenticated role.
begin;
set local search_path = public, extensions;
insert into auth.users (id, email, email_confirmed_at, phone) values
  ('fdaa0000-0000-4000-8000-000000000001', 'phone-test-a@example.invalid', now(), null),
  ('fdaa0000-0000-4000-8000-000000000002', 'phone-test-b@example.invalid', now(), '14155550123');
update public.users set discoverable_by_contacts = true where id = 'fdaa0000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','fdaa0000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$
begin
  assert not has_function_privilege('anon','public.contact_friend_matches_v2(text[])','execute');
  assert (select count(*) = 0 from contact_friend_matches_v2(array[encode(digest('+14155550123','sha256'),'hex')]));
end $$;
reset role;
update auth.users set phone_confirmed_at = now() where id = 'fdaa0000-0000-4000-8000-000000000002';
set local role authenticated;
do $$
declare
  phone text := encode(digest('+14155550123','sha256'),'hex');
  email text := encode(digest('phone-test-b@example.invalid','sha256'),'hex');
begin
  assert (select count(*) = 1 from contact_friend_matches_v2(array[phone]));
  assert (select count(*) = 1 from contact_friend_matches_v2(array[email]));
  assert (select count(*) = 1 from contact_friend_matches_v2(array[phone,email]));
end $$;
reset role;
update public.users set discoverable_by_contacts = false where id = 'fdaa0000-0000-4000-8000-000000000002';
set local role authenticated;
do $$
begin
  assert (select count(*) = 0 from contact_friend_matches_v2(array[encode(digest('+14155550123','sha256'),'hex')]));
end $$;
rollback;
