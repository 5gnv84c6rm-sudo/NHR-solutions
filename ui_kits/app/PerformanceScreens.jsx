/* Performance — reviews, goals, calibration and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Reviews ---------------- */
function PerformanceReviews({ data }) {
  const { reviews, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [show, setShow] = React.useState('Open');
  const [dept, setDept] = React.useState('All');
  const [open, setOpen] = React.useState(null);
  const [form, setForm] = React.useState({ rating: 'Met expectations', summary: '', next: '' });
  const [booking, setBooking] = React.useState(false);

  const openList = reviews.filter(r => r.liveStatus !== 'Complete');
  const done = reviews.filter(r => r.liveStatus === 'Complete');
  const base = show === 'Open' ? openList : done;
  const list = base.filter(r => dept === 'All' || r.department === dept);

  const overdue = openList.filter(r => r.liveStatus === 'Overdue');

  function complete(r) {
    R.update(r.employeeKey, 'reviews', r.id, {
      status: 'Complete', rating: form.rating,
      summary: form.summary || 'Review held, outcome recorded.',
      completedAt: new Date().toISOString().slice(0, 10)
    });
    S.logActivity(r.employeeKey, r.type + ' completed — ' + form.rating);
    /* An agreed next objective becomes a goal, so the review produces something. */
    if (form.next.trim()) {
      R.add(r.employeeKey, 'goals', {
        title: form.next, measure: 'Agreed at ' + r.type.toLowerCase(),
        due: new Date(Date.now() + 90 * window.PERF_DAY).toISOString().slice(0, 10),
        progress: 0, status: 'Not started'
      });
      S.logActivity(r.employeeKey, 'Goal added from review: ' + form.next);
    }
    setOpen(null); setForm({ rating: 'Met expectations', summary: '', next: '' }); refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open reviews" value={String(openList.length)} caption="Scheduled or overdue" icon={<Icon name="ClipboardList" size={18} />} />
        <StatTile label="Overdue" value={String(overdue.length)} caption="Past the date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Completed" value={String(done.length)} caption="On record" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Completion rate" value={reviews.length ? Math.round(done.length / reviews.length * 100) + '%' : '—'} caption="All reviews" icon={<Icon name="ChartColumn" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Open', openList.length], ['Completed', done.length]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k}<Badge tone="dark">{n}</Badge></button>
          ))}
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-reviews-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'emp' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
            { label: 'Type', key: 'type' }, { label: 'Date', key: 'date' }, { label: 'Reviewer', key: 'rev' },
            { label: 'Status', key: 'st' }, { label: 'Rating', key: 'rating' }, { label: 'Summary', key: 'sum' }],
            reviews.map(r => ({
              emp: r.employeeName, ref: r.employeeRef, dept: r.department, type: r.type,
              date: r.date, rev: r.reviewer, st: r.liveStatus, rating: r.rating || '', sum: r.summary || ''
            })))}>Export</Button>
        {canWrite && <Button size="sm" onClick={() => setBooking(true)} iconLeft={<Icon name="Plus" size={16} />}>Schedule Review</Button>}
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(r => {
            const late = r.liveStatus === 'Overdue';
            const days = r.date ? Math.floor((new Date(r.date) - Date.now()) / window.PERF_DAY) : null;
            return (
              <Card key={r.employeeKey + r.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: late ? 'rgba(242,84,91,.28)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={r.employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 175 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{r.employeeName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{r.jobTitle} · {r.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{r.type}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                      {r.date ? window.shortDate(r.date) : 'No date'}{days != null ? (days < 0 ? ' · ' + Math.abs(days) + 'd late' : ' · in ' + days + 'd') : ''}
                    </span>
                  </span>
                  {r.rating ? <Badge tone={window.RATING_TONE[r.rating] || 'dark'}>{r.rating}</Badge> : null}
                  <Badge tone={window.REVIEW_TONE[r.liveStatus] || 'dark'}>{r.liveStatus}</Badge>
                  {canWrite && r.liveStatus !== 'Complete' && (
                    <Button size="xs" onClick={() => { setOpen(open === r.id ? null : r.id); setForm({ rating: 'Met expectations', summary: '', next: '' }); }}>
                      {open === r.id ? 'Close' : 'Record Outcome'}
                    </Button>
                  )}
                </div>

                {r.liveStatus === 'Complete' && r.summary && (
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    {r.summary}
                  </span>
                )}

                {open === r.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    <FormGrid cols={2}>
                      <SelectField label="Rating" value={form.rating} onChange={v => setForm(f => Object.assign({}, f, { rating: v }))} options={window.RATINGS} />
                      <TextField label="Reviewer" value={r.reviewer || S.session.name} disabled />
                      <TextareaField label="Summary" span={2} rows={2} value={form.summary} onChange={v => setForm(f => Object.assign({}, f, { summary: v }))}
                        placeholder="What was discussed and agreed. Keep it factual and specific." />
                      <TextField label="Next objective (optional)" span={2} value={form.next} onChange={v => setForm(f => Object.assign({}, f, { next: v }))}
                        placeholder="Becomes a goal with a 90-day target" />
                    </FormGrid>
                    <Notice icon="Info">
                      A rating recorded here sits on the employee record. Where a review may lead to a formal process, follow your
                      capability policy and take advice before relying on it.
                    </Notice>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <Button size="sm" variant="ghost" tone="dark" onClick={() => setOpen(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => complete(r)} iconLeft={<Icon name="Check" size={15} />}>Complete Review</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="ClipboardList" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Open' ? 'No open reviews' : 'Nothing completed yet'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {show === 'Open' ? 'Every review on record has been completed.' : 'Completed reviews will appear here with their rating.'}
          </span>
        </Card>
      )}

      {booking && <ScheduleReviewDialog data={data} onClose={() => setBooking(false)} />}
    </div>
  );
}

/* ---------------- Schedule review ---------------- */
function ScheduleReviewDialog({ data, onClose }) {
  const { employees, S, R, refresh } = data;
  const [form, setForm] = React.useState({ employeeId: '', type: 'Annual review', date: '', reviewer: '' });
  const [error, setError] = React.useState('');
  const employee = form.employeeId ? S.get(form.employeeId) : null;
  const days = form.date ? Math.floor((new Date(form.date) - Date.now()) / window.PERF_DAY) : null;

  function submit() {
    if (!form.employeeId) return setError('Choose an employee.');
    if (!form.date) return setError('Choose a date for the review.');
    R.add(form.employeeId, 'reviews', {
      type: form.type, date: form.date, rating: '',
      reviewer: form.reviewer || S.session.name, status: 'Scheduled', summary: ''
    });
    S.logActivity(form.employeeId, form.type + ' scheduled for ' + window.shortDate(form.date));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Schedule Review"
      subtitle="Books the review on the employee record and adds it to the review calendar." width={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Review type" value={form.type} onChange={v => setForm(p => Object.assign({}, p, { type: v }))} options={window.REVIEW_TYPES} />
          <TextField label="Date" required type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
          <TextField label="Reviewer" span={2} value={form.reviewer} onChange={v => setForm(p => Object.assign({}, p, { reviewer: v }))}
            placeholder={S.session.name} hint="Defaults to you." />
        </FormGrid>
        {employee && employee.probationEndDate && form.type === 'Probation review' && (
          <Notice icon="CalendarClock">
            {S.fullName(employee)}'s probation ends {window.shortDate(employee.probationEndDate)} — hold the review before that date.
          </Notice>
        )}
        {days != null && days < 0 && <Notice icon="TriangleAlert" tone="warn">That date has passed, so the review will show as overdue straight away.</Notice>}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Schedule Review</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Goals ---------------- */
function PerformanceGoals({ data }) {
  const { goals, employees, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [status, setStatus] = React.useState('Active');
  const [dept, setDept] = React.useState('All');
  const [q, setQ] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [prog, setProg] = React.useState(0);

  const filtered = goals
    .filter(g => status === 'All' || (status === 'Active' ? g.liveStatus !== 'Complete' : g.liveStatus === status))
    .filter(g => dept === 'All' || g.department === dept)
    .filter(g => !q || (g.title + ' ' + g.employeeName).toLowerCase().includes(q.toLowerCase()));

  const active = goals.filter(g => g.liveStatus !== 'Complete');
  const done = goals.filter(g => g.liveStatus === 'Complete');

  function saveProgress(g) {
    const v = Math.max(0, Math.min(100, Number(prog) || 0));
    R.update(g.employeeKey, 'goals', g.id, { progress: v, status: v >= 100 ? 'Complete' : g.status });
    S.logActivity(g.employeeKey, 'Goal progress updated: ' + g.title + ' — ' + v + '%');
    setEditing(null); refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Active goals" value={String(active.length)} caption="In progress" icon={<Icon name="Target" size={18} />} />
        <StatTile label="Completed" value={String(done.length)} caption="Achieved" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="At risk or behind" value={String(goals.filter(g => g.liveStatus === 'At risk' || g.liveStatus === 'Behind').length)} caption="Need a conversation" icon={<Icon name="TrendingDown" size={18} />} />
        <StatTile label="Average progress" value={(active.length ? Math.round(active.reduce((n, g) => n + (Number(g.progress) || 0), 0) / active.length) : 0) + '%'} caption="Across active goals" icon={<Icon name="ChartColumn" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search goals or people…" aria-label="Search goals"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {['Active', 'All'].concat(window.GOAL_STATUSES).map(o => <option key={o} value={o}>{o === 'All' ? 'All statuses' : o}</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>Set Goal</Button>}
      </Card>

      <DashboardCard title={'Goals (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(g => {
              const bad = g.liveStatus === 'Behind';
              const warn = g.liveStatus === 'At risk';
              const days = g.due ? Math.floor((new Date(g.due) - Date.now()) / window.PERF_DAY) : null;
              return (
                <div key={g.employeeKey + g.id} style={{
                  display: 'flex', flexDirection: 'column', gap: 11, padding: 14,
                  border: '1px solid ' + (bad ? 'rgba(242,84,91,.26)' : warn ? 'rgba(242,180,65,.26)' : 'var(--border-dark)'),
                  borderRadius: 'var(--radius-md)',
                  background: bad ? 'rgba(242,84,91,.035)' : warn ? 'rgba(242,180,65,.035)' : 'rgba(255,255,255,.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <Avatar employee={g.employee} size={34} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 190 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{g.title}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{g.employeeName} · {g.measure}</span>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 92 }}>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: days != null && days < 0 ? 'var(--nhr-danger)' : '#fff' }}>
                        {g.due ? window.shortDate(g.due) : 'No date'}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                        {days == null ? 'Open ended' : days < 0 ? Math.abs(days) + ' days over' : days + ' days left'}
                      </span>
                    </span>
                    <Badge tone={window.GOAL_TONE[g.liveStatus] || 'dark'}>{g.liveStatus}</Badge>
                    {canWrite && g.liveStatus !== 'Complete' && (
                      <Button size="xs" variant="secondary" tone="dark"
                        onClick={() => { setEditing(editing === g.id ? null : g.id); setProg(g.progress || 0); }}>
                        {editing === g.id ? 'Close' : 'Update'}
                      </Button>
                    )}
                    {canWrite && (
                      <IconButton tone="dark" size={30} label="Delete goal"
                        onClick={() => { R.remove(g.employeeKey, 'goals', g.id); refresh(); }}><Icon name="Trash2" size={14} /></IconButton>
                    )}
                  </div>

                  <ProgressMeter label={'Progress'} value={Number(g.progress) || 0} valueLabel={(g.progress || 0) + '%'} />

                  {editing === g.id && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                      <input type="range" min="0" max="100" step="5" value={prog} aria-label="Progress"
                        onChange={e => setProg(e.target.value)}
                        style={{ flex: 1, minWidth: 180, accentColor: 'var(--nhr-turquoise)' }} />
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)', minWidth: 48 }}>{prog}%</span>
                      <Button size="sm" onClick={() => saveProgress(g)}>Save</Button>
                      <Button size="sm" variant="ghost" tone="dark" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing matches those filters.</span>}
      </DashboardCard>

      {adding && <SetGoalDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------------- Set goal ---------------- */
function SetGoalDialog({ data, onClose }) {
  const { employees, S, R, refresh } = data;
  const [form, setForm] = React.useState({ employeeId: '', title: '', measure: '', due: '' });
  const [error, setError] = React.useState('');
  const days = form.due ? Math.floor((new Date(form.due) - Date.now()) / window.PERF_DAY) : null;

  function submit() {
    if (!form.employeeId) return setError('Choose an employee.');
    if (!form.title.trim()) return setError('Give the goal a title.');
    R.add(form.employeeId, 'goals', {
      title: form.title, measure: form.measure || 'To be agreed',
      due: form.due, progress: 0, status: 'Not started'
    });
    S.logActivity(form.employeeId, 'Goal set: ' + form.title);
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Set Goal"
      subtitle="Adds an objective to the employee record, visible on their Performance tab." width={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <TextField label="Goal" required span={2} value={form.title} onChange={v => setForm(p => Object.assign({}, p, { title: v }))}
            placeholder="Complete level 3 safeguarding certification" />
          <TextField label="How it is measured" span={2} value={form.measure} onChange={v => setForm(p => Object.assign({}, p, { measure: v }))}
            placeholder="Certificate uploaded and verified" hint="A goal without a measure cannot be assessed fairly." />
          <TextField label="Target date" type="date" value={form.due} onChange={v => setForm(p => Object.assign({}, p, { due: v }))} />
        </FormGrid>
        {days != null && (
          <Notice icon={days < 0 ? 'TriangleAlert' : 'CalendarClock'} tone={days < 0 ? 'warn' : undefined}>
            {days < 0 ? 'That date has passed — the goal will show as behind immediately.'
              : days <= 14 ? 'Only ' + days + ' days to the target, so it will flag as at risk until progress is logged.'
                : days + ' days to the target date.'}
          </Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Set Goal</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Calibration ---------------- */
function PerformanceCalibration({ data }) {
  const { employees, goals, reviews, S } = data;
  const complete = reviews.filter(r => r.liveStatus === 'Complete' && r.rating);

  const counts = {};
  complete.forEach(r => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
  const total = complete.length || 1;

  /* Per-department average goal progress and review coverage. */
  const deptMap = {};
  employees.forEach(e => {
    const d = deptMap[e.department] || (deptMap[e.department] = { head: 0, progress: 0, goals: 0, rated: 0, reviews: 0 });
    d.head++;
  });
  goals.filter(g => g.liveStatus !== 'Complete').forEach(g => {
    const d = deptMap[g.department];
    if (d) { d.progress += Number(g.progress) || 0; d.goals++; }
  });
  complete.forEach(r => { const d = deptMap[r.department]; if (d) { d.reviews++; if (/Exceed|Exceptional/.test(r.rating)) d.rated++; } });

  const deptRows = Object.keys(deptMap).map(k => {
    const d = deptMap[k];
    return {
      id: k, department: k, headcount: d.head,
      goals: d.goals,
      avg: d.goals ? Math.round(d.progress / d.goals) : 0,
      reviews: d.reviews,
      strong: d.reviews ? Math.round(d.rated / d.reviews * 100) : 0
    };
  }).sort((a, b) => b.avg - a.avg);

  /* Top and bottom by goal progress — a prompt for a conversation, not a ranking. */
  const perPerson = employees.map(e => {
    const mine = goals.filter(g => g.employeeKey === e.id && g.liveStatus !== 'Complete');
    const completed = goals.filter(g => g.employeeKey === e.id && g.liveStatus === 'Complete').length;
    const latest = complete.filter(r => r.employeeKey === e.id).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    return {
      employee: e, name: S.fullName(e), department: e.department,
      active: mine.length, completed,
      avg: mine.length ? Math.round(mine.reduce((n, g) => n + (Number(g.progress) || 0), 0) / mine.length) : null,
      rating: latest ? latest.rating : ''
    };
  }).filter(p => p.active > 0 || p.completed > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Rated reviews" value={String(complete.length)} caption="Completed with a rating" icon={<Icon name="ClipboardList" size={18} />} />
        <StatTile label="Met or above" value={(complete.length ? Math.round(complete.filter(r => /Exceptional|Exceeded|Met/.test(r.rating)).length / total * 100) : 0) + '%'} caption="Of rated reviews" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Below expectations" value={String(complete.filter(r => /Below|Partially/.test(r.rating)).length)} caption="May need support" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Goals completed" value={String(goals.filter(g => g.liveStatus === 'Complete').length)} caption="All time" icon={<Icon name="Target" size={18} />} />
      </div>

      <div className="perf-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Rating distribution" padding={16} action={<Badge tone="dark">{complete.length} rated</Badge>}>
          {complete.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {window.RATINGS.map(k => {
                const n = counts[k] || 0;
                const pct = Math.round(n / total * 100);
                return (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: n ? '#fff' : 'var(--text-muted-dark)' }}>{k}</span>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{n} · {pct}%</span>
                    </div>
                    <span style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', display: 'block' }}>
                      <span style={{
                        display: 'block', height: '100%', width: pct + '%', borderRadius: 999,
                        background: /Below|Partially/.test(k) ? 'var(--nhr-warning)' : 'var(--nhr-turquoise)'
                      }} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No reviews have been completed with a rating yet.</span>}
        </DashboardCard>

        <DashboardCard title="Average goal progress by department" action={<Badge tone="dark">%</Badge>}>
          {deptRows.length ? <BarChart unit="%" height={175} data={deptRows.map(d => ({ label: d.department.slice(0, 6), value: d.avg }))} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No active goals.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="Department view" padding={16} action={<Badge tone="dark">Highest progress first</Badge>}>
        <DataTable compact columns={[
          { key: 'department', label: 'Department' },
          { key: 'headcount', label: 'Headcount', mono: true, align: 'right' },
          { key: 'goals', label: 'Active goals', mono: true, align: 'right' },
          { key: 'avg', label: 'Avg progress', mono: true, align: 'right' },
          { key: 'reviews', label: 'Rated reviews', mono: true, align: 'right' },
          { key: 'strong', label: 'Above expectations', mono: true, align: 'right' }
        ]} rows={deptRows.map(d => Object.assign({}, d, { avg: d.avg + '%', strong: d.reviews ? d.strong + '%' : '—' }))} />
      </DashboardCard>

      <DashboardCard title="By employee" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-performance-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'name' }, { label: 'Department', key: 'dept' }, { label: 'Active goals', key: 'active' },
            { label: 'Completed goals', key: 'done' }, { label: 'Average progress', key: 'avg' }, { label: 'Latest rating', key: 'rating' }],
            perPerson.map(p => ({
              name: p.name, dept: p.department, active: p.active, done: p.completed,
              avg: p.avg == null ? '' : p.avg, rating: p.rating
            })))}>Export</Button>}>
        <DataTable compact columns={[
          { key: 'name', label: 'Employee' }, { key: 'department', label: 'Department' },
          { key: 'active', label: 'Active', mono: true, align: 'right' },
          { key: 'completed', label: 'Completed', mono: true, align: 'right' },
          { key: 'avgLabel', label: 'Progress', mono: true, align: 'right' },
          { key: 'ratingBadge', label: 'Latest rating' }
        ]} rows={perPerson.map(p => ({
          id: p.employee.id, name: p.name, department: p.department,
          active: p.active, completed: p.completed,
          avgLabel: p.avg == null ? '—' : p.avg + '%',
          ratingBadge: p.rating ? <Badge tone={window.RATING_TONE[p.rating] || 'dark'}>{p.rating}</Badge> : <span style={{ color: 'var(--text-muted-dark)' }}>None</span>
        }))} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          This is a calibration aid, not a ranking. Forced distributions and stack ranking carry real discrimination risk,
          and goal progress depends heavily on how goals were written. Use these figures to ask why numbers differ between
          teams, not to score people against each other.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function PerformanceScreen() {
  const data = window.usePerformanceData();
  const [view, setView] = React.useState('Overview');
  const [booking, setBooking] = React.useState(false);
  const [goalOpen, setGoalOpen] = React.useState(false);
  const canWrite = data.S.can('employees.write');
  const overdue = data.reviews.filter(r => r.liveStatus === 'Overdue').length;

  const body = {
    'Overview': <window.PerformanceOverview data={data} onView={setView} />,
    'Reviews': <PerformanceReviews data={data} />,
    'Goals': <PerformanceGoals data={data} />,
    'Calibration': <PerformanceCalibration data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Performance</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Reviews due, goals in progress and how they compare across teams. Everything here writes to the employee record, and a completed review can set the next objective.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setGoalOpen(true)} iconLeft={<Icon name="Target" size={15} />}>Set Goal</Button>
            <Button size="sm" onClick={() => setBooking(true)} iconLeft={<Icon name="Plus" size={16} />}>Schedule Review</Button>
          </div>
        )}
      </div>

      <window.PerformanceSubnav view={view} onSelect={setView} counts={{ overdue }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {booking && <ScheduleReviewDialog data={data} onClose={() => setBooking(false)} />}
      {goalOpen && <SetGoalDialog data={data} onClose={() => setGoalOpen(false)} />}
    </div>
  );
}

Object.assign(window, { PerformanceScreen, PerformanceReviews, PerformanceGoals, PerformanceCalibration, ScheduleReviewDialog, SetGoalDialog });
