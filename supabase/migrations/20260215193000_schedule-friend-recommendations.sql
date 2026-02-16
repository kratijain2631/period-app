create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'nightly-friend-recommendations') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'nightly-friend-recommendations' limit 1));
  end if;
end;
$$;

select
  cron.schedule(
    'nightly-friend-recommendations',
    '30 3 * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/friend-recommendations',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
        ),
        body := jsonb_build_object('scheduled_at', now()),
        timeout_milliseconds := 10000
      ) as request_id;
    $$
  );
