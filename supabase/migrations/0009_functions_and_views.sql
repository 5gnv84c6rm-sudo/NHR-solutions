-- 0009 · business logic: functions, views, the access token hook, jobs
--
-- Everything here exists because it cannot safely live in the client. Each
-- function was ported from the prototype so the values match what the
-- frontend already produces — which is what makes the prototype a usable
-- regression net rather than just a picture.
--
-- Calculation lives in SQL where it is a query (working days, balances,
-- suppressed aggregates) and in Edge Functions where it is an algorithm
-- (gross-to-net payroll). PL/pgSQL payroll is possible and horrible to
-- maintain.

begin;

-- ============================================================ access token hook
-- Injects tenant_id, role and employee_id into every JWT as app_metadata.
-- Without this, each RLS policy would sub-query profiles per row: correct but
-- slow, and easy to forget on the one policy that matters.
--
-- Register in Supabase: Auth → Hooks → Custom Access Token.
create or replace function app.custom_access_token(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb;
  p record;
begin
  select tenant_id, role, employee_id, disabled_at
    into p
  from profiles
  where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if p.tenant_id is null then
    -- No profile yet: mid sign-up, or an orphaned auth user. Issue a token
    -- with no tenant, which every policy then rejects. Failing closed is the
    -- only safe default here.
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
    return jsonb_set(event, '{claims}', claims);
  end if;

  if p.disabled_at is not null then
    raise exception 'account disabled';
  end if;

  claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object(
    'tenant_id',   p.tenant_id,
    'role',        p.role,
    'employee_id', p.employee_id
  ));

  return jsonb_set(event, '{claims}', claims);
end $$;

grant execute on function app.custom_access_token to supabase_auth_admin;

-- ============================================================ working days
-- Excludes weekends and the tenant's own bank holidays. The nation matters:
-- 2 January is a holiday in Scotland and not in England, so the same request
-- is a different number of days depending on where the employer is.
create or replace function app.working_days(
  p_tenant uuid, p_from date, p_to date
) returns numeric language sql stable as $$
  select count(*)::numeric
  from generate_series(p_from, p_to, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (
      select 1 from bank_holidays bh
      join tenants t on t.id = p_tenant
      where bh.nation = t.nation and bh.holiday_on = d::date
    )
$$;

-- ============================================================ leave balance
-- Entitlement, taken, booked and remaining for a leave year.
--
-- Two bases, and the difference is not cosmetic. A regular worker has a days
-- entitlement. An irregular-hours or part-year worker accrues 12.07% of hours
-- worked — 5.6 weeks ÷ 46.4 working weeks — which is the figure Harpur Trust
-- v Brazel made compulsory for part-year workers on permanent contracts.
create or replace function app.leave_balance(p_employee uuid, p_year int default null)
returns table (
  leave_year int,
  entitlement numeric,
  taken numeric,
  booked numeric,
  remaining numeric,
  basis text
) language plpgsql stable as $$
declare
  e record;
  yr int;
  year_start date;
  year_end date;
  accrued numeric;
begin
  select em.*, t.leave_year_start, t.id as tid
    into e
  from employees em join tenants t on t.id = em.tenant_id
  where em.id = p_employee;

  if e is null then return; end if;

  yr := coalesce(p_year, extract(year from current_date)::int);
  year_start := make_date(yr, split_part(e.leave_year_start, '-', 1)::int,
                              split_part(e.leave_year_start, '-', 2)::int);
  if current_date < year_start then
    year_start := year_start - interval '1 year';
    yr := yr - 1;
  end if;
  year_end := year_start + interval '1 year' - interval '1 day';

  if e.irregular_hours then
    -- 12.07% of hours actually worked, converted to days at their average
    -- shift length. Accrual is to date, not for the whole year: an
    -- irregular-hours worker has not yet earned leave they have not worked
    -- the hours for.
    select coalesce(sum(
      case when ts.clock_in is not null and ts.clock_out is not null
           then extract(epoch from (ts.clock_out - ts.clock_in))/3600.0 - ts.break_minutes/60.0
           else coalesce(ts.manual_hours, 0) end
    ), 0) * 0.1207 / greatest(e.hours_per_week / greatest(e.days_per_week, 1), 1)
      into accrued
    from timesheet ts
    where ts.employee_id = p_employee
      and ts.worked_on between year_start and least(year_end, current_date);
    entitlement := round(coalesce(accrued, 0), 1);
    basis := 'accrual_12_07';
  else
    -- Pro-rated for a starter or leaver part way through the year.
    entitlement := round(
      e.annual_leave_days
      * (least(coalesce(e.end_date, year_end), year_end)
         - greatest(coalesce(e.start_date, year_start), year_start) + 1)::numeric
      / (year_end - year_start + 1)::numeric
    , 1);
    basis := 'fixed_days';
  end if;

  -- Taken = approved and already started. Booked = approved and future. Shown
  -- separately because "remaining" that silently includes next month's
  -- booked holiday is how people end up double-booking a fortnight.
  select
    coalesce(sum(case when lr.starts_on <= current_date then lr.working_days else 0 end), 0),
    coalesce(sum(case when lr.starts_on >  current_date then lr.working_days else 0 end), 0)
    into taken, booked
  from leave_requests lr
  where lr.employee_id = p_employee
    and lr.kind = 'annual'
    and lr.status = 'approved'
    and lr.leave_year = yr;

  leave_year := yr;
  remaining := entitlement - taken - booked;
  return next;
end $$;

-- ============================================================ Bradford factor
-- spells² × total days, over a rolling window.
--
-- The squaring is the whole point: it weights frequent short absences above
-- one long one, because they are more disruptive to cover. The bands are a
-- trigger for a conversation and nothing more — treating a score as grounds
-- for action is how employers end up on the wrong side of a disability
-- discrimination claim, since a condition causing frequent short absence
-- produces a high score by design.
create or replace function app.bradford(p_employee uuid, p_window_days int default 365)
returns table (spells int, days numeric, score int, band text)
language plpgsql stable as $$
begin
  select count(*)::int, coalesce(sum(coalesce(a.days, 1)), 0)
    into spells, days
  from absences a
  where a.employee_id = p_employee
    and a.starts_on >= current_date - p_window_days;

  score := (spells * spells * days)::int;
  band := case
    when score >= 500 then 'very_high'
    when score >= 200 then 'high'
    when score >= 50  then 'moderate'
    when score > 0    then 'low'
    else 'none'
  end;
  return next;
end $$;

-- ============================================================ RIDDOR
-- Reportability derived from severity, kind and the day count. Returns the
-- reason as well as the answer, because "the system said so" is not a
-- defensible basis for reporting or for not reporting.
--
-- RIDDOR 2013: death, specified injuries, dangerous occurrences and certain
-- diagnosed diseases are reportable without delay and by report within 10
-- days. Over-7-day incapacity is reportable within 15 days. Over-3-day must
-- be recorded but is not reportable.
create or replace function app.riddor(p_incident uuid)
returns table (reportable boolean, must_record boolean, deadline_days int, reason text)
language plpgsql stable as $$
declare i record;
begin
  select * into i from incidents where id = p_incident;
  if i is null then return; end if;

  if i.severity = 'fatality' then
    reportable := true; must_record := true; deadline_days := 10;
    reason := 'A death arising from a work activity is reportable without delay.';
  elsif i.severity = 'specified_injury' then
    reportable := true; must_record := true; deadline_days := 10;
    reason := 'Specified injuries — fractures other than to fingers, thumbs or toes, amputations, loss of sight, crush injuries, serious burns, scalpings, loss of consciousness from head injury or asphyxia, and injuries from enclosed spaces — are reportable without delay.';
  elsif i.kind = 'dangerous_occurrence' then
    reportable := true; must_record := true; deadline_days := 10;
    reason := 'Dangerous occurrences listed in RIDDOR Schedule 2 are reportable even where nobody was hurt.';
  elsif i.kind = 'work_related_illness' and i.diagnosed_disease then
    reportable := true; must_record := true; deadline_days := 10;
    reason := 'A diagnosed occupational disease linked to work is reportable.';
  elsif i.days_incapacitated > 7 then
    reportable := true; must_record := true; deadline_days := 15;
    reason := 'The worker was unable to perform their normal duties for more than 7 consecutive days, not counting the day of the accident.';
  elsif i.hospitalised_non_worker then
    reportable := true; must_record := true; deadline_days := 10;
    reason := 'A member of the public was taken directly to hospital for treatment arising from the incident.';
  elsif i.days_incapacitated > 3 then
    reportable := false; must_record := true; deadline_days := null;
    reason := 'More than 3 days of incapacity must be recorded in the accident book, but is not reportable to the HSE.';
  else
    reportable := false; must_record := true; deadline_days := null;
    reason := 'Not reportable on the details recorded, but it still belongs in the accident book.';
  end if;
  return next;
end $$;

-- ============================================================ derived status views
-- Status computed against today rather than stored. A stored status is wrong
-- by the following morning and nobody notices.

create or replace view v_document_status
with (security_invoker = true) as
select d.*,
  case
    when d.expires_on is null then 'no_expiry'
    when d.expires_on < current_date then 'expired'
    when d.expires_on <= current_date + d.remind_days then 'expiring_soon'
    else 'current'
  end as status,
  (d.expires_on - current_date) as days_to_expiry
from documents d
where d.deleted_at is null;

create or replace view v_training_status
with (security_invoker = true) as
select et.*,
  case
    when et.completed_on is null and et.due_on is not null and et.due_on < current_date then 'overdue'
    when et.completed_on is null then 'not_complete'
    when et.expires_on is null then 'complete'
    when et.expires_on < current_date then 'expired'
    when et.expires_on <= current_date + coalesce(tr.warn_days, 60) then 'expiring_soon'
    else 'complete'
  end as live_status,
  (et.expires_on - current_date) as days_to_expiry,
  coalesce(tr.external_provider_required, false) as external_provider_required
from employee_training et
left join training_requirements tr
  on tr.tenant_id = et.tenant_id and tr.course_name = et.course_name;

create or replace view v_risk_assessment_status
with (security_invoker = true) as
select ra.*,
  (ra.likelihood * ra.severity) as score,
  (ra.residual_likelihood * ra.residual_severity) as residual_score,
  case
    when ra.likelihood * ra.severity >= 15 then 'intolerable'
    when ra.likelihood * ra.severity >= 10 then 'high'
    when ra.likelihood * ra.severity >= 5  then 'medium'
    else 'low'
  end as band,
  case
    when ra.residual_likelihood * ra.residual_severity >= 15 then 'intolerable'
    when ra.residual_likelihood * ra.residual_severity >= 10 then 'high'
    when ra.residual_likelihood * ra.residual_severity >= 5  then 'medium'
    else 'low'
  end as residual_band,
  (ra.reviewed_on + ra.review_every) as next_review_on,
  (ra.reviewed_on + ra.review_every) < current_date as review_overdue
from risk_assessments ra;

-- ============================================================ wellbeing, suppressed
-- The ONLY path to wellbeing data. The raw table has no select policy at all,
-- so this view is not a convenience — it is the access control.
--
-- security_invoker = true means the tenant filter still applies through the
-- caller's own permissions. The HAVING clause enforces the threshold in the
-- database, so no client query can return an under-threshold group however it
-- is constructed. In a team of three, "the average dropped" identifies people.
create or replace view v_wellbeing_by_team
with (security_invoker = true) as
select
  w.tenant_id,
  w.department,
  date_trunc('week', w.submitted_on)::date as week_of,
  count(*)::int as responses,
  round(avg((w.scores->>'overall')::numeric), 2) as overall,
  round(avg((w.scores->>'workload')::numeric), 2) as workload,
  round(avg((w.scores->>'support')::numeric), 2) as support,
  round(avg((w.scores->>'balance')::numeric), 2) as balance
from wellbeing_checkins w
join wellbeing_config c on c.tenant_id = w.tenant_id
group by w.tenant_id, w.department, date_trunc('week', w.submitted_on), c.min_group
having count(*) >= c.min_group;

-- Company-wide, same rule. A company of four does not get a figure either.
create or replace view v_wellbeing_company
with (security_invoker = true) as
select
  w.tenant_id,
  date_trunc('week', w.submitted_on)::date as week_of,
  count(*)::int as responses,
  round(avg((w.scores->>'overall')::numeric), 2) as overall
from wellbeing_checkins w
join wellbeing_config c on c.tenant_id = w.tenant_id
group by w.tenant_id, date_trunc('week', w.submitted_on), c.min_group
having count(*) >= c.min_group;

-- ============================================================ dashboard aggregate
-- One call for the whole dashboard. The prototype derives fourteen figure
-- sets from local stores; as HTTP that must not be fourteen round trips.
--
-- Payroll figures are omitted entirely without permission — not returned as
-- null, not filtered client-side. They are never computed.
create or replace function app.dashboard_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := app.current_tenant();
  visible uuid[];
  result jsonb;
begin
  select array_agg(id) into visible from app.visible_employee_ids();
  if visible is null then visible := '{}'; end if;

  select jsonb_build_object(
    'headcount', (select count(*) from employees where id = any(visible) and not archived),
    'new_starters_30d', (select count(*) from employees
        where id = any(visible) and not archived and start_date >= current_date - 30),
    'on_probation', (select count(*) from employees
        where id = any(visible) and not archived and employment_status = 'probation'),

    'on_leave_today', (select count(*) from leave_requests
        where employee_id = any(visible) and status = 'approved'
          and current_date between starts_on and ends_on),
    'absent_today', (select count(*) from absences
        where employee_id = any(visible)
          and starts_on <= current_date and coalesce(ends_on, current_date) >= current_date),
    'pending_leave', (select count(*) from leave_requests
        where employee_id = any(visible) and status = 'pending'),

    'present_today', (select count(*) from timesheet
        where employee_id = any(visible) and worked_on = current_date and clock_in is not null),
    'unapproved_timesheets', (select count(*) from timesheet
        where employee_id = any(visible) and approved is null),

    'pending_expenses', (select count(*) from expenses
        where employee_id = any(visible) and status in ('pending','queried')),

    'training_required', (select count(*) from v_training_status
        where employee_id = any(visible)),
    'training_expired', (select count(*) from v_training_status
        where employee_id = any(visible) and live_status = 'expired'),
    'training_expiring', (select count(*) from v_training_status
        where employee_id = any(visible) and live_status = 'expiring_soon'),

    'documents_expired', (select count(*) from v_document_status
        where tenant_id = t and status = 'expired'),
    'documents_expiring', (select count(*) from v_document_status
        where tenant_id = t and status = 'expiring_soon'),
    'rtw_gaps', (select count(*) from employees
        where id = any(visible) and not archived and rtw_status <> 'verified'),

    'riddor_outstanding', (select count(*) from incidents i
        where i.tenant_id = t and not i.riddor_reported
          and (select reportable from app.riddor(i.id))),
    'open_safety_actions', (select count(*) from incident_actions
        where tenant_id = t and status <> 'complete'),
    'assessments_overdue', (select count(*) from v_risk_assessment_status
        where tenant_id = t and review_overdue),

    'reviews_overdue', (select count(*) from reviews
        where employee_id = any(visible) and status <> 'complete'
          and scheduled_on < current_date),
    'open_vacancies', (select count(*) from vacancies
        where tenant_id = t and status = 'open'),

    -- Wellbeing comes from the suppressed view, so the dashboard cannot be a
    -- way around the threshold either.
    'wellbeing', (select overall from v_wellbeing_company
        where tenant_id = t order by week_of desc limit 1)
  ) into result;

  -- Payroll only if entitled. The key is absent rather than null, so a
  -- client cannot tell the difference between "no permission" and "zero".
  if app.can_read_payroll() then
    result := result || jsonb_build_object(
      'payroll_annual_gross', (select coalesce(sum(annual_salary), 0) from employee_pay
          where employee_id = any(visible)),
      'payroll_on_record', (select count(*) from employee_pay
          where employee_id = any(visible) and annual_salary is not null)
    );
  end if;

  return result;
end $$;

grant execute on function app.dashboard_summary to authenticated;

-- ============================================================ scheduled jobs
-- pg_cron replaces the Redis + BullMQ queue for scheduled work. Retryable
-- outbound work — webhooks, email — still needs a worker reading a queue
-- table; these are the jobs that are purely time-driven.

-- Nightly: expire time-limited right-to-work checks so the compliance view
-- reflects reality without anyone having to notice.
select cron.schedule('rtw-expiry', '10 2 * * *', $$
  update employees set rtw_status = 'expired'
  where rtw_status = 'verified'
    and rtw_expires_on is not null
    and rtw_expires_on < current_date
$$);

-- Nightly: candidate retention. Six months from the decision unless the
-- candidate consented to being kept on file.
select cron.schedule('candidate-retention', '20 2 * * *', $$
  delete from candidates
  where delete_after is not null
    and delete_after < current_date
    and not consent_to_retain
$$);

-- Nightly: enquiry and demo retention, 24 months from last contact.
select cron.schedule('marketing-retention', '30 2 * * *', $$
  delete from enquiries where delete_after is not null and delete_after < current_date;
$$);

-- Weekly: pause webhook endpoints that have failed persistently, rather than
-- retrying into a wall indefinitely.
select cron.schedule('webhook-circuit-breaker', '0 3 * * 1', $$
  update webhook_endpoints
  set active = false, paused_at = now(),
      paused_reason = 'Paused automatically after 10 consecutive delivery failures'
  where active and consecutive_failures >= 10
$$);

commit;
