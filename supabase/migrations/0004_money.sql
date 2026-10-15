-- 0004 · money: expenses, payroll runs and lines
--
-- Payroll is the highest-consequence area in the system, so two rules shape
-- these tables:
--
--   1. A payroll line is IMMUTABLE once its run is approved. Corrections are
--      new lines in a later run, never edits. An HMRC submission that no
--      longer matches what the database says is unreconcilable.
--   2. Every line records the tax year it was calculated under, and the
--      engine version that produced it. When a band changes retrospectively,
--      you can tell which lines were computed under the old rules.

begin;

-- ============================================================ expenses
create table expenses (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,

  spent_on      date not null,
  category      text not null,
  description   text not null,
  amount        numeric(10,2) not null check (amount > 0),
  currency      char(3) not null default 'GBP',

  -- Mileage claims need the distance, because the rate changes and the
  -- distance is the auditable fact. 45p/mile for the first 10,000 business
  -- miles in a car, 25p after.
  mileage_miles numeric(7,1) check (mileage_miles is null or mileage_miles >= 0),
  mileage_rate  numeric(5,3),
  vehicle_type  text,

  -- VAT reclaim requires a receipt showing the VAT. Held separately from the
  -- gross so the accounting export does not have to infer it.
  vat_amount    numeric(10,2) check (vat_amount is null or vat_amount >= 0),
  vat_receipt   boolean not null default false,

  receipt_key   text,                    -- storage key
  receipt_missing_reason text,           -- required by policy when absent

  status        expense_status not null default 'pending',
  decided_by    uuid references profiles(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,

  -- Set when the claim is included in a pay run, so it cannot be paid twice.
  paid_in_run   uuid,
  paid_at       timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint decision_has_actor check (
    status in ('pending','queried') or (decided_by is not null and decided_at is not null)
  ),
  -- A claim with no receipt must say why. This is the control that stops
  -- "receipt lost" becoming the default.
  constraint receipt_or_reason check (
    receipt_key is not null or receipt_missing_reason is not null or status = 'pending'
  )
);

create trigger expenses_touch before update on expenses
  for each row execute function app.touch_updated_at();

create index expenses_employee on expenses (employee_id, spent_on desc);
create index expenses_pending on expenses (tenant_id)
  where status in ('pending','queried');
create index expenses_unpaid on expenses (tenant_id)
  where status = 'approved' and paid_in_run is null;

-- ============================================================ payroll runs
create table payroll_runs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,

  period_label  text not null,           -- 'September 2026'
  pay_frequency pay_frequency not null default 'monthly',
  period_start  date not null,
  period_end    date not null,
  pay_date      date not null,

  tax_year_id   uuid not null references tax_years(id),
  -- Which period of the tax year, 1-12 monthly or 1-52 weekly. HMRC
  -- submissions need it and it cannot always be derived unambiguously from
  -- the dates alone.
  tax_period    int not null check (tax_period > 0),

  status        text not null default 'draft'
    check (status in ('draft','calculated','approved','submitted','paid','cancelled')),

  -- Totals, stored once the run is calculated. Derived from the lines, but
  -- frozen at approval so a later line edit cannot silently change a figure
  -- that has already been reported.
  total_gross   numeric(14,2),
  total_net     numeric(14,2),
  total_tax     numeric(14,2),
  total_ni_employee numeric(14,2),
  total_ni_employer numeric(14,2),
  total_pension_employee numeric(14,2),
  total_pension_employer numeric(14,2),
  employee_count int,

  calculated_at timestamptz,
  calculated_by uuid references profiles(id) on delete set null,
  approved_at   timestamptz,
  approved_by   uuid references profiles(id) on delete set null,
  -- Real Time Information submission reference, when FPS is implemented.
  rti_submitted_at timestamptz,
  rti_reference text,

  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (tenant_id, period_label, pay_frequency),
  constraint payroll_window check (period_end >= period_start),
  constraint approval_has_actor check (
    status in ('draft','calculated','cancelled') or
    (approved_by is not null and approved_at is not null)
  )
);

create trigger payroll_runs_touch before update on payroll_runs
  for each row execute function app.touch_updated_at();

create index payroll_runs_tenant on payroll_runs (tenant_id, pay_date desc);

alter table expenses
  add constraint expenses_run_fk
  foreign key (paid_in_run) references payroll_runs(id) on delete set null;

-- ============================================================ payroll lines
create table payroll_lines (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  run_id        uuid not null references payroll_runs(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete restrict,

  -- Denormalised deliberately. A payslip must still read correctly after the
  -- employee's name, department or tax code changes, and after they leave.
  employee_ref  text not null,
  employee_name text not null,
  tax_code      text,
  ni_category   text,

  -- Inputs
  basic_pay     numeric(12,2) not null default 0,
  overtime_pay  numeric(12,2) not null default 0,
  bonus         numeric(12,2) not null default 0,
  commission    numeric(12,2) not null default 0,
  expenses_reimbursed numeric(12,2) not null default 0,
  other_additions jsonb not null default '[]'::jsonb,

  -- Statutory payments, which are taxable but calculated separately
  ssp           numeric(12,2) not null default 0,
  smp           numeric(12,2) not null default 0,
  other_statutory numeric(12,2) not null default 0,

  gross_pay     numeric(12,2) not null,
  -- Gross less salary-sacrifice pension. Tax is charged on this, NI on a
  -- different figure — which is precisely why both are stored rather than
  -- recomputed from gross downstream.
  taxable_pay   numeric(12,2) not null,
  niable_pay    numeric(12,2) not null,

  income_tax    numeric(12,2) not null default 0,
  ni_employee   numeric(12,2) not null default 0,
  ni_employer   numeric(12,2) not null default 0,
  pension_employee numeric(12,2) not null default 0,
  pension_employer numeric(12,2) not null default 0,
  student_loan  numeric(12,2) not null default 0,
  postgrad_loan numeric(12,2) not null default 0,
  other_deductions jsonb not null default '[]'::jsonb,

  net_pay       numeric(12,2) not null,

  -- Year-to-date figures as at this line. Needed for a cumulative-basis
  -- calculation and for the P60.
  ytd_gross     numeric(14,2),
  ytd_tax       numeric(14,2),
  ytd_ni_employee numeric(14,2),
  ytd_pension_employee numeric(14,2),

  -- Which engine computed this. When a rate is corrected, this identifies
  -- exactly which lines predate the fix.
  engine_version text not null,
  tax_year_label text not null,
  calculation_basis text not null default 'annualised'
    check (calculation_basis in ('annualised','cumulative','week1_month1')),

  payslip_key   text,                    -- generated PDF in storage
  created_at    timestamptz not null default now(),

  unique (run_id, employee_id),
  -- Net cannot exceed gross. A simple check, and it has caught real sign
  -- errors in pension handling.
  constraint net_within_gross check (net_pay <= gross_pay + expenses_reimbursed)
);

create index payroll_lines_run on payroll_lines (run_id);
create index payroll_lines_employee on payroll_lines (employee_id, created_at desc);

-- Immutability, enforced rather than documented. Once a run is approved its
-- lines are frozen; a correction is a new line in a later run.
create or replace function app.block_approved_payroll_edit() returns trigger
language plpgsql as $$
declare run_status text;
begin
  select status into run_status from payroll_runs
   where id = coalesce(new.run_id, old.run_id);
  if run_status in ('approved','submitted','paid') then
    raise exception
      'payroll_lines are immutable once the run is approved (run status: %). Issue a correction in a later run.',
      run_status;
  end if;
  return coalesce(new, old);
end $$;

create trigger payroll_lines_immutable
  before update or delete on payroll_lines
  for each row execute function app.block_approved_payroll_edit();

commit;
