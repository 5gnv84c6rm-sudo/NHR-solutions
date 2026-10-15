-- 0002 · employees and everything owned by one employee
--
-- Field names follow the prototype's employee record so the seed import is a
-- direct mapping.
--
-- Two decisions carried from the prototype, both worth keeping:
--   · archived = true IS the leaver state. Nothing is hard-deleted: statutory
--     retention requires the record, and turnover history breaks without it.
--   · pay lives in its own table, because it sits behind its own permission.
--     A response for a role without payroll access never assembles it — the
--     RLS policy in 0008 means the rows are not returned at all.

begin;

create table employees (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,

  employee_ref  text not null,            -- 'NHR-000101', per tenant

  first_name    text not null,
  middle_name   text,
  last_name     text not null,
  preferred_name text,
  photo_key     text,                     -- storage object key, never bytes

  date_of_birth date,
  gender        text,
  pronouns      text,
  nationality   text,

  -- Encrypted in the application with a KMS-managed key, on top of
  -- at-rest encryption. A database dump alone should not yield NI numbers.
  ni_number_encrypted bytea,

  rtw_status     rtw_status not null default 'pending',
  rtw_expires_on date,
  rtw_checked_on date,

  personal_email citext,
  work_email     citext,
  mobile         text,
  home_phone     text,

  job_title     text,
  department    text,
  location      text,
  manager_id    uuid references employees(id) on delete set null,

  employment_type   employment_type not null default 'full_time',
  employment_status employment_status not null default 'probation',

  start_date         date,
  probation_end_date date,
  contract_end_date  date,
  end_date           date,
  leaver_reason      text,

  working_pattern working_pattern not null default 'fixed',
  hours_per_week  numeric(4,1) not null default 37.5
    check (hours_per_week >= 0 and hours_per_week <= 168),
  days_per_week   numeric(3,1) default 5
    check (days_per_week is null or (days_per_week > 0 and days_per_week <= 7)),

  -- Days. Irregular-hours and part-year workers accrue 12.07% of hours worked
  -- instead; the calculation function in 0009 branches on irregular_hours.
  annual_leave_days numeric(5,2) not null default 28,
  irregular_hours   boolean not null default false,

  employee_category text,
  cost_centre       text,
  branch            text,
  onboarding        jsonb not null default '{}'::jsonb,

  archived      boolean not null default false,
  archived_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id) on delete set null,
  updated_by    uuid references profiles(id) on delete set null,

  unique (tenant_id, employee_ref),
  constraint employee_dates check (
    end_date is null or start_date is null or end_date >= start_date
  ),
  -- An archived record must carry its date, or turnover cannot be calculated
  -- for a period.
  constraint archived_has_date check (not archived or archived_at is not null),
  constraint manager_not_self check (manager_id is null or manager_id <> id)
);

create trigger employees_touch before update on employees
  for each row execute function app.touch_updated_at();

create index employees_tenant_active on employees (tenant_id) where not archived;
create index employees_manager on employees (manager_id) where not archived;
create index employees_dept on employees (tenant_id, department) where not archived;
-- Trigram index for the search box: 'osei' matches mid-string, which a btree
-- prefix index cannot do.
create index employees_name_trgm on employees
  using gin ((first_name || ' ' || last_name) gin_trgm_ops);

alter table profiles
  add constraint profiles_employee_fk
  foreign key (employee_id) references employees(id) on delete set null;

-- ============================================================ pay
create table employee_pay (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,

  payroll_ref   text,
  pay_frequency pay_frequency not null default 'monthly',

  annual_salary numeric(12,2) check (annual_salary is null or annual_salary >= 0),
  hourly_rate   numeric(8,2) check (hourly_rate is null or hourly_rate >= 0),

  tax_code      text,
  -- An 'S' prefix means Scottish rates. Held per employee rather than inferred
  -- from the tenant's nation, because someone can be taxed in a different
  -- nation from where the business is registered.
  ni_category   text default 'A',
  student_loan_plan text,
  postgrad_loan boolean not null default false,

  pension_scheme text,
  pension_employee_pct numeric(5,4)
    check (pension_employee_pct is null or pension_employee_pct between 0 and 1),
  pension_employer_pct numeric(5,4)
    check (pension_employer_pct is null or pension_employer_pct between 0 and 1),
  -- Salary sacrifice changes taxable pay, so it changes the order of
  -- calculation, not just the arithmetic.
  pension_salary_sacrifice boolean not null default false,
  pension_opted_out boolean not null default false,

  payment_method text default 'bank_transfer',
  bank_account_name text,
  -- Encrypted. Only the last four digits are ever returned to a client.
  bank_sort_code_encrypted bytea,
  bank_account_encrypted   bytea,
  bank_account_last4 text check (bank_account_last4 is null or bank_account_last4 ~ '^\d{4}$'),

  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,

  -- Current pay only. History is in payroll_lines and audit_log, so a pay rise
  -- never retrospectively alters an issued payslip.
  unique (employee_id),
  constraint one_pay_basis check (
    (annual_salary is not null and hourly_rate is null) or
    (annual_salary is null and hourly_rate is not null) or
    (annual_salary is null and hourly_rate is null)
  )
);

create trigger employee_pay_touch before update on employee_pay
  for each row execute function app.touch_updated_at();

-- ============================================================ addresses
create table employee_addresses (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  kind        text not null default 'home' check (kind in ('home','postal','previous')),
  line1 text, line2 text, city text, county text, postcode text,
  country     text not null default 'United Kingdom',
  -- Address history is needed for right-to-work and DBS checks.
  valid_from  date,
  valid_to    date,
  created_at  timestamptz not null default now()
);

create index employee_addresses_employee on employee_addresses (employee_id);

-- ============================================================ emergency contacts
create table emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  employee_id  uuid not null references employees(id) on delete cascade,
  name         text not null,
  relationship text,
  phone        text not null,
  email        citext,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- One primary contact at most. An ambiguous "who do we ring" is exactly the
-- failure this prevents, and it only ever matters on the worst day.
create unique index emergency_primary_one
  on emergency_contacts (employee_id) where is_primary;

-- ============================================================ documents
create table documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  -- Null employee_id = a company document (policy, handbook).
  employee_id uuid references employees(id) on delete cascade,

  name        text not null,
  category    text,
  scope       text not null default 'employee' check (scope in ('employee','company')),

  file_key    text not null,             -- storage bucket key
  size_bytes  bigint check (size_bytes is null or size_bytes >= 0),
  mime_type   text,
  checksum    text,

  -- Status is DERIVED from this against today, never stored. A stored status
  -- goes stale in the night; a derived one cannot.
  expires_on  date,
  remind_days int not null default 30,

  requires_signature boolean not null default false,
  signed_at   timestamptz,
  signed_by   uuid references profiles(id) on delete set null,
  -- IP, user agent and the checksum at the moment of signing, so a later edit
  -- to the file is detectable.
  signature_meta jsonb,

  uploaded_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  constraint company_doc_has_no_employee check (
    (scope = 'company' and employee_id is null) or
    (scope = 'employee' and employee_id is not null)
  )
);

create trigger documents_touch before update on documents
  for each row execute function app.touch_updated_at();

create index documents_employee on documents (employee_id) where deleted_at is null;
create index documents_expiry on documents (tenant_id, expires_on)
  where deleted_at is null and expires_on is not null;

create table document_acknowledgements (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  ip          inet,
  unique (document_id, employee_id)
);

-- ============================================================ notes
create table employee_notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  body        text not null,
  -- Free text about a person: usually the most sensitive material in the
  -- system. Never passed to an AI feature, never sent in a webhook.
  visibility  text not null default 'hr' check (visibility in ('hr','manager','employee')),
  author_id   uuid references profiles(id) on delete set null,
  author_label text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index employee_notes_employee on employee_notes (employee_id, created_at desc)
  where deleted_at is null;

-- ============================================================ activity
-- The human-readable trail on a profile and the dashboard. Distinct from
-- audit_log: this is for users, audit_log is for investigations.
create table activity_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  action      text not null,
  actor_id    uuid references profiles(id) on delete set null,
  actor_label text,
  occurred_at timestamptz not null default now()
);

create index activity_log_employee on activity_log (employee_id, occurred_at desc);
create index activity_log_tenant on activity_log (tenant_id, occurred_at desc);

commit;
