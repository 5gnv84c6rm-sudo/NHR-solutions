-- 0001 · foundation: extensions, JWT helpers, enums, tenants, UK reference data
--
-- Supabase architecture. Three things differ from a self-hosted Postgres:
--
--   1. auth.users is managed by Supabase Auth. Our profiles table references
--      it rather than storing passwords. There is no sessions table — Auth
--      owns session lifecycle.
--   2. Tenancy and role come from JWT claims, injected by the custom access
--      token hook in 0009. Reading them from the token rather than sub-querying
--      profiles on every policy check is the difference between a policy that
--      costs nothing and one that costs a join per row.
--   3. RLS is not optional. PostgREST exposes these tables directly to the
--      browser, so a table without a policy is a public table. 0008 enables
--      RLS on every one and the final assertion there fails the migration if
--      any table was missed.

begin;

-- app.visible_employee_ids() below selects from employees, which 0002 creates.
-- Postgres validates SQL function bodies at creation time, so without this the
-- migration fails on a clean database with "relation employees does not exist".
set local check_function_bodies = off;

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;      -- employee name search
create extension if not exists pg_cron;      -- scheduled jobs; replaces Redis/BullMQ

-- Helpers live in their own schema, deliberately not exposed through
-- PostgREST. Adding it to the API search path would let a client call
-- app.visible_employee_ids() directly, which is a security-definer function.
create schema if not exists app;
revoke all on schema app from anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- ============================================================ JWT helpers
-- Marked stable so the planner calls them once per statement, not per row.

-- The tenant the current request belongs to. Raises if absent: a null tenant
-- against a permissive policy would match every row in the table.
create or replace function app.current_tenant()
returns uuid language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      ''
    ), ''
  )::uuid
$$;

create or replace function app.current_role_name()
returns text language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    'employee'
  )
$$;

-- The employee record behind the signed-in user, for self-service scoping.
create or replace function app.current_employee()
returns uuid language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'employee_id',
      ''
    ), ''
  )::uuid
$$;

create or replace function app.is_admin()
returns boolean language sql stable as $$
  select app.current_role_name() in ('super_admin', 'hr_admin')
$$;

-- Payroll is a separate permission from admin, because a plan can include
-- Payroll and an HR Admin can still be barred from it.
create or replace function app.can_read_payroll()
returns boolean language sql stable as $$
  select app.current_role_name() in ('super_admin', 'hr_admin')
$$;

-- The set of employees the caller may see. This one function is the whole
-- role-scoping model, and every employee-owned table's policy joins to it —
-- so the rule lives in exactly one place.
--
--   super_admin / hr_admin  → everyone in the tenant
--   manager                 → direct reports, plus themselves
--   employee                → themselves only
--
-- Direct reports only, deliberately not the whole reporting tree: a manager
-- seeing their reports' reports is a different product decision, and making
-- it accidentally through a recursive CTE would be the wrong way to arrive
-- at it.
create or replace function app.visible_employee_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select e.id
  from employees e
  where e.tenant_id = app.current_tenant()
    and (
      app.is_admin()
      or e.id = app.current_employee()
      or (app.current_role_name() = 'manager' and e.manager_id = app.current_employee())
    )
$$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================ enums
-- Values match the strings the prototype stores hold, so the seed import is a
-- direct mapping and the UI labels need no translation table.

create type plan_tier as enum ('starter','professional','business','enterprise');
create type tenant_status as enum ('trial','active','past_due','suspended','cancelled');
create type uk_nation as enum ('england_wales','scotland','northern_ireland');
create type app_role as enum ('super_admin','hr_admin','manager','employee');

create type employment_type as enum
  ('full_time','part_time','temporary','contractor','apprentice','casual');
create type employment_status as enum
  ('active','on_leave','probation','pending','inactive');
create type working_pattern as enum ('fixed','flexible','shift_based');
create type pay_frequency as enum ('weekly','fortnightly','four_weekly','monthly');
create type rtw_status as enum ('verified','pending','expired','not_required');

create type leave_kind as enum ('annual','unpaid','parental','compassionate','toil');
create type approval_status as enum ('pending','approved','rejected','cancelled');
create type expense_status as enum ('pending','queried','approved','rejected','paid');

-- Ordered least to most serious, and the order is load-bearing: RIDDOR
-- reportability is derived from severity, and severity is itself derived from
-- the day count rather than chosen by whoever files the report.
create type incident_severity as enum
  ('no_injury','first_aid','medical_treatment','over_3_day',
   'over_7_day','specified_injury','fatality');
create type incident_kind as enum
  ('accident','near_miss','dangerous_occurrence','work_related_illness',
   'property_damage','violence');

create type task_state as enum ('open','in_progress','complete','cancelled');
create type goal_state as enum ('not_started','on_track','at_risk','behind','complete');
create type review_kind as enum
  ('probation','annual','mid_year','quarterly','improvement');
create type rating_band as enum
  ('exceptional','exceeded','met','partially_met','below');

-- ============================================================ tenants

create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          citext not null unique,
  plan          plan_tier not null default 'starter',
  status        tenant_status not null default 'trial',

  -- Billing counts active records only. Archived leavers are retained for
  -- statutory reasons and not charged for.
  employee_limit int,

  trial_started_at timestamptz,
  trial_ends_at    timestamptz,

  -- Drives bank holidays, and therefore holiday entitlement and every
  -- working-day count. Scotland and Northern Ireland genuinely differ;
  -- defaulting everyone to England makes those employers' figures wrong
  -- without telling them.
  nation        uk_nation not null default 'england_wales',

  -- Leave year start as month-day, e.g. '04-01'.
  leave_year_start text not null default '01-01'
    check (leave_year_start ~ '^\d{2}-\d{2}$'),

  companies_house_number text,
  billing_email citext,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  cancelled_at  timestamptz,

  constraint trial_window check (
    trial_ends_at is null or trial_started_at is null or trial_ends_at > trial_started_at
  )
);

create trigger tenants_touch before update on tenants
  for each row execute function app.touch_updated_at();

-- ============================================================ profiles
-- Mirrors auth.users with the fields our policies need. Supabase Auth owns
-- email, password, MFA and session lifecycle; this table owns tenancy, role
-- and the link to an employee record.

create table profiles (
  -- Same id as auth.users. One row per login.
  id            uuid primary key references auth.users(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,

  email         citext not null,
  name          text not null,
  role          app_role not null default 'employee',

  -- Null for an admin who is not an employee — an external bookkeeper, say.
  employee_id   uuid,

  -- Cosmetic only. Enforcement is in the access token hook and the policies.
  avatar_key    text,
  notification_prefs jsonb not null default '{}'::jsonb,

  invited_by    uuid references profiles(id) on delete set null,
  invited_at    timestamptz,
  accepted_at   timestamptz,
  last_seen_at  timestamptz,

  disabled_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (tenant_id, email)
);

create trigger profiles_touch before update on profiles
  for each row execute function app.touch_updated_at();

create index profiles_tenant_role on profiles (tenant_id, role) where disabled_at is null;
create index profiles_employee on profiles (employee_id) where employee_id is not null;

-- ============================================================ audit
-- Append-only, 7-year retention, never deleted by tenant action. This is the
-- table that answers "who changed this salary, and when".
create table audit_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  actor_label text,                    -- survives profile deletion

  action      text not null,           -- 'employee.pay.updated'
  entity_type text,
  entity_id   uuid,

  -- Before/after with sensitive values redacted by the writer. The trail
  -- records that pay changed and by whom; it is not a second uncontrolled
  -- copy of everyone's bank details.
  before      jsonb,
  after       jsonb,

  ip          inet,
  request_id  text,
  occurred_at timestamptz not null default now()
);

create index audit_log_tenant_time on audit_log (tenant_id, occurred_at desc);
create index audit_log_entity on audit_log (tenant_id, entity_type, entity_id, occurred_at desc);

-- ============================================================ UK reference data
-- Global, not tenant-scoped: facts about the UK, not about a customer.

-- Tax bands as DATA. They change every April and Scotland sets its own rates;
-- a hardcoded constant guarantees an annual emergency release.
create table tax_years (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,                    -- '2025/26'
  starts_on      date not null,
  ends_on        date not null,
  nation         uk_nation not null default 'england_wales',

  personal_allowance numeric(10,2) not null,
  -- Allowance tapers £1 for every £2 of income above this.
  taper_threshold    numeric(10,2) not null,

  -- jsonb because Scotland has more bands than rUK; a fixed column set needs
  -- altering whenever a nation adds one.
  -- [{"name":"basic","rate":0.20,"upper":50270}, ...]
  income_tax_bands   jsonb not null,
  ni_employee_bands  jsonb not null,
  ni_employer_bands  jsonb not null,
  employment_allowance numeric(10,2),

  auto_enrolment_lower numeric(10,2) not null,
  auto_enrolment_upper numeric(10,2) not null,
  min_employee_pension_pct numeric(5,4) not null,
  min_employer_pension_pct numeric(5,4) not null,

  student_loan_plans jsonb not null default '[]'::jsonb,
  national_living_wage jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  constraint tax_year_window check (ends_on > starts_on),
  unique (label, nation)
);

create table bank_holidays (
  id         uuid primary key default gen_random_uuid(),
  nation     uk_nation not null,
  holiday_on date not null,
  name       text not null,
  is_substitute boolean not null default false,   -- when it falls at a weekend
  unique (nation, holiday_on)
);

create index bank_holidays_lookup on bank_holidays (nation, holiday_on);

commit;
