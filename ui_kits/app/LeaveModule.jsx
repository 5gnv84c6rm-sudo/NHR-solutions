/* NHR Solution — Holiday & Leave module (company-wide).

   The per-employee Holiday & Leave tab handles one person; this screen is the
   HR and manager view across everyone: the approval queue, a month calendar of
   who is off, allowance tracking, team availability and the public holiday
   calendar.

   Reads employees from EmployeeStore (so permissions and the role switcher
   apply) and leave records from EmployeeRecords, which the employee tab writes
   to — a decision made in either place shows in both.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* England & Wales bank holidays. Scotland and Northern Ireland differ — the
   nation is selectable so allowances are not silently wrong. */
const BANK_HOLIDAYS = {
  'England & Wales': [
    ['2026-01-01', "New Year's Day"], ['2026-04-03', 'Good Friday'], ['2026-04-06', 'Easter Monday'],
    ['2026-05-04', 'Early May bank holiday'], ['2026-05-25', 'Spring bank holiday'],
    ['2026-08-31', 'Summer bank holiday'], ['2026-12-25', 'Christmas Day'], ['2026-12-28', 'Boxing Day (substitute)'],
    ['2027-01-01', "New Year's Day"]
  ],
  'Scotland': [
    ['2026-01-01', "New Year's Day"], ['2026-01-02', '2 January'], ['2026-04-03', 'Good Friday'],
    ['2026-05-04', 'Early May bank holiday'], ['2026-05-25', 'Spring bank holiday'],
    ['2026-08-03', 'Summer bank holiday'], ['2026-11-30', "St Andrew's Day"],
    ['2026-12-25', 'Christmas Day'], ['2026-12-28', 'Boxing Day (substitute)'], ['2027-01-01', "New Year's Day"]
  ],
  'Northern Ireland': [
    ['2026-01-01', "New Year's Day"], ['2026-03-17', "St Patrick's Day"], ['2026-04-03', 'Good Friday'],
    ['2026-04-06', 'Easter Monday'], ['2026-05-04', 'Early May bank holiday'], ['2026-05-25', 'Spring bank holiday'],
    ['2026-07-13', 'Battle of the Boyne (substitute)'], ['2026-08-31', 'Summer bank holiday'],
    ['2026-12-25', 'Christmas Day'], ['2026-12-28', 'Boxing Day (substitute)'], ['2027-01-01', "New Year's Day"]
  ]
};

const LEAVE_TONE = { Approved: 'success', Pending: 'warning', Rejected: 'danger', Cancelled: 'dark' };
const DAY_MS = 864e5;

function LeaveSubnav({ view, onSelect, counts }) {
  const items = [
    ['Overview', 'LayoutDashboard'], ['Requests', 'Inbox'], ['Calendar', 'CalendarDays'],
    ['Allowances', 'Scale'], ['Public Holidays', 'Landmark']
  ];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
              background: active ? 'rgba(0,229,212,.10)' : 'transparent',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
            {label === 'Requests' && counts.pending > 0 && <Badge tone="warning">{counts.pending}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* Gathers every leave request across the employees the current role may see. */
function useLeaveData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const rows = [];
  employees.forEach(e => {
    const set = R.get(e);
    (set.leaveRequests || []).forEach(r => {
      rows.push(Object.assign({}, r, {
        employeeId: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
        department: e.department, jobTitle: e.jobTitle, employee: e
      }));
    });
  });
  rows.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  return { employees, rows, refresh: force, S, R };
}

/* ---------------- Overview ---------------- */
function LeaveOverview({ data, onView }) {
  const { employees, rows, R } = data;
  const pending = rows.filter(r => r.status === 'Pending');
  const today = new Date().toISOString().slice(0, 10);
  const offToday = rows.filter(r => r.status === 'Approved' && r.startDate <= today && r.endDate >= today);
  const next30 = rows.filter(r => r.status === 'Approved' && r.startDate > today && new Date(r.startDate) <= new Date(Date.now() + 30 * DAY_MS));

  const balances = employees.map(e => Object.assign({ employee: e }, R.leaveBalance(e)));
  const totalEnt = balances.reduce((n, b) => n + b.entitlement, 0);
  const totalTaken = balances.reduce((n, b) => n + b.taken, 0);
  const lowRemaining = balances.filter(b => b.remaining <= 3).length;

  const byDept = {};
  rows.filter(r => r.status === 'Approved').forEach(r => { byDept[r.department] = (byDept[r.department] || 0) + r.days; });
  const deptBars = Object.keys(byDept).map(k => ({ label: k.slice(0, 6), value: byDept[k] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Awaiting decision" value={String(pending.length)} caption={pending.reduce((n, r) => n + r.days, 0) + ' days requested'} icon={<Icon name="Inbox" size={18} />} />
        <StatTile label="Off today" value={String(offToday.length)} caption={'of ' + employees.length + ' people'} icon={<Icon name="Plane" size={18} />} />
        <StatTile label="Booked next 30 days" value={String(next30.length)} caption="Approved bookings" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Allowance used" value={totalEnt ? Math.round(totalTaken / totalEnt * 100) + '%' : '0%'} caption={totalTaken + ' of ' + totalEnt + ' days'} icon={<Icon name="Scale" size={18} />} />
      </div>

      {pending.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="Inbox" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {pending.length} leave request{pending.length === 1 ? '' : 's'} waiting for a decision.
          </span>
          <Button size="sm" onClick={() => onView('Requests')}>Review Requests</Button>
        </Card>
      )}

      <div className="leave-split" style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16 }}>
        <DashboardCard title="Who is off today" padding={16}>
          {offToday.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offToday.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <Avatar employee={r.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{r.employeeName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.department} · back {window.shortDate(new Date(new Date(r.endDate).getTime() + DAY_MS))}</span>
                  </span>
                  <Badge tone="dark">{r.type}</Badge>
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Everyone is in today.</span>}
        </DashboardCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {deptBars.length > 0 && (
            <DashboardCard title="Days taken by department">
              <BarChart unit="d" height={150} data={deptBars} />
            </DashboardCard>
          )}
          <DashboardCard title="Allowance watch">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ProgressMeter label="Company allowance used" value={totalEnt ? Math.round(totalTaken / totalEnt * 100) : 0}
                valueLabel={totalTaken + ' / ' + totalEnt} />
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                {lowRemaining > 0
                  ? lowRemaining + ' ' + (lowRemaining === 1 ? 'person has' : 'people have') + ' 3 days or fewer left. Encourage bookings before the year end to avoid a December bottleneck.'
                  : 'No one is close to running out of allowance.'}
              </span>
            </div>
          </DashboardCard>
        </div>
      </div>

      <DashboardCard title="Coming up" padding={16} action={<Badge tone="dark">Next 30 days</Badge>}>
        {next30.length ? (
          <DataTable compact columns={[
            { key: 'name', label: 'Employee' }, { key: 'department', label: 'Department' },
            { key: 'type', label: 'Type' }, { key: 'dates', label: 'Dates', mono: true },
            { key: 'days', label: 'Days', mono: true, align: 'right' }
          ]} rows={next30.slice(0, 8).map(r => ({
            id: r.id, name: r.employeeName, department: r.department, type: r.type,
            dates: window.shortDate(r.startDate) + ' – ' + window.shortDate(r.endDate), days: r.days
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No approved leave in the next 30 days.</span>}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Requests queue ---------------- */
function LeaveRequests({ data }) {
  const { rows, S, R, refresh } = data;
  const [status, setStatus] = React.useState('Pending');
  const [dept, setDept] = React.useState('All');
  const [q, setQ] = React.useState('');
  const canApprove = S.can('employees.write');

  const filtered = rows.filter(r =>
    (status === 'All' || r.status === status) &&
    (dept === 'All' || r.department === dept) &&
    (!q || r.employeeName.toLowerCase().includes(q.toLowerCase()))
  );

  function decide(r, next) {
    R.update(r.employeeId, 'leaveRequests', r.id, {
      status: next, decidedBy: S.session.name, decidedAt: new Date().toISOString().slice(0, 10)
    });
    S.logActivity(r.employeeId, r.type + ' ' + next.toLowerCase() + ' (' + r.days + ' day' + (r.days > 1 ? 's' : '') + ' from ' + window.shortDate(r.startDate) + ')');
    refresh();
  }
  function decideAll(next) {
    filtered.filter(r => r.status === 'Pending').forEach(r => decide(r, next));
  }

  /* Flags other approved leave overlapping the same dates in the same team. */
  function clashes(r) {
    return rows.filter(o => o.id !== r.id && o.status === 'Approved' && o.department === r.department &&
      !(o.endDate < r.startDate || o.startDate > r.endDate)).length;
  }

  const pendingCount = filtered.filter(r => r.status === 'Pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex' }}>
            <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search requests"
              style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
          </span>
          {[['Pending', 'Pending'], ['Approved', 'Approved'], ['Rejected', 'Rejected'], ['All', 'All']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setStatus(k)} style={{
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (status === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: status === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: status === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: status === k ? 700 : 600
            }}>{label}</button>
          ))}
          <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
            background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
          }}>
            <option value="All">All departments</option>
            {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {pendingCount > 1 && canApprove && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border-dark)' }}>
            <Button size="sm" variant="secondary" tone="dark" onClick={() => decideAll('Rejected')}>Reject All ({pendingCount})</Button>
            <Button size="sm" onClick={() => decideAll('Approved')}>Approve All ({pendingCount})</Button>
          </div>
        )}
      </Card>

      {filtered.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const clash = r.status === 'Pending' ? clashes(r) : 0;
            return (
              <Card key={r.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={r.employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 190 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{r.employeeName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{r.jobTitle} · {r.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{r.type}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                      {window.shortDate(r.startDate)} – {window.shortDate(r.endDate)}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 54 }}>
                    <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{r.days}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{r.days === 1 ? 'day' : 'days'}</span>
                  </span>
                  <Badge tone={LEAVE_TONE[r.status] || 'dark'}>{r.status}</Badge>
                  {r.status === 'Pending' && canApprove && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <Button size="xs" variant="secondary" tone="dark" onClick={() => decide(r, 'Rejected')}>Reject</Button>
                      <Button size="xs" onClick={() => decide(r, 'Approved')}>Approve</Button>
                    </span>
                  )}
                </div>
                {(r.reason || clash > 0 || r.decidedBy) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    {r.reason && <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>{r.reason}</span>}
                    {clash > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--nhr-warning)' }}>
                        <Icon name="TriangleAlert" size={14} />
                        {clash} other {clash === 1 ? 'person is' : 'people are'} already approved off in {r.department} over these dates.
                      </span>
                    )}
                    {r.decidedBy && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{r.status} by {r.decidedBy} on {window.shortDate(r.decidedAt)}</span>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="Inbox" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing to show</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>No requests match those filters.</span>
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { BANK_HOLIDAYS, LEAVE_TONE, LeaveSubnav, useLeaveData, LeaveOverview, LeaveRequests });
