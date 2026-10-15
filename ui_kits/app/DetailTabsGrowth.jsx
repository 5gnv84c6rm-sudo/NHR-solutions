/* Employee Details — rotas, performance, expenses and training tabs. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const SHIFT_TONE = { Assigned: 'success', Open: 'warning', Swap: 'dark' };
const GOAL_TONE = { 'On track': 'success', 'At risk': 'warning', Complete: 'success', Behind: 'danger' };
const EX_TONE = { Approved: 'success', Pending: 'warning', Rejected: 'danger', Reimbursed: 'success' };
const TR_TONE = { Complete: 'success', 'In progress': 'warning', 'Not started': 'dark', Overdue: 'danger' };

/* ---------------- Shifts & Rotas ---------------- */
function RotaTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const canWrite = S.can('employees.write');
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [form, setForm] = React.useState({ date: '', start: '09:00', end: '17:30', label: 'Day' });

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 864e5));
  const shifts = set.shifts || [];
  const forDay = d => shifts.filter(s => s.date === d.toISOString().slice(0, 10));
  const weekHours = week.reduce((n, d) => n + forDay(d).reduce((m, s) => m + (Number(s.hours) || 0), 0), 0);

  function addShift() {
    if (!form.date) return;
    R.add(employee.id, 'shifts', {
      date: form.date, start: form.start, end: form.end, label: form.label,
      location: employee.location || 'Manchester', hours: 8, status: 'Assigned', swapRequested: false
    });
    S.logActivity(employee.id, 'Shift assigned on ' + window.shortDate(form.date) + ' (' + form.start + '–' + form.end + ')');
    setForm(p => Object.assign({}, p, { date: '' })); onChange();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Scheduled hours" value={String(Math.round(weekHours * 10) / 10)} caption="Selected week" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Shifts this week" value={String(week.reduce((n, d) => n + forDay(d).length, 0))} caption="Assigned and open" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Contracted" value={String(employee.hoursPerWeek)} caption="Hours per week" icon={<Icon name="FileText" size={18} />} />
        <StatTile label="Open shifts" value={String(shifts.filter(s => s.status === 'Open').length)} caption="Awaiting cover" icon={<Icon name="UserPlus" size={18} />} />
      </div>

      <DashboardCard title="Weekly rota" padding={16} action={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton tone="dark" size={30} label="Previous week" onClick={() => setWeekOffset(w => w - 1)}><Icon name="ChevronLeft" size={15} /></IconButton>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)', minWidth: 92, textAlign: 'center' }}>
            {monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </span>
          <IconButton tone="dark" size={30} label="Next week" onClick={() => setWeekOffset(w => w + 1)}><Icon name="ChevronRight" size={15} /></IconButton>
        </span>
      }>
        <div className="rota-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
          {week.map(d => {
            const rows = forDay(d);
            const today = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toISOString()} style={{
                display: 'flex', flexDirection: 'column', gap: 7, minHeight: 128, padding: 10,
                border: '1px solid ' + (today ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: today ? 'rgba(0,229,212,.05)' : 'rgba(255,255,255,.02)'
              }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: today ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)', fontWeight: 700 }}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{d.getDate()}</span>
                </span>
                {rows.length ? rows.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 8px', borderRadius: 'var(--radius-sm)',
                    background: s.status === 'Open' ? 'rgba(242,180,65,.12)' : 'rgba(0,229,212,.12)',
                    border: '1px solid ' + (s.status === 'Open' ? 'rgba(242,180,65,.3)' : 'rgba(0,229,212,.28)')
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{s.start}–{s.end}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-body-dark)' }}>{s.label}{s.swapRequested ? ' · swap' : ''}</span>
                    {canWrite && (
                      <span style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                        <button type="button" onClick={() => { R.update(employee.id, 'shifts', s.id, { swapRequested: !s.swapRequested }); onChange(); }}
                          title="Request swap" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--nhr-turquoise)', display: 'inline-flex' }}>
                          <Icon name="ArrowRightLeft" size={12} />
                        </button>
                        <button type="button" onClick={() => { R.remove(employee.id, 'shifts', s.id); onChange(); }}
                          title="Remove shift" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted-dark)', display: 'inline-flex' }}>
                          <Icon name="X" size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                )) : <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>—</span>}
              </div>
            );
          })}
        </div>
      </DashboardCard>

      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Assign a shift</span>
          <FormGrid cols={4}>
            <TextField label="Date" type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
            <TextField label="Start" type="time" value={form.start} onChange={v => setForm(p => Object.assign({}, p, { start: v }))} />
            <TextField label="End" type="time" value={form.end} onChange={v => setForm(p => Object.assign({}, p, { end: v }))} />
            <SelectField label="Pattern" value={form.label} onChange={v => setForm(p => Object.assign({}, p, { label: v }))} options={['Early', 'Day', 'Late', 'Night', 'On call']} />
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" disabled={!form.date} onClick={addShift} iconLeft={<Icon name="Plus" size={15} />}>Assign Shift</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Performance ---------------- */
function PerformanceTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const canWrite = S.can('employees.write');
  const [form, setForm] = React.useState({ title: '', measure: '', due: '' });
  const goals = set.goals || [];
  const reviews = set.reviews || [];
  const avg = goals.length ? Math.round(goals.reduce((n, g) => n + g.progress, 0) / goals.length) : 0;

  function addGoal() {
    if (!form.title) return;
    R.add(employee.id, 'goals', { title: form.title, measure: form.measure, due: form.due, progress: 0, status: 'On track', owner: 'Employee' });
    S.logActivity(employee.id, 'Objective added: ' + form.title);
    setForm({ title: '', measure: '', due: '' }); onChange();
  }
  function nudge(g, delta) {
    const next = Math.max(0, Math.min(100, g.progress + delta));
    R.update(employee.id, 'goals', g.id, { progress: next, status: next === 100 ? 'Complete' : g.status });
    onChange();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Objectives" value={String(goals.length)} caption={goals.filter(g => g.status === 'Complete').length + ' complete'} icon={<Icon name="Target" size={18} />} />
        <StatTile label="Average progress" value={avg + '%'} caption="Across open objectives" icon={<Icon name="TrendingUp" size={18} />} />
        <StatTile label="At risk" value={String(goals.filter(g => g.status === 'At risk').length)} caption="Need attention" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Next review" value={reviews.filter(r => r.status === 'Scheduled').length ? window.shortDate(reviews.find(r => r.status === 'Scheduled').date) : '—'} caption="Scheduled" icon={<Icon name="CalendarClock" size={18} />} />
      </div>

      <DashboardCard title={'Objectives (' + goals.length + ')'} padding={16}>
        {goals.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map(g => (
              <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{g.title}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
                      {g.measure || 'No measure set'}{g.due ? ' · due ' + window.shortDate(g.due) : ''}
                    </span>
                  </span>
                  <Badge tone={GOAL_TONE[g.status] || 'dark'}>{g.status}</Badge>
                  {canWrite && (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <IconButton tone="dark" size={30} label="Decrease progress" onClick={() => nudge(g, -10)}><Icon name="Minus" size={14} /></IconButton>
                      <IconButton tone="dark" size={30} label="Increase progress" onClick={() => nudge(g, 10)}><Icon name="Plus" size={14} /></IconButton>
                      <IconButton tone="dark" size={30} label="Remove objective" onClick={() => { R.remove(employee.id, 'goals', g.id); onChange(); }}><Icon name="Trash2" size={14} /></IconButton>
                    </span>
                  )}
                </div>
                <ProgressMeter label="Progress" value={g.progress} valueLabel={g.progress + '%'} />
              </div>
            ))}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No objectives set.</span>}
      </DashboardCard>

      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Add an objective</span>
          <FormGrid cols={3}>
            <TextField label="Objective" span={2} value={form.title} onChange={v => setForm(p => Object.assign({}, p, { title: v }))} placeholder="Complete supervisor handover training" />
            <TextField label="Due date" type="date" value={form.due} onChange={v => setForm(p => Object.assign({}, p, { due: v }))} />
            <TextField label="How it will be measured" span={3} value={form.measure} onChange={v => setForm(p => Object.assign({}, p, { measure: v }))} placeholder="Signed off by line manager" />
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" disabled={!form.title} onClick={addGoal} iconLeft={<Icon name="Plus" size={15} />}>Add Objective</Button>
          </div>
        </Card>
      )}

      <DashboardCard title={'Reviews (' + reviews.length + ')'} padding={16}>
        <DataTable compact columns={[
          { key: 'type', label: 'Review' }, { key: 'date', label: 'Date', mono: true },
          { key: 'reviewer', label: 'Reviewer' }, { key: 'rating', label: 'Outcome' }, { key: 'status', label: 'Status' }
        ]} rows={reviews.map(r => ({
          id: r.id, type: r.type, date: window.shortDate(r.date), reviewer: r.reviewer,
          rating: r.rating || '—',
          status: <Badge tone={r.status === 'Complete' ? 'success' : 'warning'}>{r.status}</Badge>
        }))} />
      </DashboardCard>
    </div>
  );
}

/* ---------------- Expenses ---------------- */
function ExpensesTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const canApprove = S.can('employees.write');
  const [form, setForm] = React.useState({ date: '', category: 'Travel', description: '', amount: '' });
  const [error, setError] = React.useState('');
  const claims = set.expenses || [];
  const money = n => '£' + Number(n || 0).toFixed(2);
  const pending = claims.filter(c => c.status === 'Pending');
  const totals = {
    pending: pending.reduce((n, c) => n + c.amount, 0),
    approved: claims.filter(c => c.status === 'Approved').reduce((n, c) => n + c.amount, 0),
    year: claims.reduce((n, c) => n + c.amount, 0)
  };

  function submit() {
    const amt = parseFloat(form.amount);
    if (!form.date) return setError('Enter the date the cost was incurred.');
    if (!(amt > 0)) return setError('Enter an amount greater than zero.');
    if (!form.description.trim()) return setError('Add a short description of the claim.');
    R.add(employee.id, 'expenses', {
      date: form.date, category: form.category, description: form.description,
      amount: Math.round(amt * 100) / 100, receipt: false, status: 'Pending',
      submittedAt: new Date().toISOString().slice(0, 10), decidedBy: '', reimbursedAt: ''
    });
    S.logActivity(employee.id, 'Expense claim submitted: ' + money(amt) + ' (' + form.category + ')');
    setForm({ date: '', category: 'Travel', description: '', amount: '' }); setError(''); onChange();
  }
  function decide(c, status) {
    R.update(employee.id, 'expenses', c.id, { status, decidedBy: S.session.name });
    S.logActivity(employee.id, 'Expense claim ' + status.toLowerCase() + ': ' + money(c.amount));
    onChange();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Awaiting approval" value={money(totals.pending)} caption={pending.length + ' claim' + (pending.length === 1 ? '' : 's')} icon={<Icon name="Hourglass" size={18} />} />
        <StatTile label="Approved" value={money(totals.approved)} caption="Due for reimbursement" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Claimed to date" value={money(totals.year)} caption="All claims on record" icon={<Icon name="ReceiptText" size={18} />} />
        <StatTile label="Claims" value={String(claims.length)} caption="All time" icon={<Icon name="Files" size={18} />} />
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Submit a claim</span>
        <FormGrid cols={4}>
          <TextField label="Date of cost" type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={R.EXPENSE_CATEGORIES} />
          <TextField label="Amount (£)" value={form.amount} onChange={v => setForm(p => Object.assign({}, p, { amount: v }))} placeholder="0.00" mono />
          <Field label="Receipt">
            <label style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 43, cursor: 'pointer',
              border: '1px dashed rgba(0,229,212,.45)', borderRadius: 'var(--radius-btn)',
              background: 'rgba(0,229,212,.05)', fontSize: 13, fontWeight: 700, color: 'var(--nhr-turquoise)'
            }}>
              <Icon name="Paperclip" size={15} />Attach
              <input type="file" style={{ display: 'none' }} onChange={e => { e.target.value = ''; }} />
            </label>
          </Field>
          <TextField label="Description" span={4} value={form.description} onChange={v => setForm(p => Object.assign({}, p, { description: v }))} placeholder="Return train fare, Manchester to Leeds" />
        </FormGrid>
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button size="sm" variant="ghost" tone="dark" onClick={() => { setForm({ date: '', category: 'Travel', description: '', amount: '' }); setError(''); }}>Reset</Button>
          <Button size="sm" onClick={submit} iconLeft={<Icon name="Plus" size={15} />}>Submit Claim</Button>
        </div>
      </Card>

      <DashboardCard title={'Claims (' + claims.length + ')'} padding={16}>
        {claims.length ? (
          <DataTable compact columns={[
            { key: 'date', label: 'Date', mono: true }, { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', mono: true, align: 'right' },
            { key: 'receipt', label: 'Receipt' }, { key: 'status', label: 'Status' },
            { key: 'actions', label: '', align: 'right' }
          ]} rows={claims.map(c => ({
            id: c.id, date: window.shortDate(c.date), category: c.category, description: c.description,
            amount: money(c.amount),
            receipt: c.receipt
              ? <Icon name="Paperclip" size={14} style={{ color: 'var(--nhr-turquoise)' }} aria-label="Receipt attached" />
              : <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>Missing</span>,
            status: <Badge tone={EX_TONE[c.status] || 'dark'}>{c.status}</Badge>,
            actions: c.status === 'Pending' && canApprove
              ? <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Button size="xs" variant="secondary" tone="dark" onClick={() => decide(c, 'Rejected')}>Reject</Button>
                <Button size="xs" onClick={() => decide(c, 'Approved')}>Approve</Button>
              </span>
              : (c.status === 'Approved' && canApprove
                ? <Button size="xs" variant="secondary" tone="dark" onClick={() => decide(c, 'Reimbursed')}>Mark Paid</Button>
                : null)
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No claims submitted.</span>}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Training ---------------- */
function TrainingTab({ employee, onChange }) {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const set = R.get(employee);
  const canWrite = S.can('employees.write');
  const [course, setCourse] = React.useState(R.COURSES[0][0]);
  const [due, setDue] = React.useState('');
  const rows = set.training || [];
  const complete = rows.filter(t => t.status === 'Complete').length;
  const overdue = rows.filter(t => t.status !== 'Complete' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const rate = rows.length ? Math.round(complete / rows.length * 100) : 0;

  function assign() {
    const meta = R.COURSES.find(c => c[0] === course);
    R.add(employee.id, 'training', {
      course, category: meta ? meta[1] : 'Compliance', durationMins: meta ? meta[2] : 60,
      assignedAt: new Date().toISOString().slice(0, 10), dueDate: due,
      progress: 0, status: 'Not started', completedAt: '', certificateId: '', expiresAt: ''
    });
    S.logActivity(employee.id, 'Course assigned: ' + course);
    setDue(''); onChange();
  }
  function markComplete(t) {
    R.update(employee.id, 'training', t.id, {
      progress: 100, status: 'Complete',
      completedAt: new Date().toISOString().slice(0, 10),
      certificateId: 'CERT-' + String(40000 + Math.floor(Math.random() * 9999))
    });
    S.logActivity(employee.id, 'Course completed: ' + t.course);
    onChange();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Completion rate" value={rate + '%'} caption={complete + ' of ' + rows.length + ' courses'} icon={<Icon name="GraduationCap" size={18} />} />
        <StatTile label="Assigned" value={String(rows.length)} caption="Courses on record" icon={<Icon name="BookOpen" size={18} />} />
        <StatTile label="Overdue" value={String(overdue)} caption="Past the due date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Certificates" value={String(rows.filter(t => t.certificateId).length)} caption="Available to download" icon={<Icon name="Award" size={18} />} />
      </div>

      {overdue > 0 && (
        <Notice icon="TriangleAlert" tone="warn">
          {overdue} course{overdue > 1 ? 's are' : ' is'} past the due date. Reminders go to the employee and their manager.
        </Notice>
      )}

      <DashboardCard title="Mandatory training progress">
        <ProgressMeter label={complete + ' of ' + rows.length + ' complete'} value={rate} valueLabel={rate + '%'} />
      </DashboardCard>

      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Assign a course</span>
          <FormGrid cols={3}>
            <SelectField label="Course" span={2} value={course} onChange={setCourse} options={R.COURSES.map(c => c[0])} />
            <TextField label="Due date" type="date" value={due} onChange={setDue} />
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" onClick={assign} iconLeft={<Icon name="Plus" size={15} />}>Assign Course</Button>
          </div>
        </Card>
      )}

      <DashboardCard title={'Courses (' + rows.length + ')'} padding={16}>
        {rows.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(t => {
              const isOverdue = t.status !== 'Complete' && t.dueDate && new Date(t.dueDate) < new Date();
              return (
                <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{t.course}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
                        {t.category} · {t.durationMins} mins{t.dueDate ? ' · due ' + window.shortDate(t.dueDate) : ''}
                        {t.expiresAt ? ' · renews ' + window.shortDate(t.expiresAt) : ''}
                      </span>
                    </span>
                    <Badge tone={isOverdue ? 'danger' : (TR_TONE[t.status] || 'dark')}>{isOverdue ? 'Overdue' : t.status}</Badge>
                    {t.certificateId
                      ? <Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
                        onClick={() => window.downloadCsv('certificate-' + t.certificateId + '.csv',
                          [{ label: 'Field', key: 'k' }, { label: 'Value', key: 'v' }],
                          [{ k: 'Certificate', v: t.certificateId }, { k: 'Employee', v: S.fullName(employee) },
                          { k: 'Course', v: t.course }, { k: 'Completed', v: t.completedAt }, { k: 'Renews', v: t.expiresAt || 'n/a' }])}>
                        {t.certificateId}
                      </Button>
                      : (canWrite && <Button size="xs" onClick={() => markComplete(t)}>Mark Complete</Button>)}
                  </div>
                  <ProgressMeter label="Progress" value={t.progress} valueLabel={t.progress + '%'} />
                </div>
              );
            })}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No courses assigned.</span>}
      </DashboardCard>
    </div>
  );
}

Object.assign(window, { RotaTab, PerformanceTab, ExpensesTab, TrainingTab, SHIFT_TONE, GOAL_TONE, EX_TONE, TR_TONE });
