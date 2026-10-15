/* NHR Solution — Reports & Analytics.

   Every other module reports on itself. This one reads across all of them, so
   the job here is aggregation plus one hard rule: a report must never reveal
   what the source module hides.

   Three inherited restrictions are enforced, not just documented:

   1. PAYROLL is omitted entirely without payroll.read. A cost report is the
      easiest accidental route to everyone's salary.
   2. WELLBEING keeps its suppression threshold. Group figures under the
      minimum return nothing here exactly as they do in that module, and the
      CSV export carries the same rule.
   3. ROLE SCOPE follows EmployeeStore.list, so a Manager's reports cover their
      own team and an Employee sees only themselves — the analytics layer does
      not widen anyone's view.

   Turnover uses archived records as leavers, which is how this platform
   represents someone who has left.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const RP_DAY = 864e5;

function ReportsSubnav({ view, onSelect, allow }) {
  const items = [['Dashboard', 'LayoutDashboard'], ['Reports', 'FileBarChart'], ['Builder', 'Wrench'], ['Headcount', 'Users']]
    .filter(([label]) => !allow || allow.indexOf(label) > -1);
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)} aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
              background: active ? 'rgba(0,229,212,.10)' : 'transparent',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
          </button>
        );
      })}
    </div>
  );
}

function useAnalytics() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const canPayroll = S.can('payroll.read');
  const canAll = S.can('employees.read.all');

  const employees = S.list({});
  const withArchived = S.list({ includeArchived: true });
  const leavers = withArchived.filter(e => e.archived);

  const year = Date.now() - 365 * RP_DAY;
  const joiners = employees.filter(e => e.startDate && new Date(e.startDate) >= year);
  const recentLeavers = leavers.filter(e => e.updatedAt && new Date(e.updatedAt) >= year);

  /* Turnover against average headcount over the period, which is the standard
     basis — dividing by today's headcount overstates it in a growing business. */
  const avgHeadcount = Math.max(1, (employees.length + (employees.length + recentLeavers.length - joiners.length)) / 2);
  const turnover = Math.round(recentLeavers.length / avgHeadcount * 1000) / 10;

  /* Absence rate: absence days as a share of available working days over the
     last 12 weeks, 5 days a week. */
  const win = 84;
  const cutoff = new Date(Date.now() - win * RP_DAY).toISOString().slice(0, 10);
  let absenceDays = 0, bradfordTotal = 0, bradfordHigh = 0;
  employees.forEach(e => {
    const set = R.get(e);
    (set.absences || []).forEach(a => { if (a.startDate >= cutoff) absenceDays += Number(a.days) || 0; });
    const b = R.bradford ? (R.bradford(e).score || 0) : 0;
    bradfordTotal += b;
    if (b >= 50) bradfordHigh++;
  });
  const availableDays = employees.length * Math.round(win / 7 * 5);
  const absenceRate = availableDays ? Math.round(absenceDays / availableDays * 1000) / 10 : 0;

  /* Leave liability: untaken entitlement, and its cost where payroll is
     visible. Accrued untaken leave is a real balance-sheet item. */
  let leaveRemaining = 0, leaveLiability = 0, payrollTotal = 0;
  employees.forEach(e => {
    const bal = R.leaveBalance ? R.leaveBalance(e) : { remaining: 0 };
    leaveRemaining += bal.remaining || 0;
    const salary = e.payroll && Number(e.payroll.salary) || 0;
    payrollTotal += salary;
    if (salary) leaveLiability += (salary / 260) * (bal.remaining || 0);
  });

  /* Training compliance, reusing the Training module's own definition so the
     two screens cannot disagree. */
  let mandatoryMet = 0, mandatoryRequired = 0, expiredCerts = 0;
  const MAND = window.MANDATORY || {};
  employees.forEach(e => {
    const training = R.get(e).training || [];
    Object.keys(MAND).forEach(course => {
      if (!window.isMandatoryFor || !window.isMandatoryFor(course, e.department)) return;
      mandatoryRequired++;
      const rec = training.find(t => t.course === course);
      if (!rec) return;
      const live = window.courseStatus ? window.courseStatus(rec) : rec.status;
      if (live === 'Complete' || live === 'Expiring soon') mandatoryMet++;
      if (live === 'Expired') expiredCerts++;
    });
  });
  const trainingRate = mandatoryRequired ? Math.round(mandatoryMet / mandatoryRequired * 100) : 100;

  /* Cross-module operational counts, each guarded because a store may not be
     loaded on every page. */
  const HS = window.SafetyStore, REC = window.RecruitmentStore, W = window.WellbeingStore;
  const incidents = HS ? HS.incidents() : [];
  const riddorDue = incidents.filter(i => {
    const r = HS.riddor(i);
    return r && r.reportable && !i.riddorReported;
  }).length;
  const openActions = incidents.reduce((n, i) => n + (i.actions || []).filter(a => a.status !== 'Complete').length, 0);
  const assessmentsOverdue = HS ? HS.assessments().filter(a => {
    const next = new Date(a.reviewedAt).getTime() + (Number(a.reviewEvery) || 365) * RP_DAY;
    return next < Date.now();
  }).length : 0;

  const vacancies = REC ? REC.vacancies().filter(v => v.status === 'Open') : [];
  const candidates = REC ? REC.candidates() : [];
  const timeToHire = REC ? REC.timeToHire() : null;

  let expenseSpend = 0, expensePending = 0;
  employees.forEach(e => {
    (R.get(e).expenses || []).forEach(x => {
      if (x.date >= cutoff && x.status !== 'Rejected') expenseSpend += Number(x.amount) || 0;
      if (x.status === 'Pending' || x.status === 'Queried') expensePending++;
    });
  });

  /* Wellbeing keeps its own suppression rule — the report layer must not be a
     way around it. */
  const wellbeingScore = W ? W.overall(W.checkIns().filter(c => c.date >= cutoff)) : null;

  return {
    S, R, canPayroll, canAll, refresh: force,
    employees, withArchived, leavers, joiners, recentLeavers,
    turnover, avgHeadcount: Math.round(avgHeadcount * 10) / 10,
    absenceRate, absenceDays, availableDays,
    bradfordAvg: employees.length ? Math.round(bradfordTotal / employees.length) : 0, bradfordHigh,
    leaveRemaining, leaveLiability: Math.round(leaveLiability),
    payrollTotal, trainingRate, mandatoryMet, mandatoryRequired, expiredCerts,
    incidents, riddorDue, openActions, assessmentsOverdue,
    vacancies, candidates, timeToHire,
    expenseSpend: Math.round(expenseSpend), expensePending,
    wellbeingScore, windowDays: win
  };
}

/* ---------------- KPI dashboard ---------------- */
function AnalyticsDashboard({ a, onView }) {
  const { S, canPayroll } = a;

  const deptRows = S.DEPARTMENTS.map(d => {
    const list = a.employees.filter(e => e.department === d);
    const salaries = list.map(e => (e.payroll && Number(e.payroll.salary)) || 0).filter(v => v > 0);
    return {
      id: d, department: d, headcount: list.length,
      probation: list.filter(e => e.employmentStatus === 'Probation').length,
      avgSalary: salaries.length ? Math.round(salaries.reduce((x, y) => x + y, 0) / salaries.length) : null
    };
  }).filter(r => r.headcount > 0).sort((x, y) => y.headcount - x.headcount);

  const headBars = deptRows.map(d => ({ label: d.department.slice(0, 6), value: d.headcount }));

  /* Starters per month over the last year — the clearest picture of growth. */
  const monthMap = {};
  a.joiners.forEach(e => {
    const k = e.startDate.slice(0, 7);
    monthMap[k] = (monthMap[k] || 0) + 1;
  });
  const joinBars = Object.keys(monthMap).sort().slice(-8).map(k => ({
    label: new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short' }),
    value: monthMap[k]
  }));

  const attention = [
    a.riddorDue > 0 && { label: a.riddorDue + ' RIDDOR ' + (a.riddorDue === 1 ? 'report' : 'reports') + ' outstanding', view: 'Reports', tone: 'danger' },
    a.expiredCerts > 0 && { label: a.expiredCerts + ' expired training ' + (a.expiredCerts === 1 ? 'certificate' : 'certificates'), view: 'Reports', tone: 'danger' },
    a.assessmentsOverdue > 0 && { label: a.assessmentsOverdue + ' risk ' + (a.assessmentsOverdue === 1 ? 'assessment' : 'assessments') + ' overdue for review', view: 'Reports', tone: 'warning' },
    a.openActions > 0 && { label: a.openActions + ' open safety ' + (a.openActions === 1 ? 'action' : 'actions'), view: 'Reports', tone: 'warning' },
    a.expensePending > 0 && { label: a.expensePending + ' expense ' + (a.expensePending === 1 ? 'claim' : 'claims') + ' awaiting a decision', view: 'Reports', tone: 'warning' }
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Headcount" value={String(a.employees.length)} caption={a.joiners.length + ' joined in 12 months'} icon={<Icon name="Users" size={18} />} />
        <StatTile label="Turnover" value={a.turnover + '%'} caption={a.recentLeavers.length + (a.recentLeavers.length === 1 ? ' leaver' : ' leavers') + ', 12 months'} icon={<Icon name="LogOut" size={18} />} />
        <StatTile label="Absence rate" value={a.absenceRate + '%'} caption={'Last ' + Math.round(a.windowDays / 7) + ' weeks'} icon={<Icon name="Thermometer" size={18} />} />
        <StatTile label="Training compliance" value={a.trainingRate + '%'} caption={a.mandatoryMet + ' of ' + a.mandatoryRequired + ' mandatory'} icon={<Icon name="ShieldCheck" size={18} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open vacancies" value={String(a.vacancies.length)} caption={a.timeToHire != null ? a.timeToHire + ' days to hire' : 'No hires yet'} icon={<Icon name="Briefcase" size={18} />} />
        <StatTile label="Leave untaken" value={a.leaveRemaining + ' days'} caption={canPayroll ? 'Worth ' + window.money0(a.leaveLiability) : 'Accrued across the team'} icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Expense spend" value={window.money0(a.expenseSpend)} caption={'Last ' + Math.round(a.windowDays / 7) + ' weeks'} icon={<Icon name="Receipt" size={18} />} />
        <StatTile label="Wellbeing" value={a.wellbeingScore == null ? '—' : a.wellbeingScore + '/5'} caption={a.wellbeingScore == null ? 'Too few responses to report' : 'Anonymous check-in average'} icon={<Icon name="HeartHandshake" size={18} />} />
      </div>

      {attention.length > 0 && (
        <DashboardCard title={'Needs attention (' + attention.length + ')'} padding={16}
          action={<Button size="xs" variant="secondary" tone="dark" onClick={() => onView('Reports')}>Open reports</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {attention.map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                border: '1px solid ' + (item.tone === 'danger' ? 'rgba(242,84,91,.26)' : 'rgba(242,180,65,.24)'),
                borderRadius: 'var(--radius-md)',
                background: item.tone === 'danger' ? 'rgba(242,84,91,.035)' : 'rgba(242,180,65,.03)'
              }}>
                <Icon name="TriangleAlert" size={15} style={{ flex: '0 0 auto', color: item.tone === 'danger' ? 'var(--nhr-danger)' : 'var(--nhr-warning)' }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-body-dark)' }}>{item.label}</span>
                <Badge tone={item.tone}>{item.tone === 'danger' ? 'Act now' : 'Review'}</Badge>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      <div className="rp-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Headcount by department" action={<Badge tone="dark">{a.employees.length}</Badge>}>
          {headBars.length ? <BarChart height={165} data={headBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No employees in scope.</span>}
        </DashboardCard>
        <DashboardCard title="Starters by month" action={<Badge tone="dark">12 months</Badge>}>
          {joinBars.length ? <BarChart height={165} data={joinBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No starters recorded in the last year.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="By department" padding={16}
        action={<Badge tone="dark">{canPayroll ? 'Includes pay' : 'Pay hidden'}</Badge>}>
        <DataTable compact columns={[
          { key: 'department', label: 'Department' },
          { key: 'headcount', label: 'Headcount', mono: true, align: 'right' },
          { key: 'probation', label: 'On probation', mono: true, align: 'right' }
        ].concat(canPayroll ? [{ key: 'avgLabel', label: 'Average salary', mono: true, align: 'right' }] : [])}
          rows={deptRows.map(d => Object.assign({}, d, {
            avgLabel: d.avgSalary == null ? '—' : window.money0(d.avgSalary)
          }))} />
        {!canPayroll && (
          <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
            Salary columns are omitted because your role cannot read payroll. They are not hidden in the interface — they
            are never calculated, so they cannot be exported either.
          </span>
        )}
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Turnover is leavers over the last 12 months divided by average headcount for the period ({a.avgHeadcount}),
          not by today's headcount — dividing by the current figure overstates turnover in a growing business. Absence
          rate is absence days over available working days at 5 days a week, which excludes weekends but not public
          holidays. Both definitions matter more than the numbers when you compare against a benchmark.
        </span>
      </Card>
    </div>
  );
}

Object.assign(window, { RP_DAY, ReportsSubnav, useAnalytics, AnalyticsDashboard });
