/* Shifts & Rotas — open shifts, swaps, coverage and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Open shifts ---------------- */
function OpenShifts({ data }) {
  const { employees, shifts, leave, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [assigning, setAssigning] = React.useState(null);
  const [pick, setPick] = React.useState('');
  const today = new Date().toISOString().slice(0, 10);

  const open = shifts.filter(s => s.status === 'Open').sort((a, b) => a.date < b.date ? -1 : 1);
  const upcoming = open.filter(s => s.date >= today);
  const past = open.filter(s => s.date < today);

  /* Anyone not already rostered that day and not on leave can cover. */
  function candidates(s) {
    return employees.filter(e => {
      if (window.onLeaveOn(leave, e.id, s.date)) return false;
      return !shifts.some(x => x.employeeKey === e.id && x.date === s.date && x.status === 'Assigned');
    });
  }

  function assign(s, employeeId) {
    if (!employeeId) return;
    R.remove(s.employeeKey, 'shifts', s.id);
    R.add(employeeId, 'shifts', {
      date: s.date, start: s.start, end: s.end, label: s.label,
      location: s.location, hours: window.shiftHours(s.start, s.end),
      status: 'Assigned', swapRequested: false
    });
    S.logActivity(employeeId, 'Picked up open shift on ' + window.shortDate(s.date) + ' (' + s.start + '–' + s.end + ')');
    setAssigning(null); setPick(''); refresh();
  }

  function renderList(list, isPast) {
    return list.map(s => {
      const able = candidates(s);
      const soon = !isPast && (new Date(s.date) - Date.now()) < 3 * 864e5;
      return (
        <Card key={s.id} tone="dark" padding={16} style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          borderColor: soon ? 'rgba(242,180,65,.30)' : undefined,
          opacity: isPast ? .7 : 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{
              width: 46, height: 46, flex: '0 0 auto', borderRadius: 'var(--radius-md)',
              background: 'rgba(242,180,65,.10)', border: '1px solid rgba(242,180,65,.28)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--nhr-warning)', fontWeight: 700 }}>
                {new Date(s.date).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{new Date(s.date).getDate()}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 170 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{s.label} shift · {s.start}–{s.end}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                {s.department} · {s.location} · {window.shiftHours(s.start, s.end)}h · {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'long' })}
              </span>
            </span>
            {soon && <Badge tone="warning">Within 3 days</Badge>}
            {isPast && <Badge tone="danger">Uncovered</Badge>}
            <Badge tone="dark">{able.length} available</Badge>
            {canWrite && !isPast && (
              <Button size="xs" onClick={() => { setAssigning(assigning === s.id ? null : s.id); setPick(''); }}>
                {assigning === s.id ? 'Close' : 'Assign Cover'}
              </Button>
            )}
            {canWrite && (
              <IconButton tone="dark" size={30} label="Delete open shift"
                onClick={() => { R.remove(s.employeeKey, 'shifts', s.id); refresh(); }}><Icon name="Trash2" size={14} /></IconButton>
            )}
          </div>

          {assigning === s.id && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
              {able.length ? (
                <React.Fragment>
                  <SelectField label="Assign to" value={pick} onChange={setPick} placeholder="Choose someone available…"
                    options={able.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
                  <Notice icon="Info">Only people without an assigned shift that day and not on approved leave are listed.</Notice>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button size="sm" variant="ghost" tone="dark" onClick={() => setAssigning(null)}>Cancel</Button>
                    <Button size="sm" disabled={!pick} onClick={() => assign(s, pick)}>Assign Shift</Button>
                  </div>
                </React.Fragment>
              ) : (
                <Notice icon="TriangleAlert" tone="warn">
                  Nobody is available. Everyone is either already rostered that day or on approved leave.
                </Notice>
              )}
            </div>
          )}
        </Card>
      );
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open shifts" value={String(upcoming.length)} caption="Upcoming, need cover" icon={<Icon name="UserPlus" size={18} />} />
        <StatTile label="Within 3 days" value={String(upcoming.filter(s => (new Date(s.date) - Date.now()) < 3 * 864e5).length)} caption="Urgent" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Went uncovered" value={String(past.length)} caption="Past shifts never filled" icon={<Icon name="CircleX" size={18} />} />
        <StatTile label="Hours at risk" value={String(Math.round(upcoming.reduce((n, s) => n + window.shiftHours(s.start, s.end), 0)))} caption="Unassigned hours" icon={<Icon name="Clock" size={18} />} />
      </div>

      {upcoming.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderList(upcoming, false)}</div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Every shift is covered</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>No open shifts are waiting for someone to pick up.</span>
        </Card>
      )}

      {past.length > 0 && (
        <DashboardCard title={'Went uncovered (' + past.length + ')'} padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderList(past.slice(0, 5), true)}</div>
        </DashboardCard>
      )}
    </div>
  );
}

/* ---------------- Swaps ---------------- */
function ShiftSwaps({ data }) {
  const { employees, shifts, leave, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [open, setOpen] = React.useState(null);
  const [pick, setPick] = React.useState('');

  const requested = shifts.filter(s => s.swapRequested).sort((a, b) => a.date < b.date ? -1 : 1);

  function candidates(s) {
    return employees.filter(e => e.id !== s.employeeKey
      && !window.onLeaveOn(leave, e.id, s.date)
      && !shifts.some(x => x.employeeKey === e.id && x.date === s.date && x.status === 'Assigned'));
  }

  function approve(s, toId) {
    R.remove(s.employeeKey, 'shifts', s.id);
    R.add(toId, 'shifts', {
      date: s.date, start: s.start, end: s.end, label: s.label, location: s.location,
      hours: window.shiftHours(s.start, s.end), status: 'Assigned', swapRequested: false
    });
    S.logActivity(s.employeeKey, 'Shift on ' + window.shortDate(s.date) + ' swapped to ' + S.fullName(S.get(toId)));
    S.logActivity(toId, 'Took over shift on ' + window.shortDate(s.date) + ' from ' + s.employeeName);
    setOpen(null); setPick(''); refresh();
  }

  function decline(s) {
    R.update(s.employeeKey, 'shifts', s.id, { swapRequested: false });
    S.logActivity(s.employeeKey, 'Swap request declined for shift on ' + window.shortDate(s.date));
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Swap requests" value={String(requested.length)} caption="Awaiting a decision" icon={<Icon name="ArrowRightLeft" size={18} />} />
        <StatTile label="This week" value={String(requested.filter(s => (new Date(s.date) - Date.now()) < 7 * 864e5 && new Date(s.date) >= Date.now()).length)} caption="Next 7 days" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Hours involved" value={String(Math.round(requested.reduce((n, s) => n + window.shiftHours(s.start, s.end), 0)))} caption="Across all requests" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="People asking" value={String(new Set(requested.map(s => s.employeeKey)).size)} caption="Distinct employees" icon={<Icon name="Users" size={18} />} />
      </div>

      {requested.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requested.map(s => {
            const able = candidates(s);
            return (
              <Card key={s.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={s.employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 170 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{s.employeeName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{s.jobTitle} · {s.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{s.label} · {s.start}–{s.end}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                      {window.shortDate(s.date)} · {window.shiftHours(s.start, s.end)}h
                    </span>
                  </span>
                  <Badge tone="dark">{able.length} could cover</Badge>
                  {canWrite && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <Button size="xs" variant="secondary" tone="dark" onClick={() => decline(s)}>Decline</Button>
                      <Button size="xs" onClick={() => { setOpen(open === s.id ? null : s.id); setPick(''); }}>
                        {open === s.id ? 'Close' : 'Find Cover'}
                      </Button>
                    </span>
                  )}
                </div>
                {open === s.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    {able.length ? (
                      <React.Fragment>
                        <SelectField label="Swap to" value={pick} onChange={setPick} placeholder="Choose someone available…"
                          options={able.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
                        <Notice icon="Info">The shift moves to the person you choose and both records are updated.</Notice>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <Button size="sm" variant="ghost" tone="dark" onClick={() => setOpen(null)}>Cancel</Button>
                          <Button size="sm" disabled={!pick} onClick={() => approve(s, pick)}>Approve Swap</Button>
                        </div>
                      </React.Fragment>
                    ) : (
                      <Notice icon="TriangleAlert" tone="warn">Nobody else is free that day. Consider making it an open shift instead.</Notice>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="ArrowRightLeft" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No swap requests</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            Employees can flag a shift for swap from the rota. Requests appear here for a decision.
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Coverage ---------------- */
function RotaCoverage({ data }) {
  const { employees, shifts, S } = data;
  const [weeks, setWeeks] = React.useState('1');

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const from = monday.toISOString().slice(0, 10);
  const to = new Date(monday.getTime() + Number(weeks) * 7 * 864e5 - 864e5).toISOString().slice(0, 10);
  const scoped = shifts.filter(s => s.date >= from && s.date <= to);

  /* Per person: scheduled versus contracted over the period. */
  const rows = employees.map(e => {
    const mine = scoped.filter(s => s.employeeKey === e.id && s.status === 'Assigned');
    const scheduled = mine.reduce((n, s) => n + window.shiftHours(s.start, s.end), 0);
    const contracted = (Number(e.hoursPerWeek) || 37.5) * Number(weeks);
    return {
      id: e.id, employee: e, name: S.fullName(e), department: e.department,
      shifts: mine.length,
      scheduled: Math.round(scheduled * 10) / 10,
      contracted: Math.round(contracted * 10) / 10,
      variance: Math.round((scheduled - contracted) * 10) / 10,
      pct: contracted ? Math.round(scheduled / contracted * 100) : 0
    };
  }).sort((a, b) => a.pct - b.pct);

  const under = rows.filter(r => r.pct < 80);
  const over = rows.filter(r => r.pct > 100);
  const totalScheduled = rows.reduce((n, r) => n + r.scheduled, 0);
  const totalContracted = rows.reduce((n, r) => n + r.contracted, 0);

  /* Coverage by day of week across the period. */
  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowHours = new Array(7).fill(0);
  scoped.forEach(s => { dowHours[(new Date(s.date).getDay() + 6) % 7] += window.shiftHours(s.start, s.end); });
  const dowBars = dowNames.map((label, i) => ({ label, value: Math.round(dowHours[i]), muted: i > 4 }));

  const deptMap = {};
  scoped.forEach(s => { deptMap[s.department] = (deptMap[s.department] || 0) + window.shiftHours(s.start, s.end); });
  const deptBars = Object.keys(deptMap).map(k => ({ label: k.slice(0, 6), value: Math.round(deptMap[k]) })).sort((a, b) => b.value - a.value);

  function exportRota() {
    window.downloadCsv('nhr-rota-' + from + '.csv',
      [{ label: 'Employee', key: 'name' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
      { label: 'Date', key: 'date' }, { label: 'Start', key: 'start' }, { label: 'End', key: 'end' },
      { label: 'Pattern', key: 'label' }, { label: 'Hours', key: 'hours' },
      { label: 'Location', key: 'location' }, { label: 'Status', key: 'status' }],
      scoped.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(s => ({
        name: s.employeeName, ref: s.employeeRef, dept: s.department, date: s.date,
        start: s.start, end: s.end, label: s.label, hours: window.shiftHours(s.start, s.end),
        location: s.location, status: s.status
      })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Hours scheduled" value={String(Math.round(totalScheduled))} caption={'of ' + Math.round(totalContracted) + ' contracted'} icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Coverage" value={totalContracted ? Math.round(totalScheduled / totalContracted * 100) + '%' : '—'} caption="Scheduled vs contracted" icon={<Icon name="ChartColumn" size={18} />} />
        <StatTile label="Under-scheduled" value={String(under.length)} caption="Below 80% of contract" icon={<Icon name="TrendingDown" size={18} />} />
        <StatTile label="Over contract" value={String(over.length)} caption="Above contracted hours" icon={<Icon name="TrendingUp" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Period</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['1', 'This week'], ['2', '2 weeks'], ['4', '4 weeks']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setWeeks(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (weeks === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: weeks === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: weeks === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: weeks === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" onClick={exportRota} iconLeft={<Icon name="Download" size={15} />}>Export Rota</Button>
      </Card>

      <div className="rota-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Hours by day" action={<Badge tone="dark">h</Badge>}>
          <BarChart unit="h" height={170} data={dowBars} />
        </DashboardCard>
        <DashboardCard title="Hours by department" action={<Badge tone="dark">h</Badge>}>
          {deptBars.length ? <BarChart unit="h" height={170} data={deptBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing scheduled in this period.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="Scheduled against contract" padding={16} action={<Badge tone="dark">Lowest first</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => {
            const flag = r.pct < 80 || r.pct > 100;
            return (
              <div key={r.id} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                border: '1px solid ' + (flag ? 'rgba(242,180,65,.26)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: flag ? 'rgba(242,180,65,.035)' : 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={r.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 165 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{r.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.employee.jobTitle} · {r.department}</span>
                  </span>
                  {[['Shifts', r.shifts], ['Scheduled', r.scheduled + 'h'], ['Contract', r.contracted + 'h']].map(([label, v]) => (
                    <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                    </span>
                  ))}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                    <span style={{
                      fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: r.variance === 0 ? 'var(--nhr-turquoise)' : r.variance > 0 ? 'var(--nhr-warning)' : 'var(--text-muted-dark)'
                    }}>{r.variance > 0 ? '+' : ''}{r.variance}h</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Variance</span>
                  </span>
                </div>
                <ProgressMeter label={r.pct + '% of contracted hours'} value={Math.min(100, r.pct)} valueLabel={r.pct + '%'} />
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Coverage compares assigned shift hours against contracted hours and excludes open shifts and approved leave.
          It is a scheduling view, not a working-time compliance check — rest breaks, the 48-hour average and night-worker
          limits need checking against your own policy and the Working Time Regulations.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function RotaScreen() {
  const data = window.useRotaData();
  const [view, setView] = React.useState('Week View');
  const [assigning, setAssigning] = React.useState(false);
  const canWrite = data.S.can('employees.write');
  const today = new Date().toISOString().slice(0, 10);
  const open = data.shifts.filter(s => s.status === 'Open' && s.date >= today).length;
  const swaps = data.shifts.filter(s => s.swapRequested).length;

  const body = {
    'Week View': <window.RotaWeek data={data} />,
    'Open Shifts': <OpenShifts data={data} />,
    'Swaps': <ShiftSwaps data={data} />,
    'Coverage': <RotaCoverage data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Shifts &amp; Rotas</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Build the week, fill open shifts and decide swaps. Approved leave is read from the Leave module, so the rota will not schedule someone who is off.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Open Shifts')} iconLeft={<Icon name="UserPlus" size={15} />}>
              Open Shifts{open > 0 ? ' (' + open + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setAssigning(true)} iconLeft={<Icon name="Plus" size={16} />}>Assign Shift</Button>
          </div>
        )}
      </div>

      <window.RotaSubnav view={view} onSelect={setView} counts={{ open, swaps }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {assigning && <window.AssignShiftDialog data={data} preset={null} onClose={() => setAssigning(false)} />}
    </div>
  );
}

Object.assign(window, { RotaScreen, OpenShifts, ShiftSwaps, RotaCoverage });
