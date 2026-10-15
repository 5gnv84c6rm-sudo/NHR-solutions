/* NHR Solution — Performance module (company-wide).

   The per-employee Performance tab holds one person's goals and reviews; this
   screen is the manager and HR view across everyone: the review calendar and
   what is overdue, goal progress company-wide, a one-to-one log, and a
   distribution view for calibration.

   Goals and reviews live in EmployeeRecords (collections 'goals' and
   'reviews'), the same store the employee tab writes to, so anything set here
   appears on the person's profile and vice versa.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const PERF_DAY = 864e5;
const GOAL_TONE = { 'On track': 'success', 'At risk': 'warning', Behind: 'danger', Complete: 'success', 'Not started': 'dark' };
const REVIEW_TONE = { Complete: 'success', Scheduled: 'warning', Overdue: 'danger', Draft: 'dark' };
const RATINGS = ['Exceptional', 'Exceeded expectations', 'Met expectations', 'Partially met', 'Below expectations'];
const RATING_TONE = { Exceptional: 'success', 'Exceeded expectations': 'success', 'Met expectations': 'dark', 'Partially met': 'warning', 'Below expectations': 'danger' };
const REVIEW_TYPES = ['Probation review', 'Annual review', 'Mid-year review', 'Quarterly check-in', 'Performance improvement review'];
const GOAL_STATUSES = ['Not started', 'On track', 'At risk', 'Behind', 'Complete'];

/* A scheduled review whose date has passed is overdue, whatever the stored
   status says — the same reason document status is derived, not trusted. */
function reviewStatus(r) {
  if (r.status === 'Complete') return 'Complete';
  if (!r.date) return 'Draft';
  return new Date(r.date) < new Date(new Date().toDateString()) ? 'Overdue' : 'Scheduled';
}
function goalStatus(g) {
  if (g.progress >= 100) return 'Complete';
  if (g.status === 'Complete') return 'Complete';
  if (!g.due) return g.status || 'Not started';
  const days = Math.floor((new Date(g.due) - Date.now()) / PERF_DAY);
  /* Expected progress against elapsed time: a goal 80% through its window at
     20% progress is behind regardless of what anyone typed. */
  if (days < 0) return 'Behind';
  if (days <= 14 && g.progress < 60) return 'At risk';
  return g.status === 'Not started' && g.progress > 0 ? 'On track' : (g.status || 'On track');
}

function PerformanceSubnav({ view, onSelect, counts }) {
  const items = [['Overview', 'LayoutDashboard'], ['Reviews', 'ClipboardList'], ['Goals', 'Target'], ['Calibration', 'ChartColumn']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Reviews' ? counts.overdue : 0;
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
            {n > 0 && <Badge tone="danger">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function usePerformanceData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const goals = [], reviews = [];
  employees.forEach(e => {
    const set = R.get(e);
    const meta = {
      employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
      department: e.department, jobTitle: e.jobTitle, employee: e
    };
    (set.goals || []).forEach(g => goals.push(Object.assign({}, g, meta, { liveStatus: goalStatus(g) })));
    (set.reviews || []).forEach(r => reviews.push(Object.assign({}, r, meta, { liveStatus: reviewStatus(r) })));
  });
  reviews.sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
  goals.sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1);
  return { employees, goals, reviews, refresh: force, S, R };
}

/* ---------------- Overview ---------------- */
function PerformanceOverview({ data, onView }) {
  const { employees, goals, reviews, S } = data;
  const overdue = reviews.filter(r => r.liveStatus === 'Overdue');
  const scheduled = reviews.filter(r => r.liveStatus === 'Scheduled');
  const next30 = scheduled.filter(r => (new Date(r.date) - Date.now()) <= 30 * PERF_DAY);
  const complete = reviews.filter(r => r.liveStatus === 'Complete');

  const active = goals.filter(g => g.liveStatus !== 'Complete');
  const atRisk = goals.filter(g => g.liveStatus === 'At risk' || g.liveStatus === 'Behind');
  const avgProgress = active.length ? Math.round(active.reduce((n, g) => n + (Number(g.progress) || 0), 0) / active.length) : 0;

  /* Nobody with a goal or a review on record is a coverage gap. */
  const noGoals = employees.filter(e => !goals.some(g => g.employeeKey === e.id && g.liveStatus !== 'Complete'));
  const noReview = employees.filter(e => !reviews.some(r => r.employeeKey === e.id && r.liveStatus !== 'Complete'));

  const ratingCounts = {};
  complete.filter(r => r.rating).forEach(r => { ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1; });
  const ratingBars = RATINGS.filter(k => ratingCounts[k]).map(k => ({ label: k.split(' ')[0].slice(0, 7), value: ratingCounts[k] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Reviews overdue" value={String(overdue.length)} caption="Past the scheduled date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Due in 30 days" value={String(next30.length)} caption="Book these in" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Active goals" value={String(active.length)} caption={avgProgress + '% average progress'} icon={<Icon name="Target" size={18} />} />
        <StatTile label="Goals at risk" value={String(atRisk.length)} caption="Behind or slipping" icon={<Icon name="TrendingDown" size={18} />} />
      </div>

      {overdue.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,84,91,.28)' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-danger)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {overdue.length} {overdue.length === 1 ? 'review is' : 'reviews are'} past their date. The longest is {Math.max.apply(null, overdue.map(r => Math.floor((Date.now() - new Date(r.date)) / PERF_DAY)))} days overdue.
          </span>
          <Button size="sm" onClick={() => onView('Reviews')}>Review</Button>
        </Card>
      )}

      <div className="perf-split" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <DashboardCard title="Next reviews" padding={16} action={<Badge tone="dark">{scheduled.length} scheduled</Badge>}>
          {overdue.concat(next30).length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdue.concat(next30).slice(0, 6).map(r => {
                const late = r.liveStatus === 'Overdue';
                const days = Math.floor((new Date(r.date) - Date.now()) / PERF_DAY);
                return (
                  <div key={r.employeeKey + r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    border: '1px solid ' + (late ? 'rgba(242,84,91,.26)' : 'var(--border-dark)'),
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <Avatar employee={r.employee} size={34} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{r.employeeName}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.type} · {r.reviewer}</span>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 88 }}>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: late ? 'var(--nhr-danger)' : '#fff' }}>
                        {window.shortDate(r.date)}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                        {late ? Math.abs(days) + ' days late' : 'in ' + days + ' days'}
                      </span>
                    </span>
                    <Badge tone={REVIEW_TONE[r.liveStatus] || 'dark'}>{r.liveStatus}</Badge>
                  </div>
                );
              })}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>Nothing due in the next 30 days.</span>}
        </DashboardCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ratingBars.length > 0 && (
            <DashboardCard title="Completed review ratings" action={<Badge tone="dark">{complete.length}</Badge>}>
              <BarChart height={150} data={ratingBars} />
            </DashboardCard>
          )}
          <DashboardCard title="Coverage">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ProgressMeter label="Employees with an active goal"
                value={employees.length ? Math.round((employees.length - noGoals.length) / employees.length * 100) : 0}
                valueLabel={(employees.length - noGoals.length) + '/' + employees.length} />
              <ProgressMeter label="Employees with a review booked"
                value={employees.length ? Math.round((employees.length - noReview.length) / employees.length * 100) : 0}
                valueLabel={(employees.length - noReview.length) + '/' + employees.length} />
              {(noGoals.length > 0 || noReview.length > 0) && (
                <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                  {noGoals.length > 0 && noGoals.length + ' without an active goal. '}
                  {noReview.length > 0 && noReview.length + ' without a review booked.'}
                </span>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>

      {atRisk.length > 0 && (
        <DashboardCard title={'Goals needing attention (' + atRisk.length + ')'} padding={16}>
          <DataTable compact columns={[
            { key: 'title', label: 'Goal' }, { key: 'employeeName', label: 'Employee' },
            { key: 'due', label: 'Due', mono: true },
            { key: 'progress', label: 'Progress', mono: true, align: 'right' },
            { key: 'status', label: 'Status' }
          ]} rows={atRisk.slice(0, 8).map(g => ({
            id: g.employeeKey + g.id, title: g.title, employeeName: g.employeeName,
            due: g.due ? window.shortDate(g.due) : '—', progress: (g.progress || 0) + '%',
            status: <Badge tone={GOAL_TONE[g.liveStatus] || 'dark'}>{g.liveStatus}</Badge>
          }))} />
        </DashboardCard>
      )}
    </div>
  );
}

Object.assign(window, {
  GOAL_TONE, REVIEW_TONE, RATINGS, RATING_TONE, REVIEW_TYPES, GOAL_STATUSES,
  reviewStatus, goalStatus, PerformanceSubnav, usePerformanceData, PerformanceOverview, PERF_DAY
});
