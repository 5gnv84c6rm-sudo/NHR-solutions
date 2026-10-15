/* Employee Details — attendance, leave and absence tabs.
   Reads and writes through window.EmployeeRecords; every form here mutates the
   record set and the figures above it recalculate. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const ATT_TONE = { Present: 'success', Late: 'warning', Absent: 'danger', 'Annual leave': 'dark' };
const REQ_TONE = { Approved: 'success', Pending: 'warning', Rejected: 'danger', Cancelled: 'dark' };
const BAND_TONE = { None: 'success', Low: 'success', Monitor: 'warning', Concern: 'warning', Review: 'danger' };

function shortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function dayName(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short' });
}

/* Empty state used inside a tab when a collection has no rows yet. */
function TabEmpty({ icon, title, description, children }) {
  return (
    <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <Icon name={icon} size={20} style={{ color: 'var(--nhr-turquoise)' }} />
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</span>
      <span style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 480, color: 'var(--text-body-dark)' }}>{description}</span>
      {children}
    </Card>
  );
}

/* ---------------- Attendance ---------------- */
function AttendanceTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const sum = R.attendanceSummary(employee);
  const canWrite = S.can('employees.write');
  const [range, setRange] = React.useState('28');
  const rows = (set.timesheet || []).slice().reverse().slice(0, Number(range));

  const byWeek = {};
  (set.timesheet || []).forEach(r => {
    const d = new Date(r.date);
    const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = monday.toISOString().slice(0, 10);
    byWeek[k] = (byWeek[k] || 0) + (Number(r.hours) || 0);
  });
  const weekBars = Object.keys(byWeek).sort().slice(-5).map(k => ({
    label: new Date(k).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    value: Math.round(byWeek[k] * 10) / 10
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Attendance rate" value={sum.rate + '%'} caption="Last 28 days" icon={<Icon name="CalendarCheck" size={18} />} />
        <StatTile label="Hours recorded" value={String(sum.hours)} caption={'of ' + sum.contracted + ' contracted'} icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Late arrivals" value={String(sum.late)} caption="Last 28 days" icon={<Icon name="AlarmClock" size={18} />} />
        <StatTile label="Awaiting approval" value={String(sum.unapproved)} caption="Timesheet days" icon={<Icon name="ClipboardCheck" size={18} />} />
      </div>

      {sum.unapproved > 0 && canWrite && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="ClipboardCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {sum.unapproved} timesheet {sum.unapproved === 1 ? 'day is' : 'days are'} waiting for manager approval.
          </span>
          <Button size="sm" onClick={() => {
            (set.timesheet || []).filter(r => !r.approved).forEach(r => R.update(employee.id, 'timesheet', r.id, { approved: true }));
            S.logActivity(employee.id, 'Timesheet approved for ' + sum.unapproved + ' days');
            onChange();
          }}>Approve All</Button>
        </Card>
      )}

      <DashboardCard title="Hours per week" action={<Badge tone="dark">Last 5 weeks</Badge>}>
        <BarChart unit="h" height={170} data={weekBars} />
      </DashboardCard>

      <DashboardCard title="Timesheet" padding={16} action={
        <select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range" style={{
          background: 'rgba(255,255,255,.05)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-sm)', padding: '6px 9px', fontSize: 12.5, fontFamily: 'var(--font-core)'
        }}>
          <option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="28">Last 28 days</option>
        </select>
      }>
        <DataTable compact columns={[
          { key: 'day', label: 'Day' }, { key: 'date', label: 'Date', mono: true },
          { key: 'clockIn', label: 'In', mono: true }, { key: 'clockOut', label: 'Out', mono: true },
          { key: 'breakMins', label: 'Break', mono: true }, { key: 'hours', label: 'Hours', mono: true, align: 'right' },
          { key: 'status', label: 'Status' }, { key: 'approved', label: '', align: 'right' }
        ]} rows={rows.map(r => ({
          id: r.id, day: dayName(r.date), date: shortDate(r.date),
          clockIn: r.clockIn, clockOut: r.clockOut,
          breakMins: r.breakMins ? r.breakMins + 'm' : '—',
          hours: r.hours ? r.hours.toFixed(2) : '—',
          status: <Badge tone={ATT_TONE[r.status] || 'dark'}>{r.status}</Badge>,
          approved: r.approved
            ? <Icon name="CircleCheck" size={15} style={{ color: 'var(--nhr-turquoise)' }} aria-label="Approved" />
            : (canWrite
              ? <Button size="xs" variant="secondary" tone="dark" onClick={() => { R.update(employee.id, 'timesheet', r.id, { approved: true }); onChange(); }}>Approve</Button>
              : <Badge tone="warning">Pending</Badge>)
        }))} />
      </DashboardCard>
    </div>
  );
}

/* ---------------- Holiday & Leave ---------------- */
function LeaveTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const bal = R.leaveBalance(employee);
  const canApprove = S.can('employees.write');
  const [form, setForm] = React.useState({ type: 'Annual leave', startDate: '', endDate: '', reason: '' });
  const [error, setError] = React.useState('');
  const days = form.startDate && form.endDate ? R.workingDays(form.startDate, form.endDate) : 0;

  function submit() {
    if (!form.startDate || !form.endDate) return setError('Choose a start and end date.');
    if (days <= 0) return setError('The end date must be on or after the start date, and cover at least one working day.');
    if (form.type === 'Annual leave' && days > bal.remaining) return setError('That request is ' + days + ' days but only ' + bal.remaining + ' remain in the allowance.');
    R.add(employee.id, 'leaveRequests', {
      type: form.type, startDate: form.startDate, endDate: form.endDate, days,
      status: 'Pending', reason: form.reason, requestedAt: new Date().toISOString().slice(0, 10),
      decidedBy: '', decidedAt: ''
    });
    S.logActivity(employee.id, form.type + ' requested: ' + days + ' day' + (days > 1 ? 's' : '') + ' from ' + shortDate(form.startDate));
    setForm({ type: 'Annual leave', startDate: '', endDate: '', reason: '' });
    setError(''); onChange();
  }

  function decide(row, status) {
    R.update(employee.id, 'leaveRequests', row.id, {
      status, decidedBy: S.session.name, decidedAt: new Date().toISOString().slice(0, 10)
    });
    S.logActivity(employee.id, row.type + ' ' + status.toLowerCase() + ' (' + row.days + ' day' + (row.days > 1 ? 's' : '') + ' from ' + shortDate(row.startDate) + ')');
    onChange();
  }

  const requests = set.leaveRequests || [];
  const pending = requests.filter(r => r.status === 'Pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Remaining" value={String(bal.remaining)} caption={'of ' + bal.entitlement + ' days'} icon={<Icon name="Plane" size={18} />} />
        <StatTile label="Taken" value={String(bal.taken)} caption="Approved this year" icon={<Icon name="CalendarCheck" size={18} />} />
        <StatTile label="Pending" value={String(bal.pending)} caption="Awaiting a decision" icon={<Icon name="Hourglass" size={18} />} />
        <StatTile label="Entitlement" value={String(bal.entitlement)} caption="Days per year" icon={<Icon name="CalendarRange" size={18} />} />
      </div>

      <DashboardCard title="Allowance used">
        <ProgressMeter label={bal.taken + ' of ' + bal.entitlement + ' days taken'}
          value={Math.round(bal.taken / bal.entitlement * 100)}
          valueLabel={Math.round(bal.taken / bal.entitlement * 100) + '%'} />
        {bal.pending > 0 && (
          <span style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
            A further {bal.pending} day{bal.pending > 1 ? 's are' : ' is'} pending and held against the allowance until decided.
          </span>
        )}
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Request leave</span>
        <FormGrid cols={3}>
          <SelectField label="Leave type" value={form.type} onChange={v => setForm(p => Object.assign({}, p, { type: v }))} options={R.LEAVE_TYPES} />
          <TextField label="Start date" type="date" value={form.startDate} onChange={v => setForm(p => Object.assign({}, p, { startDate: v }))} />
          <TextField label="End date" type="date" value={form.endDate} onChange={v => setForm(p => Object.assign({}, p, { endDate: v }))} />
          <TextareaField label="Reason (optional)" span={3} rows={2} value={form.reason} onChange={v => setForm(p => Object.assign({}, p, { reason: v }))} placeholder="Visible to the approving manager." />
        </FormGrid>
        {days > 0 && <Notice icon="Info">{days} working day{days > 1 ? 's' : ''} would be deducted. {bal.remaining - days} would remain.</Notice>}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button size="sm" variant="ghost" tone="dark" onClick={() => { setForm({ type: 'Annual leave', startDate: '', endDate: '', reason: '' }); setError(''); }}>Reset</Button>
          <Button size="sm" onClick={submit} iconLeft={<Icon name="Plus" size={15} />}>Submit Request</Button>
        </div>
      </Card>

      {pending.length > 0 && canApprove && (
        <DashboardCard title={'Awaiting your decision (' + pending.length + ')'} padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.type} · {r.days} day{r.days > 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{shortDate(r.startDate)} to {shortDate(r.endDate)}{r.reason ? ' · ' + r.reason : ''}</span>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => decide(r, 'Rejected')}>Reject</Button>
                  <Button size="xs" onClick={() => decide(r, 'Approved')}>Approve</Button>
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      <DashboardCard title={'Leave history (' + requests.length + ')'} padding={16}>
        {requests.length ? (
          <DataTable compact columns={[
            { key: 'type', label: 'Type' }, { key: 'dates', label: 'Dates', mono: true },
            { key: 'days', label: 'Days', mono: true, align: 'right' },
            { key: 'requestedAt', label: 'Requested', mono: true },
            { key: 'status', label: 'Status' }, { key: 'decided', label: 'Decided by' },
            { key: 'actions', label: '', align: 'right' }
          ]} rows={requests.map(r => ({
            id: r.id, type: r.type,
            dates: shortDate(r.startDate) + ' – ' + shortDate(r.endDate),
            days: r.days, requestedAt: shortDate(r.requestedAt),
            status: <Badge tone={REQ_TONE[r.status] || 'dark'}>{r.status}</Badge>,
            decided: r.decidedBy || '—',
            actions: r.status === 'Pending'
              ? <Button size="xs" variant="ghost" tone="dark" onClick={() => decide(r, 'Cancelled')}>Cancel</Button>
              : (canWriteRemove(S) ? <IconButton tone="dark" size={30} label="Delete request" onClick={() => { R.remove(employee.id, 'leaveRequests', r.id); onChange(); }}><Icon name="Trash2" size={14} /></IconButton> : null)
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No leave requested yet.</span>}
      </DashboardCard>
    </div>
  );
}

function canWriteRemove(S) { return S.can('employees.archive'); }

/* ---------------- Absence ---------------- */
function AbsenceTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const bf = R.bradford(employee.id);
  const canWrite = S.can('employees.write');
  const [form, setForm] = React.useState({ startDate: '', endDate: '', reason: 'Sickness', notes: '' });
  const [error, setError] = React.useState('');
  const [rtw, setRtw] = React.useState(null);
  const [rtwNotes, setRtwNotes] = React.useState('');

  const absences = set.absences || [];
  const days = form.startDate && form.endDate ? R.workingDays(form.startDate, form.endDate) : 0;

  function record() {
    if (!form.startDate || !form.endDate) return setError('Enter the first and last day of absence.');
    if (days <= 0) return setError('The last day must be on or after the first day.');
    R.add(employee.id, 'absences', {
      startDate: form.startDate, endDate: form.endDate, days, reason: form.reason,
      selfCertified: days <= 7, fitNote: days > 7,
      returnToWork: { completed: false, date: '', by: '', notes: '' }, notes: form.notes
    });
    S.logActivity(employee.id, form.reason + ' absence recorded: ' + days + ' day' + (days > 1 ? 's' : '') + ' from ' + shortDate(form.startDate));
    setForm({ startDate: '', endDate: '', reason: 'Sickness', notes: '' }); setError(''); onChange();
  }

  function completeRtw(row) {
    R.update(employee.id, 'absences', row.id, {
      returnToWork: { completed: true, date: new Date().toISOString().slice(0, 10), by: S.session.name, notes: rtwNotes || 'Return-to-work discussion held.' }
    });
    S.logActivity(employee.id, 'Return-to-work completed for absence from ' + shortDate(row.startDate));
    setRtw(null); setRtwNotes(''); onChange();
  }

  const byReason = {};
  absences.forEach(a => { byReason[a.reason] = (byReason[a.reason] || 0) + a.days; });
  const reasonBars = Object.keys(byReason).map(k => ({ label: k.split(' ')[0], value: byReason[k] }));
  const outstanding = absences.filter(a => !a.returnToWork.completed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Bradford Factor" value={String(bf.score)} caption={bf.band + ' · rolling 12 months'} icon={<Icon name="Activity" size={18} />} />
        <StatTile label="Absence spells" value={String(bf.spells)} caption="Last 12 months" icon={<Icon name="Layers" size={18} />} />
        <StatTile label="Days lost" value={String(bf.days)} caption="Last 12 months" icon={<Icon name="CalendarX" size={18} />} />
        <StatTile label="Return-to-work due" value={String(outstanding.length)} caption="Not yet completed" icon={<Icon name="ClipboardCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Badge tone={BAND_TONE[bf.band] || 'dark'}>{bf.band}</Badge>
        <span style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Bradford Factor is <strong style={{ color: '#fff' }}>{bf.spells} spells² × {bf.days} days = {bf.score}</strong>.
          The score weights frequent short absences more heavily than one long one. Bands here are illustrative — set your own trigger points in Settings before using them in a formal process.
        </span>
      </Card>

      {reasonBars.length > 0 && (
        <DashboardCard title="Days lost by reason" action={<Badge tone="dark">12 months</Badge>}>
          <BarChart unit="d" height={160} data={reasonBars} />
        </DashboardCard>
      )}

      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Record an absence</span>
          <FormGrid cols={3}>
            <TextField label="First day" type="date" value={form.startDate} onChange={v => setForm(p => Object.assign({}, p, { startDate: v }))} />
            <TextField label="Last day" type="date" value={form.endDate} onChange={v => setForm(p => Object.assign({}, p, { endDate: v }))} />
            <SelectField label="Reason" value={form.reason} onChange={v => setForm(p => Object.assign({}, p, { reason: v }))} options={R.ABSENCE_REASONS} />
            <TextareaField label="Notes (optional)" span={3} rows={2} value={form.notes} onChange={v => setForm(p => Object.assign({}, p, { notes: v }))} placeholder="Keep factual. Medical detail should be held only where necessary." />
          </FormGrid>
          {days > 0 && <Notice icon="Info">{days} working day{days > 1 ? 's' : ''}. {days > 7 ? 'Over 7 days — a fit note is expected.' : 'Self-certification applies up to 7 days.'}</Notice>}
          {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button size="sm" variant="ghost" tone="dark" onClick={() => { setForm({ startDate: '', endDate: '', reason: 'Sickness', notes: '' }); setError(''); }}>Reset</Button>
            <Button size="sm" onClick={record} iconLeft={<Icon name="Plus" size={15} />}>Record Absence</Button>
          </div>
        </Card>
      )}

      <DashboardCard title={'Absence history (' + absences.length + ')'} padding={16}>
        {absences.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {absences.map(a => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.reason} · {a.days} day{a.days > 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{shortDate(a.startDate)} to {shortDate(a.endDate)}</span>
                  </span>
                  <Badge tone={a.fitNote ? 'warning' : 'dark'}>{a.fitNote ? 'Fit note required' : 'Self-certified'}</Badge>
                  <Badge tone={a.returnToWork.completed ? 'success' : 'warning'}>{a.returnToWork.completed ? 'RTW complete' : 'RTW outstanding'}</Badge>
                  {canWrite && !a.returnToWork.completed && (
                    <Button size="xs" onClick={() => { setRtw(rtw === a.id ? null : a.id); setRtwNotes(''); }}>Return to Work</Button>
                  )}
                </div>
                {a.notes && <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>{a.notes}</span>}
                {a.returnToWork.completed && (
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
                    Completed {shortDate(a.returnToWork.date)} by {a.returnToWork.by} — {a.returnToWork.notes}
                  </span>
                )}
                {rtw === a.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    <TextareaField label="Return-to-work notes" rows={2} value={rtwNotes} onChange={setRtwNotes} placeholder="Adjustments agreed, if any." />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <Button size="xs" variant="ghost" tone="dark" onClick={() => setRtw(null)}>Cancel</Button>
                      <Button size="xs" onClick={() => completeRtw(a)}>Mark Complete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No absence recorded in the last 12 months.</span>
        )}
      </DashboardCard>
    </div>
  );
}

Object.assign(window, { AttendanceTab, LeaveTab, AbsenceTab, TabEmpty, shortDate, dayName, ATT_TONE, REQ_TONE, BAND_TONE });
