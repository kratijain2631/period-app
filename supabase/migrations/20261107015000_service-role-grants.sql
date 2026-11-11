-- Production's service role had lost most of its access: only REFERENCES, TRIGGER and
-- TRUNCATE on tables and no execute on most functions, which broke the scheduled jobs. No
-- migration explains how. This is the fix that was run on production by hand, so a database
-- built from the repo gets the same access. This also widens cycle_guidance_requests, which
-- 20261106190000 limited to delete, truncate, references and trigger. Safe to re-run.

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
