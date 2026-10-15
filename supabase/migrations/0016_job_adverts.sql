-- 0016 · job adverts, backdated applications, candidate emails
--
-- A job advert is the candidate-facing copy of a vacancy: the wording, salary
-- display, screening questions and where it is posted. The vacancy stays the
-- hiring record (positions, pipeline, fill). Matches ui_kits/app/jobAdvertStore.js.
--
-- Three rules live here rather than in the app, so a modified client cannot
-- get round them:
--   1. Only admins publish, close, backdate or record a past advert. Managers
--      write drafts and submit them for approval.
--   2. Nobody approves an advert they submitted (same rule as every other
--      decision on the platform).
--   3. An application date can be in the past (backdating) but never in the
--      future, and backdated applications never trigger automatic emails.
--
-- Candidate emails are written by the send-candidate-email Edge Function with
-- the service role; clients can read the log but never write to it.

begin;

-- ============================================================ job adverts
create table job_adverts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  vacancy_id    uuid references vacancies(id) on delete set null,
  reference     text not null,

  title         text not null,
  department    text,
  location      text,
  workplace     text not null default 'on_site' check (workplace in ('on_site','hybrid','remote')),
  employment_type employment_type not null default 'full_time',
  hours_per_week numeric(5,2),
  contract_length text,

  salary_min    numeric(12,2),
  salary_max    numeric(12,2),
  salary_period text not null default 'year' check (salary_period in ('year','hour','day')),
  show_salary   boolean not null default true,

  summary          text,
  responsibilities text,
  essential        text,
  desirable        text,
  benefits         text,
  -- [{id, text, type: 'yesno'|'text', required, knockout: 'yes'|'no'|null}]
  questions        jsonb not null default '[]'::jsonb,

  hiring_manager_id uuid references employees(id) on delete set null,
  contact_email citext,
  visibility    text not null default 'public_and_internal'
    check (visibility in ('public_and_internal','public_only','internal_only')),
  -- {careers, internal, indeed, linkedin, totaljobs, reed, findajob: boolean}
  channels      jsonb not null default '{"careers": true, "internal": true}'::jsonb,
  referral_bonus numeric(10,2),

  include_rtw_statement boolean not null default true,
  sponsorship_available boolean not null default false,
  soc_code      text check (soc_code is null or soc_code ~ '^[0-9]{4}$'),
  sponsorship_note text,

  status        text not null default 'draft'
    check (status in ('draft','pending_approval','published','paused','closed','archived')),
  -- A past advert recorded after the event: saved closed, never posted.
  historical    boolean not null default false,
  published_on  date,
  closes_on     date,
  closed_on     date,
  closed_reason text,
  start_on      date,

  requested_by  uuid references auth.users(id) on delete set null,
  requested_at  timestamptz,
  approved_by   uuid references auth.users(id) on delete set null,
  approved_at   timestamptz,

  views         jsonb not null default '{}'::jsonb,   -- {channel: count}
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (tenant_id, reference),
  constraint job_adverts_salary_range check (salary_max is null or salary_min is null or salary_max >= salary_min),
  constraint job_adverts_dates check (closes_on is null or published_on is null or closes_on >= published_on),
  constraint job_adverts_historical check (not historical or (published_on is not null and closes_on is not null)),
  constraint job_adverts_not_self_approved check (approved_by is null or requested_by is null or approved_by <> requested_by)
);

create trigger job_adverts_touch before update on job_adverts
  for each row execute function app.touch_updated_at();
create index job_adverts_live on job_adverts (tenant_id, closes_on) where status = 'published';
create index job_adverts_vacancy on job_adverts (vacancy_id);

-- History of every change that matters for an audit: who published, who
-- backdated what, who approved.
create table job_advert_events (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  advert_id   uuid not null references job_adverts(id) on delete cascade,
  action      text not null,
  detail      jsonb not null default '{}'::jsonb,
  actor       uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index job_advert_events_advert on job_advert_events (advert_id, created_at desc);

-- Enforces the publishing and backdating rules, and writes the history.
-- Security invoker on purpose: current_user must be the caller's role. Under
-- security definer it would be the owner, and every caller would look trusted.
create or replace function app.job_advert_guard()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  is_admin boolean := app.is_admin();
  -- Only end users (anon / authenticated) are checked. The service role
  -- (Edge Functions) and migrations run as other roles and are trusted.
  trusted boolean := current_user not in ('anon', 'authenticated');
  today date := (now() at time zone 'Europe/London')::date;
begin
  if not trusted and not is_admin then
    if new.status in ('published','paused','closed','archived')
       and (tg_op = 'INSERT' or old.status is distinct from new.status) then
      raise exception 'Only HR can publish, pause or close a job advert' using errcode = '42501';
    end if;
    if new.historical then
      raise exception 'Only HR can record a past advert' using errcode = '42501';
    end if;
    if new.approved_by is distinct from (case when tg_op = 'UPDATE' then old.approved_by end) then
      raise exception 'Only HR can approve a job advert' using errcode = '42501';
    end if;
    if new.published_on is not null and new.published_on < today
       and (tg_op = 'INSERT' or old.published_on is distinct from new.published_on) then
      raise exception 'Only HR can backdate a job advert' using errcode = '42501';
    end if;
  end if;

  if new.published_on is not null and new.published_on > today and new.status <> 'draft' then
    raise exception 'The posted date cannot be in the future';
  end if;
  if new.historical and new.closes_on > today then
    raise exception 'A past advert must have closed on or before today';
  end if;
  if new.historical then
    new.status := 'closed';
    new.closed_on := new.closes_on;
    new.closed_reason := coalesce(new.closed_reason, 'Recorded retrospectively');
  end if;
  if new.status = 'published' and new.published_on is null then
    new.published_on := today;
  end if;
  if new.status = 'pending_approval' and (tg_op = 'INSERT' or old.status <> 'pending_approval') then
    new.requested_by := coalesce(new.requested_by, auth.uid());
    new.requested_at := now();
  end if;

  return new;
end $$;

create trigger job_adverts_guard before insert or update on job_adverts
  for each row execute function app.job_advert_guard();

create or replace function app.job_advert_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into job_advert_events (tenant_id, advert_id, action, detail)
    values (new.tenant_id, new.id, case when new.historical then 'recorded_past_advert' else 'created' end,
            jsonb_build_object('status', new.status, 'published_on', new.published_on, 'closes_on', new.closes_on));
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into job_advert_events (tenant_id, advert_id, action, detail)
    values (new.tenant_id, new.id, 'status_' || new.status, jsonb_build_object('from', old.status));
  end if;
  if old.published_on is distinct from new.published_on and new.published_on < old.created_at::date then
    insert into job_advert_events (tenant_id, advert_id, action, detail)
    values (new.tenant_id, new.id, 'backdated', jsonb_build_object('from', old.published_on, 'to', new.published_on));
  end if;
  return new;
end $$;

create trigger job_adverts_log after insert or update on job_adverts
  for each row execute function app.job_advert_log();

-- ============================================================ candidates
alter table candidates
  add column advert_id  uuid references job_adverts(id) on delete set null,
  add column channel    text,
  -- Who typed the application in, and when, if it did not come through a
  -- form. applied_on can then be earlier than created_at (backdated).
  add column recorded_by uuid references auth.users(id) on delete set null,
  add column screening_answers jsonb not null default '[]'::jsonb,
  -- false for backdated records: the candidate may already have heard, and
  -- an automatic "we've received your application" weeks later confuses.
  add column auto_email boolean not null default true;

create index candidates_advert on candidates (advert_id);

create or replace function app.candidate_dates_guard()
returns trigger language plpgsql set search_path = public as $$
declare today date := (now() at time zone 'Europe/London')::date;
begin
  if new.applied_on > today then
    raise exception 'The date an application was received cannot be in the future';
  end if;
  if tg_op = 'INSERT' and new.applied_on < today then
    new.auto_email := false;
    new.recorded_by := coalesce(new.recorded_by, auth.uid());
  end if;
  return new;
end $$;

create trigger candidates_dates before insert or update of applied_on on candidates
  for each row execute function app.candidate_dates_guard();

-- ============================================================ candidate emails
create table candidate_emails (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete set null,
  template     text not null,          -- received, interview, offer, hired, rejected, custom
  to_email     citext not null,
  subject      text not null,
  status       text not null check (status in ('sent','failed')),
  provider_id  text,                   -- Resend message id
  error        text,
  sent_by      uuid references auth.users(id) on delete set null,   -- null = automatic
  created_at   timestamptz not null default now()
);
create index candidate_emails_candidate on candidate_emails (candidate_id, created_at desc);
create index candidate_emails_rate on candidate_emails (tenant_id, created_at);

-- Per-tenant template wording and sending mode (auto / review / off).
create table candidate_email_templates (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  template   text not null check (template in ('received','interview','interview2','offer','hired','rejected')),
  mode       text not null default 'auto' check (mode in ('auto','review','off')),
  subject    text,
  body       text,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, template)
);

-- "Application received" goes out from the database, so it works for public
-- careers-page applicants who have no account. Uses the same secret and
-- pg_net call as notify-submission; the URL is derived from its URL.
create or replace function app.notify_candidate_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg record; adv record; mode text; company text;
begin
  if not new.auto_email or new.email is null then return new; end if;
  select * into cfg from app.notify_config where id;
  if cfg is null or not cfg.enabled then return new; end if;

  select t.mode into mode from candidate_email_templates t where t.tenant_id = new.tenant_id and t.template = 'received';
  if coalesce(mode, 'auto') <> 'auto' then return new; end if;

  select a.title, a.contact_email into adv from job_adverts a where a.id = new.advert_id;
  select name into company from tenants where id = new.tenant_id;

  perform net.http_post(
    url := replace(cfg.function_url, 'notify-submission', 'send-candidate-email'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-nhr-notify-secret', cfg.secret),
    body := jsonb_build_object('template', 'received', 'record', jsonb_build_object(
      'id', new.id, 'tenant_id', new.tenant_id, 'first_name', new.first_name, 'email', new.email,
      'job_title', coalesce(adv.title, (select v.title from vacancies v where v.id = new.vacancy_id), 'the role'),
      'company', company, 'reply_to', adv.contact_email))
  );
  return new;
end $$;

create trigger candidates_received_email after insert on candidates
  for each row execute function app.notify_candidate_received();

-- ============================================================ public careers page
-- Visitors read published, public adverts for one employer by its slug, and
-- apply through a function — they never get table access.
create or replace view public_job_adverts with (security_barrier) as
  select a.id, t.slug as employer, t.name as employer_name, a.reference, a.title, a.department, a.location,
         a.workplace, a.employment_type, a.hours_per_week, a.contract_length,
         case when a.show_salary then a.salary_min end as salary_min,
         case when a.show_salary then a.salary_max end as salary_max,
         a.salary_period, a.summary, a.responsibilities, a.essential, a.desirable, a.benefits,
         (select coalesce(jsonb_agg(q - 'knockout'), '[]'::jsonb) from jsonb_array_elements(a.questions) q) as questions,
         a.include_rtw_statement, a.sponsorship_available, a.sponsorship_note,
         a.published_on, a.closes_on
  from job_adverts a
  join tenants t on t.id = a.tenant_id
  where a.status = 'published'
    and a.visibility <> 'internal_only'
    and coalesce((a.channels ->> 'careers')::boolean, false)
    and (a.closes_on is null or a.closes_on >= (now() at time zone 'Europe/London')::date);

revoke all on public_job_adverts from public;
grant select on public_job_adverts to anon, authenticated;

create or replace function public.apply_to_job_advert(
  p_advert_id uuid, p_first_name text, p_last_name text, p_email text, p_phone text,
  p_answers jsonb, p_cover_note text, p_cv_key text, p_needs_sponsorship boolean, p_consent boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare a record; cid uuid; flagged int;
begin
  if not coalesce(p_consent, false) then raise exception 'Consent is required'; end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then raise exception 'Name is required'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid email is required'; end if;

  select * into a from job_adverts where id = p_advert_id;
  if a is null or a.status <> 'published' or a.visibility = 'internal_only'
     or (a.closes_on is not null and a.closes_on < (now() at time zone 'Europe/London')::date) then
    raise exception 'This advert is not taking applications';
  end if;
  if a.vacancy_id is null then raise exception 'This advert has no vacancy'; end if;
  if exists (select 1 from candidates c where c.vacancy_id = a.vacancy_id and c.email = p_email::citext) then
    raise exception 'An application from this email address has already been received for this role';
  end if;

  select count(*) into flagged
  from jsonb_array_elements(a.questions) q
  where q ->> 'type' = 'yesno' and coalesce(q ->> 'knockout', '') <> ''
    and lower(coalesce(p_answers ->> (q ->> 'id'), '')) = q ->> 'knockout';

  insert into candidates (tenant_id, vacancy_id, advert_id, channel, first_name, last_name, email, phone,
                          cv_key, cover_note, source, screening_answers, applied_on, delete_after)
  values (a.tenant_id, a.vacancy_id, a.id, 'careers', trim(p_first_name), trim(p_last_name), p_email, p_phone,
          p_cv_key, p_cover_note, 'Company website', coalesce(p_answers, '{}'::jsonb),
          (now() at time zone 'Europe/London')::date, null)
  returning id into cid;

  if flagged > 0 or coalesce(p_needs_sponsorship, false) then
    insert into candidate_notes (tenant_id, candidate_id, kind, author_label, body)
    values (a.tenant_id, cid, 'screening', 'Careers page',
      concat_ws(' ',
        case when flagged > 0 then flagged || ' knock-out answer(s) — review before progressing.' end,
        case when p_needs_sponsorship then 'Candidate says they will need visa sponsorship.' end));
  end if;
  return cid;
end $$;

revoke all on function public.apply_to_job_advert from public;
grant execute on function public.apply_to_job_advert to anon, authenticated;

-- ============================================================ row-level security
alter table job_adverts enable row level security;
-- Admins and managers see all of their workspace's adverts; everyone else
-- sees published ones on the internal job board.
create policy job_adverts_read on job_adverts
  for select to authenticated
  using (tenant_id = app.current_tenant() and (
    app.is_admin() or app.current_role_name() = 'manager'
    or (status = 'published' and visibility <> 'public_only')));
create policy job_adverts_write on job_adverts
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'));

alter table job_advert_events enable row level security;
create policy job_advert_events_read on job_advert_events
  for select to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'));

alter table candidate_emails enable row level security;
create policy candidate_emails_read on candidate_emails
  for select to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'));
-- No insert/update/delete policy: only the Edge Function (service role) writes.

alter table candidate_email_templates enable row level security;
create policy candidate_email_templates_read on candidate_email_templates
  for select to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'));
create policy candidate_email_templates_write on candidate_email_templates
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

-- Same completeness check as 0008: no table in public without RLS.
do $$
declare missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing is not null then raise exception 'RLS is not enabled on: %', missing; end if;
end $$;

commit;
