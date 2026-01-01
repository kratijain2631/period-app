insert into public.posts (id, user_id, alias, body, mood_tag, created_at)
values
  ('9a1e2c3b-1111-4f10-8a1e-2c3b4d5e6f10', '11111111-1111-1111-1111-111111111111', 'Neha', 'Feeling bloated af today someone please come save me thanks', null, now() - interval '2 hours'),
  ('7b2c3d4e-2222-4c20-9b2c-3d4e5f6a7b20', '33333333-3333-3333-3333-333333333333', 'Maya', 'Day 1...', null, now() - interval '90 minutes'),
  ('5c3d4e5f-3333-4d30-ac3d-4e5f6a7b8c30', '22222222-2222-2222-2222-222222222222', 'Shaan', 'I can''t stop rubbing my tummy', null, now() - interval '1 hour'),
  ('4d5e6f70-4444-4e40-bd4e-5f6a7b8c9d40', '22222222-2222-2222-2222-222222222222', 'Shaan', 'It''s over!', null, now() - interval '45 minutes'),
  ('3e6f7081-5555-4f50-ce5f-6a7b8c9d0e50', '44444444-4444-4444-4444-444444444444', 'Zara', null, 'Boop me', now() - interval '30 minutes')
on conflict (id) do nothing;

insert into public.post_reactions (id, post_id, user_id, emoji, created_at)
values
  ('aa1e2c3b-aaaa-4f10-8a1e-2c3b4d5e6f10', '9a1e2c3b-1111-4f10-8a1e-2c3b4d5e6f10', '22222222-2222-2222-2222-222222222222', '🥲', now() - interval '90 minutes'),
  ('bb2c3d4e-bbbb-4c20-9b2c-3d4e5f6a7b20', '9a1e2c3b-1111-4f10-8a1e-2c3b4d5e6f10', '33333333-3333-3333-3333-333333333333', '❤️', now() - interval '80 minutes'),
  ('cc3d4e5f-cccc-4d30-ac3d-4e5f6a7b8c30', '5c3d4e5f-3333-4d30-ac3d-4e5f6a7b8c30', '44444444-4444-4444-4444-444444444444', '😂', now() - interval '50 minutes')
on conflict (id) do nothing;

insert into public.boops (id, from_user_id, to_user_id, post_id, created_at)
values
  ('dd4e5f60-dddd-4e40-bd4e-5f6a7b8c9d40', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '9a1e2c3b-1111-4f10-8a1e-2c3b4d5e6f10', now() - interval '70 minutes'),
  ('ee5f6071-eeee-4f50-ce5f-6a7b8c9d0e50', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '9a1e2c3b-1111-4f10-8a1e-2c3b4d5e6f10', now() - interval '60 minutes'),
  ('ff607182-ffff-4050-de60-7b8c9d0e1f60', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '5c3d4e5f-3333-4d30-ac3d-4e5f6a7b8c30', now() - interval '40 minutes')
on conflict (id) do nothing;
