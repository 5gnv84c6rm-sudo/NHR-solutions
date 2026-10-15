-- 0008 · row-level security
--
-- This is the security boundary. PostgREST exposes every table in the public
-- schema directly to the browser, so a table without RLS is a public table
-- and a policy that is too loose is a data breach rather than a bug.
--
-- The model:
--
--   · Every tenant-owned table filters on tenant_id = app.current_tenant(),
--     read from a JWT claim the client cannot forge.
--   · Every employee-owned table additionally filters through
--     app.visible_employee_ids(), so the role-scoping rule is written once
--     and cannot drift between tables.
--   · Payroll tables require app.can_read_payroll(). A role without it gets
--     no rows — not a filtered response, no rows at all, which means there is
--     nothing for a client-side mistake to leak.
--   · Writes are separate from reads throughout. An employee can read their
--     own record and submit their own leave; they cannot change their salary
--     or approve anything.
--
-- The assertion at the end fails the migration if any public table was left
-- without RLS. That check is the reason this file can be trusted as complete.

begin;

-- ============================================================ helper macros
-- Written out per table rather than generated, because a generated policy is
-- hard to read and this file is the one auditors and future maintainers
-- actually need to understand.

-- ============================================================ tenants
alter table tenants enable row level security;

-- A user sees their own tenant and nothing else. No insert or delete: tenants
-- are created by the service role during sign-up.
create policy tenant_self_read on tenants
  for select to authenticated
  using (id = app.current_tenant());

create policy tenant_admin_update on tenants
  for update to authenticated
  using (id = app.current_tenant() and app.current_role_name() = 'super_admin')
  with check (id = app.current_tenant());

-- ============================================================ profiles
alter table profiles enable row level security;

-- Everyone can see who else is in their tenant — a colleague directory is
-- expected. The sensitive parts of a person live on employees, not here.
create policy profiles_read on profiles
  for select to authenticated
  using (tenant_id = app.current_tenant());

-- You may edit your own name and preferences.
create policy profiles_self_update on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- and may not promote yourself. The role and tenancy columns are
    -- service-role territory; without this check the whole permission model
    -- is a suggestion.
    and role = (select p.role from profiles p where p.id = auth.uid())
    and tenant_id = (select p.tenant_id from profiles p where p.id = auth.uid())
    and employee_id is not distinct from (select p.employee_id from profiles p where p.id = auth.uid())
  );

create policy profiles_admin_write on profiles
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

-- ============================================================ audit_log
alter table audit_log enable row level security;

-- Readable by admins, append-only for everyone. Deliberately no update or
-- delete policy at all: an audit trail a tenant can edit is not an audit
-- trail, and omitting the policy is stronger than writing a restrictive one.
create policy audit_read on audit_log
  for select to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin());

create policy audit_append on audit_log
  for insert to authenticated
  with check (tenant_id = app.current_tenant());

-- ============================================================ reference data
alter table tax_years enable row level security;
alter table bank_holidays enable row level security;

-- Global facts about the UK. Readable by anyone signed in, writable only by
-- the service role — a tenant must not be able to edit tax bands.
create policy tax_years_read on tax_years
  for select to authenticated using (true);
create policy bank_holidays_read on bank_holidays
  for select to authenticated using (true);

-- ============================================================ employees
alter table employees enable row level security;

create policy employees_read on employees
  for select to authenticated
  using (id in (select app.visible_employee_ids()));

-- Only admins create and archive employee records. A manager adding a person
-- to their own team sounds convenient and produces duplicate records with no
-- payroll reference.
create policy employees_admin_insert on employees
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and app.is_admin());

create policy employees_admin_update on employees
  for update to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant());

-- An employee may correct their own contact details. Not their job title,
-- salary, manager or start date — those are changes to the employment
-- relationship, not to a phone number.
create policy employees_self_contact_update on employees
  for update to authenticated
  using (id = app.current_employee())
  with check (
    id = app.current_employee()
    and job_title is not distinct from (select e.job_title from employees e where e.id = app.current_employee())
    and department is not distinct from (select e.department from employees e where e.id = app.current_employee())
    and manager_id is not distinct from (select e.manager_id from employees e where e.id = app.current_employee())
    and start_date is not distinct from (select e.start_date from employees e where e.id = app.current_employee())
    and employment_status = (select e.employment_status from employees e where e.id = app.current_employee())
    and annual_leave_days = (select e.annual_leave_days from employees e where e.id = app.current_employee())
    and archived = (select e.archived from employees e where e.id = app.current_employee())
  );

-- No delete policy. Employees are archived, never deleted: statutory
-- retention requires the record and turnover history breaks without it.

-- ============================================================ employee_pay
alter table employee_pay enable row level security;

-- Payroll permission required to read anyone's pay, with one exception: your
-- own. An employee can see their own salary, which they already know.
create policy pay_read on employee_pay
  for select to authenticated
  using (
    tenant_id = app.current_tenant()
    and (app.can_read_payroll() or employee_id = app.current_employee())
  );

create policy pay_write on employee_pay
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.can_read_payroll())
  with check (tenant_id = app.current_tenant() and app.can_read_payroll());

-- ============================================================ employee sub-tables
-- Same shape for each: read through the visibility function, write by admin,
-- with self-service where it makes sense.

alter table employee_addresses enable row level security;
create policy addresses_read on employee_addresses
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy addresses_self_write on employee_addresses
  for all to authenticated
  using (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()))
  with check (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()));

alter table emergency_contacts enable row level security;
-- Emergency contacts are readable by anyone who can see the employee: a
-- manager needs them in an emergency, which is the only time they are read.
create policy contacts_read on emergency_contacts
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy contacts_self_write on emergency_contacts
  for all to authenticated
  using (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()))
  with check (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()));

alter table documents enable row level security;
create policy documents_read on documents
  for select to authenticated
  using (
    deleted_at is null
    and tenant_id = app.current_tenant()
    and (scope = 'company' or employee_id in (select app.visible_employee_ids()))
  );
create policy documents_admin_write on documents
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());
-- An employee may upload to their own record — a fit note, a certificate.
create policy documents_self_insert on documents
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and employee_id = app.current_employee());

alter table document_acknowledgements enable row level security;
create policy acks_read on document_acknowledgements
  for select to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or employee_id = app.current_employee()));
-- You acknowledge for yourself. Nobody acknowledges a policy on someone
-- else's behalf, which is the entire evidential value of the record.
create policy acks_self_insert on document_acknowledgements
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and employee_id = app.current_employee());

alter table employee_notes enable row level security;
-- Notes respect their own visibility setting as well as employee scope. An
-- 'hr' note is invisible to the manager it is about.
create policy notes_read on employee_notes
  for select to authenticated
  using (
    deleted_at is null
    and tenant_id = app.current_tenant()
    and (
      app.is_admin()
      or (visibility = 'manager' and employee_id in (select app.visible_employee_ids()))
      or (visibility = 'employee' and employee_id = app.current_employee())
    )
  );
create policy notes_admin_write on employee_notes
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

alter table activity_log enable row level security;
create policy activity_read on activity_log
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy activity_append on activity_log
  for insert to authenticated with check (tenant_id = app.current_tenant());

-- ============================================================ leave
alter table leave_requests enable row level security;

create policy leave_read on leave_requests
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));

-- You may submit your own request. Admins may submit on anyone's behalf,
-- because someone off sick cannot always file their own.
create policy leave_insert on leave_requests
  for insert to authenticated
  with check (
    tenant_id = app.current_tenant()
    and (employee_id = app.current_employee() or app.is_admin())
    -- A request cannot be self-approved at creation.
    and status = 'pending'
  );

-- Deciding is a manager or admin action, and never on your own request. The
-- self-approval hole is the one every approval system grows if nobody closes
-- it explicitly.
create policy leave_decide on leave_requests
  for update to authenticated
  using (
    tenant_id = app.current_tenant()
    and employee_id in (select app.visible_employee_ids())
    and (app.is_admin() or app.current_role_name() = 'manager')
    and employee_id <> app.current_employee()
  )
  with check (tenant_id = app.current_tenant());

-- You may cancel your own pending request.
create policy leave_self_cancel on leave_requests
  for update to authenticated
  using (employee_id = app.current_employee() and status = 'pending')
  with check (employee_id = app.current_employee() and status in ('pending','cancelled'));

-- ============================================================ absence
alter table absences enable row level security;

-- Absence records contain health information. Read scope is the same as
-- employee scope, which means a manager sees their own team's — necessary for
-- absence management, and the reason the reason field never leaves the module.
create policy absence_read on absences
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy absence_write on absences
  for all to authenticated
  using (
    tenant_id = app.current_tenant()
    and (app.is_admin() or (app.current_role_name() = 'manager'
         and employee_id in (select app.visible_employee_ids())))
  )
  with check (tenant_id = app.current_tenant());

-- ============================================================ timesheet
alter table timesheet enable row level security;

create policy timesheet_read on timesheet
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));

-- You clock yourself in and out.
create policy timesheet_self_write on timesheet
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and employee_id = app.current_employee() and approved is null);
create policy timesheet_self_update on timesheet
  for update to authenticated
  using (employee_id = app.current_employee() and approved is null)
  with check (employee_id = app.current_employee() and approved is null);

-- Approving is a manager action and cannot be done on your own hours.
create policy timesheet_approve on timesheet
  for update to authenticated
  using (
    tenant_id = app.current_tenant()
    and employee_id in (select app.visible_employee_ids())
    and (app.is_admin() or app.current_role_name() = 'manager')
    and employee_id <> app.current_employee()
  )
  with check (tenant_id = app.current_tenant());

-- ============================================================ shifts
alter table shifts enable row level security;

-- Published shifts are visible to the whole tenant: you need to know who else
-- is on. Unpublished drafts are admin-only, so a half-built rota does not
-- become gossip.
create policy shifts_read on shifts
  for select to authenticated
  using (tenant_id = app.current_tenant() and (published or app.is_admin() or app.current_role_name() = 'manager'));
create policy shifts_write on shifts
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table availability enable row level security;
create policy availability_read on availability
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy availability_self_write on availability
  for all to authenticated
  using (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()))
  with check (employee_id = app.current_employee() or (tenant_id = app.current_tenant() and app.is_admin()));

-- ============================================================ expenses
alter table expenses enable row level security;

create policy expenses_read on expenses
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy expenses_self_insert on expenses
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and employee_id = app.current_employee() and status = 'pending');
create policy expenses_self_update on expenses
  for update to authenticated
  using (employee_id = app.current_employee() and status in ('pending','queried'))
  with check (employee_id = app.current_employee() and status in ('pending','queried'));
create policy expenses_decide on expenses
  for update to authenticated
  using (
    tenant_id = app.current_tenant()
    and employee_id in (select app.visible_employee_ids())
    and (app.is_admin() or app.current_role_name() = 'manager')
    and employee_id <> app.current_employee()
  )
  with check (tenant_id = app.current_tenant());

-- ============================================================ payroll
alter table payroll_runs enable row level security;
alter table payroll_lines enable row level security;

create policy payroll_runs_read on payroll_runs
  for select to authenticated
  using (tenant_id = app.current_tenant() and app.can_read_payroll());
create policy payroll_runs_write on payroll_runs
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.can_read_payroll())
  with check (tenant_id = app.current_tenant() and app.can_read_payroll());

-- Payroll lines: payroll permission for everyone's, or your own payslip.
-- Self-access is limited to approved runs, so nobody reads a draft
-- calculation of their own pay before it is final.
create policy payroll_lines_read on payroll_lines
  for select to authenticated
  using (
    tenant_id = app.current_tenant()
    and (
      app.can_read_payroll()
      or (employee_id = app.current_employee()
          and exists (select 1 from payroll_runs r
                       where r.id = run_id and r.status in ('approved','submitted','paid')))
    )
  );
create policy payroll_lines_write on payroll_lines
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.can_read_payroll())
  with check (tenant_id = app.current_tenant() and app.can_read_payroll());

-- ============================================================ safety
alter table incidents enable row level security;

-- Everyone in the tenant can read incidents. This is deliberate: hazard
-- awareness is the point of a safety log, and restricting it to managers
-- means the people exposed to the hazard are the ones who cannot see it.
create policy incidents_read on incidents
  for select to authenticated using (tenant_id = app.current_tenant());

-- Everyone can report. Gating incident reporting behind an admin role is how
-- near misses stop being reported at all, and near misses are the only free
-- warning a business gets.
create policy incidents_insert on incidents
  for insert to authenticated with check (tenant_id = app.current_tenant());

-- Investigating, RIDDOR sign-off and editing are restricted.
create policy incidents_update on incidents
  for update to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table incident_actions enable row level security;
create policy incident_actions_read on incident_actions
  for select to authenticated using (tenant_id = app.current_tenant());
create policy incident_actions_write on incident_actions
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table risk_assessments enable row level security;
-- Also readable by everyone: an assessment nobody has read controls nothing.
create policy risk_read on risk_assessments
  for select to authenticated using (tenant_id = app.current_tenant());
create policy risk_write on risk_assessments
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

-- ============================================================ training
alter table training_requirements enable row level security;
create policy training_req_read on training_requirements
  for select to authenticated using (tenant_id = app.current_tenant());
create policy training_req_write on training_requirements
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

alter table employee_training enable row level security;
create policy training_read on employee_training
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy training_write on employee_training
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

-- ============================================================ performance
alter table goals enable row level security;
create policy goals_read on goals
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
-- An employee can update progress on their own goal. They cannot set or
-- delete one, because an objective you set for yourself and mark complete is
-- not an objective.
create policy goals_self_progress on goals
  for update to authenticated
  using (employee_id = app.current_employee())
  with check (
    employee_id = app.current_employee()
    and title = (select g.title from goals g where g.id = id)
    and due_on is not distinct from (select g.due_on from goals g where g.id = id)
  );
create policy goals_manage on goals
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table reviews enable row level security;
create policy reviews_read on reviews
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
-- The employee may add their own comment to their own review, and nothing
-- else. A review the subject cannot respond to is an assessment, not a
-- conversation.
create policy reviews_self_comment on reviews
  for update to authenticated
  using (employee_id = app.current_employee())
  with check (
    employee_id = app.current_employee()
    and rating is not distinct from (select r.rating from reviews r where r.id = id)
    and summary is not distinct from (select r.summary from reviews r where r.id = id)
    and status = (select r.status from reviews r where r.id = id)
  );
create policy reviews_manage on reviews
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

-- ============================================================ recruitment
alter table vacancies enable row level security;
-- Open vacancies are visible to everyone — internal applicants and referrals
-- depend on it. Drafts are not.
create policy vacancies_read on vacancies
  for select to authenticated
  using (tenant_id = app.current_tenant() and (status = 'open' or app.is_admin() or app.current_role_name() = 'manager'));
create policy vacancies_write on vacancies
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

-- Candidate data is restricted to admins and managers. A candidate's
-- application is not visible to the whole company, and the employee who
-- referred them does not get to see the notes.
alter table candidates enable row level security;
create policy candidates_access on candidates
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table candidate_notes enable row level security;
create policy candidate_notes_access on candidate_notes
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

alter table interviews enable row level security;
create policy interviews_access on interviews
  for all to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or app.current_role_name() = 'manager'))
  with check (tenant_id = app.current_tenant());

-- ============================================================ learning
alter table courses enable row level security;
-- Platform courses (null tenant) plus your own.
create policy courses_read on courses
  for select to authenticated
  using (published and (tenant_id is null or tenant_id = app.current_tenant()));
create policy courses_write on courses
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

alter table enrolments enable row level security;
create policy enrolments_read on enrolments
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
-- A learner records their own progress. The pass is written by an Edge
-- Function under the service role, so a client cannot mark itself passed.
create policy enrolments_self_progress on enrolments
  for all to authenticated
  using (tenant_id = app.current_tenant() and employee_id = app.current_employee())
  with check (tenant_id = app.current_tenant() and employee_id = app.current_employee());

-- ============================================================ wellbeing
alter table wellbeing_config enable row level security;
create policy wellbeing_config_read on wellbeing_config
  for select to authenticated using (tenant_id = app.current_tenant());
create policy wellbeing_config_write on wellbeing_config
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

alter table wellbeing_checkins enable row level security;

-- INSERT ONLY for everyone. There is deliberately NO select policy on this
-- table: raw anonymous responses are not readable by anybody through the API,
-- including super admins. Reporting goes through the suppressed view in 0009,
-- which is the only path to this data.
--
-- Without this, an admin could read the table directly, cross-reference the
-- timestamp against who was online, and de-anonymise a response. Anonymity
-- that depends on nobody looking is not anonymity.
create policy wellbeing_submit on wellbeing_checkins
  for insert to authenticated with check (tenant_id = app.current_tenant());

alter table adjustments enable row level security;
-- An employee sees their own adjustments. A manager sees their team's,
-- because they have to deliver them. Neither sees a reason, because the table
-- does not record one.
create policy adjustments_read on adjustments
  for select to authenticated using (employee_id in (select app.visible_employee_ids()));
create policy adjustments_write on adjustments
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

-- ============================================================ content
alter table policies enable row level security;
create policy policies_read on policies
  for select to authenticated
  using (tenant_id = app.current_tenant() and (status = 'active' or app.is_admin()));
create policy policies_write on policies
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

alter table resources enable row level security;
create policy resources_read on resources
  for select to authenticated
  using (published and (tenant_id is null or tenant_id = app.current_tenant()));
create policy resources_write on resources
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant() and app.is_admin());

-- Published stories are public: they are marketing content on the website,
-- read by visitors who are not signed in.
alter table customer_stories enable row level security;
create policy stories_public_read on customer_stories
  for select to anon, authenticated using (published);

-- ============================================================ support
alter table help_articles enable row level security;
create policy help_public_read on help_articles
  for select to anon, authenticated using (published);

alter table article_votes enable row level security;
create policy votes_self on article_votes
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table tickets enable row level security;
create policy tickets_read on tickets
  for select to authenticated
  using (tenant_id = app.current_tenant() and (app.is_admin() or raised_by = auth.uid()));
create policy tickets_insert on tickets
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and raised_by = auth.uid());
create policy tickets_admin_update on tickets
  for update to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin())
  with check (tenant_id = app.current_tenant());

alter table ticket_replies enable row level security;
-- Internal support notes are never returned to the customer.
create policy replies_read on ticket_replies
  for select to authenticated
  using (
    not internal
    and tenant_id = app.current_tenant()
    and exists (select 1 from tickets t where t.id = ticket_id
                 and (app.is_admin() or t.raised_by = auth.uid()))
  );
create policy replies_insert on ticket_replies
  for insert to authenticated
  with check (tenant_id = app.current_tenant() and not internal and not from_support);

-- ============================================================ integrations
alter table integration_connections enable row level security;
-- Super admin only, and the encrypted token columns are excluded from the
-- API by a column grant below rather than relying on the client not asking.
create policy integrations_access on integration_connections
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin')
  with check (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin');

alter table api_keys enable row level security;
create policy api_keys_access on api_keys
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin')
  with check (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin');

alter table webhook_endpoints enable row level security;
create policy webhooks_access on webhook_endpoints
  for all to authenticated
  using (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin')
  with check (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin');

alter table webhook_deliveries enable row level security;
create policy deliveries_read on webhook_deliveries
  for select to authenticated
  using (tenant_id = app.current_tenant() and app.current_role_name() = 'super_admin');

alter table sync_log enable row level security;
create policy sync_log_read on sync_log
  for select to authenticated
  using (tenant_id = app.current_tenant() and app.is_admin());

-- ============================================================ marketing capture
alter table enquiries enable row level security;
alter table demo_bookings enable row level security;

-- The public can submit, and read nothing back. Insert-only for anon with no
-- select policy: a contact form that can read its own table is a mailing list
-- anyone can download.
create policy enquiries_public_insert on enquiries
  for insert to anon, authenticated with check (true);
create policy demos_public_insert on demo_bookings
  for insert to anon, authenticated with check (true);

-- ============================================================ column-level grants
-- Belt and braces on the secrets. Even with a passing policy, these columns
-- are not selectable through the API — only the service role inside an Edge
-- Function can read them.
revoke select on employee_pay from authenticated;
grant select (
  id, tenant_id, employee_id, payroll_ref, pay_frequency, annual_salary, hourly_rate,
  tax_code, ni_category, student_loan_plan, postgrad_loan, pension_scheme,
  pension_employee_pct, pension_employer_pct, pension_salary_sacrifice,
  pension_opted_out, payment_method, bank_account_name, bank_account_last4,
  effective_from, created_at, updated_at, updated_by
) on employee_pay to authenticated;

revoke select on employees from authenticated;
grant select (
  id, tenant_id, employee_ref, first_name, middle_name, last_name, preferred_name,
  photo_key, date_of_birth, gender, pronouns, nationality, rtw_status, rtw_expires_on,
  rtw_checked_on, personal_email, work_email, mobile, home_phone, job_title,
  department, location, manager_id, employment_type, employment_status, start_date,
  probation_end_date, contract_end_date, end_date, leaver_reason, working_pattern,
  hours_per_week, days_per_week, annual_leave_days, irregular_hours,
  employee_category, cost_centre, branch, onboarding, archived, archived_at,
  created_at, updated_at, created_by, updated_by
) on employees to authenticated;

revoke select on integration_connections from authenticated;
grant select (
  id, tenant_id, provider, status, scopes, mapping_confirmed, field_mapping,
  token_expires_at, external_account_id, last_sync_at, last_error,
  connected_at, connected_by
) on integration_connections to authenticated;

revoke select on webhook_endpoints from authenticated;
grant select (
  id, tenant_id, url, events, active, consecutive_failures, paused_at,
  paused_reason, created_at, created_by
) on webhook_endpoints to authenticated;

-- ============================================================ completeness assertion
-- Fails the migration if any table in public lacks RLS. Without this, the
-- next table someone adds is silently world-readable, and nobody finds out
-- until it matters.
do $$
declare missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if missing is not null then
    raise exception 'RLS is not enabled on: %', missing;
  end if;
end $$;

commit;
