-- Disposable DB only; all changes roll back. A pair of people holds at most one friend request.
begin;
insert into auth.users(id,email) values
 ('cd220000-0000-4000-8000-000000000001','pair-a@example.invalid'),
 ('cd220000-0000-4000-8000-000000000002','pair-b@example.invalid'),
 ('cd220000-0000-4000-8000-000000000003','pair-c@example.invalid');

-- b can't request a, who already requested b.
insert into public.friend_requests(from_user_id,to_user_id,status)
values ('cd220000-0000-4000-8000-000000000001','cd220000-0000-4000-8000-000000000002','pending');
do $$begin
  begin
    insert into public.friend_requests(from_user_id,to_user_id,status)
    values ('cd220000-0000-4000-8000-000000000002','cd220000-0000-4000-8000-000000000001','pending');
    assert false, 'a request back to someone who requested you was allowed';
  exception when unique_violation then null;
  end;
end$$;

-- Once they're friends, b still can't send a.
update public.friend_requests set status='accepted'
 where from_user_id='cd220000-0000-4000-8000-000000000001' and to_user_id='cd220000-0000-4000-8000-000000000002';
do $$begin
  begin
    insert into public.friend_requests(from_user_id,to_user_id,status)
    values ('cd220000-0000-4000-8000-000000000002','cd220000-0000-4000-8000-000000000001','pending');
    assert false, 'a request to an existing friend was allowed';
  exception when unique_violation then null;
  end;
end$$;

-- Rows from before this rule (both directions pending): accepting one removes the other.
set local session_replication_role = replica;
insert into public.friend_requests(from_user_id,to_user_id,status) values
 ('cd220000-0000-4000-8000-000000000001','cd220000-0000-4000-8000-000000000003','pending'),
 ('cd220000-0000-4000-8000-000000000003','cd220000-0000-4000-8000-000000000001','pending');
set local session_replication_role = origin;
select set_config('request.jwt.claim.sub','cd220000-0000-4000-8000-000000000003',true);
set local role authenticated;
update public.friend_requests set status='accepted'
 where from_user_id='cd220000-0000-4000-8000-000000000001' and to_user_id='cd220000-0000-4000-8000-000000000003';
reset role;
do $$begin
  assert exists(select 1 from public.friend_requests
                 where from_user_id='cd220000-0000-4000-8000-000000000001'
                   and to_user_id='cd220000-0000-4000-8000-000000000003' and status='accepted');
  assert not exists(select 1 from public.friend_requests
                     where from_user_id='cd220000-0000-4000-8000-000000000003'
                       and to_user_id='cd220000-0000-4000-8000-000000000001');
end$$;
rollback;
