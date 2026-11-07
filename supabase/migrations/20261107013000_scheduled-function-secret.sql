-- Scheduled edge functions didn't check who called them, so anyone with the public key
-- could run them. This creates a random secret in the vault, lets the functions check it,
-- and makes the existing cron jobs send it. The secret is generated here and never leaves
-- the database. Apply this before deploying the functions, because the jobs can send the
-- extra header before the functions need it. Safe to re-run.

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret')
 where not exists (select 1 from vault.secrets where name = 'cron_secret');

-- Comparing hashes means the time taken doesn't reveal how much of the secret matched.
create or replace function public.cron_secret_matches(provided text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
      from vault.decrypted_secrets s
     where s.name = 'cron_secret'
       and length(coalesce(provided, '')) > 0
       and digest(provided, 'sha256') = digest(s.decrypted_secret, 'sha256')
  );
$$;
revoke all on function public.cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.cron_secret_matches(text) to service_role;

do $$
declare
  job record;
begin
  for job in
    select jobid, command
      from cron.job
     where jobname in ('nightly-cycle-guidance', 'nightly-friend-recommendations', 'daily-phase-change-reminder')
       and command not like '%x-cron-secret%'
  loop
    -- Some jobs were written by hand without a space after the comma, so match either.
    perform cron.alter_job(
      job.jobid,
      command := regexp_replace(
        job.command,
        $old$'Content-Type',\s*'application/json',$old$,
        $new$'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),$new$
      )
    );
  end loop;
end;
$$;
