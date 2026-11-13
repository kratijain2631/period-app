-- Disposable DB only; all changes roll back. Exercise the real functions as an authenticated viewer.
begin;
insert into auth.users(id,email) values
 ('cd110000-0000-4000-8000-000000000001','circle-a@example.invalid'),
 ('cd110000-0000-4000-8000-000000000002','circle-b@example.invalid'),
 ('cd110000-0000-4000-8000-000000000003','circle-c@example.invalid');
update public.users set alias='rank-a',bio='friends only',community_rankings_enabled=true where id='cd110000-0000-4000-8000-000000000001';
update public.users set alias='rank-b' where id='cd110000-0000-4000-8000-000000000002';
update public.users set alias='rank-c' where id='cd110000-0000-4000-8000-000000000003';
insert into public.friend_requests (from_user_id,to_user_id,status) values('cd110000-0000-4000-8000-000000000001','cd110000-0000-4000-8000-000000000002','accepted');
insert into public.posts(id,user_id,body) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000001','Test post');
-- Deliberately reuse the post UUID to prove conversations on the two parent kinds are independent.
insert into public.cycle_events(id,user_id,event_type,starts_at) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000001','menstrual_flow',now());
insert into public.post_reactions(post_id,user_id,emoji) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000002','❤️');
insert into public.boops(post_id,from_user_id,to_user_id) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000002','cd110000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000002',true);
set local role authenticated;
insert into public.post_comments(post_id,body) values('cd110000-0000-4000-8000-000000000011','A supportive comment');
insert into public.event_comments(event_id,body) values('cd110000-0000-4000-8000-000000000011','Cycle support');
reset role;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$begin
 assert not has_function_privilege('anon','public.circle_community_top(text)','execute');
 assert exists(select 1 from circle_community_top('posts') where alias='rank-a' and score=1);
 assert exists(select 1 from circle_community_top('friends') where alias='rank-a' and score=1);
 assert not exists(select 1 from circle_community_top('friends') where alias='rank-b');
 assert exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002' and reactions=1 and boops=1 and comments=2);
end$$;
reset role;
-- The post and event share an ID. An erasure must only remove cycle activity.
savepoint before_withdrawal;
insert into public.cycle_snapshots(user_id,last_synced_at,snapshot)
values ('cd110000-0000-4000-8000-000000000001',now(),'{"currentPhase":"follicular"}');
insert into public.event_reactions(event_id,user_id,emoji)
values ('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000002','👏');
set local role authenticated;
do $$
declare
  target uuid := 'cd110000-0000-4000-8000-000000000011';
  sender uuid := 'cd110000-0000-4000-8000-000000000002';
begin
  assert exists(select from update_engagement_members('post',target) where member_id=sender and booped and emojis=array['❤️']);
  assert exists(select from update_engagement_members('post',target,'boop') where member_id=sender and booped);
  assert exists(select from update_engagement_members('cycle',target,'👏') where member_id=sender and not booped);
  assert not exists(select from update_engagement_members('cycle',target,'❤️'));
  perform set_cycle_sync_enabled(auth.uid(),false);
  assert not cycle_sync_enabled();
  assert not exists(select from public.cycle_snapshots where user_id=auth.uid());
  assert not exists(select from public.cycle_events where id=target);
  assert not exists(select from update_engagement_members('cycle',target));
  assert exists(select from update_engagement_members('post',target) where member_id=sender and booped);
  assert is_friend(sender);
  begin
    insert into public.cycle_snapshots(user_id,last_synced_at,snapshot) values (auth.uid(),now(),'{}');
    raise exception 'A withdrawn account re-uploaded its snapshot';
  exception when insufficient_privilege then null; end;
  perform set_cycle_sync_enabled(auth.uid(),true);
  assert cycle_sync_enabled();
  insert into public.cycle_snapshots(user_id,last_synced_at,snapshot) values (auth.uid(),now(),'{}');
end$$;
rollback to before_withdrawal;
-- A removed friendship changes the private boards and Largest Circle immediately; posts are independent.
savepoint before_removal;
delete from public.friend_requests where from_user_id='cd110000-0000-4000-8000-000000000001' and to_user_id='cd110000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin
 assert not exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002');
 assert not exists(select 1 from circle_community_top('friends') where alias='rank-a');
 assert exists(select 1 from circle_community_top('posts') where alias='rank-a' and score=1);
end$$;
rollback to before_removal;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$begin
 assert not exists(select 1 from public.post_comments where body='A supportive comment');
 assert not exists(select 1 from public.event_comments where body='Cycle support');
 begin
  insert into public.event_comments(event_id,body) values('cd110000-0000-4000-8000-000000000011','Denied');
  raise exception 'Unexpected stranger cycle comment';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.post_comments(post_id,body) values('cd110000-0000-4000-8000-000000000011','Denied');
  raise exception 'Unexpected stranger comment';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000002',true);
set local role authenticated;
savepoint before_comment_removal;
delete from public.post_comments where body='A supportive comment' and user_id=auth.uid();
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000001',true);
do $$begin
 assert exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002' and comments=1 and reactions=1 and boops=1);
end$$;
rollback to before_comment_removal;
reset role;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000001',true);
delete from posts where id='cd110000-0000-4000-8000-000000000011';
set local role authenticated;
do $$begin
 assert not exists(select 1 from circle_community_top('posts') where alias='rank-a');
 assert not exists(select 1 from public.post_comments where body='A supportive comment');
 assert exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002' and comments=1);
 delete from public.event_comments where body='Cycle support';
 assert exists(select 1 from public.event_comments where body='Cycle support'); -- Only its author can delete it.
 assert exists(select 1 from circle_community_top('friends') where alias='rank-a' and score=1);
end$$;
reset role;
delete from public.cycle_events where id='cd110000-0000-4000-8000-000000000011';
set local role authenticated;
do $$begin
 assert not exists(select 1 from public.event_comments where body='Cycle support');
 assert not exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002');
end$$;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000003',true);
do $$begin
 assert exists(select 1 from circle_member_profile('cd110000-0000-4000-8000-000000000001') where alias='rank-a' and bio is null and not has_access);
 assert not exists(select 1 from circle_search_members('%%'));
 assert exists(select 1 from circle_search_members('rank-') where alias='rank-a');
end$$;
rollback;
