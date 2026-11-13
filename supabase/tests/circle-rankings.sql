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
insert into public.post_reactions(post_id,user_id,emoji) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000002','❤️');
insert into public.boops(post_id,from_user_id,to_user_id) values('cd110000-0000-4000-8000-000000000011','cd110000-0000-4000-8000-000000000002','cd110000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000002',true);
set local role authenticated;
insert into public.post_comments(post_id,body) values('cd110000-0000-4000-8000-000000000011','A supportive comment');
reset role;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$begin
 assert not has_function_privilege('anon','public.circle_community_top(text)','execute');
 assert exists(select 1 from circle_community_top('posts') where alias='rank-a' and score=1);
 assert exists(select 1 from circle_community_top('friends') where alias='rank-a' and score=1);
 assert not exists(select 1 from circle_community_top('friends') where alias='rank-b');
 assert exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002' and reactions=1 and boops=1 and comments=1);
end$$;
reset role;
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
 assert exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002' and comments=0 and reactions=1 and boops=1);
end$$;
rollback to before_comment_removal;
reset role;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000001',true);
delete from posts where id='cd110000-0000-4000-8000-000000000011';
set local role authenticated;
do $$begin
 assert not exists(select 1 from circle_community_top('posts') where alias='rank-a');
 assert not exists(select 1 from public.post_comments where body='A supportive comment');
 assert not exists(select 1 from my_circle_support() where member_id='cd110000-0000-4000-8000-000000000002');
 assert exists(select 1 from circle_community_top('friends') where alias='rank-a' and score=1);
end$$;
select set_config('request.jwt.claim.sub','cd110000-0000-4000-8000-000000000003',true);
do $$begin
 assert exists(select 1 from circle_member_profile('cd110000-0000-4000-8000-000000000001') where alias='rank-a' and bio is null and not has_access);
 assert not exists(select 1 from circle_search_members('%%'));
 assert exists(select 1 from circle_search_members('rank-') where alias='rank-a');
end$$;
rollback;
