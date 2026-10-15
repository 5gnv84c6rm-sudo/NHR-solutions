# NHR Solution — Production Backend Specification

**Version 1.0 · 15 September 2026 · for developer handover**

This describes the backend the existing frontend prototype needs in order to become a real product. Every table, endpoint and rule below is derived from behaviour the prototype already implements — nothing here is speculative. Where the prototype fakes something (localStorage, no auth, no email), this document says what replaces it.

Read `ui_kits/app/*Store.js` alongside this. Those files are the de facto data model; this spec is their server-side counterpart.

---

## 1. Architecture

```
app.nhrsolution.co.uk      React SPA (the prototype, built)
api.nhrsolution.co.uk      REST API (to build)
                           PostgreSQL 16 · Redis · S3-compatible object store
                           Background worker (queue) for email, exports, webhooks
```

**Single database, row-level tenancy.** Every table carries `tenant_id`. A shared schema with enforced tenancy is simpler to operate than schema-per-tenant and scales to the target market (UK SMEs, up to ~5,000 employees per tenant). Enforce it in Postgres with row-level security, not only in application code — an ORM mistake should fail closed.

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Set `app.tenant_id` from the authenticated token at the start of every request transaction.

**Data residency:** UK or EEA only. This is stated in the privacy policy and the data protection terms, so it is a contractual commitment, not a preference.

---

## 2. Authentication and authorisation

### 2.1 Sessions

Replace the prototype's `authStore.js` with:

- **Password login** — Argon2id hashing (not bcrypt; memory-hard matters for stolen-database scenarios). Minimum 12 characters, checked against a breached-password list. No composition rules and no forced rotation — both push users toward weaker, reused passwords.
- **Session tokens** — opaque random 256-bit, stored server-side in Redis, sent as `Secure; HttpOnly; SameSite=Lax` cookie. Not JWT: HR sessions must be revocable the instant someone is dismissed, and a stateless token cannot be.
- **Absolute expiry** 12 hours, idle expiry 60 minutes. Payroll and Documents require re-authentication if the session is older than 30 minutes.
- **MFA** — TOTP, mandatory for any user with `payroll.read` or `settings.write`. Recovery codes issued once, hashed at rest.
- **SSO** — SAML 2.0 and OIDC for the Microsoft 365 / Google Workspace integrations. Enterprise plan only.

### 2.2 Roles

The prototype's four roles are correct and should be preserved exactly, because every screen has been built and tested against them:

| Role | Scope |
|---|---|
| `super_admin` | Everything in the tenant, including billing and user management |
| `hr_admin` | All employees, all modules; no billing |
| `manager` | Direct reports only; no payroll, no company documents |
| `employee` | Own record only; can submit leave, expenses, timesheets |

Permissions are checked server-side on every request. The frontend's `EmployeeStore.can()` is a convenience for hiding UI — it is **not** a security boundary and must never be treated as one.

**Permission keys** (as used by the prototype): `employees.read.all`, `employees.read.team`, `employees.read.self`, `employees.write`, `payroll.read`, `payroll.write`, `documents.read.company`, `settings.write`, `billing.write`, `reports.read`.

### 2.3 The rule that matters most

**A report must never reveal what the source module hides.** The Reports and Analytics module enforces this in the frontend; the API must enforce it in the query layer. Practically:

- A request without `payroll.read` must not have salary columns *calculated*, not merely filtered from the response. If the value never enters the result set it cannot leak through an export, an error message or a log line.
- Wellbeing aggregates return `null` below the minimum group size (5 responses). Implement this in the SQL (`HAVING count(*) >= 5`), so no code path can bypass it.
- Manager scope is a join on the reporting line, applied at the query level.

---

## 3. Database schema

Abbreviated to columns the frontend actually reads or writes. All tables have `id uuid primary key default gen_random_uuid()`, `tenant_id uuid not null`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.

### 3.1 Core

```sql
tenants(
  name text not null, slug text unique not null,
  plan text not null,                    -- starter|professional|business|enterprise
  employee_limit int, trial_ends_at timestamptz,
  nation text not null default 'England & Wales',  -- drives bank holidays
  status text not null default 'active'  -- active|suspended|cancelled
)

users(
  email citext not null, password_hash text, role text not null,
  employee_id uuid references employees(id),   -- null for admins with no record
  mfa_secret text, mfa_enabled bool default false,
  last_login_at timestamptz, failed_attempts int default 0, locked_until timestamptz,
  unique(tenant_id, email)
)

employees(
  employee_ref text not null,             -- NHR-000101, unique per tenant
  first_name text not null, last_name text not null,
  email citext, phone text, date_of_birth date,
  job_title text, department text, location text,
  employment_type text,                   -- full-time|part-time|temporary|casual|contractor
  employment_status text,                 -- active|probation|notice|leaver
  start_date date, probation_end_date date, end_date date,
  hours_per_week numeric(4,1), manager_id uuid references employees(id),
  right_to_work_status text, right_to_work_expires_at date,
  ni_number text,                         -- encrypted at rest
  archived bool default false, archived_at timestamptz,
  unique(tenant_id, employee_ref)
)
```

`employees.archived = true` **is** the leaver state — the prototype's turnover calculation depends on this. Do not hard-delete employees: statutory retention requires the record, and turnover history breaks without it.

### 3.2 Per-employee records

Each mirrors a collection in `employeeRecords.js`. All carry `employee_id uuid not null references employees(id)`.

```sql
employee_pay(              -- separate table, separate permission
  salary numeric(10,2), pay_frequency text, pension_scheme text,
  pension_employee_pct numeric(4,2), pension_employer_pct numeric(4,2),
  tax_code text, bank_account_name text,
  bank_sort_code text,     -- encrypted
  bank_account_number text -- encrypted
)

timesheet(date date not null, clock_in time, clock_out time,
  break_mins int default 0, hours numeric(4,2),
  status text, note text, approved bool,
  approved_by uuid references users(id), approved_at timestamptz,
  unique(employee_id, date))

leave_requests(type text not null, start_date date not null, end_date date not null,
  days numeric(4,1) not null, status text not null default 'pending',
  reason text, requested_at timestamptz, decided_by uuid, decided_at timestamptz)

absences(start_date date not null, end_date date, days numeric(4,1),
  reason text,                            -- special category data
  self_certified bool, fit_note bool,
  return_to_work jsonb, note text)

documents(name text not null, category text, file_key text not null,
  size_bytes bigint, mime_type text,
  expires_at date, uploaded_by uuid, signed_at timestamptz,
  scope text not null default 'employee') -- employee|company

training(course text not null, category text, status text,
  assigned_at date, due_at date, completed_at date,
  certificate_id text, expires_at date, renew_every int)

goals(title text not null, measure text, due date,
  progress int default 0, status text)

reviews(type text not null, review_date date, reviewer text,
  status text, rating text, summary text, completed_at date)

expenses(claim_date date not null, category text, description text,
  amount numeric(10,2) not null, receipt_key text,
  status text default 'pending', decided_by uuid, decided_at timestamptz)

shifts(shift_date date not null, start_time time, end_time time,
  role text, location text, published bool default false)
```

### 3.3 Company-wide

```sql
vacancies(title text, department text, location text, employment_type text,
  salary_min numeric, salary_max numeric, status text, opened_at date, closed_at date)

candidates(vacancy_id uuid references vacancies(id),
  first_name text, last_name text, email citext, phone text,
  stage text, source text, rating int, cv_key text,
  applied_at date, moved_at date,
  retain_until date not null)   -- see §7 retention

incidents(reference text not null, incident_type text, category text,
  severity text, location text, description text, incident_date date,
  employee_id uuid references employees(id), reported_by uuid,
  days_off int default 0, diagnosed bool, hospitalised_non_worker bool,
  investigation jsonb, riddor_reported bool default false, riddor_reported_at date)

incident_actions(incident_id uuid not null references incidents(id),
  title text, owner text, due_date date, status text, completed_at date)

risk_assessments(reference text, title text, location text, category text,
  likelihood int, severity int, controls text,
  residual_likelihood int, residual_severity int,
  assessor text, reviewed_at date, review_every int default 365, status text)

wellbeing_checkins(            -- NO employee_id, by design
  department text, week_of date,
  workload int, support int, balance int, morale int,
  comment text)

adjustments(employee_id uuid, category text, description text,
  agreed_date date, review_date date, status text)
  -- records WHAT, never WHY: no diagnosis field exists

courses(code text, title text, category text, minutes int,
  summary text, lessons jsonb, quiz jsonb, published bool)

enrolments(employee_id uuid, course_id uuid,
  lessons_complete jsonb, attempts int default 0,
  best_score int, passed bool, started_at date, completed_at date,
  unique(employee_id, course_id))

activity_log(employee_id uuid, actor_id uuid,
  action text not null, occurred_at timestamptz not null default now())

audit_log(actor_id uuid, action text not null, entity_type text, entity_id uuid,
  before jsonb, after jsonb, ip inet, user_agent text,
  occurred_at timestamptz not null default now())
```

**`wellbeing_checkins` has no employee reference and must never gain one.** The prototype guarantees anonymity structurally rather than by policy, and the privacy notice states it. Adding a foreign key later would be a breaking change to a published commitment.

**`adjustments` deliberately has no diagnosis or condition field.** A manager needs to know someone starts at 10am, not why. Same reasoning.

### 3.4 Indexes

```sql
CREATE INDEX ON employees(tenant_id, archived, department);
CREATE INDEX ON employees(tenant_id, manager_id);          -- manager scope
CREATE INDEX ON timesheet(employee_id, date DESC);
CREATE INDEX ON leave_requests(employee_id, status, start_date);
CREATE INDEX ON leave_requests(tenant_id, status) WHERE status = 'pending';
CREATE INDEX ON documents(tenant_id, expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX ON training(employee_id, course, expires_at);
CREATE INDEX ON audit_log(tenant_id, occurred_at DESC);
```

The partial indexes matter: the dashboard's "pending approvals" and "expiring documents" counts run on every page load.

---

## 4. API

REST over HTTPS. JSON request and response bodies. `/v1` prefix. Cursor pagination (`?cursor=&limit=`, max 100) — offset pagination drifts when records are inserted mid-list, which happens constantly in a live HR system.

### 4.1 Conventions

```
Authorization: Bearer <token>      or session cookie
Idempotency-Key: <uuid>            required on POST that creates money or records
X-Request-Id: <uuid>               echoed in responses and logs
```

Errors use a single shape. Field errors must be per-field, because the frontend renders them inline:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some fields need attention.",
    "fields": { "email": "Enter a valid email address." },
    "request_id": "..."
  }
}
```

Codes: `unauthenticated` 401, `forbidden` 403, `not_found` 404, `validation_failed` 422, `conflict` 409, `rate_limited` 429, `plan_limit_reached` 402, `internal` 500.

### 4.2 Endpoints

**Auth**
```
POST   /v1/auth/login                 email, password → session + mfa_required
POST   /v1/auth/mfa/verify            code → session
POST   /v1/auth/logout
POST   /v1/auth/password/forgot       always 202, never reveals whether the email exists
POST   /v1/auth/password/reset        token, new_password
GET    /v1/auth/me                    user, role, permissions[], tenant, plan
```

**Employees**
```
GET    /v1/employees                  ?q=&department=&status=&type=&sort=&cursor=
POST   /v1/employees
GET    /v1/employees/:id
PATCH  /v1/employees/:id
POST   /v1/employees/:id/archive      body: end_date, reason
POST   /v1/employees/import           multipart CSV → { job_id }
GET    /v1/employees/import/:job_id   { status, processed, total, errors[] }
GET    /v1/employees/export           ?format=csv → 202 + job, or 200 stream if small
```

`GET /v1/employees` applies role scope server-side. A manager receives their reports; an employee receives a single record. The endpoint does not accept a "scope" parameter — scope is derived from the token, never requested.

**Per-employee collections** — uniform shape, which keeps the client simple:
```
GET    /v1/employees/:id/{collection}
POST   /v1/employees/:id/{collection}
PATCH  /v1/employees/:id/{collection}/:record_id
DELETE /v1/employees/:id/{collection}/:record_id
```
where `{collection}` ∈ `timesheet | leave | absences | documents | training | goals | reviews | expenses | shifts | notes`.

**Computed reads** — these must be server-side, because the frontend currently derives them and two implementations will diverge:
```
GET    /v1/employees/:id/leave-balance    entitlement, taken, booked, remaining, carried_over
GET    /v1/employees/:id/bradford         score, spells, days, band
GET    /v1/employees/:id/attendance-summary
```

**Approvals**
```
GET    /v1/approvals                  everything awaiting this user, across modules
POST   /v1/leave/:id/decision         { decision: approve|reject, note }
POST   /v1/expenses/:id/decision
POST   /v1/timesheet/:id/approve
POST   /v1/approvals/bulk             { type, ids[], decision }
```

**Payroll** — every route requires `payroll.read`, write routes `payroll.write`:
```
GET    /v1/payroll/periods
POST   /v1/payroll/runs               { period } → draft run
GET    /v1/payroll/runs/:id           lines, gross, deductions, net, employer cost
POST   /v1/payroll/runs/:id/approve   locks the run
GET    /v1/payroll/runs/:id/payslips  ?employee_id=
```

**Health & Safety**
```
GET    /v1/incidents                  ?riddor_due=true
POST   /v1/incidents                  returns riddor: { reportable, deadline_days, reason }
PATCH  /v1/incidents/:id
POST   /v1/incidents/:id/riddor-reported
GET    /v1/risk-assessments           POST, PATCH, POST :id/review
```

The RIDDOR determination is **server-side and derived**, never a client-supplied flag. See §6.

**Reports**
```
GET    /v1/reports                    available to this role
POST   /v1/reports/:key/run           { filters } → rows (or job for large sets)
GET    /v1/reports/:key/export        ?format=csv
GET    /v1/analytics/dashboard        the dashboard's figures in one call
```

`GET /v1/analytics/dashboard` exists so the dashboard is one request rather than fourteen. It is the single most-called endpoint; cache it in Redis for 60 seconds per tenant, invalidated on any write to a contributing table.

**Other**
```
GET    /v1/courses                    /v1/courses/:id/submit-quiz
GET    /v1/wellbeing/checkins         aggregate only, suppressed below 5
POST   /v1/wellbeing/checkins         anonymous, no employee_id accepted
GET    /v1/integrations               POST :key/connect, DELETE :key
GET    /v1/api-keys                   POST, DELETE :id
GET    /v1/webhooks                   POST, PATCH :id, DELETE :id, POST :id/test
GET    /v1/billing/subscription       POST /v1/billing/checkout-session
POST   /v1/enquiries                  public, rate-limited — contact form
POST   /v1/demo-bookings              public, rate-limited — demo form
```

### 4.3 Rate limits

| Scope | Limit |
|---|---|
| Login per IP | 10 / 15 min, then exponential backoff |
| Login per account | 5 failures → 15 min lock |
| Public forms | 5 / hour / IP |
| Authenticated API | 600 / min / tenant |
| Exports | 10 / hour / tenant |
| Webhook deliveries | 100 / min / endpoint |

---

## 5. Business logic that must move server-side

The prototype implements these correctly in JavaScript. They are the product's actual value and must be reimplemented server-side, with the client calling the API rather than calculating locally. Where both exist, **the server is authoritative**.

### 5.1 Holiday entitlement

Statutory minimum is 5.6 weeks (28 days for a 5-day week), and may include bank holidays. Part-time is pro-rated on days worked per week. First-year accrual is 1/12 of the annual entitlement at the start of each month.

Irregular-hours and part-year workers accrue at **12.07%** of hours worked, for leave years beginning on or after 1 April 2024. Rolled-up holiday pay is permitted for those workers only.

### 5.2 Working days

Exclude weekends and the bank holidays for the tenant's nation. England & Wales, Scotland and Northern Ireland differ — the prototype already stores nation per tenant for this reason. Do not hardcode England.

### 5.3 Bradford Factor

`score = spells² × total_days`, over a rolling 52 weeks. Bands are a trigger for a conversation, not grounds for action, and the API response should carry that caveat text so no client invents its own.

### 5.4 Pay calculation (2025/26)

Income tax, National Insurance and pension must be calculated in this order: pension first (salary-sacrifice or net-pay arrangement changes taxable pay), then tax, then NI. Getting the order wrong is the most common payroll bug.

Bands are **configuration, not code** — they change every April, and Scotland has its own rates. Store them in a `tax_years` table with an effective date. The prototype's calculators are the reference implementation.

### 5.5 RIDDOR reportability

Derived from severity, incident type, days off and whether a non-worker went to hospital:

| Condition | Reportable | Deadline |
|---|---|---|
| Death | Yes | Without delay, report within 10 days |
| Specified injury | Yes | 10 days |
| Dangerous occurrence | Yes | 10 days |
| Diagnosed occupational disease | Yes | 10 days |
| Non-worker taken to hospital | Yes | 10 days |
| Over 7 days' incapacity | Yes | 15 days |
| Over 3 days' incapacity | No — record only | — |

Severity is derived from the day count, not chosen by the reporter. The API returns the determination with its reason; the client displays it.

**The platform does not report to the HSE.** Marking a report as sent records that the customer did it. This is stated in the terms and must not change without legal review.

### 5.6 Turnover

`leavers in period ÷ average headcount for the period`. Average headcount, not closing headcount — dividing by today's figure understates turnover in a shrinking business and overstates it in a growing one.

### 5.7 Document and certificate status

Derived from `expires_at` against the current date, never stored. A stored status goes stale silently; a derived one cannot.

---

## 6. Webhooks

The prototype's Integrations module already defines the event list and payload shapes. Implement exactly those:

`employee.created` · `employee.updated` · `employee.archived` · `leave.requested` · `leave.approved` · `absence.recorded` · `expense.submitted` · `expense.approved` · `training.completed` · `incident.reported`

```json
{
  "event": "leave.approved",
  "occurred_at": "2026-09-15T10:42:11Z",
  "tenant": "acme-ltd",
  "data": { "id": "...", "employee_id": "NHR-000101", "type": "Annual leave",
            "start_date": "2026-10-05", "end_date": "2026-10-09",
            "working_days": 5, "status": "Approved" }
}
```

**Signing:** `X-NHR-Signature: t=<unix>,v1=<hex>` where `v1 = HMAC-SHA256(secret, "<t>.<raw_body>")`. Reject timestamps older than 5 minutes to prevent replay. Publish this verification recipe in the developer docs — an unverified webhook endpoint is an open door, and the product already tells customers so.

**Delivery:** queue-backed, at-least-once. Retry at 1m, 5m, 30m, 2h, 12h, then disable the endpoint and email the tenant admin. Record every attempt with status code and duration — the Activity tab already displays this.

**Never include in a payload:** salary, bank details, NI number, absence reasons, HR notes, or wellbeing responses. Webhook endpoints are customer-controlled and frequently less secure than the platform.

---

## 7. Data protection

These are commitments already published in the legal pages, so they are contractual rather than aspirational.

| Data | Retention | Basis |
|---|---|---|
| Website enquiries | 24 months from last contact | Legitimate interests |
| Candidate records | 6 months from decision, then delete | Short by design; `retain_until` is a column so it can be enforced by job, not by memory |
| Employee records | Duration of employment + 6 years | Limitation period for employment claims |
| Payroll records | 6 years after the tax year | HMRC requirement (minimum 3, 6 is safer) |
| Working time records | 2 years | Working Time Regulations |
| Accident records | 3 years from the entry | RIDDOR |
| Tenant data after cancellation | 30 days retrieval, then delete | Stated in terms |
| Backups | 35 days rolling | Deletion completes within this window |
| Audit log | 7 years | Append-only, never deleted by tenant action |

**Encryption:** TLS 1.3 in transit. At rest, whole-database encryption plus application-level encryption for `ni_number`, `bank_sort_code`, `bank_account_number` using envelope encryption with a KMS-managed key. Those three fields are the ones where a database dump alone should not be enough.

**Subject access requests:** `GET /v1/employees/:id/data-export` returns everything held about one person as a machine-readable bundle. The statutory deadline is one month from when the request reaches *anyone* at the organisation, so this must be self-service for the tenant rather than a support ticket.

**Deletion:** soft-delete with `deleted_at`, hard-deleted by a scheduled job after the retention period. Never expose hard delete through the API — an accidental cascade across an HR system is unrecoverable.

**Article 22:** no endpoint may take an adverse decision about an individual automatically. Bradford scores, performance ratings and AI insights are inputs to a human decision. The API should record which user made each decision (`decided_by` on every decision table) precisely so this is demonstrable.

---

## 8. AI features

`NHR Intelligence` in the prototype is given aggregate figures only. Preserve that:

```
POST /v1/intelligence/ask     { question } → { answer, context_used, generated_by }
GET  /v1/intelligence/context the exact snapshot the model receives
```

- The context is built server-side from the caller's permitted scope. Payroll figures are omitted entirely without `payroll.read` — not filtered from the answer, omitted from the prompt.
- Individual records, HR notes, absence reasons and wellbeing responses are never included.
- `GET /v1/intelligence/context` is deliberately public to the tenant. An assistant whose inputs cannot be inspected cannot be audited.
- Responses are labelled as AI generated. Log every question and the context hash for audit.
- Prompt injection: treat all model output as untrusted text. Never let it drive an action, a query, or a permission decision.

---

## 9. Email

Transactional only, via a provider with a UK/EEA option. Queue-backed with retry.

Required: welcome and set-password, password reset, MFA enrolment, leave decision, expense decision, document expiry (30/7/1 days), training assignment and expiry, probation review due, RIDDOR deadline warning, webhook endpoint disabled, invoice and payment failure, enquiry and demo confirmations.

Every email must honour the tenant's sending domain with SPF, DKIM and DMARC configured. Notification preferences per user, stored server-side — an HR system that cannot be turned down gets filtered to spam, and then the important ones are missed too.

---

## 10. Observability and operations

- **Structured JSON logs** with `request_id`, `tenant_id`, `user_id`, route, duration, status. **Never log** request bodies on payroll, documents or auth routes.
- **Metrics:** p50/p95/p99 latency per route, error rate, queue depth and age, webhook delivery success rate, login failure rate.
- **Alerts:** error rate above 1% for 5 minutes; queue age above 10 minutes; any 5xx on payroll or auth; failed backup; certificate expiring within 14 days.
- **Backups:** continuous WAL archiving plus nightly snapshots, 35-day retention, restore tested monthly. An untested backup is not a backup.
- **Migrations:** forward-only, reversible, reviewed. No migration that drops a column in the same release that stops writing to it — two releases, so a rollback is survivable.

---

## 11. Build order

The prototype is complete, so the backend can be built behind it incrementally. This order keeps the product usable at every step:

1. **Tenancy, auth, users, employees** — with RLS from the first migration, not retrofitted
2. **Employee collections + computed reads** — leave balance, Bradford, attendance summary
3. **Approvals** — leave, expenses, timesheets; the highest-frequency daily action
4. **Documents** — object storage, signed URLs, expiry jobs
5. **Payroll** — behind a feature flag until verified against a real bureau's output
6. **Training, Health & Safety, Performance, Recruitment, Wellbeing**
7. **Reports and the dashboard aggregate endpoint**
8. **Webhooks, API keys, integrations**
9. **AI assistant**
10. **Billing and self-service plan changes**

### Known gaps in the prototype that need product decisions before build

- **No approval chains.** Approval is single-step. Multi-step (manager then HR) is a schema change, so decide now if it is needed.
- **No document e-signature.** `signed_at` exists but nothing sets it.
- **Payroll is illustrative.** Employer cost uses a flat 15% for NI and pension. Real rates and a real bureau reconciliation are required before anyone relies on a figure.
- **No timesheet geofencing or photo clock-in.** The schema supports it; there is no UI and no decision on whether it is wanted. Note that location monitoring triggers a DPIA.
- **No employee self-service portal separate from the admin app.** The `employee` role restricts the same app. That works, but a phone-first portal would likely serve better.

---

## 12. Before launch

- [ ] Independent penetration test, including tenancy isolation and permission escalation
- [ ] Legal review of all five documents in `legal.html` — currently marked draft, version 0.9
- [ ] DPIA covering attendance monitoring and the AI assistant
- [ ] Processor agreements with every sub-processor, and a published list
- [ ] Payroll output reconciled against a bureau for at least two full periods
- [ ] Restore from backup, timed and documented
- [ ] Accessibility audit — the statement lists known gaps honestly and they should be closed
- [ ] Remove the prototype's demo data seeding and the role switcher from production builds

---

*Written against the NHR Solution prototype at 15 September 2026. Every rule here reflects behaviour the frontend already implements — where this document and the prototype disagree, the prototype is the specification and this document has drifted.*
