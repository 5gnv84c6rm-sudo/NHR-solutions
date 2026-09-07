# NHR Solution

HR software platform for UK businesses — employee records, attendance & leave,
payroll, shift scheduling, and passport/visa compliance tracking, all in one
place. Built with React, Vite, TypeScript and Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`. Landing page at `/`, HR dashboard at
`/dashboard` (behind sign-in/trial).

## Data layer

The app works fully standalone out of the box: everything (employees, leave,
attendance, payroll, shifts) is persisted to the browser's `localStorage`,
pre-seeded with realistic demo data (see `src/lib/seed.ts`).

To connect a real Supabase backend instead:

1. Create a Supabase project with tables `employees`, `leave_requests`,
   `attendance`, `payroll_runs`, `shifts` matching the shapes in `src/types`.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
3. Restart the dev server. The same `src/lib/store.ts` calls now read/write
   Postgres via Supabase, and `src/lib/auth.tsx` switches to Supabase Auth.

## Structure

- `src/pages/Landing.tsx` — marketing site (hero, modules, pricing, comparison
  table, testimonials, sign-in/trial/demo/enterprise modals)
- `src/pages/dashboard/` — the six HR modules (Overview, Employee records,
  Attendance & leave, Payroll, Shifts & scheduling, Passport tracking, Visa
  tracking)
- `src/lib/store.ts` — Supabase-or-localStorage data layer
- `src/lib/auth.tsx` — Supabase-or-local auth context
- `src/lib/seed.ts` — demo data seeded into localStorage on first run

## Build

```bash
npm run build   # type-checks and produces dist/
npm run preview # serve the production build locally
```
