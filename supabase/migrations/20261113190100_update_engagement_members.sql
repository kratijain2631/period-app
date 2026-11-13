-- Invoker rights preserve the visibility of both the parent and each interaction.
create function public.update_engagement_members(
  target_kind text, target_id uuid, interaction text default null, page_offset integer default 0
) returns table(member_id uuid, display_name text, alias text, emojis text[], booped boolean)
language sql stable security invoker set search_path = '' as $$
  with parent as (
    select p.id from public.posts p where target_kind = 'post' and p.id = target_id
      and (p.user_id = auth.uid() or public.is_friend(p.user_id))
    union all
    select target_id where target_kind = 'cycle' and public.cycle_event_visible(target_id)
  ), engagement as (
    select r.user_id as who, r.emoji, false as boop from public.post_reactions r
      join parent on parent.id = r.post_id where target_kind = 'post'
    union all
    select r.user_id, r.emoji, false from public.event_reactions r
      join parent on parent.id = r.event_id where target_kind = 'cycle'
    union all
    select b.from_user_id, null, true from public.boops b join parent
      on (target_kind = 'post' and b.post_id = parent.id) or (target_kind = 'cycle' and b.event_id = parent.id)
  ), members as (
    select who, array_remove(array_agg(distinct emoji order by emoji),null) as emojis, bool_or(boop) as booped
    from engagement where interaction is null or (interaction = 'boop' and boop) or emoji = interaction
    group by who order by who limit 40 offset greatest(page_offset,0)
  )
  select m.who, coalesce(nullif(trim(p.full_name),''),p.alias),p.alias,m.emojis,m.booped
  from members m left join lateral public.circle_member_profile(m.who) p on true order by m.who
$$;
revoke all on function public.update_engagement_members(text,uuid,text,integer) from public,anon;
grant execute on function public.update_engagement_members(text,uuid,text,integer) to authenticated;
