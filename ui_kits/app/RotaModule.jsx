/* NHR Solution — Shifts & Rotas module (company-wide).

   The per-employee Shifts & Rotas tab shows one person's week; this screen is
   the scheduler's view: a whole-team week grid, open shifts needing cover,
   swap requests to decide, and coverage against contracted hours.

   Employees come from EmployeeStore so permissions apply; shifts come from
   EmployeeRecords, the same store the employee tab writes to. Leave is read
   from the same place so the rota never schedules someone who is off.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const ROTA_DAY = 864e5;
const SHIFT_PATTERNS = [
  ['Early', '06:00', '14:00'], ['Day', '09:00', '17:30'],
  ['Late', '14:00', '22:00'], ['Night', '22:00', '06:00'], ['On call', '00:00', '23:59']
];

function shiftHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;            /* crosses midnight */
  return Math.round(mins / 60 * 100) / 100;
}

function RotaSubnav({ view, onSelect, counts }) {
  const items = [
    ['Week View', 'CalendarRange'], ['Open Shifts', 'UserPlus'],
    ['Swaps', 'ArrowRightLeft'], ['Coverage', 'ChartColumn']
  ];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Open Shifts' ? counts.open : label === 'Swaps' ? counts.swaps : 0;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)}
            aria-current={active ? 'page' : undefined}
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
            {n > 0 && <Badge tone="warning">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useRotaData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const shifts = [];
  const leave = [];
  employees.forEach(e => {
    const set = R.get(e);
    (set.shifts || []).forEach(s => shifts.push(Object.assign({}, s, {
      employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
      department: e.department, jobTitle: e.jobTitle, employee: e
    })));
    (set.leaveRequests || []).filter(l => l.status === 'Approved').forEach(l => leave.push(Object.assign({}, l, { employeeKey: e.id })));
  });
  return { employees, shifts, leave, refresh: force, S, R };
}

/* Is this person on approved leave on this date? */
function onLeaveOn(leave, employeeKey, iso) {
  return leave.some(l => l.employeeKey === employeeKey && l.startDate <= iso && l.endDate >= iso);
}

/* ---------------- Week view ---------------- */
function RotaWeek({ data }) {
  const { employees, shifts, leave, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [offset, setOffset] = React.useState(0);
  const [dept, setDept] = React.useState('All');
  const [adding, setAdding] = React.useState(null);   /* {employee, iso} */

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  const week = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * ROTA_DAY));
  const isoOf = d => d.toISOString().slice(0, 10);
  const from = isoOf(week[0]), to = isoOf(week[6]);

  const people = employees.filter(e => dept === 'All' || e.department === dept);
  const inWeek = shifts.filter(s => s.date >= from && s.date <= to);
  const cellShifts = (key, iso) => inWeek.filter(s => s.employeeKey === key && s.date === iso);

  const weekHours = inWeek.reduce((n, s) => n + shiftHours(s.start, s.end), 0);
  const openCount = inWeek.filter(s => s.status === 'Open').length;
  const openUpcoming = inWeek.filter(s => s.status === 'Open' && s.date >= new Date().toISOString().slice(0, 10)).length;

  function copyLastWeek() {
    const prevFrom = isoOf(new Date(monday.getTime() - 7 * ROTA_DAY));
    const prevTo = isoOf(new Date(monday.getTime() - ROTA_DAY));
    const source = shifts.filter(s => s.date >= prevFrom && s.date <= prevTo && (dept === 'All' || s.department === dept));
    let n = 0;
    source.forEach(s => {
      const target = isoOf(new Date(new Date(s.date).getTime() + 7 * ROTA_DAY));
      if (onLeaveOn(leave, s.employeeKey, target)) return;
      if (cellShifts(s.employeeKey, target).length) return;
      R.add(s.employeeKey, 'shifts', {
        date: target, start: s.start, end: s.end, label: s.label,
        location: s.location, hours: shiftHours(s.start, s.end), status: 'Assigned', swapRequested: false
      });
      n++;
    });
    if (n) S.logActivity(source[0].employeeKey, n + ' shifts copied into week beginning ' + window.shortDate(from));
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Shifts scheduled" value={String(inWeek.length)} caption="Selected week" icon={<Icon name="CalendarRange" size={18} />} />
        <StatTile label="Hours scheduled" value={String(Math.round(weekHours))} caption="Across the team" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Open shifts" value={String(openCount)} caption={openUpcoming === openCount ? 'Awaiting cover' : openUpcoming + ' still upcoming'} icon={<Icon name="UserPlus" size={18} />} />
        <StatTile label="People rostered" value={String(new Set(inWeek.map(s => s.employeeKey)).size)} caption={'of ' + people.length + ' in view'} icon={<Icon name="Users" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton tone="dark" size={32} label="Previous week" onClick={() => setOffset(o => o - 1)}><Icon name="ChevronLeft" size={16} /></IconButton>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', minWidth: 158, textAlign: 'center' }}>
            {window.shortDate(from)} – {window.shortDate(to)}
          </span>
          <IconButton tone="dark" size={32} label="Next week" onClick={() => setOffset(o => o + 1)}><Icon name="ChevronRight" size={16} /></IconButton>
        </span>
        {offset !== 0 && <Button size="xs" variant="ghost" tone="dark" onClick={() => setOffset(0)}>This week</Button>}
        <span style={{ flex: 1 }} />
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {canWrite && <Button size="sm" variant="secondary" tone="dark" onClick={copyLastWeek} iconLeft={<Icon name="Copy" size={15} />}>Copy Last Week</Button>}
      </Card>

      <Card tone="dark" padding={0} style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7,minmax(0,1fr))', borderBottom: '1px solid var(--border-dark)' }}>
            <span style={{ padding: '13px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, color: 'var(--text-muted-dark)' }}>Employee</span>
            {week.map(d => {
              const today = d.toDateString() === new Date().toDateString();
              return (
                <span key={isoOf(d)} style={{ padding: '13px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, borderLeft: '1px solid var(--border-dark)', background: today ? 'rgba(0,229,212,.05)' : 'transparent' }}>
                  <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color: today ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{d.getDate()}</span>
                </span>
              );
            })}
          </div>

          {people.map(e => {
            const mine = inWeek.filter(s => s.employeeKey === e.id);
            const mineHours = mine.reduce((n, s) => n + shiftHours(s.start, s.end), 0);
            const contracted = Number(e.hoursPerWeek) || 37.5;
            const over = mineHours > contracted;
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '180px repeat(7,minmax(0,1fr))', borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', minWidth: 0 }}>
                  <Avatar employee={e} size={30} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{S.fullName(e)}</span>
                    <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: over ? 'var(--nhr-warning)' : 'var(--text-muted-dark)' }}>
                      {Math.round(mineHours * 10) / 10}h / {contracted}h
                    </span>
                  </span>
                </span>
                {week.map(d => {
                  const iso = isoOf(d);
                  const rows = cellShifts(e.id, iso);
                  const off = onLeaveOn(leave, e.id, iso);
                  return (
                    <span key={iso} style={{
                      display: 'flex', flexDirection: 'column', gap: 4, padding: 6, minHeight: 62,
                      borderLeft: '1px solid var(--border-dark)',
                      background: off ? 'rgba(0,229,212,.04)' : 'transparent'
                    }}>
                      {off && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--nhr-turquoise)', textAlign: 'center', paddingTop: 6 }}>ON LEAVE</span>}
                      {!off && rows.map(s => (
                        <span key={s.id} style={{
                          display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 6px', borderRadius: 5,
                          background: s.status === 'Open' ? 'rgba(242,180,65,.12)' : s.swapRequested ? 'rgba(255,255,255,.06)' : 'rgba(0,229,212,.12)',
                          border: '1px solid ' + (s.status === 'Open' ? 'rgba(242,180,65,.3)' : s.swapRequested ? 'rgba(255,255,255,.16)' : 'rgba(0,229,212,.26)')
                        }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{s.start}–{s.end}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-body-dark)' }}>{s.label}{s.swapRequested ? ' · swap' : ''}</span>
                          {canWrite && (
                            <span style={{ display: 'flex', gap: 5 }}>
                              <button type="button" title="Request swap"
                                onClick={() => { R.update(e.id, 'shifts', s.id, { swapRequested: !s.swapRequested }); refresh(); }}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--nhr-turquoise)', display: 'inline-flex' }}>
                                <Icon name="ArrowRightLeft" size={10} />
                              </button>
                              <button type="button" title="Remove shift"
                                onClick={() => { R.remove(e.id, 'shifts', s.id); refresh(); }}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted-dark)', display: 'inline-flex' }}>
                                <Icon name="X" size={10} />
                              </button>
                            </span>
                          )}
                        </span>
                      ))}
                      {!off && canWrite && (
                        <button type="button" aria-label={'Add shift for ' + S.fullName(e) + ' on ' + iso}
                          onClick={() => setAdding({ employee: e, iso })}
                          style={{
                            marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '3px 0', borderRadius: 4, cursor: 'pointer',
                            border: '1px dashed var(--border-dark)', background: 'transparent', color: 'var(--text-muted-dark)'
                          }}>
                          <Icon name="Plus" size={11} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {[['rgba(0,229,212,.12)', 'rgba(0,229,212,.26)', 'Assigned'],
          ['rgba(242,180,65,.12)', 'rgba(242,180,65,.3)', 'Open shift'],
          ['rgba(255,255,255,.06)', 'rgba(255,255,255,.16)', 'Swap requested']].map(([bg, bd, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted-dark)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: '1px solid ' + bd }} />{label}
          </span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>Hours over contract shown in amber.</span>
      </div>

      {adding && <AssignShiftDialog data={data} preset={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

/* ---------------- Assign shift ---------------- */
function AssignShiftDialog({ data, preset, onClose }) {
  const { employees, leave, S, R, refresh } = data;
  const [form, setForm] = React.useState({
    employeeId: preset && preset.employee ? preset.employee.id : '',
    date: preset ? preset.iso : '',
    pattern: 'Day', start: '09:00', end: '17:30',
    location: preset && preset.employee ? (preset.employee.location || '') : '',
    open: false, repeat: '1'
  });
  const [error, setError] = React.useState('');
  const employee = form.employeeId ? S.get(form.employeeId) : null;
  const hours = shiftHours(form.start, form.end);
  const clash = form.employeeId && form.date && onLeaveOn(leave, form.employeeId, form.date);

  function setPattern(name) {
    const p = SHIFT_PATTERNS.find(x => x[0] === name);
    setForm(f => Object.assign({}, f, { pattern: name, start: p ? p[1] : f.start, end: p ? p[2] : f.end }));
  }

  function submit() {
    if (!form.open && !form.employeeId) return setError('Choose an employee, or mark the shift as open.');
    if (!form.date) return setError('Choose a date.');
    if (clash) return setError(S.fullName(employee) + ' is on approved leave that day.');
    const target = form.open ? (form.employeeId || employees[0].id) : form.employeeId;
    const repeat = Math.max(1, Math.min(14, Number(form.repeat) || 1));
    for (let i = 0; i < repeat; i++) {
      const iso = new Date(new Date(form.date).getTime() + i * ROTA_DAY).toISOString().slice(0, 10);
      if (!form.open && onLeaveOn(leave, target, iso)) continue;
      R.add(target, 'shifts', {
        date: iso, start: form.start, end: form.end, label: form.pattern,
        location: form.location || 'Unassigned', hours,
        status: form.open ? 'Open' : 'Assigned', swapRequested: false
      });
    }
    S.logActivity(target, (form.open ? 'Open shift created' : 'Shift assigned') + ' for ' + window.shortDate(form.date) +
      ' (' + form.start + '–' + form.end + ')' + (repeat > 1 ? ' ×' + repeat + ' days' : ''));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Assign Shift"
      subtitle="Adds the shift to the employee's rota and their record." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label={form.open ? 'Team (for an open shift)' : 'Employee'} required span={2}
            value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <TextField label="Date" required type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
          <SelectField label="Pattern" value={form.pattern} onChange={setPattern} options={SHIFT_PATTERNS.map(p => p[0])} />
          <TextField label="Start" type="time" value={form.start} onChange={v => setForm(p => Object.assign({}, p, { start: v, pattern: 'Custom' }))} />
          <TextField label="End" type="time" value={form.end} onChange={v => setForm(p => Object.assign({}, p, { end: v, pattern: 'Custom' }))} />
          <TextField label="Location" value={form.location} onChange={v => setForm(p => Object.assign({}, p, { location: v }))} placeholder="Manchester" />
          <TextField label="Repeat for (days)" value={form.repeat} onChange={v => setForm(p => Object.assign({}, p, { repeat: v }))} mono hint="1 creates a single shift." />
          <SelectField label="Type" span={2} value={form.open ? 'Open shift — anyone can pick up' : 'Assigned to this person'}
            onChange={v => setForm(p => Object.assign({}, p, { open: /^Open/.test(v) }))}
            options={['Assigned to this person', 'Open shift — anyone can pick up']} />
        </FormGrid>
        <Notice icon="Clock">{hours} hour{hours === 1 ? '' : 's'} per shift{hours > 12 ? ' — over 12 hours, check working time limits.' : '.'}</Notice>
        {clash && <Notice icon="TriangleAlert" tone="warn">{S.fullName(employee)} is on approved leave on {window.shortDate(form.date)}.</Notice>}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Assign Shift</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { SHIFT_PATTERNS, shiftHours, onLeaveOn, RotaSubnav, useRotaData, RotaWeek, AssignShiftDialog });
