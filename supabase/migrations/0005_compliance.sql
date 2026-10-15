-- 0005 · compliance: safety, training, performance
--
-- The pattern throughout: store what was recorded, derive what follows from
-- it. RIDDOR reportability, certificate status and review lateness are all
-- computed in 0009 from the columns here, because each one is a function of
-- today's date and would be wrong the morning after it was stored.

begin;

-- ============================================================ incidents
create table incidents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  reference     text not null,              -- 'INC-3308', per tenant

  kind          incident_kind not null default 'accident',
  category      text not null,              -- 'Slip, trip or fall'
  severity      incident_severity not null default 'no_injury',

  occurred_on   date not null,
  occurred_at_time time,
  location      text not null,
  description   text not null,

  -- Null where the person involved is not an employee — a visitor or
  -- contractor. The incident is still reportable.
  employee_id   uuid references employees(id) on delete set null,
  non_employee_name text,
  non_employee_kind text check (non_employee_kind is null
    or non_employee_kind in ('visitor','contractor','member_of_public','agency')),

  reported_by   uuid references profiles(id) on delete set null,
  reported_by_label text,
  reported_at   timestamptz not null default now(),

  -- Days unable to perform normal duties, NOT counting the day of the
  -- accident. This is the RIDDOR test, and the reason severity is derived
  -- from it rather than chosen: over 7 days is reportable within 15, over 3
  -- must be recorded but is not reportable.
  days_incapacitated int not null default 0 check (days_incapacitated >= 0),

  -- Additional reportability triggers that are not about severity.
  diagnosed_disease boolean not null default false,
  hospitalised_non_worker boolean not null default false,

  -- Whether the statutory report has been MADE. Reportability itself is
  -- derived — this records the human action, because the platform cannot
  -- submit to the HSE on anyone's behalf.
  riddor_reported boolean not null default false,
  riddor_reported_at date,
  riddor_reference text,

  investigation_status task_state not null default 'open',
  investigation_findings text,
  investigation_by uuid references profiles(id) on delete set null,
  investigation_at date,
  -- Immediate cause and underlying cause held separately: an investigation
  -- that only records the immediate cause has not been done.
  immediate_cause text,
  root_cause    text,

  witness_notes text,
  photo_keys    jsonb not null default '[]'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (tenant_id, reference),
  constraint riddor_report_has_date check (not riddor_reported or riddor_reported_at is not null),
  -- Someone was involved, either an employee or a named non-employee.
  constraint has_a_person check (
    employee_id is not null or non_employee_name is not null or kind = 'dangerous_occurrence'
  )
);

create trigger incidents_touch before update on incidents
  for each row execute function app.touch_updated_at();

create index incidents_tenant_date on incidents (tenant_id, occurred_on desc);
create index incidents_riddor_open on incidents (tenant_id)
  where not riddor_reported;
create index incidents_employee on incidents (employee_id) where employee_id is not null;

alter table absences
  add constraint absences_incident_fk
  foreign key (incident_id) references incidents(id) on delete set null;

-- Corrective actions. Separate table because an incident without a closed
-- action has not actually been dealt with, and one incident produces several.
create table incident_actions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,

  title       text not null,
  owner_label text,
  owner_id    uuid references profiles(id) on delete set null,
  due_on      date,

  status      task_state not null default 'open',
  completed_on date,
  completion_note text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint complete_has_date check (status <> 'complete' or completed_on is not null)
);

create trigger incident_actions_touch before update on incident_actions
  for each row execute function app.touch_updated_at();

create index incident_actions_open on incident_actions (tenant_id, due_on)
  where status <> 'complete';

-- ============================================================ risk assessments
create table risk_assessments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  reference   text not null,              -- 'RA-201'

  title       text not null,
  location    text,
  category    text,
  activity_description text,
  -- Who is exposed. A risk assessment that does not name the people at risk
  -- has skipped the first question.
  persons_at_risk text,

  -- 5×5 matrix, before controls.
  likelihood  int not null check (likelihood between 1 and 5),
  severity    int not null check (severity between 1 and 5),

  controls    text not null,
  -- After controls. The residual score is the one that decides whether the
  -- work can proceed.
  residual_likelihood int not null check (residual_likelihood between 1 and 5),
  residual_severity   int not null check (residual_severity between 1 and 5),
  further_action text,

  assessor_label text,
  assessor_id uuid references profiles(id) on delete set null,
  reviewed_on date not null default current_date,
  -- Days until the next review. High untreated risk gets 182 rather than
  -- 365, set by the application when the score warrants it.
  review_every int not null default 365 check (review_every > 0),

  status      text not null default 'active'
    check (status in ('draft','active','archived')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (tenant_id, reference),
  -- Controls cannot make a risk worse. This catches transposed residual
  -- figures, which is a common and dangerous data-entry error.
  constraint residual_not_worse check (
    (residual_likelihood * residual_severity) <= (likelihood * severity)
  )
);

create trigger risk_assessments_touch before update on risk_assessments
  for each row execute function app.touch_updated_at();

create index risk_assessments_review on risk_assessments (tenant_id, reviewed_on)
  where status = 'active';

-- ============================================================ training
-- Mandatory-course requirements per tenant. The prototype hardcoded these;
-- as data, each tenant defines its own matrix.
create table training_requirements (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  course_name text not null,
  category    text,
  -- Null departments = required of everyone. Otherwise an array of names.
  departments jsonb,
  renew_every int not null default 365 check (renew_every > 0),
  -- Days before expiry to start flagging.
  warn_days   int not null default 60,
  -- Some training must come from an approved external provider: first aid at
  -- work, most plant tickets. Internal eLearning cannot satisfy these, and
  -- the flag keeps the compliance view honest about it.
  external_provider_required boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (tenant_id, course_name)
);

create table employee_training (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,

  course_name text not null,
  category    text,
  minutes     int,

  assigned_on date,
  due_on      date,
  completed_on date,
  -- Status is DERIVED from completed_on and expires_on against today. Stored
  -- here only as the recorded intent: assigned, in progress, complete.
  progress    int not null default 0 check (progress between 0 and 100),

  certificate_ref text,
  certificate_key text,                  -- storage key for the PDF
  score       int check (score is null or score between 0 and 100),
  expires_on  date,
  renew_every int,

  provider    text,
  -- True when earned through the platform's own eLearning, false when
  -- recorded from an outside course. The compliance view distinguishes them
  -- because only one of the two has an auditable assessment behind it.
  via_elearning boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (employee_id, course_name)
);

create trigger employee_training_touch before update on employee_training
  for each row execute function app.touch_updated_at();

create index employee_training_employee on employee_training (employee_id);
create index employee_training_expiry on employee_training (tenant_id, expires_on)
  where expires_on is not null;

-- ============================================================ performance
create table goals (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,

  title       text not null,
  -- How it will be judged. A goal without a measure cannot be assessed
  -- fairly, which matters when it appears in a capability process.
  measure     text,
  due_on      date,
  progress    int not null default 0 check (progress between 0 and 100),
  -- Recorded state. The live state is derived: within 14 days of the due date
  -- at under 60% reads as at risk, past due reads as behind.
  status      goal_state not null default 'not_started',

  -- Set when the goal came out of a review, so the chain is traceable.
  from_review_id uuid,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);

create trigger goals_touch before update on goals
  for each row execute function app.touch_updated_at();

create index goals_employee on goals (employee_id) where status <> 'complete';

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,

  kind        review_kind not null default 'annual',
  scheduled_on date,
  reviewer_label text,
  reviewer_id uuid references profiles(id) on delete set null,

  status      task_state not null default 'open',
  rating      rating_band,
  summary     text,
  -- What the employee said, held separately from the reviewer's summary. A
  -- review record with only one voice in it is not a record of a
  -- conversation.
  employee_comment text,
  completed_on date,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint complete_has_outcome check (
    status <> 'complete' or (completed_on is not null and rating is not null)
  )
);

create trigger reviews_touch before update on reviews
  for each row execute function app.touch_updated_at();

create index reviews_employee on reviews (employee_id, scheduled_on desc);
create index reviews_due on reviews (tenant_id, scheduled_on) where status <> 'complete';

alter table goals
  add constraint goals_review_fk
  foreign key (from_review_id) references reviews(id) on delete set null;

commit;
