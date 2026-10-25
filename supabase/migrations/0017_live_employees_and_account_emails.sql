-- 0017 · live employees for real accounts, and account emails
--
-- 1. Employees: the app now saves employee records for real (non-demo)
--    accounts. Address, emergency contacts, notes, documents list and the
--    activity trail ride in app_data until each gets its own table; pay goes
--    to employee_pay as before (payroll-restricted), with the NI number in
--    employee_pay.app_data so it is never readable by managers.
-- 2. Delete: admins may permanently delete an employee record added by
--    mistake. Archive remains the route for leavers. Nobody can delete their
--    own record, because their login is linked to it.
-- 3. Account emails: a welcome email when a company registers, and a plan
--    confirmation when a trial becomes a paid plan. Sent by the
--    send-candidate-email Edge Function, called with the shared secret.

begin;

-- ============================================================ employees
alter table employees    add column if not exists app_data jsonb not null default '{}'::jsonb;
alter table employee_pay add column if not exists app_data jsonb not null default '{}'::jsonb;

-- Column-level grants from 0008 list readable columns explicitly; add the new ones.
grant select (app_data) on employees to authenticated;
grant select (app_data) on employee_pay to authenticated;

drop policy if exists employees_admin_delete on employees;
create policy employees_admin_delete on employees
  for delete to authenticated
  using (
    tenant_id = app.current_tenant()
    and app.is_admin()
    and id is distinct from app.current_employee()
  );

-- The self-service policy from an earlier migration re-read employees inside
-- its own WITH CHECK, which Postgres rejects as infinite recursion, so no
-- update to employees could save. Same rule, enforced by a trigger instead:
-- staff may update their own contact details but not their job, manager,
-- dates, status, leave allowance or archive flag.
drop policy if exists employees_self_contact_update on employees;
create policy employees_self_contact_update on employees
  for update to authenticated
  using (id = app.current_employee())
  with check (id = app.current_employee());

create or replace function app.employees_self_update_guard()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or app.is_admin() then return new; end if;
  if new.job_title is distinct from old.job_title
     or new.department is distinct from old.department
     or new.manager_id is distinct from old.manager_id
     or new.start_date is distinct from old.start_date
     or new.employment_status is distinct from old.employment_status
     or new.annual_leave_days is distinct from old.annual_leave_days
     or new.archived is distinct from old.archived
     or new.tenant_id is distinct from old.tenant_id then
    raise exception 'Only HR can change job, manager, dates, status or leave allowance'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists employees_self_update_guard on employees;
create trigger employees_self_update_guard before update on employees
  for each row execute function app.employees_self_update_guard();

-- ============================================================ account emails
create or replace function app.send_account_email(p_template text, p_record jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cfg record;
begin
  select * into cfg from app.notify_config where id;
  if cfg is null or not cfg.enabled then return; end if;
  perform net.http_post(
    url := replace(cfg.function_url, 'notify-submission', 'send-candidate-email'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-nhr-notify-secret', cfg.secret),
    body := jsonb_build_object('template', p_template, 'record', p_record)
  );
end $$;
revoke all on function app.send_account_email from public, anon, authenticated;

-- Welcome: the account owner's profile is the last row sign-up writes, so
-- when it exists the workspace is fully provisioned.
create or replace function app.notify_account_welcome()
returns trigger language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if new.role <> 'super_admin' or new.email is null then return new; end if;
  select id, name, plan, status, trial_ends_at into t from tenants where id = new.tenant_id;
  if t is null then return new; end if;
  perform app.send_account_email('account_welcome', jsonb_build_object(
    'tenant_id', t.id, 'email', new.email, 'first_name', split_part(coalesce(new.name, ''), ' ', 1),
    'company', t.name, 'plan', initcap(t.plan::text), 'status', t.status::text,
    'trial_ends_on', to_char(t.trial_ends_at at time zone 'Europe/London', 'FMDD FMMonth YYYY')));
  return new;
end $$;

drop trigger if exists profiles_welcome_email on profiles;
create trigger profiles_welcome_email after insert on profiles
  for each row execute function app.notify_account_welcome();

-- Plan confirmed: a trial (or lapsed account) becomes active, or an active
-- account changes plan.
create or replace function app.notify_plan_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner record;
begin
  if not ((new.status = 'active' and old.status is distinct from 'active')
          or (new.status = 'active' and new.plan is distinct from old.plan)) then
    return new;
  end if;
  select email, name into owner from profiles
   where tenant_id = new.id and role = 'super_admin' and email is not null
   order by created_at limit 1;
  if owner is null and new.billing_email is null then return new; end if;
  perform app.send_account_email('plan_confirmed', jsonb_build_object(
    'tenant_id', new.id, 'email', coalesce(new.billing_email::text, owner.email::text),
    'first_name', split_part(coalesce(owner.name, ''), ' ', 1),
    'company', new.name, 'plan', initcap(new.plan::text)));
  return new;
end $$;

drop trigger if exists tenants_plan_email on tenants;
create trigger tenants_plan_email after update of status, plan on tenants
  for each row execute function app.notify_plan_change();

commit;
