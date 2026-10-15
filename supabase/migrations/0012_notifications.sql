-- 0012 · email notifications for public form submissions
--
-- Every enquiry and demo booking is emailed to the team by the
-- notify-submission Edge Function, called from an insert trigger.
--
-- pg_net posts asynchronously, so a slow or failing email can never block or
-- roll back a visitor's submission. The row is stored either way — a lost
-- email can be recovered from the table, a lost enquiry cannot.
--
-- The Edge Function source is kept at
-- .github/edge-functions/notify-submission/index.ts.txt, not under
-- supabase/functions/, because the design-system compiler sweeps every .ts
-- file in this project into _ds_bundle.js and breaks on Deno code (SETUP.md).
--
-- After running this, set the config row and the matching Edge Function
-- secrets. The secret is deliberately not in source control:
--
--   update app.notify_config set
--     function_url = 'https://<project-ref>.supabase.co/functions/v1/notify-submission',
--     secret       = '<a long random string>';
--
--   Supabase dashboard > Edge Functions > Secrets:
--     NOTIFY_SECRET   the same random string
--     RESEND_API_KEY  from resend.com
--     MAIL_TO         nhrsolutionltd@gmail.com
--     MAIL_FROM       NHR Solution <enquiries@nhrsolutions.net>   (once the domain is verified)

begin;

create extension if not exists pg_net with schema extensions;

-- The app schema is revoked from anon and authenticated in 0001, so a visitor
-- cannot read the shared secret through PostgREST.
create table if not exists app.notify_config (
  id           boolean primary key default true check (id),
  function_url text not null,
  secret       text not null,
  enabled      boolean not null default true
);

create or replace function app.notify_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare cfg record;
begin
  select * into cfg from app.notify_config where id;
  if cfg is null or not cfg.enabled then return new; end if;

  perform net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nhr-notify-secret', cfg.secret
    ),
    body := jsonb_build_object(
      'table', tg_table_name,
      'record', to_jsonb(new)
    )
  );
  return new;
end $$;

drop trigger if exists enquiries_notify on enquiries;
create trigger enquiries_notify
  after insert on enquiries
  for each row execute function app.notify_submission();

drop trigger if exists demo_bookings_notify on demo_bookings;
create trigger demo_bookings_notify
  after insert on demo_bookings
  for each row execute function app.notify_submission();

commit;
