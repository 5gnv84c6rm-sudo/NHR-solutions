/* Holiday & Leave — calendar, allowances, public holidays and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Month calendar ---------------- */
function LeaveCalendar({ data }) {
  const { employees, rows, S } = data;
  const [offset, setOffset] = React.useState(0);
  const [nation, setNation] = React.useState('England & Wales');
  const [dept, setDept] = React.useState('All');

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear(), month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const holidays = Object.fromEntries(window.BANK_HOLIDAYS[nation]);

  const approved = rows.filter(r => r.status === 'Approved' && (dept === 'All' || r.department === dept));
  const pending = rows.filter(r => r.status === 'Pending' && (dept === 'All' || r.department === dept));

  function onDay(list, day) {
    const iso = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    return list.filter(r => r.startDate <= iso && r.endDate >= iso);
  }

  const headcount = dept === 'All' ? employees.length : employees.filter(e => e.department === dept).length;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton tone="dark" size={32} label="Previous month" onClick={() => setOffset(o => o - 1)}><Icon name="ChevronLeft" size={16} /></IconButton>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', minWidth: 148, textAlign: 'center' }}>
            {base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
          <IconButton tone="dark" size={32} label="Next month" onClick={() => setOffset(o => o + 1)}><Icon name="ChevronRight" size={16} /></IconButton>
        </span>
        {offset !== 0 && <Button size="xs" variant="ghost" tone="dark" onClick={() => setOffset(0)}>Today</Button>}
        <span style={{ flex: 1 }} />
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={nation} onChange={e => setNation(e.target.value)} aria-label="Bank holiday nation" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {Object.keys(window.BANK_HOLIDAYS).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </Card>

      <Card tone="dark" padding={16}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6, marginBottom: 8 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <span key={d} style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, color: 'var(--text-muted-dark)', textAlign: 'center' }}>{d}</span>
          ))}
        </div>
        <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={'e' + i} />;
            const iso = new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10);
            const dow = new Date(year, month, d).getDay();
            const weekend = dow === 0 || dow === 6;
            const bh = holidays[iso];
            const off = onDay(approved, d);
            const pend = onDay(pending, d);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
            const pressure = headcount ? off.length / headcount : 0;
            return (
              <div key={iso} style={{
                display: 'flex', flexDirection: 'column', gap: 5, minHeight: 92, padding: 8,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid ' + (isToday ? 'rgba(0,229,212,.45)' : bh ? 'rgba(242,180,65,.28)' : 'var(--border-dark)'),
                background: bh ? 'rgba(242,180,65,.07)' : weekend ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.03)',
                opacity: weekend && !off.length ? .65 : 1
              }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? 'var(--nhr-turquoise)' : '#fff' }}>{d}</span>
                  {pressure >= 0.25 && <span title="A quarter or more of the team is off" style={{ display: 'inline-flex', color: 'var(--nhr-warning)' }}><Icon name="TriangleAlert" size={11} /></span>}
                </span>
                {bh && <span style={{ fontSize: 9.5, lineHeight: 1.3, color: 'var(--nhr-warning)', fontWeight: 600 }}>{bh}</span>}
                {off.slice(0, 2).map(r => (
                  <span key={r.id} title={r.employeeName + ' — ' + r.type} style={{
                    fontSize: 9.5, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    background: 'rgba(0,229,212,.14)', border: '1px solid rgba(0,229,212,.26)', color: '#fff', fontWeight: 600
                  }}>{r.employeeName.split(' ')[0]}</span>
                ))}
                {off.length > 2 && <span style={{ fontSize: 9.5, color: 'var(--text-muted-dark)' }}>+{off.length - 2} more</span>}
                {pend.length > 0 && (
                  <span style={{ fontSize: 9.5, padding: '2px 5px', borderRadius: 4, background: 'rgba(242,180,65,.12)', border: '1px dashed rgba(242,180,65,.3)', color: 'var(--nhr-warning)', fontWeight: 600 }}>
                    {pend.length} pending
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-dark)' }}>
          {[['rgba(0,229,212,.14)', 'rgba(0,229,212,.26)', 'Approved leave'],
            ['rgba(242,180,65,.12)', 'rgba(242,180,65,.3)', 'Pending request'],
            ['rgba(242,180,65,.07)', 'rgba(242,180,65,.28)', 'Bank holiday']].map(([bg, bd, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted-dark)' }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: '1px solid ' + bd }} />{label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted-dark)' }}>
            <Icon name="TriangleAlert" size={12} style={{ color: 'var(--nhr-warning)' }} />A quarter or more of the team off
          </span>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Allowances ---------------- */
function LeaveAllowances({ data }) {
  const { employees, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [sort, setSort] = React.useState('remaining');
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState('');

  const balances = employees.map(e => Object.assign({ employee: e }, R.leaveBalance(e)));
  balances.sort((a, b) => sort === 'remaining' ? a.remaining - b.remaining
    : sort === 'taken' ? b.taken - a.taken
      : S.fullName(a.employee).localeCompare(S.fullName(b.employee)));

  function save(b) {
    const n = parseFloat(draft);
    if (!(n >= 0)) return;
    S.update(b.employee.id, { annualLeaveEntitlement: n });
    S.logActivity(b.employee.id, 'Annual leave entitlement set to ' + n + ' days');
    setEditing(null); setDraft(''); refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Sort by</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['remaining', 'Least remaining'], ['taken', 'Most taken'], ['name', 'Name']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSort(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (sort === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: sort === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: sort === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: sort === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{balances.length} {balances.length === 1 ? 'person' : 'people'}</span>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {balances.map(b => {
          const pct = b.entitlement ? Math.round(b.taken / b.entitlement * 100) : 0;
          const low = b.remaining <= 3;
          return (
            <Card key={b.employee.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Avatar employee={b.employee} size={36} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 180 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{S.fullName(b.employee)}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{b.employee.jobTitle} · {b.employee.department}</span>
                </span>
                {[['Entitlement', b.entitlement], ['Taken', b.taken], ['Pending', b.pending], ['Remaining', b.remaining]].map(([label, v]) => (
                  <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: label === 'Remaining' ? (low ? 'var(--nhr-warning)' : 'var(--nhr-turquoise)') : '#fff'
                    }}>{v}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                  </span>
                ))}
                {canWrite && (editing === b.employee.id ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={draft} onChange={e => setDraft(e.target.value)} aria-label="New entitlement" autoFocus
                      style={{ width: 68, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(0,229,212,.35)', borderRadius: 'var(--radius-sm)', padding: '8px 9px', outline: 'none' }} />
                    <Button size="xs" onClick={() => save(b)}>Save</Button>
                    <Button size="xs" variant="ghost" tone="dark" onClick={() => setEditing(null)}>Cancel</Button>
                  </span>
                ) : (
                  <IconButton tone="dark" size={30} label="Edit entitlement"
                    onClick={() => { setEditing(b.employee.id); setDraft(String(b.entitlement)); }}><Icon name="Pencil" size={14} /></IconButton>
                ))}
              </div>
              <ProgressMeter label={b.taken + ' of ' + b.entitlement + ' days taken'} value={pct} valueLabel={pct + '%'} />
              {low && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--nhr-warning)' }}>
                  <Icon name="TriangleAlert" size={14} />{b.remaining} day{b.remaining === 1 ? '' : 's'} remaining. Statutory minimum is 28 days including bank holidays for a full-time worker.
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Public holidays ---------------- */
function PublicHolidays() {
  const [nation, setNation] = React.useState('England & Wales');
  const list = window.BANK_HOLIDAYS[nation];
  const today = new Date().toISOString().slice(0, 10);
  const next = list.find(h => h[0] >= today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16 }}>
        <StatTile label="Bank holidays listed" value={String(list.length)} caption={nation} icon={<Icon name="Landmark" size={18} />} />
        <StatTile label="Next holiday" value={next ? window.shortDate(next[0]) : '—'} caption={next ? next[1] : 'None listed'} icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Statutory minimum" value="28 days" caption="Full-time, including bank holidays" icon={<Icon name="Scale" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Nation</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.keys(window.BANK_HOLIDAYS).map(n => (
            <button key={n} type="button" onClick={() => setNation(n)} style={{
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (nation === n ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: nation === n ? 'rgba(0,229,212,.10)' : 'transparent',
              color: nation === n ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: nation === n ? 700 : 600
            }}>{n}</button>
          ))}
        </div>
      </Card>

      <DashboardCard title={nation} padding={16}>
        <DataTable compact columns={[
          { key: 'date', label: 'Date', mono: true }, { key: 'day', label: 'Day' },
          { key: 'name', label: 'Holiday' }, { key: 'status', label: '', align: 'right' }
        ]} rows={list.map(([iso, name]) => ({
          id: iso, date: window.shortDate(iso),
          day: new Date(iso).toLocaleDateString('en-GB', { weekday: 'long' }),
          name,
          status: iso < today
            ? <Badge tone="dark">Passed</Badge>
            : (next && next[0] === iso ? <Badge tone="success">Next</Badge> : <Badge tone="dark">Upcoming</Badge>)
        }))} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Dates listed are the standard bank holidays for each nation. One-off royal or commemorative holidays are announced by government
          and are not included until confirmed. Whether bank holidays count toward the 28-day statutory minimum depends on the contract —
          check your own terms before relying on these figures.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Book leave on behalf of an employee ---------------- */
function BookLeaveDialog({ data, onClose }) {
  const { employees, S, R, refresh } = data;
  const [form, setForm] = React.useState({ employeeId: '', type: 'Annual leave', startDate: '', endDate: '', reason: '', approve: true });
  const [error, setError] = React.useState('');
  const employee = form.employeeId ? S.get(form.employeeId) : null;
  const bal = employee ? R.leaveBalance(employee) : null;
  const days = form.startDate && form.endDate ? R.workingDays(form.startDate, form.endDate) : 0;

  function submit() {
    if (!form.employeeId) return setError('Choose an employee.');
    if (!form.startDate || !form.endDate) return setError('Choose a start and end date.');
    if (days <= 0) return setError('The end date must be on or after the start date and cover a working day.');
    if (form.type === 'Annual leave' && bal && days > bal.remaining) return setError('That is ' + days + ' days but only ' + bal.remaining + ' remain.');
    R.add(form.employeeId, 'leaveRequests', {
      type: form.type, startDate: form.startDate, endDate: form.endDate, days,
      status: form.approve ? 'Approved' : 'Pending', reason: form.reason,
      requestedAt: new Date().toISOString().slice(0, 10),
      decidedBy: form.approve ? S.session.name : '', decidedAt: form.approve ? new Date().toISOString().slice(0, 10) : ''
    });
    S.logActivity(form.employeeId, form.type + ' booked by ' + S.session.name + ': ' + days + ' day' + (days > 1 ? 's' : '') + ' from ' + window.shortDate(form.startDate));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Book Leave" subtitle="Records the booking against the employee's record and allowance." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Leave type" value={form.type} onChange={v => setForm(p => Object.assign({}, p, { type: v }))} options={R.LEAVE_TYPES} />
          <SelectField label="Decision" value={form.approve ? 'Approve now' : 'Leave pending'}
            onChange={v => setForm(p => Object.assign({}, p, { approve: v === 'Approve now' }))}
            options={['Approve now', 'Leave pending']} />
          <TextField label="Start date" required type="date" value={form.startDate} onChange={v => setForm(p => Object.assign({}, p, { startDate: v }))} />
          <TextField label="End date" required type="date" value={form.endDate} onChange={v => setForm(p => Object.assign({}, p, { endDate: v }))} />
          <TextareaField label="Note (optional)" span={2} rows={2} value={form.reason} onChange={v => setForm(p => Object.assign({}, p, { reason: v }))} />
        </FormGrid>
        {bal && (
          <Notice icon="Scale">
            {S.fullName(employee)} has {bal.remaining} of {bal.entitlement} days remaining
            {days > 0 ? ' — this booking would leave ' + Math.max(0, bal.remaining - days) + '.' : '.'}
          </Notice>
        )}
        {days > 0 && <Notice icon="Info">{days} working day{days > 1 ? 's' : ''} (weekends excluded).</Notice>}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Book Leave</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Screen shell ---------------- */
function LeaveScreen() {
  const data = window.useLeaveData();
  const [view, setView] = React.useState('Overview');
  const [booking, setBooking] = React.useState(false);
  const pending = data.rows.filter(r => r.status === 'Pending').length;
  const canWrite = data.S.can('employees.write');

  const body = {
    'Overview': <window.LeaveOverview data={data} onView={setView} />,
    'Requests': <window.LeaveRequests data={data} />,
    'Calendar': <LeaveCalendar data={data} />,
    'Allowances': <LeaveAllowances data={data} />,
    'Public Holidays': <PublicHolidays />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Holiday &amp; Leave</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Requests, balances and team availability across everyone you manage. Decisions here appear on the employee record straight away.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Calendar')} iconLeft={<Icon name="CalendarDays" size={15} />}>View Calendar</Button>
            <Button size="sm" onClick={() => setBooking(true)} iconLeft={<Icon name="Plus" size={16} />}>Book Leave</Button>
          </div>
        )}
      </div>

      <window.LeaveSubnav view={view} onSelect={setView} counts={{ pending }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {booking && <BookLeaveDialog data={data} onClose={() => setBooking(false)} />}
    </div>
  );
}

Object.assign(window, { LeaveScreen, LeaveCalendar, LeaveAllowances, PublicHolidays, BookLeaveDialog });
