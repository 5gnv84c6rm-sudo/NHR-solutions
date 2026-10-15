-- 0006 · recruitment, learning content, wellbeing
--
-- Wellbeing is the one place in this schema where a missing foreign key is a
-- feature. wellbeing_checkins has NO employee_id and must never gain one:
-- anonymity is the product promise, and a nullable link would eventually be
-- populated "just for follow-up". There is no technical route from a response
-- back to a person, which is also why team results are suppressed below five.

begin;

-- ============================================================ recruitment
create table vacancies (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  reference   text not null,

  title       text not null,
  department  text,
  location    text,
  employment_type employment_type not null default 'full_time',

  -- Advertised range. Held as two columns rather than free text so it can be
  -- filtered, and because pay transparency is increasingly expected.
  salary_min  numeric(12,2),
  salary_max  numeric(12,2),
  salary_note text,

  description text,
  requirements text,
  hiring_manager_id uuid references employees(id) on delete set null,

  status      text not null default 'draft'
    check (status in ('draft','open','on_hold','closed','filled')),
  opened_on   date,
  closes_on   date,
  filled_on   date,
  -- The employee record created when the hire completed, closing the loop
  -- from candidate to colleague.
  filled_by_employee_id uuid references employees(id) on delete set null,

  positions   int not null default 1 check (positions > 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (tenant_id, reference),
  constraint salary_range check (salary_max is null or salary_min is null or salary_max >= salary_min)
);

create trigger vacancies_touch before update on vacancies
  for each row execute function app.touch_updated_at();

create index vacancies_open on vacancies (tenant_id) where status = 'open';

create table candidates (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  vacancy_id  uuid references vacancies(id) on delete set null,

  first_name  text not null,
  last_name   text not null,
  email       citext,
  phone       text,

  cv_key      text,                      -- storage key
  cover_note  text,
  source      text,                      -- 'Direct', 'Agency', 'Referral'
  referred_by uuid references employees(id) on delete set null,

  stage       text not null default 'applied'
    check (stage in ('applied','screening','interview','assessment','offer','hired','rejected','withdrawn')),
  stage_changed_at timestamptz not null default now(),

  rating      int check (rating is null or rating between 1 and 5),
  -- Right to work is checked before an offer, not after. Recording it here
  -- keeps the check in the hiring flow rather than as an afterthought at
  -- onboarding.
  rtw_checked boolean not null default false,

  applied_on  date not null default current_date,
  rejected_reason text,
  -- Candidate data has a short retention period: 6 months from the decision
  -- unless the candidate consents to being kept on file. The retention job
  -- reads this column.
  delete_after date,
  consent_to_retain boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger candidates_touch before update on candidates
  for each row execute function app.touch_updated_at();

create index candidates_vacancy on candidates (vacancy_id, stage);
create index candidates_stale on candidates (tenant_id, stage_changed_at)
  where stage not in ('hired','rejected','withdrawn');
create index candidates_retention on candidates (delete_after)
  where delete_after is not null;

create table candidate_notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  body        text not null,
  -- Interview notes are disclosable in a discrimination claim. Recording the
  -- author is what makes them defensible.
  author_id   uuid references profiles(id) on delete set null,
  author_label text,
  kind        text not null default 'note'
    check (kind in ('note','screening','interview','reference','decision')),
  created_at  timestamptz not null default now()
);

create index candidate_notes_candidate on candidate_notes (candidate_id, created_at desc);

create table interviews (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 45,
  kind        text,
  location    text,
  interviewer_ids jsonb not null default '[]'::jsonb,
  status      task_state not null default 'open',
  outcome     text,
  created_at  timestamptz not null default now()
);

create index interviews_candidate on interviews (candidate_id, scheduled_at);

-- ============================================================ learning content
create table courses (
  id          uuid primary key default gen_random_uuid(),
  -- Null tenant_id = a platform course available to everyone. A tenant can
  -- also author its own, which is why this is nullable rather than required.
  tenant_id   uuid references tenants(id) on delete cascade,

  code        text not null,
  title       text not null,
  category    text,
  summary     text,
  minutes     int not null default 30,

  -- Lessons and questions as jsonb. They are read as a whole document by the
  -- player and never queried field by field, so separate tables would add
  -- joins for no benefit.
  lessons     jsonb not null default '[]'::jsonb,
  quiz        jsonb not null default '[]'::jsonb,
  pass_mark   int not null default 80 check (pass_mark between 0 and 100),

  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger courses_touch before update on courses
  for each row execute function app.touch_updated_at();

create unique index courses_code on courses (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

create table enrolments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  course_id   uuid not null references courses(id) on delete cascade,

  lessons_complete jsonb not null default '[]'::jsonb,
  attempts    int not null default 0,
  -- Best score is kept, not the latest. A learner who passes and then retakes
  -- for revision does not lose their certificate.
  best_score  int check (best_score is null or best_score between 0 and 100),
  passed      boolean not null default false,

  started_at  timestamptz,
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (employee_id, course_id)
);

create trigger enrolments_touch before update on enrolments
  for each row execute function app.touch_updated_at();

create index enrolments_employee on enrolments (employee_id);

-- ============================================================ wellbeing
-- Minimum responses before a group figure is returned. Enforced in the view
-- in 0009 as a HAVING clause, so no client query can return an
-- under-threshold group regardless of how it is constructed.
create table wellbeing_config (
  tenant_id   uuid primary key references tenants(id) on delete cascade,
  min_group   int not null default 5 check (min_group >= 3),
  cadence     text not null default 'weekly' check (cadence in ('weekly','fortnightly','monthly')),
  enabled     boolean not null default true,
  questions   jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- NO employee_id. NO user_id. This is deliberate and permanent.
--
-- The department is recorded so team-level reporting is possible, which is the
-- entire point of collecting it — but with a suppression threshold, because in
-- a team of three, "the department average dropped" identifies people.
create table wellbeing_checkins (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,

  -- Coarse: department only, never location + department + role, which in
  -- combination would identify one person.
  department  text,
  submitted_on date not null default current_date,

  -- Per-question scores 1-5.
  scores      jsonb not null,
  -- Free text. Shown only in aggregate reports above the threshold, and never
  -- attributed. A comment box on an anonymous survey is where someone says
  -- the thing they cannot say in a meeting.
  comment     text,

  created_at  timestamptz not null default now()
);

create index wellbeing_checkins_period on wellbeing_checkins (tenant_id, submitted_on desc);
create index wellbeing_checkins_dept on wellbeing_checkins (tenant_id, department, submitted_on);

-- The adjustments register. This one IS linked to an employee, because a
-- reasonable adjustment has to be delivered to a named person.
--
-- What it records is the ADJUSTMENT, not the reason for it. There is no
-- diagnosis column and there must never be one: the employer needs to know
-- that someone has a later start and a specific chair, not their medical
-- history.
create table adjustments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,

  adjustment  text not null,
  category    text,
  agreed_on   date,
  review_on   date,
  status      text not null default 'active'
    check (status in ('proposed','active','under_review','ended')),

  -- Who agreed it, for the avoidance of the "nobody told me" conversation
  -- when a manager changes.
  agreed_by   uuid references profiles(id) on delete set null,
  note        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger adjustments_touch before update on adjustments
  for each row execute function app.touch_updated_at();

create index adjustments_employee on adjustments (employee_id) where status = 'active';

commit;
