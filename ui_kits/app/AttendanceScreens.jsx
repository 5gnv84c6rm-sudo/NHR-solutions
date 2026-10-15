/* Attendance — lateness analysis, reports and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Lateness ---------------- */
function AttendanceLateness({ data }) {
  const { employees, rows, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [days, setDays] = React.useState('28');
  const cutoff = new Date(Date.now() - Number(days) * 864e5).toISOString().slice(0, 10);
  const scoped = rows.filter(r => r.date >= cutoff);

  /* Per-person lateness and absence, worst first. */
  const people = employees.map(e => {
    const mine = scoped.filter(r => r.employeeKey === e.id);
    const working = mine.filter(r => r.status !== 'Annual leave');
    const late = working.filter(r => r.status === 'Late');
    const absent = working.filter(r => r.status === 'Absent');
    const lateMins = late.reduce((n, r) => n + Math.max(0, window.minutesBetween('09:05', r.clockIn)), 0);
    return {
      employee: e, late: late.length, absent: absent.length, lateMins,
      logged: working.length,
      rate: working.length ? Math.round((working.length - absent.length) / working.length * 1000) / 10 : 0
    };
  }).filter(p => p.logged > 0).sort((a, b) => (b.late + b.absent * 2) - (a.late + a.absent * 2));

  const totalLate = people.reduce((n, p) => n + p.late, 0);
  const totalMins = people.reduce((n, p) => n + p.lateMins, 0);
  const totalAbsent = people.reduce((n, p) => n + p.absent, 0);
  const flagged = people.filter(p => p.late >= 3 || p.absent >= 2);

  const bars = people.slice(0, 6).filter(p => p.late > 0)
    .map(p => ({ label: p.employee.firstName.slice(0, 6), value: p.late }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Late arrivals" value={String(totalLate)} caption={'Last ' + days + ' days'} icon={<Icon name="AlarmClock" size={18} />} />
        <StatTile label="Time lost" value={(Math.floor(totalMins / 60) + 'h ' + (totalMins % 60) + 'm')} caption="Cumulative lateness" icon={<Icon name="Hourglass" size={18} />} />
        <StatTile label="Unplanned absence" value={String(totalAbsent)} caption="Days recorded" icon={<Icon name="CalendarX" size={18} />} />
        <StatTile label="People flagged" value={String(flagged.length)} caption="Past the trigger point" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Period</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['7', 'Last 7 days'], ['14', 'Last 14 days'], ['28', 'Last 28 days']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setDays(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (days === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: days === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: days === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: days === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Lateness counted from 09:05</span>
      </Card>

      {bars.length > 0 && (
        <DashboardCard title="Late arrivals by person" action={<Badge tone="dark">Last {days} days</Badge>}>
          <BarChart height={160} data={bars} />
        </DashboardCard>
      )}

      <DashboardCard title={'Attendance by person (' + people.length + ')'} padding={16}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {people.map(p => {
            const flag = p.late >= 3 || p.absent >= 2;
            return (
              <div key={p.employee.id} style={{
                display: 'flex', flexDirection: 'column', gap: 11, padding: 14,
                border: '1px solid ' + (flag ? 'rgba(242,180,65,.28)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: flag ? 'rgba(242,180,65,.04)' : 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={p.employee} size={36} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 170 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{S.fullName(p.employee)}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{p.employee.jobTitle} · {p.employee.department}</span>
                  </span>
                  {[['Late', p.late], ['Absent', p.absent], ['Days', p.logged]].map(([label, v]) => (
                    <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 54 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                    </span>
                  ))}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: p.rate >= 95 ? 'var(--nhr-turquoise)' : 'var(--nhr-warning)' }}>{p.rate}%</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Rate</span>
                  </span>
                  {flag && canWrite && (
                    <Button size="xs" variant="secondary" tone="dark"
                      onClick={() => { S.logActivity(p.employee.id, 'Attendance discussion logged — ' + p.late + ' late, ' + p.absent + ' absent in last ' + days + ' days'); refresh(); }}>
                      Log Discussion
                    </Button>
                  )}
                </div>
                <ProgressMeter label="Attendance rate" value={p.rate} valueLabel={p.rate + '%'} />
                {flag && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--nhr-warning)' }}>
                    <Icon name="TriangleAlert" size={14} />
                    Past the illustrative trigger of 3 late arrivals or 2 absence days. Set your own trigger points before using this in a formal process.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Reports ---------------- */
function AttendanceReports({ data }) {
  const { employees, rows, S } = data;
  const [days, setDays] = React.useState('28');
  const cutoff = new Date(Date.now() - Number(days) * 864e5).toISOString().slice(0, 10);
  const scoped = rows.filter(r => r.date >= cutoff);
  const working = scoped.filter(r => r.status !== 'Annual leave');

  const present = working.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const rate = working.length ? Math.round(present / working.length * 1000) / 10 : 0;
  const hours = scoped.reduce((n, r) => n + (Number(r.hours) || 0), 0);

  /* By department */
  const deptMap = {};
  working.forEach(r => {
    const d = deptMap[r.department] || (deptMap[r.department] = { logged: 0, present: 0, hours: 0, late: 0, absent: 0 });
    d.logged++; d.hours += Number(r.hours) || 0;
    if (r.status === 'Present' || r.status === 'Late') d.present++;
    if (r.status === 'Late') d.late++;
    if (r.status === 'Absent') d.absent++;
  });
  const deptRows = Object.keys(deptMap).map(k => {
    const d = deptMap[k];
    return {
      id: k, department: k, logged: d.logged,
      hours: Math.round(d.hours * 10) / 10,
      late: d.late, absent: d.absent,
      rate: d.logged ? Math.round(d.present / d.logged * 1000) / 10 : 0
    };
  }).sort((a, b) => a.rate - b.rate);

  /* By weekday — shows which days lose the most time */
  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowMap = {};
  working.forEach(r => {
    const i = (new Date(r.date).getDay() + 6) % 7;
    const d = dowMap[i] || (dowMap[i] = { logged: 0, present: 0 });
    d.logged++;
    if (r.status === 'Present' || r.status === 'Late') d.present++;
  });
  const dowBars = dowNames.map((label, i) => {
    const d = dowMap[i];
    return { label, value: d && d.logged ? Math.round(d.present / d.logged * 100) : 0, muted: i > 4 };
  }).filter(b => b.value > 0 || b.muted === false);

  function exportReport() {
    window.downloadCsv('nhr-attendance-' + days + 'day-' + new Date().toISOString().slice(0, 10) + '.csv',
      [{ label: 'Employee', key: 'name' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
      { label: 'Date', key: 'date' }, { label: 'Clock in', key: 'in' }, { label: 'Clock out', key: 'out' },
      { label: 'Break (mins)', key: 'brk' }, { label: 'Hours', key: 'hours' }, { label: 'Status', key: 'status' },
      { label: 'Approved', key: 'approved' }],
      scoped.slice().sort((a, b) => a.date < b.date ? 1 : -1).map(r => ({
        name: r.employeeName, ref: r.employeeRef, dept: r.department, date: r.date,
        in: r.clockIn, out: r.clockOut, brk: r.breakMins, hours: r.hours,
        status: r.status, approved: r.approved ? 'Yes' : 'No'
      })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Attendance rate" value={rate + '%'} caption={'Last ' + days + ' days'} icon={<Icon name="ChartColumn" size={18} />} />
        <StatTile label="Hours recorded" value={String(Math.round(hours))} caption="Across everyone" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Days logged" value={String(scoped.length)} caption="Timesheet rows" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Headcount" value={String(employees.length)} caption="In this view" icon={<Icon name="Users" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Period</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['7', '7 days'], ['14', '14 days'], ['28', '28 days']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setDays(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (days === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: days === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: days === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: days === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" onClick={exportReport} iconLeft={<Icon name="Download" size={15} />}>Export CSV</Button>
      </Card>

      <div className="att-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Attendance by weekday" action={<Badge tone="dark">%</Badge>}>
          <BarChart unit="%" height={170} data={dowBars} />
        </DashboardCard>
        <DashboardCard title="Hours by department" action={<Badge tone="dark">h</Badge>}>
          <BarChart unit="h" height={170} data={deptRows.slice().sort((a, b) => b.hours - a.hours).map(d => ({ label: d.department.slice(0, 6), value: d.hours }))} />
        </DashboardCard>
      </div>

      <DashboardCard title="Department breakdown" padding={16} action={<Badge tone="dark">Lowest rate first</Badge>}>
        <DataTable compact columns={[
          { key: 'department', label: 'Department' },
          { key: 'rate', label: 'Rate', align: 'right' },
          { key: 'hours', label: 'Hours', mono: true, align: 'right' },
          { key: 'late', label: 'Late', mono: true, align: 'right' },
          { key: 'absent', label: 'Absent', mono: true, align: 'right' },
          { key: 'logged', label: 'Days', mono: true, align: 'right' }
        ]} rows={deptRows.map(d => Object.assign({}, d, {
          rate: <Badge tone={d.rate >= 95 ? 'success' : d.rate >= 90 ? 'warning' : 'danger'}>{d.rate}%</Badge>
        }))} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Figures cover timesheet days recorded in this workspace and exclude approved leave from the rate calculation.
          Lateness is measured from 09:05 and absence trigger points are illustrative defaults — both should be set to match your own
          policy before any of this is used in a formal capability or disciplinary process.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function AttendanceScreen() {
  const data = window.useAttendanceData();
  const [view, setView] = React.useState('Today');
  const canWrite = data.S.can('employees.write');
  const unapproved = data.rows.filter(r => !r.approved).length;

  const body = {
    'Today': <window.AttendanceToday data={data} />,
    'Timesheets': <window.AttendanceTimesheets data={data} />,
    'Lateness': <AttendanceLateness data={data} />,
    'Reports': <AttendanceReports data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Attendance</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Who is in right now, timesheets waiting for approval, and where time is being lost. Everything here writes to the employee record.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Reports')} iconLeft={<Icon name="ChartColumn" size={15} />}>View Reports</Button>
            <Button size="sm" onClick={() => setView('Timesheets')} iconLeft={<Icon name="ClipboardCheck" size={15} />}>
              Approve Timesheets{unapproved > 0 ? ' (' + unapproved + ')' : ''}
            </Button>
          </div>
        )}
      </div>

      <window.AttendanceSubnav view={view} onSelect={setView} counts={{ unapproved }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
    </div>
  );
}

Object.assign(window, { AttendanceScreen, AttendanceLateness, AttendanceReports });
