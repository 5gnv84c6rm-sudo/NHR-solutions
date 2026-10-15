/* NHR Solution — Attendance module (company-wide).

   The per-employee Attendance tab covers one person's timesheet; this screen is
   the operational view across everyone: today's live board with clock in/out,
   the timesheet approval queue, lateness and absence analytics, and a
   week-by-week timesheet grid.

   Employees come from EmployeeStore (so the role switcher and permissions
   apply); timesheet rows come from EmployeeRecords, the same store the employee
   tab writes to — a clock-in or approval here shows there and vice versa.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const ATT_STATUS_TONE = { Present: 'success', Late: 'warning', Absent: 'danger', 'Annual leave': 'dark' };
const A_DAY = 864e5;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function hhmm(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

/* Minutes between two HH:MM strings. */
function minutesBetween(a, b) {
  if (!a || !b || a === '—' || b === '—') return 0;
  const pa = a.split(':').map(Number), pb = b.split(':').map(Number);
  return (pb[0] * 60 + pb[1]) - (pa[0] * 60 + pa[1]);
}

function AttendanceSubnav({ view, onSelect, counts }) {
  const items = [
    ['Today', 'Radio'], ['Timesheets', 'ClipboardCheck'], ['Lateness', 'AlarmClock'], ['Reports', 'ChartColumn']
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
            {label === 'Timesheets' && counts.unapproved > 0 && <Badge tone="warning">{counts.unapproved}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* Collects every timesheet row across the employees this role may see. */
function useAttendanceData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const rows = [];
  employees.forEach(e => {
    const set = R.get(e);
    (set.timesheet || []).forEach(t => {
      rows.push(Object.assign({}, t, {
        employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
        department: e.department, jobTitle: e.jobTitle, location: e.location, employee: e
      }));
    });
  });
  return { employees, rows, refresh: force, S, R };
}

/* ---------------- Today ---------------- */
function AttendanceToday({ data }) {
  const { employees, rows, S, R, refresh } = data;
  const iso = todayIso();
  const canWrite = S.can('employees.write');
  const [dept, setDept] = React.useState('All');
  const [q, setQ] = React.useState('');

  /* One row per employee for today, whether or not a record exists yet. */
  const board = employees
    .filter(e => dept === 'All' || e.department === dept)
    .filter(e => !q || S.fullName(e).toLowerCase().includes(q.toLowerCase()))
    .map(e => {
      const set = R.get(e);
      const row = (set.timesheet || []).find(t => t.date === iso) || null;
      const onLeave = (set.leaveRequests || []).some(l => l.status === 'Approved' && l.startDate <= iso && l.endDate >= iso);
      return { employee: e, row, onLeave };
    });

  const clockedIn = board.filter(b => b.row && b.row.clockIn !== '—' && b.row.clockOut === '—').length;
  const finished = board.filter(b => b.row && b.row.clockOut !== '—' && b.row.clockIn !== '—').length;
  const onLeaveCount = board.filter(b => b.onLeave).length;
  const notIn = board.filter(b => !b.row && !b.onLeave).length;

  function clockIn(e) {
    const set = R.get(e);
    const existing = (set.timesheet || []).find(t => t.date === iso);
    const now = hhmm(new Date());
    /* Anything after 09:05 counts as late — configurable per business in Settings. */
    const late = minutesBetween('09:05', now) > 0;
    if (existing) {
      R.update(e.id, 'timesheet', existing.id, { clockIn: now, status: late ? 'Late' : 'Present' });
    } else {
      R.add(e.id, 'timesheet', {
        date: iso, clockIn: now, clockOut: '—', breakMins: 0, hours: 0,
        status: late ? 'Late' : 'Present', note: late ? 'Clocked in after 09:05' : '', approved: false
      });
    }
    S.logActivity(e.id, 'Clocked in at ' + now + (late ? ' (late)' : ''));
    refresh();
  }

  function clockOut(e, row) {
    const now = hhmm(new Date());
    const worked = Math.max(0, minutesBetween(row.clockIn, now) - (row.breakMins || 0));
    R.update(e.id, 'timesheet', row.id, { clockOut: now, hours: Math.round(worked / 60 * 100) / 100 });
    S.logActivity(e.id, 'Clocked out at ' + now + ' — ' + (Math.round(worked / 60 * 10) / 10) + ' hours');
    refresh();
  }

  function addBreak(e, row, mins) {
    R.update(e.id, 'timesheet', row.id, { breakMins: (row.breakMins || 0) + mins });
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Currently clocked in" value={String(clockedIn)} caption={'of ' + board.length + ' people'} icon={<Icon name="Radio" size={18} />} />
        <StatTile label="Finished today" value={String(finished)} caption="Clocked out" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="On leave" value={String(onLeaveCount)} caption="Approved absence" icon={<Icon name="Plane" size={18} />} />
        <StatTile label="Not clocked in" value={String(notIn)} caption="No record yet today" icon={<Icon name="CircleDashed" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search people"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </Card>

      <DashboardCard title="Live board" padding={16} action={<Badge tone="dark">{board.length} {board.length === 1 ? 'person' : 'people'}</Badge>}>
        {board.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {board.map(({ employee, row, onLeave }) => {
              const isIn = row && row.clockIn !== '—' && row.clockOut === '—';
              const done = row && row.clockOut !== '—' && row.clockIn !== '—';
              const live = isIn ? Math.max(0, minutesBetween(row.clockIn, hhmm(new Date())) - (row.breakMins || 0)) : 0;
              return (
                <div key={employee.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14,
                  border: '1px solid ' + (isIn ? 'rgba(0,229,212,.28)' : 'var(--border-dark)'),
                  borderRadius: 'var(--radius-md)',
                  background: isIn ? 'rgba(0,229,212,.05)' : 'rgba(255,255,255,.02)'
                }}>
                  <Avatar employee={employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 170 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{S.fullName(employee)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{employee.jobTitle} · {employee.department}</span>
                  </span>

                  {onLeave ? <Badge tone="dark">On leave</Badge> : (
                    <React.Fragment>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 118 }}>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                          {row ? row.clockIn : '—'} → {row ? row.clockOut : '—'}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                          {row && row.breakMins ? row.breakMins + 'm break' : 'No break logged'}
                        </span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>
                          {isIn ? (Math.floor(live / 60) + 'h ' + String(live % 60).padStart(2, '0') + 'm')
                            : done ? (row.hours ? row.hours.toFixed(2) + 'h' : '—') : '—'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{isIn ? 'so far' : 'worked'}</span>
                      </span>
                      {row && <Badge tone={ATT_STATUS_TONE[row.status] || 'dark'}>{row.status}</Badge>}
                      {isIn && (
                        <span aria-label="Currently clocked in" style={{
                          width: 9, height: 9, borderRadius: '50%', background: 'var(--nhr-turquoise)',
                          boxShadow: '0 0 0 4px rgba(0,229,212,.18)', flex: '0 0 auto'
                        }} />
                      )}
                      {canWrite && (
                        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!row && <Button size="xs" onClick={() => clockIn(employee)} iconLeft={<Icon name="LogIn" size={13} />}>Clock In</Button>}
                          {isIn && (
                            <React.Fragment>
                              <Button size="xs" variant="secondary" tone="dark" onClick={() => addBreak(employee, row, 30)}>+30m Break</Button>
                              <Button size="xs" onClick={() => clockOut(employee, row)} iconLeft={<Icon name="LogOut" size={13} />}>Clock Out</Button>
                            </React.Fragment>
                          )}
                          {done && !row.approved && <Button size="xs" variant="secondary" tone="dark"
                            onClick={() => { R.update(employee.id, 'timesheet', row.id, { approved: true }); refresh(); }}>Approve</Button>}
                          {done && row.approved && <Badge tone="success">Approved</Badge>}
                        </span>
                      )}
                    </React.Fragment>
                  )}
                </div>
              );
            })}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nobody matches those filters.</span>}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Timesheet approvals ---------------- */
function AttendanceTimesheets({ data }) {
  const { rows, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [dept, setDept] = React.useState('All');
  const [only, setOnly] = React.useState('Unapproved');
  const [weekOffset, setWeekOffset] = React.useState(0);

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  const sunday = new Date(monday.getTime() + 6 * A_DAY);
  const from = monday.toISOString().slice(0, 10), to = sunday.toISOString().slice(0, 10);

  const inWeek = rows.filter(r => r.date >= from && r.date <= to);
  const filtered = inWeek
    .filter(r => dept === 'All' || r.department === dept)
    .filter(r => only === 'All' || (only === 'Unapproved' ? !r.approved : r.status === only))
    .sort((a, b) => a.date === b.date ? a.employeeName.localeCompare(b.employeeName) : (a.date < b.date ? 1 : -1));

  const unapproved = inWeek.filter(r => !r.approved);
  const weekHours = inWeek.reduce((n, r) => n + (Number(r.hours) || 0), 0);

  function approveAll() {
    filtered.filter(r => !r.approved).forEach(r => R.update(r.employeeKey, 'timesheet', r.id, { approved: true }));
    const names = [...new Set(filtered.filter(r => !r.approved).map(r => r.employeeKey))];
    names.forEach(k => S.logActivity(k, 'Timesheet approved for week beginning ' + window.shortDate(from)));
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Awaiting approval" value={String(unapproved.length)} caption="Timesheet days this week" icon={<Icon name="ClipboardCheck" size={18} />} />
        <StatTile label="Hours recorded" value={String(Math.round(weekHours * 10) / 10)} caption="Week total" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Days logged" value={String(inWeek.length)} caption="Across everyone" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Exceptions" value={String(inWeek.filter(r => r.status === 'Late' || r.status === 'Absent').length)} caption="Late or absent" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton tone="dark" size={32} label="Previous week" onClick={() => setWeekOffset(w => w - 1)}><Icon name="ChevronLeft" size={16} /></IconButton>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', minWidth: 158, textAlign: 'center' }}>
              {window.shortDate(from)} – {window.shortDate(to)}
            </span>
            <IconButton tone="dark" size={32} label="Next week" onClick={() => setWeekOffset(w => w + 1)}><Icon name="ChevronRight" size={16} /></IconButton>
          </span>
          {weekOffset !== 0 && <Button size="xs" variant="ghost" tone="dark" onClick={() => setWeekOffset(0)}>This week</Button>}
          <span style={{ flex: 1 }} />
          {[['Unapproved', 'Unapproved'], ['Late', 'Late'], ['Absent', 'Absent'], ['All', 'All']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setOnly(k)} style={{
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (only === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: only === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: only === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: only === k ? 700 : 600
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
        {canWrite && filtered.some(r => !r.approved) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border-dark)' }}>
            <Button size="sm" onClick={approveAll} iconLeft={<Icon name="CheckCheck" size={15} />}>
              Approve All Shown ({filtered.filter(r => !r.approved).length})
            </Button>
          </div>
        )}
      </Card>

      <DashboardCard title={'Timesheet days (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <DataTable compact columns={[
            { key: 'name', label: 'Employee' }, { key: 'date', label: 'Date', mono: true },
            { key: 'clockIn', label: 'In', mono: true }, { key: 'clockOut', label: 'Out', mono: true },
            { key: 'breakMins', label: 'Break', mono: true },
            { key: 'hours', label: 'Hours', mono: true, align: 'right' },
            { key: 'status', label: 'Status' }, { key: 'action', label: '', align: 'right' }
          ]} rows={filtered.map(r => ({
            id: r.id, name: r.employeeName, date: window.shortDate(r.date),
            clockIn: r.clockIn, clockOut: r.clockOut,
            breakMins: r.breakMins ? r.breakMins + 'm' : '—',
            hours: r.hours ? r.hours.toFixed(2) : '—',
            status: <Badge tone={ATT_STATUS_TONE[r.status] || 'dark'}>{r.status}</Badge>,
            action: r.approved
              ? <Icon name="CircleCheck" size={15} style={{ color: 'var(--nhr-turquoise)' }} aria-label="Approved" />
              : (canWrite
                ? <Button size="xs" variant="secondary" tone="dark"
                  onClick={() => { R.update(r.employeeKey, 'timesheet', r.id, { approved: true }); refresh(); }}>Approve</Button>
                : <Badge tone="warning">Pending</Badge>)
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing matches those filters for this week.</span>}
      </DashboardCard>
    </div>
  );
}

Object.assign(window, { ATT_STATUS_TONE, AttendanceSubnav, useAttendanceData, AttendanceToday, AttendanceTimesheets, minutesBetween, hhmm, todayIso });
