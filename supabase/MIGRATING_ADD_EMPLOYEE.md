# Add Employee: localStorage → Supabase

The first flow to convert, and the template for the other eleven stores.
Worth doing carefully: get this pattern right and the rest is repetition.

**Now**

```
AddEmployeeWizard  →  EmployeeStore.create()  →  localStorage['nhr-employees-v1']
                                              →  subscribers re-render
```

**After**

```
AddEmployeeWizard  →  useCreateEmployee()  →  supabase.from('employees').insert()
                                           →  RLS checks tenant + role
                                           →  React Query invalidates, re-renders
```

---

## What the current code does

`ui_kits/app/employeeStore.js`, `create()`:

1. Generates `emp-<random>` as the id
2. Generates the next `NHR-000nnn` reference by scanning existing records
3. Merges the draft over a blank employee template
4. Pushes to the array, writes the whole array to localStorage
5. Appends an activity entry
6. Notifies subscribers, which re-renders every mounted component

Five of those six move server-side. Only the last stays.

## Step 0 — validation, in three layers

The prototype validates in the wizard only. That was fine when the wizard was
the only way in; it is not fine once there is an API, because anyone can skip
the form and `POST` straight to it.

Three layers, each catching what the others cannot:

| Layer | Catches | Cannot catch |
|---|---|---|
| **Client** (same schema) | Typos, while typing, with no round trip | Anything, once the form is bypassed |
| **Server** (same schema) | A bypassed form, a stale client, a bad integration | A race between two valid requests |
| **Database** (constraints) | Races, direct SQL, a bug in the layer above | Anything needing context it does not have |

The schema is written **once** and imported by both sides. Two copies drift,
and they drift silently — the client accepts something the server rejects, and
the user sees a validation error on a field that looked fine.

`packages/shared/src/schemas/employee.ts`

```ts
import { z } from 'zod';

export const employeeDraftSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name:  z.string().trim().min(1, 'Last name is required').max(80),

  // Optional but validated when present. An empty string is not an invalid
  // email — it is an absent one, which is why these coerce to undefined.
  work_email:     z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  personal_email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),

  // UK mobile, tolerant of spaces and +44. Deliberately loose: rejecting a
  // real number because of its format is worse than storing one that is
  // slightly odd.
  mobile: z.string().trim().regex(/^[\d\s+()-]{7,20}$/, 'Enter a valid phone number')
    .optional().or(z.literal('')),

  job_title:  z.string().trim().max(120).optional(),
  department: z.string().trim().min(1, 'Choose a department'),
  location:   z.string().trim().max(120).optional(),
  manager_id: z.string().uuid().optional().or(z.literal('')),

  employment_type: z.enum(['full_time','part_time','temporary','contractor','apprentice','casual']),
  employment_status: z.enum(['active','on_leave','probation','pending','inactive']),

  start_date: z.string().date('Enter a valid date'),
  probation_end_date: z.string().date().optional().or(z.literal('')),

  working_pattern: z.enum(['fixed','flexible','shift_based']),
  hours_per_week: z.coerce.number().min(0).max(168),
  days_per_week:  z.coerce.number().min(0).max(7),
  annual_leave_days: z.coerce.number().min(0).max(365),
  irregular_hours: z.coerce.boolean().default(false),

  rtw_status: z.enum(['verified','pending','expired','not_required']),

  annual_salary: z.coerce.number().min(0).max(10_000_000).optional(),
  hourly_rate:   z.coerce.number().min(0).max(10_000).optional(),
  tax_code: z.string().trim().max(12).optional(),
})
  // Cross-field rules. These are the ones a per-field validator misses, and
  // they are where the real data-quality problems live.
  .refine(d => !d.probation_end_date || !d.start_date ||
               d.probation_end_date > d.start_date, {
    message: 'Probation must end after the start date',
    path: ['probation_end_date'],
  })
  .refine(d => !(d.annual_salary && d.hourly_rate), {
    message: 'Enter either an annual salary or an hourly rate, not both',
    path: ['hourly_rate'],
  })
  // An irregular-hours worker accrues 12.07% of hours worked, so a fixed days
  // entitlement is contradictory. Catching it here stops a leave balance that
  // is wrong in a way nobody notices for a year.
  .refine(d => !d.irregular_hours || d.annual_leave_days === 0, {
    message: 'Irregular-hours workers accrue leave from hours worked — leave the days entitlement at 0',
    path: ['annual_leave_days'],
  })
  .refine(d => d.employment_status !== 'probation' || !!d.probation_end_date, {
    message: 'A probation period needs an end date, or it will lapse unnoticed',
    path: ['probation_end_date'],
  })
  // Start dates far in the past are usually a year typo: 2016 for 2026.
  .refine(d => !d.start_date || new Date(d.start_date) > new Date('1970-01-01'), {
    message: 'Check the start date',
    path: ['start_date'],
  });

export type EmployeeDraft = z.infer<typeof employeeDraftSchema>;
```

**In the wizard** — `react-hook-form` with the same schema, so errors appear
per field as the user types:

```ts
const form = useForm<EmployeeDraft>({
  resolver: zodResolver(employeeDraftSchema),
  mode: 'onBlur',
});
```

**In the API module** — parse before sending. It costs nothing and catches a
bug in our own code before it reaches the database:

```ts
export async function createEmployee(draft: unknown): Promise<Employee> {
  const parsed = employeeDraftSchema.parse(draft);   // throws ZodError
  const { data, error } = await supabase
    .rpc('create_employee', { p_draft: parsed })
    .single();
  if (error) throw error;
  return data as Employee;
}
```

**In the Edge Function** — the same parse, because the browser is not the only
caller. An API key holder and a CSV import both arrive here without passing
through the wizard:

```ts
const result = employeeDraftSchema.safeParse(await req.json());
if (!result.success) {
  return Response.json(
    { error: 'validation_failed', fields: result.error.flatten().fieldErrors },
    { status: 422 }
  );
}
```

**In the database** — the constraints already written in `0002`:
`hours_per_week` between 0 and 168, `one_pay_basis`, `employee_dates`,
`manager_not_self`, `archived_has_date`. These are the backstop. They catch
what no amount of application validation can: a race, a direct SQL fix, or a
bug in the layer above.

None of the three is redundant. Drop the client layer and the form feels
broken; drop the server layer and the API is unprotected; drop the
constraints and a race corrupts the data permanently.


## Step 1 — the API module

Replaces `employeeStore.js`. Same function names deliberately, so the call
sites barely change.

`apps/web/src/api/employees.ts`

```ts
import { supabase } from '../lib/supabase';
import type { Employee, EmployeeDraft } from '@nhr/shared';

// No tenant_id and no role filtering in any of these queries. RLS applies
// both. If you find yourself adding `.eq('tenant_id', …)` here, the policy is
// missing — fix it there, not here.

export async function listEmployees(opts: {
  search?: string;
  department?: string;
  status?: string;
  includeArchived?: boolean;
} = {}): Promise<Employee[]> {
  let q = supabase
    .from('employees')
    .select('*, employee_pay(annual_salary, hourly_rate, pay_frequency)')
    .order('last_name');

  if (!opts.includeArchived) q = q.eq('archived', false);
  if (opts.department) q = q.eq('department', opts.department);
  if (opts.status) q = q.eq('employment_status', opts.status);
  // Trigram index on the name, so this matches mid-string: 'osei' finds
  // Amara Osei, which a prefix index would not.
  if (opts.search) {
    q = q.or(
      `first_name.ilike.%${opts.search}%,` +
      `last_name.ilike.%${opts.search}%,` +
      `employee_ref.ilike.%${opts.search}%`
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  // employee_pay comes back as an array from the join; a role without payroll
  // permission gets an empty one, because the policy excluded the rows.
  return data.map(r => ({ ...r, pay: r.employee_pay?.[0] ?? null }));
}

export async function createEmployee(draft: EmployeeDraft): Promise<Employee> {
  // The reference is generated by the database, not here. Two admins adding
  // someone at the same moment would otherwise both scan the list, both see
  // NHR-000112 as the highest, and both claim NHR-000113.
  const { data, error } = await supabase
    .rpc('create_employee', { p_draft: draft })
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(
  id: string,
  patch: Partial<EmployeeDraft>
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Archive, never delete. Statutory retention requires the record, and
// turnover history breaks without it.
export async function archiveEmployee(id: string, reason: string) {
  const { error } = await supabase
    .from('employees')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      leaver_reason: reason,
    })
    .eq('id', id);
  if (error) throw error;
}
```

## Step 2 — reference generation in the database

Add to a new migration. This is the part that cannot move to the client.

```sql
-- Employee reference allocation. Per tenant, gap-free, and safe under
-- concurrency because the advisory lock serialises the read-then-write that
-- a client-side scan cannot.
create or replace function app.next_employee_ref(p_tenant uuid)
returns text language plpgsql as $$
declare n int;
begin
  -- Lock keyed on the tenant, so two tenants adding simultaneously do not
  -- block each other.
  perform pg_advisory_xact_lock(hashtext('employee_ref:' || p_tenant::text));

  select coalesce(max(nullif(regexp_replace(employee_ref, '\D', '', 'g'), '')::int), 100) + 1
    into n
  from employees
  where tenant_id = p_tenant;

  return 'NHR-' || lpad(n::text, 6, '0');
end $$;

-- Creates the employee, its pay row and its first activity entry as one
-- transaction. Three separate client calls could leave an employee with no
-- pay record if the second failed.
create or replace function create_employee(p_draft jsonb)
returns employees language plpgsql security definer set search_path = public as $$
declare
  t uuid := app.current_tenant();
  e employees;
  ref text;
begin
  if not app.is_admin() then
    raise exception 'insufficient permissions to create an employee';
  end if;

  -- Plan limit, counted against active records only. Archived leavers are
  -- retained and not charged for.
  if (select employee_limit from tenants where id = t) is not null
     and (select count(*) from employees where tenant_id = t and not archived)
         >= (select employee_limit from tenants where id = t) then
    raise exception 'employee limit reached for this plan';
  end if;

  ref := app.next_employee_ref(t);

  insert into employees (
    tenant_id, employee_ref, first_name, last_name, work_email, personal_email,
    mobile, job_title, department, location, manager_id,
    employment_type, employment_status, start_date, probation_end_date,
    working_pattern, hours_per_week, days_per_week, annual_leave_days,
    irregular_hours, rtw_status, created_by, updated_by
  ) values (
    t, ref,
    p_draft->>'first_name', p_draft->>'last_name',
    nullif(p_draft->>'work_email',''), nullif(p_draft->>'personal_email',''),
    nullif(p_draft->>'mobile',''),
    p_draft->>'job_title', p_draft->>'department', p_draft->>'location',
    nullif(p_draft->>'manager_id','')::uuid,
    coalesce((p_draft->>'employment_type')::employment_type, 'full_time'),
    coalesce((p_draft->>'employment_status')::employment_status, 'probation'),
    nullif(p_draft->>'start_date','')::date,
    nullif(p_draft->>'probation_end_date','')::date,
    coalesce((p_draft->>'working_pattern')::working_pattern, 'fixed'),
    coalesce((p_draft->>'hours_per_week')::numeric, 37.5),
    coalesce((p_draft->>'days_per_week')::numeric, 5),
    coalesce((p_draft->>'annual_leave_days')::numeric, 28),
    coalesce((p_draft->>'irregular_hours')::boolean, false),
    coalesce((p_draft->>'rtw_status')::rtw_status, 'pending'),
    auth.uid(), auth.uid()
  ) returning * into e;

  -- Pay row always exists, even when empty. A null row is easier to reason
  -- about than a missing one, and the join in listEmployees expects it.
  insert into employee_pay (tenant_id, employee_id, annual_salary, hourly_rate, tax_code)
  values (
    t, e.id,
    nullif(p_draft->>'annual_salary','')::numeric,
    nullif(p_draft->>'hourly_rate','')::numeric,
    nullif(p_draft->>'tax_code','')
  );

  insert into activity_log (tenant_id, employee_id, action, actor_id, actor_label)
  values (
    t, e.id,
    'Employee record created — ' || ref,
    auth.uid(),
    (select name from profiles where id = auth.uid())
  );

  return e;
end $$;

grant execute on function create_employee to authenticated;
```

`security definer` is needed because the function writes to `activity_log` and
`employee_pay` on the caller's behalf — but the permission check is the first
statement in the body, so it grants nothing the caller did not already have.

## Step 3 — the React Query hooks

Replaces the subscriber pattern. `useEffect(() => Store.subscribe(force), [])`
becomes cache invalidation, which gets you loading and error states for free.

`apps/web/src/hooks/useEmployees.ts`

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/employees';

export const employeeKeys = {
  all: ['employees'] as const,
  list: (f: object) => ['employees', 'list', f] as const,
  one: (id: string) => ['employees', id] as const,
};

export function useEmployees(filters = {}) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => api.listEmployees(filters),
    staleTime: 30_000,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createEmployee,
    onSuccess: () => {
      // The dashboard headcount and the employee list both go stale, so
      // invalidate both rather than patching the cache by hand.
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

## Step 4 — the wizard

`ui_kits/app/EmployeeWizard.jsx` keeps its markup, validation and step logic.
Only submission changes.

```diff
- const S = window.EmployeeStore;
+ import { useCreateEmployee } from '../hooks/useEmployees';

  function AddEmployeeWizard({ onClose }) {
+   const create = useCreateEmployee();

-   function submit() {
-     const created = S.create(form);
-     S.logActivity(created.id, 'Employee record created');
-     onClose();
-   }
+   async function submit() {
+     try {
+       await create.mutateAsync(form);
+       onClose();
+     } catch (err) {
+       // Real failures the prototype could not have: a duplicate email, the
+       // plan limit, a lost connection. Each needs saying in words rather
+       // than a silent no-op.
+       setError(messageFor(err));
+     }
+   }

    return (
      <Drawer …>
        …
-       <Button onClick={submit}>Add Employee</Button>
+       <Button onClick={submit} disabled={create.isPending}>
+         {create.isPending ? 'Adding…' : 'Add Employee'}
+       </Button>
      </Drawer>
    );
  }
```

## What this flow gains

Things the prototype could not do, in rough order of how often they will
matter:

- **Two admins see the same data.** The reason for the whole exercise.
- **The reference cannot collide.** Generated under a lock rather than by
  scanning a local array.
- **Permissions are enforced.** A manager calling `create_employee` directly
  from the browser console gets an exception, not a new employee.
- **The plan limit is real.** Currently a client-side check anyone can edit.
- **Failure is visible.** A dropped connection shows a message instead of
  appearing to succeed.
- **The record survives.** Clearing site data no longer destroys the company's
  employee list.

## What to verify before moving on

Sign in as each of the three seeded roles and check by behaviour, not by
reading the policy:

1. As employee → the Add Employee button is hidden **and** a direct
   `create_employee` call raises. The second test is the one that matters; the
   first is only the UI being polite.
2. As manager → the list returns direct reports only.
3. As Northgate admin → 12 employees, and `where employee_ref like 'BVW-%'`
   returns nothing.
4. Add an employee → reference is `NHR-000113`, pay row exists, activity entry
   written, dashboard headcount increments to 13.
5. Kill the network mid-submit → an error message, and no partial record.

Test 5 is the one that finds the real bugs. Everything else passes on the
first attempt surprisingly often.

## Then repeat

The remaining stores follow the same four steps. In dependency order:

`employeeRecords.js` → the eight collection tables (biggest, do it second)
`payrollStore.js` → runs and lines, plus the calculate Edge Function
`safetyStore.js` · `learningStore.js` · `recruitmentStore.js` ·
`wellbeingStore.js` · `supportStore.js` · `policyStore.js` ·
`resourceStore.js` · `storyStore.js` · `integrationStore.js`

`authStore.js` is the exception: it is replaced by Supabase Auth rather than
converted. Keep its function signatures — `session()`, `isAuthed()`, `plan()`,
`isLocked(module)` — and swap the bodies, since it was written to match what
a real API would expose.
