-- 0014 · fix the order provisioning writes its rows in
--
-- 0011 inserted the employee before the profile, but employees.created_by
-- references profiles(id). Provisioning therefore always failed with a
-- foreign key violation and no account could be created at all.
--
-- The profile now goes first with a null employee_id — the column is nullable
-- for exactly this case, an admin who is not an employee — then the employee,
-- then the profile is pointed at it.

begin;
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
  -- Before the employee: employees.created_by points at this row.
  insert into profiles (id, tenant_id, email, name, role, employee_id, accepted_at)
  values (p_user_id, t_id, p_email, trim(p_admin_name), 'super_admin', null, now());

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

  update profiles set employee_id = e_id where id = p_user_id;

  insert into employee_pay (tenant_id, employee_id) values (t_id, e_id);

  -- The profile last, because it is what the access token hook reads. Until
  -- this row exists the user's JWT carries no tenant and they see nothing —
  -- which is the correct state mid-provisioning.
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

commit;
