# Handoff: NHR Solution — HR, payroll and compliance platform

For a developer picking this up in Claude Code. Written to be self-sufficient:
you should not need the conversation that produced it.

---

## 1. What this is

**NHR Solution** is a UK HR, payroll and compliance SaaS product: a marketing
website plus a working platform application covering employees, leave,
absence, attendance, rotas, payroll, documents, performance, expenses,
recruitment, health & safety, training, eLearning, wellbeing, reports and an
AI layer.

The repository contains three things, at three different levels of maturity:

| | What | Status |
|---|---|---|
| `ui_kits/` | 33 HTML prototype pages + ~90 JSX modules | **Working prototype.** Runs in a browser with no build step. This is the design and behaviour reference. |
| `supabase/` | 11 SQL migrations, seed, RLS policies, 3 handover docs | **Production-intent.** Written to be deployed as-is. |
| `apps/`, `packages/` | Monorepo scaffold | **Skeleton only.** Structure and config; almost no implementation. |

**Your job is to build the real application from the prototype, on the
database that already exists.** Not to ship the HTML.

---

## 2. Read these first, in this order

1. **`supabase/README.md`** — the database layer. 51 tables, the five security
   decisions, what is derived vs stored, and the two setup steps SQL cannot do.
   Nothing else makes sense before this.
2. **`supabase/MIGRATING_ADD_EMPLOYEE.md`** — one store converted from
   localStorage to Supabase in four steps. **This is the pattern for the other
   eleven.** Follow it literally the first time.
3. **`supabase/SIGNUP_FLOW.md`** — the only flow that runs before a tenant
   exists, and therefore the only one RLS cannot protect.
4. **`BACKEND_SPEC.md`** — the original specification. Useful for intent;
   superseded by `supabase/` wherever the two disagree, because the SQL was
   written against the actual prototype and the spec was not.
5. **`ui_kits/app/README.md`** and **`ui_kits/website/README.md`** — what each
   prototype file does.

---

## 3. The prototype: what it is and is not

**It is a design reference and a behaviour specification.** Every screen runs,
every form submits, every calculation is real. Open
`ui_kits/preview.html` in a browser — no server, no build — and click through
all 33 pages.

**It is not production code.** React 18 loads from a CDN as UMD globals, JSX is
transpiled in the browser by Babel standalone, modules communicate through
`window` globals, and there is no bundler. `ui_kits/app/index.html` loads 72
script tags. That was the right trade for building 20 modules quickly; it is
unshippable.

**Fidelity: high.** Final colours, typography, spacing, interaction states and
copy. Recreate it pixel-accurately using the target stack's own libraries.
Do not redesign it on the way through.

### Reuse this, don't rewrite it

- **`tokens/*.css`** — 9 files of CSS custom properties: colours, typography,
  spacing, radius, motion, effects, and the light/dark theme mapping. Copy
  across unchanged.
- **`components/`** — the design system: `core/`, `app/`, `forms/`,
  `marketing/`. Real React components with `.d.ts` files. Port as-is.
- **`styles.css`** — the global stylesheet that imports the tokens.

### Rebuild this

Everything in `ui_kits/app/*.jsx` and `ui_kits/website/*.jsx`. The markup and
logic are correct; the module system, the data layer and the build are not.

---

## 4. The database is the finished part

`supabase/migrations/0001` … `0011`. Run:

```bash
npm i -g supabase
supabase init && supabase start
supabase db reset          # migrations + seed
```

**51 tables, 5 derived views, 5 private storage buckets, RLS on every table.**

Five decisions you must not undo:

1. **Tenancy is a JWT claim, not a query filter.** `app.current_tenant()` reads
   `app_metadata.tenant_id` from the token and raises on absence — a null
   tenant against a permissive policy matches every row.
2. **Role scoping lives in one function.** `app.visible_employee_ids()` is the
   whole model: admins see everyone, managers see direct reports plus
   themselves, employees see themselves. Every employee-owned table joins to
   it. Change it once and all eleven modules follow.
3. **Payroll returns no rows without permission** — not nulls, not a filtered
   response. Column grants also exclude the encrypted fields, and
   `app.dashboard_summary()` omits the payroll keys entirely so a client
   cannot distinguish "no permission" from "zero".
4. **`wellbeing_checkins` has no select policy at all.** Insert-only for
   everyone including super admins. The only read path is
   `v_wellbeing_by_team`, which enforces `having count(*) >= min_group` in the
   database. The table has no `employee_id` and must never gain one.
5. **Nobody approves their own request.** Every decision policy carries
   `employee_id <> app.current_employee()`.

`0008` ends with an assertion that **fails the migration if any public table
lacks RLS**, so the next table added cannot be silently world-readable.

### Two setup steps SQL cannot do

- **Register the access token hook**: Dashboard → Authentication → Hooks →
  Custom Access Token → `app.custom_access_token`. Until this is done every JWT
  lacks `tenant_id` and **every policy denies everything** — the app looks
  completely broken rather than partially broken, which is the intended failure
  mode.
- **Create auth users and link profiles** — instructions at the foot of
  `supabase/seed.sql`. Create three (super admin, manager, employee) and sign
  in as each. The prototype's role switcher proved the UI; only real logins
  prove the boundary.

### Seed data

Two tenants, so cross-tenant isolation can be tested rather than assumed:

| | Northgate Services | Bridgeview Care Group |
|---|---|---|
| Employees | 12 | 4 |
| Nation | England & Wales | Scotland |
| Leave year | 1 January | 1 April |
| Roles present | admin, HR, manager, employee | admin, HR, employee |
| Tax codes | `1257L` | `S1257L` |

Bridgeview differs on every axis that could hide a bug. Signed in as a
Northgate admin, `select count(*) from employees` must return 12, never 16.

Plus real 2025/26 tax data for rUK **and** Scotland (six bands, not three) and
2026 bank holidays for all three nations.

---

## 5. Architecture to build

Settled over the last few turns of the conversation:

```
Marketing site (static)          Platform app (SPA)
        │                                │
        └────────────┬───────────────────┘
                     │
              Node server tier
                     │
                 Supabase
              (Auth, Storage, Postgres + RLS)
```

**The server tier forwards the user's JWT.** Do not give it the service role
as a default credential — that bypasses RLS and moves every permission check
back into application code, which is exactly the failure mode the prototype
had. Service role is for four specific things: tenant provisioning, payroll
calculation, payslip writes, webhook dispatch.

```ts
// per-request client, caller's own permissions
const db = createClient(URL, ANON_KEY, {
  global: { headers: { Authorization: req.headers.authorization } }
});
```

**Connection strings:** use the pooler on port `6543` for application traffic.
Port `5432` is a direct connection that does not pool — a serverless function
or restarting process will exhaust it. Keep `5432` for `supabase db push` and
psql only. Never use the `postgres` superuser from an app server; it bypasses
every policy.

**Region:** pick London (`eu-west-2`) at project creation. The privacy policy
and data protection terms in `ui_kits/website/legal.html` commit to UK/EEA
residency, and the region cannot be changed afterwards.

### Recommended frontend stack

Vite + React 18 + TypeScript, React Router, `@tanstack/react-query` for server
state, `react-hook-form` + Zod (schemas shared with the server via
`packages/shared`), `lucide-react` replacing the CDN icon script.

---

## 6. Implementation plan

**Phase 1 — build tool.** Move `components/` and `tokens/` into the web app.
Convert `window` globals to ES exports, file by file. Replace CDN scripts with
real dependencies. One `index.html` with React Router.

Keep the localStorage stores working throughout. The app then runs at every
commit and you can diff behaviour against the prototype. **Do this as a
strictly mechanical conversion with no feature changes** — so that when
something breaks you know it was the tooling, not a logic edit.

**Phase 2 — database and auth.** Run the migrations. Register the hook.
Replace `authStore.js` with Supabase Auth, keeping its function signatures
(`session()`, `isAuthed()`, `plan()`, `isLocked(module)`) — it was written to
match what a real API would expose.

**Phase 3 — employees.** The vertical slice that proves the pattern. Follow
`MIGRATING_ADD_EMPLOYEE.md` exactly.

**Phase 4 — the eight employee collections.** Port `bradford()`,
`leaveBalance()`, `attendanceSummary()`, holiday accrual and working-day maths
as pure functions, with **unit tests pinned to the values the prototype
produces**. That is your regression net — the reason the prototype is worth
keeping running.

**Phase 5 onwards** — approvals, documents, payroll, then the remaining
modules, then reports and webhooks, then hardening.

Roughly 3–4 weeks with Supabase doing the auth, storage and RLS work.

---

## 7. Edge Functions still to write

None of these can be SQL. They belong in `supabase/functions/`.

| Function | Why not SQL | Port from |
|---|---|---|
| `signup` | Creates the auth user, then provisions atomically | `SIGNUP_FLOW.md` has the full implementation |
| `payroll-calculate` | Gross-to-net: pension before tax, then NI on a different figure | `ui_kits/app/payrollEngine.js` |
| `payroll-payslips` | PDF generation, writes to the `payslips` bucket | — |
| `quiz-submit` | Marks an attempt server-side — a client that can mark itself passed will | `ui_kits/app/learningStore.js` |
| `csv-import` | Row-level validation with a per-row error report | `ui_kits/app/EmployeeImport.jsx` |
| `webhook-dispatch` | HMAC signing, exponential backoff, circuit breaking | `ui_kits/app/integrationStore.js` |
| `send-email` | Approval notifications, expiry reminders, invitations | — |
| `intelligence-context` | Builds the AI snapshot from permitted scope only | `ui_kits/app/IntelligenceModule.jsx` |

`pg_cron` already covers time-driven work (right-to-work expiry, candidate and
marketing retention, trial expiry, webhook circuit breaking — all in `0009`
and `0011`). Retryable outbound work still needs a `jobs` table and a worker.

---

## 8. The twelve stores to replace

Each is a self-contained localStorage module with a `read`/`write`/`subscribe`
shape. In dependency order:

| File | Becomes | Notes |
|---|---|---|
| `authStore.js` | Supabase Auth | Replaced, not converted |
| `employeeStore.js` | `employees`, `employee_pay` | Start here — see the migration doc |
| `employeeRecords.js` | 8 collection tables | Biggest. Do it second. |
| `payrollStore.js` + `payrollEngine.js` | `payroll_runs`, `payroll_lines` | Engine → Edge Function |
| `safetyStore.js` | `incidents`, `incident_actions`, `risk_assessments` | RIDDOR logic → `app.riddor()` |
| `learningStore.js` | `courses`, `enrolments` | ~23KB of real course content to preserve |
| `recruitmentStore.js` | `vacancies`, `candidates`, `interviews` | |
| `wellbeingStore.js` | `wellbeing_checkins`, `adjustments` | Suppression is already in the view |
| `supportStore.js` | `help_articles`, `tickets`, `article_votes` | |
| `policyStore.js` | `policies` | |
| `resourceStore.js` | `resources` | |
| `storyStore.js` | `customer_stories` | |
| `integrationStore.js` | 5 integration tables | |

---

## 9. Business logic that must be preserved exactly

This is the part where a rewrite silently breaks something a customer relies
on. Each was checked against the relevant UK source.

**Holiday.** 5.6 weeks statutory minimum. Irregular-hours and part-year workers
accrue **12.07%** of hours worked (5.6 ÷ 46.4), which *Harpur Trust v Brazel*
made compulsory for part-year workers on permanent contracts. Both branches
are in `app.leave_balance()`.

**Payroll order of operations.** Salary-sacrifice pension comes off *before*
tax, and NI is charged on a different figure from tax. `payroll_lines` stores
`gross_pay`, `taxable_pay` and `niable_pay` separately for exactly this reason.
2025/26: personal allowance £12,570 tapering above £100,000; employee NI 8%
then 2%; employer NI 15% above £5,000.

**RIDDOR.** Reportability is *derived* from severity, kind and day count —
never chosen by whoever files the report. Over-7-day incapacity is reportable
within 15 days; over-3-day must be recorded but is not reportable; specified
injuries, fatalities and dangerous occurrences within 10 days.
`app.riddor()` returns the reason as well as the answer, because "the system
said so" is not a defensible basis for reporting or for not reporting.

**Bradford factor.** spells² × days. The squaring weights frequent short
absences above one long one. The bands are a trigger for a conversation and
nothing more — a condition causing frequent short absence produces a high score
by design, so treating the score as grounds for action is a discrimination
risk.

**Wellbeing suppression.** Groups under 5 responses return nothing. In a team
of three, "the average dropped" identifies people.

**Working days.** Excludes weekends and the tenant's own bank holidays. The
nation matters: 2 January is a holiday in Scotland and not in England, so the
same leave request is a different number of days.

---

## 10. Three schema questions to answer before Phase 4

Cheap now, expensive after the collections are migrated:

1. **Approval chains.** Approvals are currently single-step. Multi-step
   (manager → HR → director) changes the tables.
2. **E-signature.** `documents.signed_at` and `signature_meta` exist but
   nothing populates them. Is signing in scope?
3. **Self-service portal.** Currently the same app with a restricted role. A
   separate employee portal is a different routing and bundle decision.

---

## 11. What was deliberately left out

Not oversights:

- **Seven employee profile tabs are blank** because no design source existed.
  Nothing was invented to fill them.
- **HMRC RTI** is a separate project with its own recognition process.
  `payroll_runs.rti_reference` is the placeholder.
- **No accreditation claims anywhere.** Not HMRC-recognised, not
  CIPP-accredited, no ISO 27001. The legal pages say so explicitly.
- **Legal pages are marked draft, version 0.9, pending review**, with an
  undismissable banner. They are specific to what the product actually does so
  a solicitor reviews real statements rather than rewriting boilerplate — but
  they have not been reviewed.
- **Accessibility statement lists known gaps** rather than claiming compliance:
  partial screen-reader testing, wide tables that scroll, undescribed charts,
  a rota grid that is hard to keyboard, no independent audit.

---

## 12. Outstanding

- **Rotate the Supabase database password.** A live connection string was
  pasted into a chat during development. Settings → Database → Reset database
  password. Treat the old one as compromised.
- Re-check the mobile pass on a real narrow viewport. Below 720px the design
  system's `DataTable` switches from rows to cards; that was verified by code
  path, not on a device.
- Answer the three schema questions in §10.

---

## 13. File map

```
tokens/                  9 CSS files — colours, type, spacing, radius, motion, theme
styles.css               global stylesheet, imports the tokens
components/              the design system (core, app, forms, marketing)
                         real React + .d.ts — port as-is

ui_kits/preview.html     index of all 33 prototype pages — start here
ui_kits/website/         10 marketing pages + 15 section modules
ui_kits/app/             23 platform screens + ~65 modules + 12 stores
ui_kits/app/README.md    what each app file does
ui_kits/website/README.md   what each website file does

supabase/README.md       READ FIRST — the database layer
supabase/MIGRATING_ADD_EMPLOYEE.md   the conversion pattern
supabase/SIGNUP_FLOW.md  provisioning
supabase/migrations/     0001–0011
supabase/seed.sql        UK reference data + two demo tenants

BACKEND_SPEC.md          original spec — superseded by supabase/ where they differ
PHASE_0_SCAFFOLD.md      monorepo scaffold notes
SETUP.md                 local setup
docker-compose.yml       Postgres 16 + Redis 7, local only
apps/, packages/         monorepo skeleton — structure and config only
```

---

## 14. First session in Claude Code

A reasonable opening:

> Read `supabase/README.md` and `supabase/MIGRATING_ADD_EMPLOYEE.md`. Then
> start Phase 1: scaffold a Vite + React + TypeScript app in `apps/web`, move
> `tokens/` and `components/` into it unchanged, and convert
> `ui_kits/app/Shell.jsx` and `ui_kits/app/Dashboard.jsx` from `window`
> globals to ES modules. Keep the localStorage stores working — this phase
> changes the build only, not the data layer or any behaviour.

The prototype staying runnable through Phase 1 is what makes the rest
verifiable. Don't skip it.
