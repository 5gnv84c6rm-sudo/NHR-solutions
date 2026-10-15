-- 0003 · time and absence: leave, absences, timesheet, shifts
--
-- The four tables that carry most of the daily traffic. Each one stores what
-- was recorded and nothing that can be computed: working days, balances and
-- Bradford scores are all derived in 0009, because a stored total is a total
-- that disagrees with its own components the first time a row is edited.

begin;

-- ============================================================ leave
create table leave_requests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,

  kind          leave_kind not null default 'annual',
  starts_on     date not null,
  ends_on       date not null,

  -- Working days, excluding weekends and the tenant's bank holidays. Stored
  -- because it is the figure that was agreed at the time — if a bank holiday
  -- is later added to the calendar, a booked and approved request does not
  -- silently change length.
  working_days  numeric(4,1) not null check (working_days >= 0),
  -- Half-day support: which half, when working_days ends in .5.
  half_day      text check (half_day is null or half_day in ('am','pm')),

  note          text,
  status        approval_status not null default 'pending',

  decided_by    uuid references profiles(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,

  -- Which leave year this consumes. A request spanning the year end is split
  -- into two rows at booking time rather than being apportioned later.
  leave_year    int not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id) on delete set null,

  constraint leave_window check (ends_on >= starts_on),
  -- A decision must record who made it. An approval with no name attached is
  -- useless in a dispute, which is the only time anyone reads it.
  constraint decision_has_actor check (
    status in ('pending','cancelled') or (decided_by is not null and decided_at is not null)
  )
);

create trigger leave_requests_touch before update on leave_requests
  for each row execute function app.touch_updated_at();

create index leave_employee on leave_requests (employee_id, starts_on desc);
create index leave_pending on leave_requests (tenant_id) where status = 'pending';
-- Powers "who is off today" and the team calendar.
create index leave_span on leave_requests (tenant_id, starts_on, ends_on)
  where status = 'approved';

-- ============================================================ absence
create table absences (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,

  starts_on     date not null,
  -- Null while someone is still off — an open absence. Duration is therefore
  -- computed to today, not to a guessed end date.
  ends_on       date,
  days          numeric(4,1) check (days is null or days >= 0),

  -- Health information, special category data under Article 9. Held here
  -- because absence management requires it, never passed to an AI feature,
  -- never included in a webhook payload, never exported to an integration.
  reason        text,

  -- Self-certification covers up to 7 calendar days; beyond that a fit note
  -- is required. Both flags are recorded rather than derived, because what
  -- was actually provided is a fact about the case.
  self_certified boolean not null default true,
  fit_note      boolean not null default false,
  fit_note_key  text,                    -- storage key if uploaded

  -- Return-to-work discussion. Held as a nested object because it is one
  -- event with several fields, and an absence has at most one.
  rtw_completed boolean not null default false,
  rtw_date      date,
  rtw_by        uuid references profiles(id) on delete set null,
  rtw_notes     text,

  note          text,
  -- Set when an absence was created from a safety incident, so the two
  -- records stay connected. FK added in 0005 once incidents exists.
  incident_id   uuid,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id) on delete set null,

  constraint absence_window check (ends_on is null or ends_on >= starts_on),
  -- Over 7 days self-certified is a data-entry error: the threshold is
  -- statutory, so the database can say so.
  constraint fit_note_over_7 check (
    ends_on is null or (ends_on - starts_on) < 7 or not self_certified or fit_note
  )
);

create trigger absences_touch before update on absences
  for each row execute function app.touch_updated_at();

create index absences_employee on absences (employee_id, starts_on desc);
create index absences_open on absences (tenant_id) where ends_on is null;
create index absences_span on absences (tenant_id, starts_on, ends_on);

-- ============================================================ timesheet
-- Named timesheet, not attendance, matching the prototype's collection name.
create table timesheet (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,

  worked_on     date not null,
  clock_in      timestamptz,
  clock_out     timestamptz,

  -- Total unpaid break in minutes. Workers over 6 hours are entitled to a
  -- 20-minute uninterrupted rest break; the report flags where it is missing
  -- rather than the database rejecting the row, because the breach is a fact
  -- that needs recording, not hiding.
  break_minutes int not null default 0 check (break_minutes >= 0),

  -- Hours are DERIVED from clock times, not stored — except where there are
  -- no clock times at all and hours were entered manually.
  manual_hours  numeric(5,2) check (manual_hours is null or manual_hours >= 0),

  source        text not null default 'manual'
    check (source in ('manual','web_clock','mobile','terminal','import')),
  -- Where a mobile clock-in happened, if location is enabled. Monitoring
  -- location is a DPIA trigger, so it is optional and off by default.
  clock_in_lat  numeric(9,6),
  clock_in_lng  numeric(9,6),

  approved      boolean,                 -- null = not yet reviewed
  approved_by   uuid references profiles(id) on delete set null,
  approved_at   timestamptz,

  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- One row per employee per day. A second clock-in on the same day amends
  -- the row rather than creating a duplicate that double-counts the hours.
  unique (employee_id, worked_on),
  constraint clock_order check (clock_out is null or clock_in is null or clock_out > clock_in),
  constraint hours_or_clock check (clock_in is not null or manual_hours is not null)
);

create trigger timesheet_touch before update on timesheet
  for each row execute function app.touch_updated_at();

create index timesheet_employee_date on timesheet (employee_id, worked_on desc);
create index timesheet_unapproved on timesheet (tenant_id, worked_on)
  where approved is null;
create index timesheet_date on timesheet (tenant_id, worked_on);

-- ============================================================ shifts
create table shifts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  -- Null employee_id = an open shift nobody has taken yet.
  employee_id   uuid references employees(id) on delete set null,

  shift_on      date not null,
  starts_at     time not null,
  ends_at       time not null,
  -- True where the shift crosses midnight, so ends_at < starts_at is correct
  -- rather than an error.
  overnight     boolean not null default false,
  break_minutes int not null default 0 check (break_minutes >= 0),

  role          text,
  location      text,
  department    text,
  note          text,

  published     boolean not null default false,
  published_at  timestamptz,

  -- Swap and cover requests. A swap needs both parties and a manager, so it
  -- carries its own small state machine.
  swap_requested_by uuid references employees(id) on delete set null,
  swap_offered_to   uuid references employees(id) on delete set null,
  swap_status   approval_status,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id) on delete set null,

  constraint shift_times check (overnight or ends_at > starts_at)
);

create trigger shifts_touch before update on shifts
  for each row execute function app.touch_updated_at();

create index shifts_date on shifts (tenant_id, shift_on);
create index shifts_employee on shifts (employee_id, shift_on) where employee_id is not null;
create index shifts_open on shifts (tenant_id, shift_on) where employee_id is null;

-- Stated availability, used when assigning shifts. Separate from shifts
-- because it is a recurring pattern rather than a dated event.
create table availability (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  -- 0 = Sunday, matching JS getDay(), so the frontend needs no translation.
  weekday     int not null check (weekday between 0 and 6),
  available_from time,
  available_to   time,
  unavailable boolean not null default false,
  note        text,
  unique (employee_id, weekday)
);

commit;
