-- Disposable DB only; all changes roll back. Ending a friendship any way clears its sharing
-- and recommendation rows, and leaves other friendships alone.
begin;
insert into auth.users(id,email) values
 ('cd330000-0000-4000-8000-000000000001','end-a@example.invalid'),
 ('cd330000-0000-4000-8000-000000000002','end-b@example.invalid'),
 ('cd330000-0000-4000-8000-000000000003','end-c@example.invalid');
insert into public.friend_requests(from_user_id,to_user_id,status) values
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000002','accepted'),
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000003','accepted');
insert into public.friend_sharing(user_id,friend_id,has_shared) values
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000002',true),
 ('cd330000-0000-4000-8000-000000000002','cd330000-0000-4000-8000-000000000001',true),
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000003',true),
 ('cd330000-0000-4000-8000-000000000003','cd330000-0000-4000-8000-000000000001',true);
insert into public.friend_recommendations(user_id,friend_id,recommendations) values
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000002','["walk"]'),
 ('cd330000-0000-4000-8000-000000000002','cd330000-0000-4000-8000-000000000001','["walk"]'),
 ('cd330000-0000-4000-8000-000000000001','cd330000-0000-4000-8000-000000000003','["tea"]');

-- b deletes the accepted request directly instead of using remove_friend.
select set_config('request.jwt.claim.sub','cd330000-0000-4000-8000-000000000002',true);
set local role authenticated;
delete from public.friend_requests
 where from_user_id='cd330000-0000-4000-8000-000000000001' and to_user_id='cd330000-0000-4000-8000-000000000002';
reset role;
do $$begin
  assert not exists(select 1 from public.friend_sharing
    where 'cd330000-0000-4000-8000-000000000002' in (user_id, friend_id)), 'sharing survived a direct delete';
  assert not exists(select 1 from public.friend_recommendations
    where 'cd330000-0000-4000-8000-000000000002' in (user_id, friend_id)), 'recommendations survived a direct delete';
  assert (select count(*) from public.friend_sharing
    where 'cd330000-0000-4000-8000-000000000003' in (user_id, friend_id)) = 2, 'another friendship lost its sharing';
  assert exists(select 1 from public.friend_recommendations
    where friend_id='cd330000-0000-4000-8000-000000000003'), 'another friendship lost its recommendations';
end$$;

-- c, the recipient, sets an accepted request back to pending.
select set_config('request.jwt.claim.sub','cd330000-0000-4000-8000-000000000003',true);
set local role authenticated;
update public.friend_requests set status='pending'
 where from_user_id='cd330000-0000-4000-8000-000000000001' and to_user_id='cd330000-0000-4000-8000-000000000003';
reset role;
do $$begin
  assert not exists(select 1 from public.friend_sharing
    where 'cd330000-0000-4000-8000-000000000003' in (user_id, friend_id)), 'sharing survived an un-accept';
  assert not exists(select 1 from public.friend_recommendations
    where 'cd330000-0000-4000-8000-000000000003' in (user_id, friend_id)), 'recommendations survived an un-accept';
end$$;
rollback;
