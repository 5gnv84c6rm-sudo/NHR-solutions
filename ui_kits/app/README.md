# UI kit — NHR Solution platform

The product workspace: dark interface, turquoise accents, real data density.

| Entry | Opens on |
| --- | --- |
| `index.html` | Overview dashboard (sidebar navigates the whole app) |
| `employees.html` | The Employees module directly |

## Files

| File | Contents |
| --- | --- |
| `Shell.jsx` | `Sidebar` (nine-item nav, live employee count, plan usage), `Topbar` (title, date, `GlobalSearch`, notifications, user), `AppWindow` (composes both; `compact` is the variant the marketing site embeds) |
| `Screens.jsx` | `OverviewScreen` (KPIs, attendance chart, payroll, employees widget, activity, tasks), `PayrollScreen`, and a deliberate blank state for screens with no supplied source |
| `employeeStore.js` | **Data layer.** Owns the employee record shape, all reads/writes, validation, permissions and change notification. Not a component — plain JS, no React. |
| `EmployeeShared.jsx` | Module primitives: `Avatar`, `StatusBadge`, dark-theme `TextField`/`SelectField`/`TextareaField`, `SecureValue` (permission-gated reveal), `Drawer`, `Menu`, `StepRail`, `Notice` |
| `EmployeeList.jsx` | `EmployeesModule` — the page: summary cards, search/filter/sort toolbar, table (desktop) / cards (mobile), pagination, empty state, role switcher. Also `EmployeesWidget` for the dashboard. |
| `EmployeeWizard.jsx` | Six-step Add New Employee flow with per-step validation, draft save, and the post-create onboarding checklist |
| `EmployeeImport.jsx` | Bulk import: upload → map columns → validate → preview → import, with per-row error and warning reporting |
| `EmployeeProfile.jsx` | Fourteen-tab employee profile. Built out: Overview, Personal Details, Employment, Documents, Notes, Payroll, Activity. |

## Employees module — what actually works

Every interaction below writes through `employeeStore.js` to `localStorage` and re-renders every subscribed view. No dead buttons.

- **Add** — six steps (Personal, Employment, Contact & Emergency, Payroll, Documents, Review). Required fields block progress; the step rail shows progress and allows jumping back. *Save as Draft* persists and restores on reopen. On create: generated employee ID, success screen, onboarding checklist, and three exits (profile / continue / add another).
- **Import** — 53-row sample file, column mapping, validation reporting ready/attention/blocked counts with per-row reasons, preview, then real record creation.
- **View** — click any row. Profile header carries photo or initials, status, employee ID, and the "Updated by X on DATE" audit line.
- **Search** — the toolbar filters by name, employee ID, email, phone, job title and department. The top bar's `GlobalSearch` searches across the app and jumps straight to a profile.
- **Filter and sort** — department, status, employment type; sort by name, start date or department, either direction. Summary cards are clickable filters. Pagination at eight per page.
- **Documents** — upload with category and expiry, delete, expiry warnings surfaced at the top of the tab; uploads log to Activity and tick the onboarding checklist.
- **Notes** — add with title, body and visibility; marked internal; deletable; logged to Activity.
- **Status and manager** — change from the row menu or profile menu; propagates to summary counts, badges and the sidebar count.
- **Archive** — removes from the directory and logs the action.
- **Permissions** — the *Viewing as* switcher (Super Admin / HR Admin / Manager / Employee) changes what the screen can do. Managers lose payroll; Employees see only their own record. Payroll, NI numbers and bank details render as *Restricted* without permission, and bank fields are masked to the last four digits for everyone.
- **Empty state** — clear all records and the module shows the "Start building your team" onboarding screen instead of a bare table.
- **Mobile** — the table becomes cards under 900px, the wizard grid collapses to one column, and the drawer goes full width.

### Resetting the demo

```js
EmployeeStore.reset();     // back to the 12 seeded employees
EmployeeStore.clearAll();  // empty — shows the empty state
```

## Connecting a real backend

`employeeStore.js` is the only file that touches storage. Replace each method body with a `fetch` call and the UI is unchanged. The record shape is the intended database schema: identifiers, personal, contact, address, emergency contacts, employment, working pattern, payroll (masked bank fields), documents, notes, activity, onboarding flags, and `createdAt/updatedAt/createdBy/updatedBy` audit columns.

Permissions live in one `PERMISSIONS` map keyed by role; the UI asks `EmployeeStore.can('payroll.read')` rather than checking role names, so server-side rules can replace it directly.

## Notes

All figures, names, amounts and documents are illustrative placeholders. Charts are CSS/DOM with a single turquoise series — no chart library. Uploaded files exist only in the browser session.

## Job Adverts module — what actually works

Files: `jobAdvertStore.js` (data layer), `JobAdvertsModule.jsx` (list, cards, editor), `JobAdvertsScreens.jsx` (detail, preview, internal board, apply/refer forms, performance, screen), `job-adverts.html` (entry), `careers.html` (public hosted careers page).

An advert is the candidate-facing copy of a vacancy. The vacancy in `RecruitmentStore` stays the hiring record; the advert holds the copy, salary display, screening questions, channels and approval state.

- **Write** — five-step editor (Role, Description, Screening, Publishing, Review) with per-step validation, Save Draft, and a live candidate preview.
- **Start faster** — copy an existing employee's role (title, department, location, hours, manager; salary only if the viewer may read payroll), or advertise an existing vacancy.
- **Quality checks** — blocking checks (title, location, summary, essential criteria, closing date, channels) and warnings (no salary, no manager, wording). Inclusive-language check flags age, gender and nationality-coded words with suggested replacements.
- **Right to work and sponsorship** — right-to-work statement applied to every advert; sponsorship flag with SOC code, and a warning when the salary is below the Skilled Worker general threshold (£41,700).
- **Approval** — Managers write and submit; HR Admin / Super Admin approve and publish, or return to draft with a note. Nobody approves their own submission.
- **Publish** — creates (or reopens) the linked vacancy in Recruitment. Pause puts the vacancy on hold; a filled or closed vacancy, or a passed closing date, closes the advert automatically. Closed adverts can be extended and republished.
- **Apply** — the careers page, the internal job board and "Log Application" all call `JobAdvertStore.apply`, which creates a Recruitment candidate with the channel as its source and screening answers as a note. Knock-out answers are flagged for a person to review, never auto-rejected. Duplicate applications are blocked.
- **Employees** — hiring manager is an employee record; internal applications and referrals are logged on the employee's activity; Employee role sees only the internal job board; "Advertise this role" on an employee profile opens a pre-filled advert.
- **Recruitment** — each vacancy shows "Create Advert" or its advert status; candidates show which advert they came from; Job Adverts opens a candidate straight in the pipeline.
- **Performance** — views and applications by channel, conversion, days live; CSV export; Google for Jobs `JobPosting` structured data on the careers page.

### Backdating (HR Admin and Super Admin only, always audit-logged)

- **Posted date** on an advert can be set in the past. Publishing logs "Posted date backdated to …" and the linked vacancy takes the same date.
- **Record a past advert** saves an advert that already ran (posted and closing dates both in the past) as Closed, with "Recorded retrospectively". Nothing is posted anywhere.
- **Record Past Application** / **Log Application** take a *Date received*. It cannot be in the future or before the advert's posted date; the note records who entered it and when.
- **Change date received** (calendar icon on the advert's Candidates tab) corrects an existing application and notes the old date.
- Backdated applications never trigger automatic emails.

The same rules are enforced in the database by `supabase/migrations/0016_job_adverts.sql`, so a modified client cannot get round them.

### Automated candidate emails (`candidateMailStore.js`, `JobAdvertsEmails.jsx`)

Moving a candidate in Recruitment sends the matching email: application received, interview invitation (with the booked date, format and interviewer), second interview, job offer (salary and start date), welcome on hire, and an optional rejection. Each template is **Send automatically**, **Check before sending** or **Off**, and the wording is editable with merge fields. Offers default to *Check before sending*. Each stage email goes once per candidate.

Job Adverts › **Candidate emails** has the outbox (review, edit, send, discard, retry) and the templates. Every candidate in Recruitment has an Emails panel and an *Email candidate* button.

Delivery: on the live platform emails go through the `send-candidate-email` Edge Function (Resend) and are logged in `candidate_emails`. In the demo workspace they are written and logged but marked *Not sent*. Public careers-page applications get their acknowledgement from a database trigger, because the applicant has no account.

```js
JobAdvertStore.reset();       // back to the seeded adverts
CandidateMailStore.reset();   // empty outbox, standard templates
```

Job board channels (Indeed, LinkedIn, Totaljobs, Reed, DWP Find a job) are recorded as posting destinations; sending the feed to each board belongs in Integrations once a backend exists.

### Live accounts (`liveRecruitment.js`)

For a real signed-in account (not the demo), Recruitment and Job Adverts read and write the Supabase database instead of the browser:

- On load it reads vacancies, candidates, candidate notes, interviews, job adverts and email template settings for the workspace, and refreshes every minute while the page is open.
- Every change the stores make is written back, in order. If the database refuses a change (row-level security, or the publishing/backdating rules in `0016_job_adverts.sql`), the screen reloads what the database holds and a message explains why.
- Live data has its own browser cache (`…:live:<user id>`), so it never mixes with demo data, and the demo's sample adverts are never written to the database.
- The careers page for a live workspace is `careers.html?employer=<workspace slug>`. It reads the `public_job_adverts` view, uploads the CV to the `cvs` bucket, and submits through `apply_to_job_advert()`. The database trigger sends the "application received" email.
- Employees are still browser-only, so a hire creates the employee record on that device.
