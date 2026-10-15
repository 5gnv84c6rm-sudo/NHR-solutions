-- 0013 · the two things 0011's provisioning needs to actually run
--
-- Both were missing, so sign-up failed before this: app.provision_tenant()
-- calls app.next_employee_ref(), which only ever existed in
-- MIGRATING_ADD_EMPLOYEE.md, and PostgREST only exposes the public schema, so
-- the documented rpc('provision_tenant') call could never reach the function
-- in the app schema.

begin;

create or replace function app.next_employee_ref(p_tenant uuid)
returns text language plpgsql as $$
declare n int;
begin
  -- Serialises the read-then-write, so two admins adding someone at the same
  -- moment cannot claim the same reference. Keyed per tenant so tenants do not
  -- block each other.
  perform pg_advisory_xact_lock(hashtext('employee_ref:' || p_tenant::text));

  select coalesce(max(nullif(regexp_replace(employee_ref, '\D', '', 'g'), '')::int), 100) + 1
    into n
  from employees
  where tenant_id = p_tenant;

  return 'NHR-' || lpad(n::text, 6, '0');
end $$;

create or replace function public.provision_tenant(
  p_user_id       uuid,
  p_email         citext,
  p_admin_name    text,
  p_company_name  text,
  p_plan          plan_tier default 'professional',
  p_nation        uk_nation default 'england_wales',
  p_employee_band text default null,
  p_sector        text default null,
  p_trial_days    int default 14
) returns jsonb
language sql security definer set search_path = public as $$
  select app.provision_tenant(
    p_user_id, p_email, p_admin_name, p_company_name,
    p_plan, p_nation, p_employee_band, p_sector, p_trial_days
  )
$$;

-- Only the signup Edge Function, as service_role, may provision a workspace.
revoke all on function public.provision_tenant(uuid, citext, text, text, plan_tier, uk_nation, text, text, int)
  from public, anon, authenticated;
grant execute on function public.provision_tenant(uuid, citext, text, text, plan_tier, uk_nation, text, text, int)
  to service_role;

commit;
