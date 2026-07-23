create or replace function public."sync-score"(friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  seed int;
  score int;
begin
  if friend_id is null then
    return jsonb_build_object('score', 0, 'overlap', '[]'::jsonb);
  end if;

  seed := abs(hashtext(friend_id::text)) % 41;
  score := 60 + seed;

  return jsonb_build_object('score', score, 'overlap', '[]'::jsonb);
end;
$$;

revoke all on function public."sync-score"(uuid) from public;
grant execute on function public."sync-score"(uuid) to authenticated;
;
