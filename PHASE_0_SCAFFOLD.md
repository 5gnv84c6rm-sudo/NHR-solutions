# NHR Solution — Phase 0 scaffold source

**Why this file exists.** This project is a *design system*: an in-browser
compiler sweeps every `.js`, `.ts` and `.tsx` file in it into `_ds_bundle.js`
and transforms the result as browser JSX. Node backend source cannot survive
that — `import.meta` in `env.ts` broke the bundle, and with it the preview of
all 59 design-system cards.

So the Phase 0 source lives here as text instead of as swept files. Every byte
is unchanged. Recreate the tree by writing each block to the path in its
heading — or better, hand this file to Claude Code in a real repository, where
a normal toolchain applies.

The files the compiler does **not** sweep are still live in the project and
need no action: `package.json` (×4), `tsconfig*.json` (×4), `.env.example`,
`docker-compose.yml`, `.gitignore`, `.prettierrc.json`, `.prettierignore`,
`SETUP.md`, and the three `README.md` files.

## Files in this document

- `eslint.config.js`
- `packages/shared/src/index.ts`
- `packages/shared/src/constants.ts`
- `packages/shared/src/permissions.ts`
- `packages/shared/src/types.ts`
- `packages/shared/src/api.ts`
- `apps/api/src/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/lib/logger.ts`
- `apps/api/src/middleware/requestId.ts`
- `apps/api/src/middleware/errors.ts`
- `apps/api/src/routes/health.ts`
- `apps/api/tests/health.test.ts`
- `apps/api/vitest.config.ts`
- `apps/web/vite.config.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`

---

## `eslint.config.js`

```js
// Flat config. Deliberately narrow in Phase 0: it lints the new TypeScript in
// apps/ and packages/ and leaves the working prototype alone. ui_kits/ is
// browser-transpiled JSX with intentional window globals — linting it now would
// produce hundreds of findings for code Phase 1 is going to move anyway.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      // The live prototype. Untouched in Phase 0.
      'ui_kits/**',
      // Design-system sources and the compiled bundle are owned by the
      // design-system compiler, not by us.
      'components/**',
      '_ds_bundle.js',
      'support.js',
      'thumbnail.html'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Unused args are often deliberate in Express middleware signatures
      // ((err, req, res, next) needs all four to be recognised as a handler).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      // Fine in scaffolding; will be swapped for pino once logging lands.
      'no-console': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      // Floating promises in a request handler swallow errors silently.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  },

  {
    files: ['**/*.config.{js,ts}', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked
  },

  // Must stay last so formatting rules defer to Prettier.
  prettier
);
```

## `packages/shared/src/index.ts`

```ts
/**
 * @nhr/shared — the single source of truth for anything both sides need to
 * agree on.
 *
 * Phase 0 contains types and constants only: no runtime logic, no validation
 * schemas, no database concerns. Everything here was read off the existing
 * prototype stores rather than invented, so the shapes already match what the
 * UI renders.
 *
 * Nothing in ui_kits/ imports from this package yet. Phase 1 starts doing so.
 */

export * from './constants.js';
export * from './permissions.js';
export * from './types.js';
export * from './api.js';
```

## `packages/shared/src/constants.ts`

```ts
/**
 * Reference data, lifted verbatim from the prototype stores.
 *
 * These are the exact string values the existing localStorage records contain,
 * which matters: Phase 2's seed script imports prototype data, and Phase 1's
 * components still render these labels. Changing a value here silently breaks
 * both. Add new values freely; do not edit or reorder existing ones without a
 * migration.
 *
 * Source: ui_kits/app/employeeStore.js, employeeRecords.js, safetyStore.js
 */

/** ui_kits/app/employeeStore.js — DEPARTMENTS */
export const DEPARTMENTS = [
  'Operations',
  'Finance',
  'People',
  'Support',
  'Sales',
  'Warehouse'
] as const;

/** ui_kits/app/employeeStore.js — EMPLOYMENT_TYPES */
export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Temporary',
  'Contractor',
  'Apprentice',
  'Casual'
] as const;

/** ui_kits/app/employeeStore.js — STATUSES */
export const EMPLOYMENT_STATUSES = [
  'Active',
  'On Leave',
  'Probation',
  'Pending',
  'Inactive'
] as const;

export const WORKING_PATTERNS = ['Fixed', 'Flexible', 'Shift-based'] as const;

export const PAY_FREQUENCIES = ['Weekly', 'Fortnightly', 'Four-weekly', 'Monthly'] as const;

export const RIGHT_TO_WORK_STATUSES = ['Verified', 'Pending', 'Expired', 'Not required'] as const;

export const DOCUMENT_CATEGORIES = [
  'Employment contract',
  'Right-to-work document',
  'ID document',
  'Qualification',
  'Training certificate',
  'DBS certificate',
  'Policy acknowledgement',
  'Medical/occupational document',
  'Other'
] as const;

/**
 * Document and certificate status is DERIVED from the expiry date, never
 * stored. A stored status goes stale silently; a derived one cannot. The list
 * exists for display and filtering only.
 */
export const DOCUMENT_STATUSES = ['Valid', 'Expiring soon', 'Expired', 'Pending review'] as const;

export const LEAVE_TYPES = [
  'Annual leave',
  'Unpaid leave',
  'Parental leave',
  'Compassionate leave',
  'Time off in lieu'
] as const;

export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;

export const EXPENSE_STATUSES = ['Pending', 'Queried', 'Approved', 'Rejected', 'Paid'] as const;

/** ui_kits/app/safetyStore.js — INCIDENT_TYPES */
export const INCIDENT_TYPES = [
  'Accident',
  'Near miss',
  'Dangerous occurrence',
  'Work-related illness',
  'Property damage',
  'Violence or aggression'
] as const;

/**
 * Ordered least to most serious. The order is load-bearing: RIDDOR
 * reportability is derived from severity, and severity itself is derived from
 * the days-off count rather than chosen by the reporter.
 */
export const INCIDENT_SEVERITIES = [
  'No injury',
  'First aid only',
  'Medical treatment',
  'Over-3-day injury',
  'Over-7-day injury',
  'Specified injury',
  'Fatality'
] as const;

/**
 * Bank holidays differ between England & Wales, Scotland and Northern Ireland.
 * Stored per tenant so holiday entitlement and working-day counts are not
 * silently wrong for Scottish and NI employers.
 */
export const UK_NATIONS = ['England & Wales', 'Scotland', 'Northern Ireland'] as const;

/** Anonymous wellbeing results are withheld below this many responses. */
export const WELLBEING_MIN_GROUP = 5;

/** Pass mark for every eLearning assessment. */
export const COURSE_PASS_MARK = 80;

/**
 * Statutory holiday accrual rate for irregular-hours and part-year workers,
 * for leave years beginning on or after 1 April 2024.
 */
export const IRREGULAR_HOURS_ACCRUAL_RATE = 0.1207;

/** Working days per year used to value a day of untaken leave. */
export const WORKING_DAYS_PER_YEAR = 260;

export const PLANS = ['Starter', 'Professional', 'Business', 'Enterprise'] as const;

/** Modules requiring a tier above Starter. Mirrors AuthStore.LOCKABLE. */
export const PLAN_LOCKED_MODULES = ['Payroll', 'Analytics', 'Documents', 'Performance'] as const;

export const TRIAL_DAYS = 14;
```

## `packages/shared/src/permissions.ts`

```ts
/**
 * Roles and permissions, mirroring ui_kits/app/employeeStore.js exactly.
 *
 * THE IMPORTANT PART: in the prototype this map is the whole authorisation
 * system, because there is no server. From Phase 2 it becomes a convenience for
 * hiding UI, and the API re-checks every permission independently.
 *
 * A client-side `can()` is not a security boundary. It never was — it is a way
 * to avoid rendering a button the request would reject. Both sides read this
 * file so the two answers agree, but only the server's answer counts.
 */

export const ROLES = ['Super Admin', 'HR Admin', 'Manager', 'Employee'] as const;
export type Role = (typeof ROLES)[number];

/** Stable database values. The display names above are for the UI only. */
export const ROLE_KEYS: Record<Role, string> = {
  'Super Admin': 'super_admin',
  'HR Admin': 'hr_admin',
  Manager: 'manager',
  Employee: 'employee'
};

export const PERMISSIONS = [
  'employees.read.all',
  'employees.read.team',
  'employees.read.self',
  'employees.write',
  'employees.archive',
  'payroll.read',
  'payroll.write',
  'documents.read',
  'documents.write',
  'notes.read',
  'notes.write',
  'settings.write'
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Verbatim from employeeStore.js. Do not widen a role without review. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  'Super Admin': [
    'employees.read.all',
    'employees.write',
    'employees.archive',
    'payroll.read',
    'payroll.write',
    'documents.read',
    'documents.write',
    'notes.read',
    'notes.write',
    'settings.write'
  ],
  'HR Admin': [
    'employees.read.all',
    'employees.write',
    'employees.archive',
    'payroll.read',
    'documents.read',
    'documents.write',
    'notes.read',
    'notes.write'
  ],
  Manager: [
    'employees.read.team',
    'employees.write',
    'documents.read',
    'notes.read',
    'notes.write'
  ],
  Employee: ['employees.read.self']
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * How wide a role's employee visibility is. From Phase 3 this must be applied
 * as a SQL join, not by filtering a full result set — filtering after the fact
 * means the rows were still fetched, logged and cached.
 */
export type EmployeeScope = 'all' | 'team' | 'self' | 'none';

export function employeeScope(role: Role): EmployeeScope {
  if (can(role, 'employees.read.all')) return 'all';
  if (can(role, 'employees.read.team')) return 'team';
  if (can(role, 'employees.read.self')) return 'self';
  return 'none';
}
```

## `packages/shared/src/types.ts`

```ts
/**
 * Domain types, derived from the record shapes the prototype stores already
 * hold. Phase 0 is types only — no Zod schemas yet, because validation rules
 * belong with the endpoints that enforce them (Phase 3 onwards).
 *
 * Field names match the prototype's JavaScript objects, not the eventual
 * database columns. The API layer maps snake_case columns to these camelCase
 * shapes, so the frontend need not change when the storage changes.
 */

import type {
  DEPARTMENTS,
  DOCUMENT_CATEGORIES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  EXPENSE_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  LEAVE_STATUSES,
  LEAVE_TYPES,
  PAY_FREQUENCIES,
  PLANS,
  RIGHT_TO_WORK_STATUSES,
  UK_NATIONS,
  WORKING_PATTERNS
} from './constants.js';

export type Department = (typeof DEPARTMENTS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export type WorkingPattern = (typeof WORKING_PATTERNS)[number];
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];
export type RightToWorkStatus = (typeof RIGHT_TO_WORK_STATUSES)[number];
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type LeaveType = (typeof LEAVE_TYPES)[number];
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type UkNation = (typeof UK_NATIONS)[number];
export type Plan = (typeof PLANS)[number];

/** ISO 8601 date, no time component: '2026-09-15'. */
export type IsoDate = string;
/** ISO 8601 instant: '2026-09-15T10:42:11.000Z'. */
export type IsoDateTime = string;

export interface Address {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

/**
 * Pay sits in its own type because it sits behind its own permission. A
 * response for a role without `payroll.read` omits this object entirely — it is
 * not blanked or masked, it is never assembled, so it cannot leak through an
 * export, an error body or a log line.
 */
export interface EmployeePayroll {
  payrollId: string;
  payFrequency: PayFrequency;
  salary: number | '';
  hourlyRate: number | '';
  paymentMethod: string;
  taxCode: string;
  accountName: string;
  accountNumberLast4: string;
  sortCodeMasked: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: IsoDate;
  /** Status is derived from this against today; never stored. */
  expiresAt?: IsoDate;
  sizeBytes?: number;
  mimeType?: string;
  signedAt?: IsoDate;
}

export interface EmployeeNote {
  id: string;
  body: string;
  author: string;
  at: IsoDateTime;
}

export interface ActivityEntry {
  action: string;
  by: string;
  at: IsoDateTime;
}

export interface Employee {
  id: string;
  /** Human-facing reference, 'NHR-000101'. Unique per tenant. */
  employeeId: string;

  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  profilePhoto: string | null;
  dateOfBirth: IsoDate | '';
  gender: string;
  pronouns: string;
  nationality: string;

  /** Encrypted at rest. Omitted from responses without the right permission. */
  nationalInsurance: string;
  rightToWorkStatus: RightToWorkStatus;
  rightToWorkExpiry: IsoDate | '';

  personalEmail: string;
  workEmail: string;
  mobile: string;
  homePhone: string;
  address: Address;
  emergencyContacts: EmergencyContact[];

  jobTitle: string;
  department: Department | '';
  location: string;
  managerId: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  startDate: IsoDate | '';
  probationEndDate: IsoDate | '';
  contractEndDate: IsoDate | '';
  workingPattern: WorkingPattern;
  hoursPerWeek: number;
  annualLeaveEntitlement: number;
  employeeCategory: string;
  costCentre: string;
  branch: string;

  payroll?: EmployeePayroll;
  documents: EmployeeDocument[];
  notes: EmployeeNote[];
  activity: ActivityEntry[];
  onboarding: Record<string, boolean>;

  /** `archived: true` IS the leaver state. Employees are never hard-deleted. */
  archived: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  createdBy: string;
  updatedBy: string;
}

/** The eight per-employee collections held in employeeRecords.js. */
export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  workingDays: number;
  status: LeaveStatus;
  reason?: string;
  requestedAt?: IsoDateTime;
  decidedBy?: string;
  decidedAt?: IsoDateTime;
}

export interface AbsenceRecord {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  days: number;
  /** Health information — special category data under Article 9. */
  reason: string;
  selfCertified: boolean;
  fitNote: boolean;
  returnToWork: { completed: boolean; date: string; by: string; notes: string };
  note?: string;
}

export interface TimesheetEntry {
  id: string;
  date: IsoDate;
  clockIn: string;
  clockOut: string;
  breakMins: number;
  hours: number;
  status?: string;
  note?: string;
  approved?: boolean;
}

export interface ShiftEntry {
  id: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  role?: string;
  location?: string;
  published?: boolean;
}

export interface TrainingRecord {
  id: string;
  course: string;
  category?: string;
  status: string;
  assignedAt?: IsoDate;
  dueAt?: IsoDate;
  completedAt?: IsoDate;
  certificateId?: string;
  expiresAt?: IsoDate;
  renewEvery?: number;
}

export interface Goal {
  id: string;
  title: string;
  measure: string;
  due: IsoDate | '';
  progress: number;
  status: string;
}

export interface Review {
  id: string;
  type: string;
  date: IsoDate | '';
  reviewer: string;
  status: string;
  rating: string;
  summary: string;
  completedAt?: IsoDate;
}

export interface ExpenseClaim {
  id: string;
  date: IsoDate;
  category: string;
  description: string;
  amount: number;
  receipt?: string | null;
  status: ExpenseStatus;
  decidedBy?: string;
  decidedAt?: IsoDateTime;
}

export interface EmployeeRecordSet {
  leaveRequests: LeaveRequest[];
  absences: AbsenceRecord[];
  timesheet: TimesheetEntry[];
  rotas: ShiftEntry[];
  training: TrainingRecord[];
  goals: Goal[];
  reviews: Review[];
  expenses: ExpenseClaim[];
}

/** Computed values. Server-authoritative from Phase 4. */
export interface LeaveBalance {
  entitlement: number;
  taken: number;
  booked: number;
  remaining: number;
  carriedOver?: number;
}

export interface BradfordScore {
  score: number;
  spells: number;
  days: number;
  band: string;
}

/**
 * The outcome of a RIDDOR assessment. Derived server-side from severity, type
 * and day count — never a flag the client sets. `reportable: false` with
 * `mustRecord: true` means the accident book, not the HSE.
 */
export interface RiddorOutcome {
  reportable: boolean;
  mustRecord?: boolean;
  /** Days from the incident date, not from today. */
  deadline?: number;
  reason: string;
}

export interface SessionUser {
  userId: string;
  name: string;
  role: import('./permissions.js').Role;
  /** Links the login to an employee record. Null for admins without one. */
  employeeId: string | null;
  permissions: import('./permissions.js').Permission[];
  tenant: { id: string; name: string; plan: Plan; nation: UkNation };
}
```

## `packages/shared/src/api.ts`

```ts
/**
 * The HTTP contract. Response envelopes and error codes, agreed once so the
 * frontend's error handling does not have to guess.
 */

/** Error codes and their HTTP status. */
export const ERROR_CODES = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_failed: 422,
  plan_limit_reached: 402,
  rate_limited: 429,
  internal: 500,
  service_unavailable: 503
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * One error shape for everything. `fields` is per-field because the UI renders
 * errors inline against the input — a single joined message cannot be placed.
 */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

/**
 * Cursor pagination, not offset. Offset drifts when rows are inserted mid-list,
 * which happens constantly in a live HR system — a manager paging through
 * employees would see duplicates and gaps.
 */
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
  total?: number;
}

export interface ApiOk<T> {
  data: T;
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

/** Response of GET /health. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: Record<string, HealthCheck>;
}

export interface HealthCheck {
  /**
   * `not_configured` is distinct from `down` on purpose. In Phase 0 Postgres and
   * Redis are not wired up yet, and a health endpoint that reported them as
   * failing would train everyone to ignore it.
   */
  status: 'ok' | 'down' | 'not_configured';
  detail?: string;
  latencyMs?: number;
}
```

## `apps/api/src/index.ts`

```ts
/**
 * Entry point. Binds the port and handles shutdown.
 *
 * Graceful shutdown matters more than it looks: without it, a deploy can cut a
 * request mid-write, and with a queue attached (Phase 2) it can drop a job that
 * was claimed but not finished.
 */

import { createApp } from './app.js';
import { assertProductionReady, env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';

const missing = assertProductionReady();
if (missing.length > 0) {
  if (isProduction) {
    logger.fatal({ missing }, 'refusing to start: required configuration is missing');
    process.exit(1);
  }
  logger.warn(
    { missing },
    'starting without full configuration — expected during Phase 0, since Postgres and Redis are not wired up yet'
  );
}

const app = createApp();

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(
    { url: `http://${env.API_HOST}:${env.API_PORT}`, env: env.NODE_ENV },
    'NHR Solution API listening'
  );
  logger.info(`health: http://${env.API_HOST}:${env.API_PORT}/health`);
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
    logger.info('closed cleanly');
    process.exit(0);
  });

  // Do not hang forever on a stuck connection.
  setTimeout(() => {
    logger.error('forced exit after 10s');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// An unhandled rejection leaves the process in an unknown state. Log it and
// exit rather than continue and serve wrong answers.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
```

## `apps/api/src/app.ts`

```ts
/**
 * Express application assembly, kept separate from the listener so tests can
 * import the app without binding a port.
 *
 * Route order is load-bearing: request id and logging first so everything after
 * is traceable, security headers before anything that can respond, then routes,
 * then the 404, then the error handler last.
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { corsOrigins, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { requestId } from './middleware/requestId.js';
import healthRouter from './routes/health.js';

export function createApp(): Express {
  const app = express();

  // Behind a proxy in production, so rate limiting and logs see the real IP
  // rather than the load balancer's.
  if (isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { id?: string }).id ?? 'unknown',
      // Health polling every few seconds would drown the log.
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      }
    })
  );

  app.use(
    helmet({
      // The API serves JSON only; CSP belongs on the web app, which has its own
      // domain and its own policy.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' }
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin and tools with no Origin header (curl, health probes).
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin not allowed: ${origin}`));
      },
      // Sessions are cookie-based from Phase 2, so credentials must be allowed
      // and the origin list must stay explicit — '*' and credentials are
      // mutually exclusive, by design.
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id']
    })
  );

  // 1MB is generous for JSON and small enough that a malformed client cannot
  // exhaust memory. File uploads will use presigned URLs direct to storage
  // rather than passing through this process.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // A broad ceiling only. Per-route limits (login, exports, public forms) are
  // much tighter and are added with those routes.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/health'),
      message: {
        error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' }
      }
    })
  );

  // Unversioned, because monitoring should not have to track an API version.
  app.use(healthRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'NHR Solution API',
      version: '0.1.0',
      phase: 'Phase 0 — scaffold. No data endpoints yet; the frontend still runs on localStorage.',
      health: '/health'
    });
  });

  // Phase 3 onwards mounts the real routers here:
  // app.use('/v1/auth', authRouter);
  // app.use('/v1/employees', employeesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

## `apps/api/src/config/env.ts`

```ts
/**
 * Environment loading and validation.
 *
 * The rule here: fail loudly at boot for anything genuinely required, and stay
 * quiet about anything a later phase introduces. A server that starts with a
 * missing session secret and only fails on the first login is much worse than
 * one that refuses to start.
 *
 * In Phase 0 almost everything is optional, because Postgres, Redis, storage
 * and email are not connected yet. Each `requiredFrom` note says which phase
 * makes it mandatory.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load the repository-root .env so one file serves both apps.
loadDotenv({ path: resolve(import.meta.dirname, '../../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('127.0.0.1'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // requiredFrom: phase 2
  DATABASE_URL: z.string().optional(),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().int().positive().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),

  // requiredFrom: phase 2
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // requiredFrom: phase 2
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().positive().default(12),
  SESSION_IDLE_MINUTES: z.coerce.number().positive().default(60),
  FIELD_ENCRYPTION_KEY: z.string().optional(),

  // requiredFrom: phase 5
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Assemble a Postgres URL from parts when one was not supplied whole. Returns
 * null when there is not enough to connect, which the health check reports as
 * `not_configured` rather than as a failure.
 */
export function databaseUrl(): string | null {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = env;
  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) return null;
  const port = POSTGRES_PORT ?? 5432;
  const user = encodeURIComponent(POSTGRES_USER);
  const pass = encodeURIComponent(POSTGRES_PASSWORD);
  return `postgresql://${user}:${pass}@${POSTGRES_HOST}:${port}/${POSTGRES_DB}`;
}

export function redisUrl(): string | null {
  if (env.REDIS_URL) return env.REDIS_URL;
  if (!env.REDIS_HOST) return null;
  const port = env.REDIS_PORT ?? 6379;
  const auth = env.REDIS_PASSWORD ? `:${encodeURIComponent(env.REDIS_PASSWORD)}@` : '';
  return `redis://${auth}${env.REDIS_HOST}:${port}`;
}

/**
 * Checks that must pass before a production boot. Called from index.ts; in
 * development it only warns, so Phase 0 runs with an almost empty .env.
 */
export function assertProductionReady(): string[] {
  const missing: string[] = [];
  if (!databaseUrl()) missing.push('DATABASE_URL (or the POSTGRES_* parts)');
  if (!redisUrl()) missing.push('REDIS_URL (or REDIS_HOST)');
  if (!env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!env.FIELD_ENCRYPTION_KEY) missing.push('FIELD_ENCRYPTION_KEY');
  return missing;
}
```

## `apps/api/src/lib/logger.ts`

```ts
/**
 * Structured logging.
 *
 * The redaction list is the important part and is deliberately wide. An HR
 * system logs constantly, and a request body captured in a log line is a copy
 * of personal data outside the retention policy that governs the database.
 * Payroll, auth and document routes must never have their bodies logged at all.
 */

import pino from 'pino';
import { env, isDevelopment } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.newPassword',
      '*.token',
      '*.secret',
      '*.sessionSecret',
      '*.nationalInsurance',
      '*.niNumber',
      '*.accountNumber',
      '*.sortCode',
      '*.salary',
      '*.dateOfBirth',
      '*.reason',
      'body',
      'req.body'
    ],
    censor: '[redacted]'
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
      }
    : undefined
});

export type Logger = typeof logger;
```

## `apps/api/src/middleware/requestId.ts`

```ts
/**
 * Assigns every request a correlation id, echoed in the response header and
 * included in error bodies. When a user reports a problem, the id is the only
 * practical way to find their request among thousands.
 */

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Honour an upstream id so a trace survives a proxy, but never trust its
  // shape — it ends up in logs and headers.
  const incoming = req.header('x-request-id');
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
```

## `apps/api/src/middleware/errors.ts`

```ts
/**
 * Error handling, and the one error shape the whole API uses.
 *
 * Two rules worth stating: an unexpected error never reveals its message to the
 * client (stack traces and driver errors leak schema and paths), and every
 * response carries the request id so a support conversation can find the log
 * line without guessing.
 */

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { ERROR_CODES, type ErrorCode } from '@nhr/shared';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/env.js';

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.fields = fields;
  }

  get status(): number {
    return ERROR_CODES[this.code];
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError('validation_failed', message, fields);
export const unauthenticated = (message = 'Sign in to continue.') =>
  new HttpError('unauthenticated', message);
export const forbidden = (message = 'You do not have access to this.') =>
  new HttpError('forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError('not_found', message);

/** 404 for anything that reached the end of the router stack. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError('not_found', `No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // Express 5 identifies an error handler by its four-argument signature, so
  // `next` must stay even though it is unused.
  _next: NextFunction
) => {
  // Zod failures become per-field messages, because the UI renders them inline
  // against the input rather than as one combined banner.
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    res.status(422).json({
      error: {
        code: 'validation_failed',
        message: 'Some fields need attention.',
        fields,
        requestId: req.id
      }
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
        requestId: req.id
      }
    });
    return;
  }

  logger.error({ err, requestId: req.id, method: req.method, path: req.path }, 'unhandled error');

  res.status(500).json({
    error: {
      code: 'internal',
      message: 'Something went wrong at our end.',
      // The real message is useful locally and dangerous in production.
      ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
      requestId: req.id
    }
  });
};

/** Wraps an async handler so a rejection reaches the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
```

## `apps/api/src/routes/health.ts`

```ts
/**
 * GET /health   — full report, for humans and dashboards
 * GET /health/live  — process is up (liveness)
 * GET /health/ready — dependencies usable (readiness)
 *
 * The distinction that matters in Phase 0: a dependency that has not been
 * configured yet reports `not_configured`, not `down`. Reporting Postgres as
 * failing before Phase 2 wires it up would teach everyone to ignore this
 * endpoint, which defeats the point of having it.
 */

import { Router } from 'express';
import type { HealthCheck, HealthResponse } from '@nhr/shared';
import { databaseUrl, env, redisUrl } from '../config/env.js';

const router = Router();
const startedAt = Date.now();
const VERSION = '0.1.0';

/**
 * Phase 2 replaces this with a real `SELECT 1` and a pool latency reading.
 * Deliberately not stubbed as `ok` — a health check that lies is worse than no
 * health check.
 */
function checkPostgres(): HealthCheck {
  const url = databaseUrl();
  if (!url) {
    return {
      status: 'not_configured',
      detail: 'No DATABASE_URL. The frontend is still running on localStorage (Phase 0).'
    };
  }
  return { status: 'not_configured', detail: 'Configured, but the API does not connect until Phase 2.' };
}

function checkRedis(): HealthCheck {
  const url = redisUrl();
  if (!url) {
    return { status: 'not_configured', detail: 'No REDIS_URL. Sessions and jobs arrive in Phase 2.' };
  }
  return { status: 'not_configured', detail: 'Configured, but unused until Phase 2.' };
}

router.get('/health', (_req, res) => {
  const checks: Record<string, HealthCheck> = {
    api: { status: 'ok' },
    postgres: checkPostgres(),
    redis: checkRedis()
  };

  // Only a genuine `down` degrades the overall status.
  const degraded = Object.values(checks).some((c) => c.status === 'down');

  const body: HealthResponse = {
    status: degraded ? 'degraded' : 'ok',
    version: VERSION,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    checks
  };

  res.status(degraded ? 503 : 200).json(body);
});

/** Liveness: is the process running. Never touches a dependency. */
router.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Readiness: should traffic be routed here. */
router.get('/health/ready', (_req, res) => {
  const down = [checkPostgres(), checkRedis()].some((c) => c.status === 'down');
  res.status(down ? 503 : 200).json({ status: down ? 'degraded' : 'ok' });
});

export default router;
```

## `apps/api/tests/health.test.ts`

```ts
/**
 * Phase 0 smoke tests. They prove the app assembles, the health contract holds,
 * and the error shape is the one the frontend expects — the three things Phase 1
 * onwards will build on.
 */

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /health', () => {
  it('reports ok with the documented shape', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      environment: expect.any(String),
      uptimeSeconds: expect.any(Number),
      timestamp: expect.any(String)
    });
    expect(res.body.checks.api.status).toBe('ok');
  });

  it('reports unwired dependencies as not_configured rather than down', async () => {
    const res = await request(app).get('/health');

    // The Phase 0 contract: not_configured must not degrade overall status,
    // otherwise the endpoint is red from day one and gets ignored.
    expect(['not_configured', 'ok']).toContain(res.body.checks.postgres.status);
    expect(['not_configured', 'ok']).toContain(res.body.checks.redis.status);
    expect(res.body.status).toBe('ok');
  });

  it('echoes a request id', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[\w-]{8,64}$/);
  });
});

describe('liveness and readiness', () => {
  it('answers /health/live without touching dependencies', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('answers /health/ready', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
  });
});

describe('errors', () => {
  it('returns the standard envelope for an unknown route', async () => {
    const res = await request(app).get('/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'not_found',
      message: expect.stringContaining('/v1/does-not-exist'),
      requestId: expect.any(String)
    });
  });

  it('does not advertise the server framework', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
```

## `apps/api/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Keeps test output readable when a suite fails during a migration.
    reporters: 'verbose'
  },
  resolve: {
    alias: {
      '@nhr/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname
    }
  }
});
```

## `apps/web/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nhr/shared': resolve(import.meta.dirname, '../../packages/shared/src/index.ts'),
      '@': resolve(import.meta.dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    // Proxying means the browser sees one origin in development, so session
    // cookies behave the same locally as in production. Without it, SameSite
    // rules differ between environments and cookie bugs only appear on deploy.
    proxy: {
      '/v1': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022'
  }
});
```

## `apps/web/src/main.tsx`

```tsx
/**
 * Phase 0 placeholder.
 *
 * This is an empty Vite + React shell that proves the toolchain works. It is
 * NOT the application — the working NHR Solution prototype still lives in
 * `ui_kits/` and still runs on localStorage, exactly as before.
 *
 * Phase 1 moves the real components in here: `components/` and `tokens/` become
 * `src/design-system/`, the `window` globals become ES exports, and the 52
 * browser-transpiled Babel scripts become a real module graph. The stores stay
 * on localStorage throughout Phase 1, so the app keeps working at every commit
 * and behaviour can be diffed against the prototype.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## `apps/web/src/App.tsx`

```tsx
/**
 * Phase 0 status page. Its only jobs: prove React renders through Vite, prove
 * `@nhr/shared` resolves across the workspace, and show whether the API is
 * reachable.
 *
 * Styling is inline and minimal on purpose — the real design system is not
 * imported yet, and dressing this page up would only create work to delete in
 * Phase 1.
 */

import { useEffect, useState } from 'react';
import { DEPARTMENTS, ROLES, type HealthResponse } from '@nhr/shared';

type Probe = { state: 'checking' } | { state: 'up'; body: HealthResponse } | { state: 'down'; error: string };

export function App() {
  const [probe, setProbe] = useState<Probe>({ state: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/health', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: HealthResponse) => setProbe({ state: 'up', body }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setProbe({ state: 'down', error: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '48px 24px',
        background: '#050505',
        color: 'rgba(245,255,255,.72)',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        alignItems: 'center'
      }}
    >
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#00E5D4', fontWeight: 700 }}>
            Phase 0 · scaffold
          </span>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>
            NHR Solution — build toolchain
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
            This page is not the application. It exists to confirm Vite, React and the shared workspace
            package all resolve. The working prototype is unchanged and still runs from{' '}
            <code style={{ color: '#00E5D4' }}>ui_kits/</code> on localStorage.
          </p>
        </header>

        <section style={panel}>
          <h2 style={h2}>API</h2>
          {probe.state === 'checking' && <p style={p}>Checking /health…</p>}
          {probe.state === 'down' && (
            <p style={p}>
              Not reachable ({probe.error}). Start it with{' '}
              <code style={code}>npm run dev:api</code> — the page does not need it to render.
            </p>
          )}
          {probe.state === 'up' && (
            <>
              <p style={p}>
                <strong style={{ color: '#00E5D4' }}>{probe.body.status}</strong> · v{probe.body.version} ·{' '}
                {probe.body.environment} · up {probe.body.uptimeSeconds}s
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9 }}>
                {Object.entries(probe.body.checks).map(([name, check]) => (
                  <li key={name}>
                    <strong style={{ color: '#fff' }}>{name}</strong>: {check.status}
                    {check.detail ? ` — ${check.detail}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section style={panel}>
          <h2 style={h2}>Shared package</h2>
          <p style={p}>
            Imported from <code style={code}>@nhr/shared</code>, read off the existing prototype stores:
          </p>
          <p style={{ ...p, color: '#fff' }}>
            {ROLES.length} roles · {DEPARTMENTS.length} departments
          </p>
        </section>

        <section style={panel}>
          <h2 style={h2}>Next</h2>
          <p style={p}>
            Phase 1 moves <code style={code}>components/</code> and <code style={code}>tokens/</code> into
            this app as a real module graph, replacing the 52 browser-transpiled Babel scripts. The
            localStorage stores stay untouched until Phase 3.
          </p>
        </section>
      </div>
    </main>
  );
}

const panel = {
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 16,
  padding: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 10
} as const;

const h2 = { margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' } as const;
const p = { margin: 0, fontSize: 13.5, lineHeight: 1.75 } as const;
const code = { color: '#00E5D4', fontFamily: 'ui-monospace, monospace', fontSize: '.92em' } as const;
```
