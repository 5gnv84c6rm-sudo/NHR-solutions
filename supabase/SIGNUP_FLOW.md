# Sign-up flow

```
Create account  →  Create company  →  Administrator  →  Plan  →  Trial  →  Dashboard
```

The one flow that runs before a tenant exists. That changes how it has to be
built, in two ways that are not obvious.

## Why this flow is different

**RLS cannot protect it.** Every policy in `0008` filters on
`app.current_tenant()`, which reads a JWT claim. During sign-up there is no
tenant, so the claim is absent, so every policy denies everything. Correctly —
but it means provisioning cannot run from the browser under the user's own
token. It runs in an Edge Function under the service role.

**A half-finished sign-up is worse than a failed one.** If the auth user is
created and provisioning then fails, the email is taken, so the user cannot
retry — but there is no profile, so their token carries no tenant and every
screen is empty. They are locked out of an account they cannot recreate, and
only support can fix it.

So everything after the auth user is a single transaction:
`app.provision_tenant()` in `0011`. Either the account works or it does not
exist.

## The sequence

| Step | Where | What happens |
|---|---|---|
| 1. Account | Auth API | `signUp({ email, password })`. Only the Auth API can create an auth user — not SQL. |
| 2–4. Company, admin, plan | Edge Function | One call to `app.provision_tenant()` as service role. Tenant, profile, the admin's own employee record, wellbeing config, sector training matrix, audit entry. |
| 5. Trial | Same transaction | `status = 'trial'`, `trial_ends_at = now() + 14 days`. No card. |
| 6. Dashboard | Client | Refresh the session so the JWT picks up the new claims, then redirect. |

Step 6 is easy to miss. The token minted at sign-up predates the profile, so
it has no `tenant_id` and the dashboard will be empty until it is refreshed:

```ts
await supabase.auth.refreshSession();   // re-runs the access token hook
```

## The Edge Function

`supabase/functions/signup/index.ts` — lives in the application repo, since
the design-system compiler here claims every `.ts` file.

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { signupSchema } from '@nhr/shared';

Deno.serve(async (req) => {
  const parsed = signupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'validation_failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { email, password, admin_name, company_name, plan, nation,
          employee_band, sector } = parsed.data;

  // Service role. Never exposed to the browser, never in the frontend bundle.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. The auth user. email_confirm false: they verify by email, but they get
  //    into the product first. A trial that starts with "check your inbox"
  //    loses people who were ready to look.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name: admin_name },
  });

  if (authError) {
    // Do not disclose whether an address is registered. "That email is already
    // in use" on a sign-up form is an account-enumeration oracle.
    if (authError.message.includes('already')) {
      return Response.json(
        { error: 'signup_failed',
          message: 'We could not create that account. If you already have one, try signing in or resetting your password.' },
        { status: 409 }
      );
    }
    throw authError;
  }

  // 2. Everything else, atomically.
  const { data: provisioned, error: provisionError } = await admin
    .rpc('provision_tenant', {
      p_user_id: created.user.id,
      p_email: email,
      p_admin_name: admin_name,
      p_company_name: company_name,
      p_plan: plan,
      p_nation: nation,
      p_employee_band: employee_band ?? null,
      p_sector: sector ?? null,
      p_trial_days: 14,
    });

  if (provisionError) {
    // Roll back the auth user. Without this the address is burned and the
    // person cannot try again — the exact lockout described above.
    await admin.auth.admin.deleteUser(created.user.id);
    throw provisionError;
  }

  // 3. Fire-and-forget. A failed welcome email must not fail a sign-up.
  queueWelcomeEmail(email, admin_name, provisioned.slug).catch(() => {});

  return Response.json({ ok: true, ...provisioned });
});
```

## Trial, not payment

The diagram has payment and trial as one step. They should not be.

**No card for the trial.** Asking for card details before someone has seen the
product is the single largest drop-off in B2B SaaS sign-up, and it is not
needed: the plan choice already tells you what they want, and `trial_status()`
already enforces what they can reach.

**Plan choice is not a payment.** It sets `tenants.plan`, which decides which
modules unlock. `employee_limit` is derived from the band they selected, but
generously — someone who picks "1–10" and hires an eleventh person should not
hit a wall, so the limit is set above the band.

**When the trial ends, nothing is deleted.** `status` moves to `past_due`
(nightly cron in `0011`) and write access is withdrawn. The employee list, the
documents, the payroll history all stay. A customer who comes back three weeks
later finds their data where they left it — and one who does not is entitled to
export it.

Payment belongs in its own flow, entered from Billing, at whatever point they
decide to convert. That is a Stripe integration and a `subscriptions` table,
and it is genuinely independent of sign-up.

## What the administrator sees first

`provision_tenant` creates the admin's own employee record deliberately. A
founder who signs up and finds an HR system containing nobody — including
themselves — has to do setup work before the product does anything, and most
will not.

So the first dashboard load has: one employee, a four-course compliance matrix
(plus sector additions for healthcare, care and construction), and an
onboarding prompt to add the rest of the team.

It does not have fake employees. Seeding a demo company into a real account
means someone eventually runs payroll against invented people.

## Verifying it

1. Sign up → land on the dashboard with headcount 1 and your own name in the
   employee list.
2. Sign up with the same email → a 409 that does not confirm the address
   exists.
3. Sign up with the same company name → a second tenant with slug
   `acme-1`, fully isolated from the first.
4. Break `provision_tenant` deliberately (rename a column) and sign up → the
   auth user is deleted, and the same email works on the next attempt. This is
   the test that matters; skip it and you will find out from a customer.
5. Set `trial_ends_at` to yesterday, run the cron job → `status = 'past_due'`,
   and `trial_status()` returns `expired: true` while every record is still
   there.
6. Sector `Healthcare` → seven training requirements, with Emergency First Aid
   flagged `external_provider_required`.
