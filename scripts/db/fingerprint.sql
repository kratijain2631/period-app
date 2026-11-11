-- Fingerprint of the public schema, one row per kind of object. Compare two databases by
-- running this on both: matching hashes mean matching definitions. Read-only. See docs/DB_PUSH.md.
with o as (
  select 'column' k, table_name || '.' || column_name n, concat_ws('|', data_type, is_nullable, column_default) d from information_schema.columns where table_schema = 'public'
  union all select 'policy', c.relname || '.' || p.polname, concat_ws('|', p.polcmd, p.polpermissive, (select string_agg(r.rolname, ',' order by r.rolname) from pg_roles r where r.oid = any(p.polroles)), pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace ns on ns.oid = c.relnamespace where ns.nspname = 'public'
  union all select 'rls', c.relname, c.relrowsecurity::text from pg_class c join pg_namespace ns on ns.oid = c.relnamespace where ns.nspname = 'public' and c.relkind = 'r'
  union all select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.prokind = 'f'
  union all select 'function_acl', p.proname, concat_ws(',', 'anon=' || has_function_privilege('anon', p.oid, 'execute'), 'authed=' || has_function_privilege('authenticated', p.oid, 'execute'), 'service=' || has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.prokind = 'f'
  union all select 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace ns on ns.oid = c.relnamespace where ns.nspname = 'public' and not t.tgisinternal
  union all select 'auth_trigger', t.tgname, pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace ns on ns.oid = c.relnamespace where ns.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal and t.tgname = 'on_auth_user_created'
  union all select 'index', indexname, indexdef from pg_indexes where schemaname = 'public'
  union all select 'constraint', c.relname || '.' || con.conname, pg_get_constraintdef(con.oid) from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace ns on ns.oid = c.relnamespace where ns.nspname = 'public'
  union all select 'table_grant', table_name || ':' || grantee || ':' || privilege_type, '' from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  union all select 'column_grant', table_name || '.' || column_name || ':' || grantee || ':' || privilege_type, '' from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role') and privilege_type = 'UPDATE'
  union all select 'publication', tablename, '' from pg_publication_tables where pubname = 'supabase_realtime'
  union all select 'cron', jobname, schedule from cron.job
)
select k, count(*)::int as n, md5(string_agg(n || '=' || coalesce(d, ''), E'\n' order by n collate "C", d collate "C")) as hash from o group by k order by k;
