-- seed.sql · local development data
--
-- Reference data first (real UK figures, needed for anything to calculate),
-- then a demo tenant matching the prototype's 12 employees so the new stack
-- can be diffed against the working prototype screen by screen.
--
-- Run automatically by `supabase db reset`.
--
-- No auth users are created here: those need the Auth API, not SQL. Create
-- one through the dashboard or the CLI, then run the profile-linking block at
-- the foot of this file.

-- ============================================================ tax year 2025/26
-- England, Wales and Northern Ireland. Scotland has its own bands and is
-- inserted separately below, because an employee taxed under an S-prefix code
-- needs the Scottish row, not a rate applied to the wrong bands.
insert into tax_years (
  label, starts_on, ends_on, nation,
  personal_allowance, taper_threshold,
  income_tax_bands, ni_employee_bands, ni_employer_bands, employment_allowance,
  auto_enrolment_lower, auto_enrolment_upper,
  min_employee_pension_pct, min_employer_pension_pct,
  student_loan_plans, national_living_wage
) values (
  '2025/26', '2025-04-06', '2026-04-05', 'england_wales',
  12570, 100000,
  -- Basic 20% to 50,270; higher 40% to 125,140; additional 45% above.
  '[{"name":"basic","rate":0.20,"upper":50270},
    {"name":"higher","rate":0.40,"upper":125140},
    {"name":"additional","rate":0.45,"upper":null}]'::jsonb,
  -- Employee NI: 8% between the primary threshold and upper earnings limit,
  -- 2% above.
  '[{"name":"main","rate":0.08,"lower":12570,"upper":50270},
    {"name":"upper","rate":0.02,"lower":50270,"upper":null}]'::jsonb,
  -- Employer NI: 15% above the secondary threshold of 5,000 from April 2025.
  '[{"name":"secondary","rate":0.15,"lower":5000,"upper":null}]'::jsonb,
  10500,
  6240, 50270,
  0.05, 0.03,
  '[{"plan":"1","threshold":26065,"rate":0.09},
    {"plan":"2","threshold":28470,"rate":0.09},
    {"plan":"4","threshold":32745,"rate":0.09},
    {"plan":"5","threshold":25000,"rate":0.09},
    {"plan":"postgrad","threshold":21000,"rate":0.06}]'::jsonb,
  '[{"band":"21_and_over","rate":12.21},
    {"band":"18_to_20","rate":10.00},
    {"band":"under_18","rate":7.55},
    {"band":"apprentice","rate":7.55}]'::jsonb
) on conflict (label, nation) do nothing;

-- Scotland: five bands rather than three, which is exactly why the bands are
-- jsonb and not a fixed column set.
insert into tax_years (
  label, starts_on, ends_on, nation,
  personal_allowance, taper_threshold,
  income_tax_bands, ni_employee_bands, ni_employer_bands, employment_allowance,
  auto_enrolment_lower, auto_enrolment_upper,
  min_employee_pension_pct, min_employer_pension_pct,
  student_loan_plans, national_living_wage
) values (
  '2025/26', '2025-04-06', '2026-04-05', 'scotland',
  12570, 100000,
  '[{"name":"starter","rate":0.19,"upper":15397},
    {"name":"basic","rate":0.20,"upper":27491},
    {"name":"intermediate","rate":0.21,"upper":43662},
    {"name":"higher","rate":0.42,"upper":75000},
    {"name":"advanced","rate":0.45,"upper":125140},
    {"name":"top","rate":0.48,"upper":null}]'::jsonb,
  -- NI is reserved, so the same as the rest of the UK.
  '[{"name":"main","rate":0.08,"lower":12570,"upper":50270},
    {"name":"upper","rate":0.02,"lower":50270,"upper":null}]'::jsonb,
  '[{"name":"secondary","rate":0.15,"lower":5000,"upper":null}]'::jsonb,
  10500, 6240, 50270, 0.05, 0.03,
  '[{"plan":"4","threshold":32745,"rate":0.09},
    {"plan":"postgrad","threshold":21000,"rate":0.06}]'::jsonb,
  '[{"band":"21_and_over","rate":12.21}]'::jsonb
) on conflict (label, nation) do nothing;

-- ============================================================ bank holidays
-- England & Wales 2026. Scotland and NI differ and are inserted below —
-- 2 January is a holiday in Scotland and not in England, which changes the
-- length of the same leave request.
insert into bank_holidays (nation, holiday_on, name, is_substitute) values
  ('england_wales','2026-01-01','New Year''s Day', false),
  ('england_wales','2026-04-03','Good Friday', false),
  ('england_wales','2026-04-06','Easter Monday', false),
  ('england_wales','2026-05-04','Early May bank holiday', false),
  ('england_wales','2026-05-25','Spring bank holiday', false),
  ('england_wales','2026-08-31','Summer bank holiday', false),
  ('england_wales','2026-12-25','Christmas Day', false),
  ('england_wales','2026-12-28','Boxing Day (substitute)', true),

  ('scotland','2026-01-01','New Year''s Day', false),
  ('scotland','2026-01-02','2 January', false),
  ('scotland','2026-04-03','Good Friday', false),
  ('scotland','2026-05-04','Early May bank holiday', false),
  ('scotland','2026-05-25','Spring bank holiday', false),
  ('scotland','2026-08-03','Summer bank holiday', false),
  ('scotland','2026-11-30','St Andrew''s Day', false),
  ('scotland','2026-12-25','Christmas Day', false),
  ('scotland','2026-12-28','Boxing Day (substitute)', true),

  ('northern_ireland','2026-01-01','New Year''s Day', false),
  ('northern_ireland','2026-03-17','St Patrick''s Day', false),
  ('northern_ireland','2026-04-03','Good Friday', false),
  ('northern_ireland','2026-04-06','Easter Monday', false),
  ('northern_ireland','2026-05-04','Early May bank holiday', false),
  ('northern_ireland','2026-05-25','Spring bank holiday', false),
  ('northern_ireland','2026-07-13','Battle of the Boyne (substitute)', true),
  ('northern_ireland','2026-08-31','Summer bank holiday', false),
  ('northern_ireland','2026-12-25','Christmas Day', false),
  ('northern_ireland','2026-12-28','Boxing Day (substitute)', true)
on conflict (nation, holiday_on) do nothing;

-- ============================================================ demo tenant
-- Fixed uuid so re-running the seed is idempotent and local API calls can
-- hardcode it during development.
insert into tenants (
  id, name, slug, plan, status, employee_limit,
  trial_started_at, trial_ends_at, nation, leave_year_start, billing_email
) values (
  '00000000-0000-4000-8000-000000000001',
  'Northgate Services Ltd', 'northgate', 'professional', 'trial', 50,
  now() - interval '3 days', now() + interval '11 days',
  'england_wales', '01-01', 'finance@northgate.example'
) on conflict (id) do nothing;

insert into wellbeing_config (tenant_id, min_group, cadence, questions) values (
  '00000000-0000-4000-8000-000000000001', 5, 'weekly',
  '[{"key":"overall","text":"How has work felt this week?"},
    {"key":"workload","text":"Was your workload manageable?"},
    {"key":"support","text":"Did you get the support you needed?"},
    {"key":"balance","text":"Could you switch off outside work?"}]'::jsonb
) on conflict (tenant_id) do nothing;

-- ============================================================ employees
-- The same 12 people as the prototype, so every screen can be compared
-- against the working version. Manager links are set in a second pass because
-- the table references itself.
insert into employees (
  id, tenant_id, employee_ref, first_name, last_name, work_email,
  job_title, department, location, employment_type, employment_status,
  start_date, probation_end_date, hours_per_week, days_per_week,
  annual_leave_days, rtw_status, rtw_expires_on
) values
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','NHR-000101','Amara','Osei','amara.osei@northgate.example','Operations Director','Operations','Head office','full_time','active','2019-03-04',null,37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','NHR-000102','Priya','Raman','priya.raman@northgate.example','People Manager','People','Head office','full_time','active','2020-07-13',null,37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','NHR-000103','Tom','Whitfield','tom.whitfield@northgate.example','Warehouse Supervisor','Warehouse','Warehouse','full_time','active','2021-01-18',null,40,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','NHR-000104','Sofia','Marchetti','sofia.marchetti@northgate.example','Finance Lead','Finance','Head office','full_time','active','2021-09-06',null,37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000001','NHR-000105','Daniel','Boateng','daniel.boateng@northgate.example','Support Specialist','Support','Head office','full_time','active','2022-02-14',null,37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000001','NHR-000106','Hannah','Clarke','hannah.clarke@northgate.example','Sales Executive','Sales','Head office','full_time','active','2022-06-20',null,37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000107','00000000-0000-4000-8000-000000000001','NHR-000107','Marcus','Reid','marcus.reid@northgate.example','Warehouse Operative','Warehouse','Warehouse','full_time','active','2023-04-03',null,40,5,28,'verified','2027-04-30'),
  ('00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000001','NHR-000108','Leila','Haddad','leila.haddad@northgate.example','Support Advisor','Support','Head office','part_time','active','2023-10-09',null,22.5,3,16.8,'verified',null),
  ('00000000-0000-4000-8000-000000000109','00000000-0000-4000-8000-000000000001','NHR-000109','Owen','Pritchard','owen.pritchard@northgate.example','Driver','Warehouse','Warehouse','full_time','active','2024-05-13',null,40,5,28,'pending',null),
  ('00000000-0000-4000-8000-000000000110','00000000-0000-4000-8000-000000000001','NHR-000110','Grace','Nkemelu','grace.nkemelu@northgate.example','Finance Assistant','Finance','Head office','full_time','probation','2026-07-06','2026-10-06',37.5,5,28,'verified',null),
  ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000001','NHR-000111','Callum','Reid','callum.reid@northgate.example','Sales Development','Sales','Remote','full_time','probation','2026-08-17','2026-11-17',37.5,5,28,'verified',null),
  -- Casual worker on irregular hours: exercises the 12.07% accrual path,
  -- which is the branch most likely to be got wrong.
  ('00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000001','NHR-000112','Isla','Fraser','isla.fraser@northgate.example','Warehouse Casual','Warehouse','Warehouse','casual','active','2025-11-03',null,0,0,0,'verified',null)
on conflict (id) do nothing;

update employees set irregular_hours = true
  where id = '00000000-0000-4000-8000-000000000112';

-- Reporting lines, second pass.
update employees set manager_id = '00000000-0000-4000-8000-000000000101'
  where employee_ref in ('NHR-000102','NHR-000103','NHR-000104');
update employees set manager_id = '00000000-0000-4000-8000-000000000103'
  where employee_ref in ('NHR-000107','NHR-000109','NHR-000112');
update employees set manager_id = '00000000-0000-4000-8000-000000000104'
  where employee_ref = 'NHR-000110';
update employees set manager_id = '00000000-0000-4000-8000-000000000102'
  where employee_ref in ('NHR-000105','NHR-000106','NHR-000108','NHR-000111');

-- ============================================================ pay
insert into employee_pay (
  tenant_id, employee_id, pay_frequency, annual_salary, hourly_rate,
  tax_code, ni_category, pension_employee_pct, pension_employer_pct
) values
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','monthly',72000,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','monthly',48500,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000103','monthly',38000,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000104','monthly',55000,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000105','monthly',31500,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000106','monthly',34000,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000107','monthly',27300,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000108','monthly',19200,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000109','monthly',28600,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000110','monthly',26000,null,'1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000111','monthly',29500,null,'1257L','A',0.05,0.03),
  -- Hourly, at the 2025/26 National Living Wage for 21 and over.
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000112','weekly',null,12.21,'1257L','A',0.05,0.03)
on conflict (employee_id) do nothing;

-- ============================================================ mandatory training matrix
insert into training_requirements (
  tenant_id, course_name, category, departments, renew_every, warn_days, external_provider_required
) values
  ('00000000-0000-4000-8000-000000000001','Fire Safety Awareness','Health & Safety',null,365,60,false),
  ('00000000-0000-4000-8000-000000000001','GDPR and Data Protection','Compliance',null,730,60,false),
  ('00000000-0000-4000-8000-000000000001','Equality, Diversity and Inclusion','Compliance',null,730,60,false),
  ('00000000-0000-4000-8000-000000000001','Manual Handling','Health & Safety','["Warehouse"]'::jsonb,365,60,false),
  -- First aid must come from an approved provider. Internal eLearning cannot
  -- satisfy it, and the flag is what stops the compliance view claiming
  -- otherwise.
  ('00000000-0000-4000-8000-000000000001','Emergency First Aid at Work','Health & Safety','["Warehouse","Operations"]'::jsonb,1095,90,true),
  ('00000000-0000-4000-8000-000000000001','Cyber Security Basics','Technology',null,365,60,false)
on conflict (tenant_id, course_name) do nothing;

-- ============================================================ second tenant
-- A second company, so cross-tenant isolation can be TESTED rather than
-- assumed. Deliberately different in three ways that exercise the schema:
--
--   · Scotland, so it gets different bank holidays and different tax bands —
--     the same leave request is a different number of working days here.
--   · A 1 April leave year, so the balance function cannot assume January.
--   · No manager role at all, which must be fine: roles are per user, not a
--     required set.
--
-- If a query as Company A ever returns a Bridgeview row, the tenancy model is
-- broken and nothing else in the system can be trusted.
insert into tenants (
  id, name, slug, plan, status, employee_limit,
  nation, leave_year_start, billing_email
) values (
  '00000000-0000-4000-8000-000000000002',
  'Bridgeview Care Group', 'bridgeview', 'business', 'active', 200,
  'scotland', '04-01', 'accounts@bridgeview.example'
) on conflict (id) do nothing;

insert into wellbeing_config (tenant_id, min_group, cadence, questions) values (
  '00000000-0000-4000-8000-000000000002', 5, 'monthly',
  '[{"key":"overall","text":"How has work felt this month?"},
    {"key":"workload","text":"Was your workload manageable?"},
    {"key":"support","text":"Did you get the support you needed?"},
    {"key":"balance","text":"Could you switch off outside work?"}]'::jsonb
) on conflict (tenant_id) do nothing;

insert into employees (
  id, tenant_id, employee_ref, first_name, last_name, work_email,
  job_title, department, location, employment_type, employment_status,
  start_date, hours_per_week, days_per_week, annual_leave_days, rtw_status
) values
  ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000002','BVW-0001','Eilidh','Mackay','eilidh.mackay@bridgeview.example','Registered Manager','Operations','Glasgow','full_time','active','2018-06-11',37.5,5,33,'verified'),
  ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000002','BVW-0002','Rhys','Morgan','rhys.morgan@bridgeview.example','HR Business Partner','People','Glasgow','full_time','active','2021-02-01',37.5,5,33,'verified'),
  ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002','BVW-0003','Aoife','Byrne','aoife.byrne@bridgeview.example','Senior Care Assistant','Care','Paisley','full_time','active','2022-09-19',37.5,5,28,'verified'),
  ('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000002','BVW-0004','Jamal','Iqbal','jamal.iqbal@bridgeview.example','Care Assistant','Care','Paisley','part_time','active','2024-01-08',24,4,22.4,'verified')
on conflict (id) do nothing;

update employees set manager_id = '00000000-0000-4000-8000-000000000201'
  where employee_ref in ('BVW-0002','BVW-0003');
update employees set manager_id = '00000000-0000-4000-8000-000000000203'
  where employee_ref = 'BVW-0004';

insert into employee_pay (
  tenant_id, employee_id, pay_frequency, annual_salary,
  -- 'S' prefix: taxed under Scottish rates. Held per employee rather than
  -- inferred from the tenant's nation, because the two can differ.
  tax_code, ni_category, pension_employee_pct, pension_employer_pct
) values
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000201','monthly',58000,'S1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000202','monthly',44000,'S1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000203','monthly',28500,'S1257L','A',0.05,0.03),
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000204','monthly',18300,'S1257L','A',0.05,0.03)
on conflict (employee_id) do nothing;

-- ============================================================ linking a login
-- Auth users cannot be created from SQL. Create one first:
--
--   supabase auth admin create-user \
--     --email amara.osei@northgate.example --password 'ChangeMeLocally!1'
--
-- then run this, substituting the returned id:
--
--   insert into profiles (id, tenant_id, email, name, role, employee_id)
--   values (
--     '<auth-user-uuid>',
--     '00000000-0000-4000-8000-000000000001',
--     'amara.osei@northgate.example', 'Amara Osei', 'super_admin',
--     '00000000-0000-4000-8000-000000000101'
--   );
--
-- Create a second user linked to NHR-000103 (Tom Whitfield) with role
-- 'manager', and a third linked to NHR-000107 (Marcus Reid) with role
-- 'employee'. Signing in as each is the only honest way to test the RLS
-- policies: the role switcher in the prototype proved the UI, not the
-- boundary.
