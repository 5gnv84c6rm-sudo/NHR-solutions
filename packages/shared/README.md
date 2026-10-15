# @nhr/shared

Types, constants and permission definitions used by **both** the API and the web
app, so a rule is written once.

## Phase 0 contents

- `constants.ts` — reference data lifted verbatim from the prototype stores
- `permissions.ts` — the four roles and their permissions, mirroring
  `employeeStore.js`
- `types.ts` — domain types derived from the record shapes already in
  localStorage
- `api.ts` — the HTTP contract: error codes, envelopes, pagination, health

No runtime logic and no validation schemas yet. Zod schemas arrive with the
endpoints that enforce them (Phase 3 onwards), and the calculation logic —
holiday accrual, Bradford, payroll, RIDDOR — goes in `apps/api/src/domain/` as
pure functions, not here.

## The constants are load-bearing

The string values in `constants.ts` are the exact values the existing
localStorage records contain. Phase 2's seed script imports prototype data and
Phase 1's components still render these labels, so **editing a value silently
breaks both**. Add freely; change or reorder only with a migration.

## On permissions

`ROLE_PERMISSIONS` is currently the whole authorisation system, because there is
no server. From Phase 2 it becomes a convenience for hiding UI, and the API
re-checks every permission independently.

A client-side `can()` is not a security boundary and never was. Both sides read
this file so their answers agree — but only the server's answer counts.
