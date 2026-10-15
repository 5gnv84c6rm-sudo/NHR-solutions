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
