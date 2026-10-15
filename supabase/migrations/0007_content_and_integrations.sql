-- 0007 · content, support, integrations, marketing capture
--
-- The remaining stores. Most are straightforward; two carry real constraints:
--
--   · api_keys stores a hash and a prefix, never the key. The full secret is
--     shown once at creation and cannot be recovered, which is how a key
--     store must behave — a database read should not yield working credentials.
--   · webhook_deliveries records test fires separately from real ones, because
--     a local test proves nothing about whether the customer's endpoint is
--     reachable, and conflating them makes the log useless for debugging.

begin;

-- ============================================================ policies and content
create table policies (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null,
  category    text,
  body        text,
  document_id uuid references documents(id) on delete set null,

  version     text not null default '1.0',
  effective_from date,
  review_on   date,
  -- Whether every employee must acknowledge it. Acknowledgements live in
  -- document_acknowledgements.
  requires_acknowledgement boolean not null default false,

  status      text not null default 'draft'
    check (status in ('draft','active','under_review','superseded')),
  superseded_by uuid references policies(id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger policies_touch before update on policies
  for each row execute function app.touch_updated_at();

create index policies_active on policies (tenant_id) where status = 'active';

-- Guides, templates and articles in the Resources library. Platform-provided
-- where tenant_id is null.
create table resources (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  slug        text not null,
  title       text not null,
  kind        text not null default 'guide'
    check (kind in ('guide','template','article','webinar','checklist','video')),
  category    text,
  summary     text,
  body        text,
  file_key    text,
  minutes     int,
  tags        jsonb not null default '[]'::jsonb,
  published   boolean not null default false,
  published_on date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger resources_touch before update on resources
  for each row execute function app.touch_updated_at();

create unique index resources_slug on resources
  (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create table customer_stories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  company     text not null,
  sector      text,
  size_band   text,
  challenge   text,
  solution    text,
  outcome     text,
  quote       text,
  quote_attribution text,
  modules_used jsonb not null default '[]'::jsonb,
  -- Fictional until a real customer consents in writing. The flag is what
  -- stops an illustrative story being mistaken for a reference.
  is_illustrative boolean not null default true,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================ support
create table help_articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    text not null,
  body        text not null,
  -- Which module it explains, so the help panel can open in context.
  module      text,
  tags        jsonb not null default '[]'::jsonb,
  helpful_count int not null default 0,
  unhelpful_count int not null default 0,
  published   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create index help_articles_category on help_articles (category) where published;

create table article_votes (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references help_articles(id) on delete cascade,
  -- Tenant and profile, so a person is not asked twice and the counts cannot
  -- be inflated by one enthusiast.
  tenant_id   uuid references tenants(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  helpful     boolean not null,
  created_at  timestamptz not null default now(),
  unique (article_id, profile_id)
);

create table tickets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  reference   text not null,

  subject     text not null,
  body        text not null,
  category    text,
  -- Priority is what the customer says it is. Response targets are measured
  -- in working hours and are targets, not guarantees, unless an SLA says so.
  priority    text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),

  status      text not null default 'open'
    check (status in ('open','waiting_on_customer','waiting_on_us','resolved','closed')),

  raised_by   uuid references profiles(id) on delete set null,
  raised_by_label text,
  -- Which module and screen the ticket came from, captured automatically. A
  -- support request with no context costs two round trips to establish it.
  context     jsonb not null default '{}'::jsonb,

  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (tenant_id, reference)
);

create trigger tickets_touch before update on tickets
  for each row execute function app.touch_updated_at();

create index tickets_open on tickets (tenant_id, created_at desc)
  where status not in ('resolved','closed');

create table ticket_replies (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  ticket_id   uuid not null references tickets(id) on delete cascade,
  body        text not null,
  author_id   uuid references profiles(id) on delete set null,
  author_label text,
  -- True for NHR Solution staff, false for the customer. Drives which side of
  -- the thread it appears on.
  from_support boolean not null default false,
  -- Internal notes are not shown to the customer.
  internal    boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index ticket_replies_ticket on ticket_replies (ticket_id, created_at);

-- ============================================================ integrations
create table integration_connections (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  -- Matches the catalogue key in the frontend: 'csv', 'xero', 'sage'.
  provider    text not null,

  status      text not null default 'connected'
    check (status in ('connected','paused','error','revoked')),
  scopes      jsonb not null default '[]'::jsonb,
  -- Whether a human has confirmed the field mapping. An unconfirmed mapping
  -- is the most common cause of a sync writing the wrong field.
  mapping_confirmed boolean not null default false,
  field_mapping jsonb not null default '{}'::jsonb,

  -- OAuth tokens, encrypted at application level. Never returned to a client
  -- under any circumstances.
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  token_expires_at timestamptz,
  external_account_id text,

  last_sync_at timestamptz,
  last_error  text,
  connected_at timestamptz not null default now(),
  connected_by uuid references profiles(id) on delete set null,

  unique (tenant_id, provider)
);

create table api_keys (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,

  label       text not null,
  -- The visible prefix, for identification in a list: 'nhr_live_7Kq2'.
  prefix      text not null,
  -- SHA-256 of the full key. The key itself is shown once at creation and is
  -- not recoverable — if it is lost it must be revoked and replaced.
  key_hash    text not null unique,

  scopes      jsonb not null default '[]'::jsonb,
  -- Optional IP allow-list. For a server-to-server key this is cheap and
  -- removes most of the risk of a leaked credential.
  allowed_ips jsonb,

  last_used_at timestamptz,
  last_used_ip inet,
  expires_at  timestamptz,
  revoked_at  timestamptz,
  revoked_by  uuid references profiles(id) on delete set null,

  created_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);

create index api_keys_tenant on api_keys (tenant_id) where revoked_at is null;
create index api_keys_lookup on api_keys (key_hash) where revoked_at is null;

create table webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,

  url         text not null check (url ~ '^https://'),
  events      jsonb not null default '[]'::jsonb,
  -- HMAC signing secret, encrypted. The customer verifies the signature
  -- before trusting the body; an unauthenticated webhook endpoint is an open
  -- door into their systems.
  signing_secret_encrypted bytea not null,

  active      boolean not null default true,
  -- Consecutive failures. After 10 the endpoint is auto-paused and the
  -- customer is emailed, rather than retrying into a wall forever.
  consecutive_failures int not null default 0,
  paused_at   timestamptz,
  paused_reason text,

  created_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);

create index webhook_endpoints_active on webhook_endpoints (tenant_id) where active;

create table webhook_deliveries (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,

  event       text not null,
  payload     jsonb not null,
  -- Idempotency key sent in the header, so a customer can safely de-duplicate
  -- a retry.
  delivery_id uuid not null default gen_random_uuid(),

  attempt     int not null default 1,
  status_code int,
  response_body text,
  duration_ms int,
  error       text,

  -- Separated from real deliveries. A test fire proves the payload shape, not
  -- that the endpoint works, and mixing them makes the log misleading.
  is_test     boolean not null default false,

  -- Exponential backoff: 1m, 5m, 25m, 2h, 10h.
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index webhook_deliveries_endpoint on webhook_deliveries (endpoint_id, created_at desc);
create index webhook_deliveries_retry on webhook_deliveries (next_retry_at)
  where delivered_at is null and next_retry_at is not null;

create table sync_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  provider    text not null,
  direction   text not null check (direction in ('import','export')),
  records     int not null default 0,
  result      text not null default 'complete'
    check (result in ('complete','partial','failed')),
  -- Per-row errors from a CSV import, so a partial success tells the user
  -- exactly which rows to fix rather than making them guess.
  errors      jsonb not null default '[]'::jsonb,
  note        text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid references profiles(id) on delete set null
);

create index sync_log_tenant on sync_log (tenant_id, started_at desc);

-- ============================================================ marketing capture
-- Not tenant-scoped: these arrive before a tenant exists. Written by the
-- public anon role through a tightly-scoped policy in 0008.
create table enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       citext not null,
  phone       text,
  company     text,
  employee_band text,
  sector      text,
  route       text,                      -- 'sales', 'support', 'data_protection'
  subject     text,
  message     text not null,

  -- A data protection request has a statutory one-month deadline that starts
  -- when it reaches anyone at the company. Flagged on arrival so the clock is
  -- visible from the first minute rather than discovered later.
  is_dsr      boolean not null default false,
  dsr_due_on  date,

  status      text not null default 'new'
    check (status in ('new','in_progress','responded','closed','spam')),
  -- Where it came from and whether it looked automated. Held for spam
  -- triage, deleted with the enquiry.
  source_page text,
  ip          inet,

  created_at  timestamptz not null default now(),
  responded_at timestamptz,
  -- 24 months from last contact unless a commercial relationship begins.
  delete_after date
);

create index enquiries_new on enquiries (created_at desc) where status = 'new';
create index enquiries_dsr on enquiries (dsr_due_on) where is_dsr and status <> 'closed';

create table demo_bookings (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       citext not null,
  phone       text,
  company     text not null,
  employee_band text,
  sector      text,
  modules_of_interest jsonb not null default '[]'::jsonb,

  preferred_on date,
  preferred_slot text,
  confirmed_at timestamptz,
  -- Set once the prospect converts, linking the booking to the tenant.
  became_tenant_id uuid references tenants(id) on delete set null,

  message     text,
  status      text not null default 'requested'
    check (status in ('requested','confirmed','held','no_show','cancelled','converted')),
  source_page text,
  created_at  timestamptz not null default now(),
  delete_after date
);

create index demo_bookings_upcoming on demo_bookings (preferred_on)
  where status in ('requested','confirmed');

commit;
