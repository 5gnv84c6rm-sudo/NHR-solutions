-- 0011 · tenant provisioning
--
-- Sign-up is the one flow with no tenant to scope to. app.current_tenant()
-- returns null, so every policy written in 0008 denies everything — correctly.
-- Provisioning therefore runs under the service role, from an Edge Function,
-- never from the browser.
--
-- The hard requirement is atomicity. A half-provisioned account is the worst
-- possible outcome: an auth user exists, so the email is taken and sign-up
-- cannot be retried, but there is no profile, so the JWT carries no tenant and
-- every screen is empty. The user is locked out of an account they cannot
-- recreate, and support has to fix it by hand.
--
-- So: Auth creates the user (only the Auth API can), then this one function
-- does everything else in a single transaction.

begin;

-- ---------------------------------------------------------------- slug
-- Derived from the company name, uniqueness-checked. Used in URLs and in the
-- eventual subdomain, so it has to be stable and safe.
create or replace function app.tenant_slug(p_name text)
returns text language plpgsql as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  base := left(nullif(base, ''), 40);
  if base is null then base := 'company'; end if;

  -- Reserved words that would collide with our own routes.
  if base in ('app','api','www','admin','help','support','docs','status','billing') then
    base := base || '-co';
  end if;

  candidate := base;
  loop
    exit when not exists (select 1 from tenants where slug = candidate);
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  return candidate;
end $$;

-- ---------------------------------------------------------------- provisioning
-- Creates tenant, profile, the administrator's own employee record, the
-- default training matrix and the wellbeing config. One transaction: either
-- the account works or it does not exist.
--
-- SECURITY: service_role only. Granting this to authenticated would let any
-- signed-in user create tenants at will.
create or replace function app.provision_tenant(
  p_user_id       uuid,      -- from the Auth API, already created
  p_email         citext,
  p_admin_name    text,
  p_company_name  text,
  p_plan          plan_tier default 'professional',
  p_nation        uk_nation default 'england_wales',
  p_employee_band text default null,
  p_sector        text default null,
  p_trial_days    int default 14
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t_id uuid;
  e_id uuid;
  first_name text;
  last_name  text;
begin
  -- Idempotency. A retried request after a network timeout must not create a
  -- second company — the user taps the button again and the first call
  -- already succeeded.
  select tenant_id into t_id from profiles where id = p_user_id;
  if t_id is not null then
    return jsonb_build_object(
      'tenant_id', t_id,
      'already_provisioned', true
    );
  end if;

  insert into tenants (
    name, slug, plan, status,
    -- The band the prospect selected is a hint, not a limit. Charging by
    -- actual active records and letting them exceed a guess is better than
    -- blocking the twelfth employee on a plan they picked before counting.
    employee_limit,
    trial_started_at, trial_ends_at, nation, billing_email
  ) values (
    trim(p_company_name),
    app.tenant_slug(p_company_name),
    p_plan,
    'trial',
    case p_employee_band
      when '1-10'    then 25
      when '11-50'   then 75
      when '51-200'  then 250
      when '201-500' then 600
      else null                        -- enterprise: no limit
    end,
    now(),
    now() + make_interval(days => p_trial_days),
    p_nation,
    p_email
  ) returning id into t_id;

  -- Split the name for the employee record. Imperfect by nature — a single
  -- word becomes the first name, which is better than guessing at a surname.
  first_name := split_part(trim(p_admin_name), ' ', 1);
  last_name  := nullif(trim(substring(trim(p_admin_name) from position(' ' in trim(p_admin_name)) + 1)), '');

  -- The administrator is almost always an employee of their own company, and
  -- a founder who is not in their own HR system finds an empty product. Their
  -- record is created here so the dashboard has something in it from the
  -- first screen.
  insert into employees (
    tenant_id, employee_ref, first_name, last_name, work_email,
    job_title, department, employment_type, employment_status,
    start_date, rtw_status, created_by, updated_by
  ) values (
    t_id, app.next_employee_ref(t_id),
    first_name, coalesce(last_name, '—'), p_email,
    'Administrator', 'Operations', 'full_time', 'active',
    current_date, 'not_required', p_user_id, p_user_id
  ) returning id into e_id;

  insert into employee_pay (tenant_id, employee_id) values (t_id, e_id);

  -- The profile last, because it is what the access token hook reads. Until
  -- this row exists the user's JWT carries no tenant and they see nothing —
  -- which is the correct state mid-provisioning.
  insert into profiles (id, tenant_id, email, name, role, employee_id, accepted_at)
  values (p_user_id, t_id, p_email, trim(p_admin_name), 'super_admin', e_id, now());

  insert into wellbeing_config (tenant_id, questions) values (
    t_id,
    '[{"key":"overall","text":"How has work felt this week?"},
      {"key":"workload","text":"Was your workload manageable?"},
      {"key":"support","text":"Did you get the support you needed?"},
      {"key":"balance","text":"Could you switch off outside work?"}]'::jsonb
  );

  -- A starting compliance matrix, so the Training module is not an empty
  -- screen with no explanation of what it wants. Sector-specific additions
  -- below; these four apply to any UK employer.
  insert into training_requirements (tenant_id, course_name, category, renew_every, warn_days)
  values
    (t_id, 'Fire Safety Awareness', 'Health & Safety', 365, 60),
    (t_id, 'GDPR and Data Protection', 'Compliance', 730, 60),
    (t_id, 'Equality, Diversity and Inclusion', 'Compliance', 730, 60),
    (t_id, 'Manual Handling', 'Health & Safety', 365, 60);

  if p_sector in ('Healthcare','Care Services') then
    insert into training_requirements
      (tenant_id, course_name, category, renew_every, warn_days, external_provider_required)
    values
      (t_id, 'Safeguarding Adults', 'Compliance', 1095, 90, false),
      (t_id, 'Infection Prevention and Control', 'Health & Safety', 365, 60, false),
      -- Must come from an approved provider; internal eLearning cannot
      -- satisfy it, and the flag keeps the compliance view honest.
      (t_id, 'Emergency First Aid at Work', 'Health & Safety', 1095, 90, true);
  elsif p_sector = 'Construction' then
    insert into training_requirements
      (tenant_id, course_name, category, renew_every, warn_days, external_provider_required)
    values
      (t_id, 'Working at Height', 'Health & Safety', 365, 60, false),
      (t_id, 'Asbestos Awareness', 'Health & Safety', 365, 60, false),
      (t_id, 'Emergency First Aid at Work', 'Health & Safety', 1095, 90, true);
  end if;

  insert into audit_log (tenant_id, actor_id, actor_label, action, entity_type, entity_id, after)
  values (
    t_id, p_user_id, trim(p_admin_name), 'tenant.provisioned', 'tenant', t_id,
    jsonb_build_object('plan', p_plan, 'nation', p_nation, 'trial_days', p_trial_days)
  );

  return jsonb_build_object(
    'tenant_id', t_id,
    'employee_id', e_id,
    'slug', (select slug from tenants where id = t_id),
    'trial_ends_at', (select trial_ends_at from tenants where id = t_id),
    'already_provisioned', false
  );
end $$;

revoke all on function app.provision_tenant from public, anon, authenticated;
grant execute on function app.provision_tenant to service_role;

-- ---------------------------------------------------------------- trial state
-- Read by the client to decide what to lock. Server-authoritative: the
-- prototype kept this in localStorage, where anyone could extend their own
-- trial by editing a date.
create or replace function trial_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t record;
begin
  select * into t from tenants where id = app.current_tenant();
  if t is null then return jsonb_build_object('status', 'unknown'); end if;

  return jsonb_build_object(
    'status', t.status,
    'plan', t.plan,
    'trial_ends_at', t.trial_ends_at,
    'days_remaining', greatest(0, extract(day from t.trial_ends_at - now())::int),
    'expired', t.status = 'trial' and t.trial_ends_at < now(),
    'employee_limit', t.employee_limit,
    'employee_count', (select count(*) from employees
                        where tenant_id = t.id and not archived)
  );
end $$;

grant execute on function trial_status to authenticated;

-- Nightly: move expired trials to past_due rather than deleting anything. The
-- data stays; access is what changes, and a customer who returns three weeks
-- later still has their employee list.
select cron.schedule('trial-expiry', '5 1 * * *', $$
  update tenants set status = 'past_due'
  where status = 'trial' and trial_ends_at < now()
$$);

commit;
