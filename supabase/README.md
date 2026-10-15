# NHR Solution — Supabase backend

The database layer for the production application. **51 tables, 5 derived
views, 5 storage buckets, RLS on everything.**

Ported from the working prototype in `ui_kits/`, which stays the reference
implementation: same 12 employees, same figures, same calculation results. If
a screen disagrees with the prototype after migration, the migration is wrong.

---

## What is here

| File | Contents |
|---|---|
| `migrations/0001_foundation.sql` | Extensions, `app` schema, JWT helpers, enums, tenants, profiles, audit log, UK tax years and bank holidays |
| `migrations/0002_employees.sql` | Employees, pay, addresses, emergency contacts, documents, acknowledgements, notes, activity |
| `migrations/0003_time_and_absence.sql` | Leave, absences, timesheet, shifts, availability |
| `migrations/0004_money.sql` | Expenses, payroll runs, payroll lines (immutable once approved) |
| `migrations/0005_compliance.sql` | Incidents, corrective actions, risk assessments, training matrix, goals, reviews |
| `migrations/0006_talent_and_wellbeing.sql` | Vacancies, candidates, interviews, courses, enrolments, wellbeing, adjustments |
| `migrations/0007_content_and_integrations.sql` | Policies, resources, stories, help articles, tickets, API keys, webhooks, sync log, enquiries, demos |
| `migrations/0008_rls_policies.sql` | Every policy, column grants, and a completeness assertion |
| `migrations/0009_functions_and_views.sql` | Access token hook, working days, leave balance, Bradford, RIDDOR, derived-status views, dashboard aggregate, cron jobs |
| `migrations/0010_storage.sql` | Five private buckets and their policies |
| `seed.sql` | 2025/26 tax data for rUK and Scotland, 2026 bank holidays for all three nations, demo tenant with the prototype's 12 employees |

## Running it

```bash
npm i -g supabase
supabase init
supabase start            # local Postgres, Auth, Storage, Studio
supabase db reset         # applies migrations, then seed.sql
```

Studio at `http://localhost:54323`. Connection string from `supabase status`.

For a hosted project:

```bash
supabase link --project-ref <ref>
supabase db push
```

**Pick London (`eu-west-2`) at project creation.** The privacy policy and data
protection terms in `ui_kits/website/legal.html` commit to UK or EEA
residency, and the region cannot be changed afterwards.

## Two pieces of setup the SQL cannot do

**1. Register the access token hook.** Dashboard → Authentication → Hooks →
Custom Access Token → `app.custom_access_token`.

Until this is done every JWT lacks `tenant_id`, `app.current_tenant()` returns
null, and **every policy denies everything**. The app will look completely
broken rather than partially broken, which is the intended failure mode.

**2. Create auth users and link profiles.** Instructions at the foot of
`seed.sql`. Create three — super admin, manager, employee — and sign in as
each. The prototype's role switcher proved the UI; only real logins prove the
boundary.

---

## The five decisions worth understanding

**Tenancy is a JWT claim, not a query filter.** `app.current_tenant()` reads
`app_metadata.tenant_id` from the token. It raises rather than returning null,
because a null tenant against a permissive policy matches every row in the
table.

**Role scoping lives in one function.** `app.visible_employee_ids()` is the
whole model — admins see everyone, managers see direct reports plus
themselves, employees see themselves. Every employee-owned table joins to it,
so the rule cannot drift between tables. Change it once and leave, absence,
timesheet, expenses, training, goals and reviews all follow.

**Payroll returns no rows without permission.** Not a filtered response, not
nulls — the policy excludes the rows and the column grants exclude the
encrypted fields. `app.dashboard_summary()` omits the payroll keys entirely,
so a client cannot distinguish "no permission" from "zero".

**Wellbeing has no select policy at all.** `wellbeing_checkins` is
insert-only for everyone, including super admins. The only read path is
`v_wellbeing_by_team`, which enforces `having count(*) >= min_group` in the
database. Without this an admin could read raw rows, cross-reference
timestamps against who was online, and de-anonymise a response — and
anonymity that depends on nobody looking is not anonymity. The table has no
`employee_id` and must never gain one.

**Nobody approves their own request.** Every decision policy carries
`employee_id <> app.current_employee()`. Self-approval is the hole every
approval system grows if it is not closed explicitly.

## What is derived, never stored

Anything that is a function of today's date. A stored status is wrong by the
following morning and nobody notices.

- Document and certificate status → `v_document_status`, `v_training_status`
- Risk banding and review overdue → `v_risk_assessment_status`
- RIDDOR reportability → `app.riddor()`, which returns the reason as well as
  the answer, because "the system said so" is not a defensible basis for
  reporting or for not reporting
- Leave entitlement and balance → `app.leave_balance()`, with the 12.07%
  accrual branch for irregular-hours and part-year workers
- Bradford score and band → `app.bradford()`

Stored deliberately: `leave_requests.working_days`, because it is the figure
agreed at booking. If a bank holiday is added to the calendar later, an
approved request must not silently change length.

## Still to build, and where

**Edge Functions** (`supabase/functions/`, TypeScript). Cannot live in this
project — the design-system compiler sweeps every `.ts` file into a browser
bundle, which is what broke the preview during Phase 0. They belong in the
application repository.

| Function | Why not SQL |
|---|---|
| `payroll-calculate` | Gross-to-net: pension before tax, then NI on a different figure. Ports from `ui_kits/app/payrollEngine.js`. PL/pgSQL payroll is possible and horrible to maintain. |
| `payroll-payslips` | PDF generation, writes to the `payslips` bucket under the service role |
| `quiz-submit` | Marks an attempt and writes the pass to `employee_training`. Server-side because a client that can mark itself passed will. |
| `csv-import` | Row-level validation with a per-row error report |
| `webhook-dispatch` | HMAC signing, exponential backoff, circuit breaking |
| `send-email` | Approval notifications, expiry reminders, invitations |
| `intelligence-context` | Builds the assistant's snapshot from permitted scope only |

**Queue table.** `pg_cron` covers time-driven work (right-to-work expiry,
retention, the webhook circuit breaker — all in 0009). Retryable outbound
work still needs a `jobs` table and a worker.

**HMRC RTI.** Full Payment Submission is a separate project with its own
recognition process. `payroll_runs.rti_reference` is the placeholder.

## Verifying the policies

The assertion at the end of `0008` fails the migration if any public table
lacks RLS — so the next table someone adds cannot be silently world-readable.

Beyond that, test by signing in as each role rather than by reading the SQL:

```sql
-- As a manager, should return only direct reports plus self
select employee_ref, first_name, last_name from employees;

-- As a manager, should return zero rows
select * from employee_pay where employee_id <> app.current_employee();

-- As anyone, should return zero rows — there is no select policy
select * from wellbeing_checkins;

-- As anyone in a small tenant, should return zero rows (under threshold)
select * from v_wellbeing_by_team;
```

The third and fourth are the ones to check first. They are the promises that
matter most and the easiest to break with a well-meaning "just add a view".

### Cross-tenant isolation

The seed creates two companies so this can be tested rather than assumed:

| | Northgate Services | Bridgeview Care Group |
|---|---|---|
| Employees | 12 | 4 |
| Nation | England & Wales | Scotland |
| Leave year | 1 January | 1 April |
| Roles present | admin, HR, manager, employee | admin, HR, employee |
| Tax codes | `1257L` | `S1257L` |

Bridgeview differs deliberately on every axis that could hide a bug: a
different nation means different bank holidays and different tax bands, so the
same leave request is a different number of working days; a 1 April leave year
means `app.leave_balance()` cannot assume January; and no manager role at all
confirms roles are per user rather than a required set.

```sql
-- Signed in as a Northgate admin. Must return 12, never 16.
select count(*) from employees;

-- Must return zero rows, not a permission error — the rows do not exist
-- as far as this session is concerned.
select * from employees where employee_ref like 'BVW-%';
```

If either returns a Bridgeview row the tenancy model is broken, and nothing
else in the system can be trusted until it is fixed.
