-- Run as the database owner (SQL editor or `supabase db query --linked --file ...`).
-- Synthetic accounts exist only inside this transaction; no emails are sent.
-- Any assertion failure aborts the transaction. Success explicitly rolls back too.
begin;
set local search_path = public, extensions;

create temporary table contact_test_accounts as
select label, gen_random_uuid() as id
from (values ('caller'), ('target'), ('hidden')) as fixtures(label);
alter table contact_test_accounts add column email text;
update contact_test_accounts set email = 'contacts-check-' || id || '@example.invalid';
grant select on contact_test_accounts to authenticated;

insert into auth.users (id, email)
select id, email from contact_test_accounts;

do $$
begin
  assert (select count(*) = 3 from public.users u join contact_test_accounts f using (id)
          where u.discoverable_by_contacts = false), 'New accounts must default to undiscoverable';
  assert not has_function_privilege('anon', 'public.contact_friend_matches(text[],integer)', 'execute'),
    'Anonymous lookup must be denied';
  assert has_function_privilege('authenticated', 'public.contact_friend_matches(text[],integer)', 'execute'),
    'Authenticated lookup must be allowed';
end;
$$;

select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'caller'), true);
set local role authenticated;
do $$
declare affected integer;
begin
  assert (select count(*) = 1 from public.users), 'Profile reads must remain owner-only';
  update public.users set discoverable_by_contacts = true
    where id = (select id from contact_test_accounts where label = 'target');
  get diagnostics affected = row_count;
  assert affected = 0, 'A caller must not opt another account in';
  assert (select count(*) = 0 from public.contact_friend_matches(
    array(select encode(digest(email, 'sha256'), 'hex') from contact_test_accounts))),
    'Default-off accounts must not match';
end;
$$;

-- The target opts in using only their own RLS-scoped account.
select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'target'), true);
update public.users set discoverable_by_contacts = true where id = auth.uid();
select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'caller'), true);
do $$
declare hashes text[];
begin
  select array_agg(encode(digest(email, 'sha256'), 'hex')) into hashes from contact_test_accounts;
  assert (select count(*) = 1 from public.contact_friend_matches(hashes)), 'Only the opted-in target must match';
  assert (select id = (select id from contact_test_accounts where label = 'target')
          from public.contact_friend_matches(hashes)), 'Matched the wrong account';
  assert (select discoverable_by_contacts = false from public.users where id = auth.uid()),
    'Looking up contacts must not opt the caller in';
  assert (select count(*) = 0 from public.contact_friend_matches(array[]::text[])), 'Empty lookup must return nothing';
  assert (select count(*) = 0 from public.contact_friend_matches(hashes, 0)), 'Zero limit must return nothing';
  assert (select count(*) = 0 from public.contact_friend_matches(hashes, -1)), 'Negative limit must return nothing';
end;
$$;

-- Self is excluded even after opting in. Normalization is shared with the client.
update public.users set discoverable_by_contacts = true where id = auth.uid();
do $$
begin
  assert (select count(*) = 0 from public.contact_friend_matches(
    array(select encode(digest(email, 'sha256'), 'hex') from contact_test_accounts where label = 'caller'))),
    'The caller must never match themselves';
end;
$$;

select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'target'), true);
update public.users set email = '  ' || upper(email) || '  ' where id = auth.uid();
select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'caller'), true);
do $$
begin
  assert (select count(*) = 1 from public.contact_friend_matches(
    array(select encode(digest(email, 'sha256'), 'hex') from contact_test_accounts where label = 'target'))),
    'Matching must trim and lowercase the stored email';
end;
$$;

select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'target'), true);
update public.users set discoverable_by_contacts = false where id = auth.uid();
select set_config('request.jwt.claim.sub', (select id::text from contact_test_accounts where label = 'caller'), true);
do $$
begin
  assert (select count(*) = 0 from public.contact_friend_matches(
    array(select encode(digest(email, 'sha256'), 'hex') from contact_test_accounts where label = 'target'))),
    'Opting out must remove the target from subsequent lookups';
end;
$$;

-- A role alone is insufficient without an authenticated user ID.
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert (select count(*) = 0 from public.contact_friend_matches(
    array(select encode(digest(email, 'sha256'), 'hex') from contact_test_accounts))),
    'A missing user ID must never return matches';
end;
$$;
reset role;
rollback;
select 'PASS: defaults, grants, owner RLS, opt-in/out, caller independence, self exclusion, normalization, empty/limited results, missing user ID; all fixtures rolled back' as result;
