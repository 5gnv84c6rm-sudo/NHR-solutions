# Edge Functions

Deployed to Supabase, kept here as `.ts.txt` because the design-system compiler
sweeps every `.ts` file in this project into `_ds_bundle.js` and breaks on Deno
code (see `SETUP.md`). To redeploy with the CLI, copy a function to
`supabase/functions/<name>/index.ts` first, deploy, then delete the copy.

| Function | verify_jwt | Called by | Purpose |
|---|---|---|---|
| `signup` | off | the website | Creates the account, then provisions the workspace as the service role. Off because the caller has no account yet. |
| `notify-submission` | off | database triggers | Emails enquiries and demo bookings. Off because Postgres has no Supabase token; authenticity is a shared secret header instead. |
| `stripe-checkout` | **on** | the app | Starts a Stripe Checkout session. The workspace comes from the caller's token, never the request body. |
| `stripe-webhook` | off | Stripe | Keeps subscription state in step. Off because Stripe has no Supabase token; authenticity is the Stripe signature, checked before anything is read. |
| `stripe-portal` | **on** | the app | Opens Stripe's billing portal so customers manage card, invoices and cancellation. |

## Secrets

Set in the dashboard under Edge Functions → Secrets. None belongs in source
control.

| Secret | Used by | Where it comes from |
|---|---|---|
| `RESEND_API_KEY` | notify-submission | resend.com |
| `NOTIFY_SECRET` | notify-submission | must match `app.notify_config.secret` |
| `MAIL_TO` / `MAIL_FROM` | notify-submission | optional; defaults to nhrsolutionltd@gmail.com |
| `STRIPE_SECRET_KEY` | stripe-checkout, stripe-webhook, stripe-portal | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | shown when the webhook endpoint is created |
| `SITE_URL` | stripe-checkout, stripe-portal | `https://nhrsolutions.net` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided
by the platform and must not be set by hand.

## Why the webhook records event ids

Stripe retries any non-2xx response and can deliver the same event twice.
`billing_events` has the Stripe event id as its primary key, so a repeat insert
fails and the handler returns early instead of, say, recording a payment twice.
When a handler genuinely fails the row is deleted again, so Stripe's retry is
treated as new work rather than a duplicate.
