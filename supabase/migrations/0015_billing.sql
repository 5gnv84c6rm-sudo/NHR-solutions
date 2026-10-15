-- 0015 · Stripe billing
--
-- Stripe is the source of truth for money; subscriptions is a local mirror so
-- the app can answer "is this workspace paid?" without calling Stripe on every
-- request. Only the webhook (service role) writes it — a customer cannot mark
-- themselves as paid, which is why there is no insert or update policy.
--
-- Edge Function sources: .github/edge-functions/stripe-{checkout,webhook,portal}/
-- Secrets (Supabase dashboard > Edge Functions > Secrets):
--   STRIPE_SECRET_KEY      restricted key from Stripe
--   STRIPE_WEBHOOK_SECRET  signing secret shown when the endpoint is created
--   SITE_URL               https://nhrsolutions.net

begin;

alter table tenants add column if not exists stripe_customer_id text unique;

create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,

  stripe_customer_id     text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id        text,

  -- The headcount band sold, so the app can show what was bought without
  -- looking up Stripe metadata.
  employee_band          text,
  interval               text check (interval in ('month','year')),
  amount_pence           int check (amount_pence is null or amount_pence >= 0),
  currency               char(3) not null default 'GBP',

  -- Stripe's own vocabulary, kept verbatim rather than translated, so a
  -- surprise status is visible instead of being mapped to something wrong.
  status                 text not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_tenant on subscriptions (tenant_id);
create index if not exists subscriptions_status on subscriptions (status);

drop trigger if exists subscriptions_touch on subscriptions;
create trigger subscriptions_touch before update on subscriptions
  for each row execute function app.touch_updated_at();

alter table subscriptions enable row level security;

drop policy if exists subscriptions_read on subscriptions;
create policy subscriptions_read on subscriptions
  for select to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin());

-- Records every webhook Stripe sends, so a replayed or duplicated event is
-- processed once. Stripe retries on any non-2xx, so this is not optional.
create table if not exists billing_events (
  id           text primary key,
  type         text not null,
  tenant_id    uuid references tenants(id) on delete set null,
  payload      jsonb,
  received_at  timestamptz not null default now()
);

alter table billing_events enable row level security;
-- No policy: service role only.

commit;
