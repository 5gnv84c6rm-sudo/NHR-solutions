/* NHR Solution — Absence module (company-wide).

   The per-employee Absence tab handles one person's episodes; this screen is the
   HR view across everyone: the Bradford Factor league table, outstanding
   return-to-work meetings, patterns worth noticing, and a company-wide record.

   Employees come from EmployeeStore so the role switcher and permissions apply;
   episodes come from EmployeeRecords, the same store the employee tab writes to.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const BAND_TONES = { None: 'success', Low: 'success', Monitor: 'warning', Concern: 'warning', Review: 'danger' };
const ABS_DAY = 864e5;

/* Illustrative Bradford trigger points. Real ones belong in Settings — these
   mirror what many UK employers use as a starting position. */
const BRADFORD_BANDS = [
  ['Low', 0, 49, 'No action. Normal variation.'],
  ['Monitor', 50, 199, 'Informal chat at the next one-to-one.'],
  ['Concern', 200, 499, 'Formal attendance review with the line manager.'],
  ['Review', 500, Infinity, 'Escalate under the absence policy.']
];

function AbsenceSubnav({ view, onSelect, counts }) {
  const items = [
    ['Overview', 'LayoutDashboard'], ['Episodes', 'ListOrdered'],
    ['Return to Work', 'ClipboardCheck'], ['Patterns', 'ChartColumn']
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
              whiteSpace: 'nowrap',
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
            {label === 'Return to Work' && counts.rtw > 0 && <Badge tone="warning">{counts.rtw}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useAbsenceData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const episodes = [];
  const people = employees.map(e => {
    const set = R.get(e);
    const mine = (set.absences || []).map(a => Object.assign({}, a, {
      employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
      department: e.department, jobTitle: e.jobTitle, employee: e
    }));
    mine.forEach(a => episodes.push(a));
    const bf = R.bradford(e.id);
    return { employee: e, bradford: bf, episodes: mine, outstanding: mine.filter(a => !a.returnToWork.completed).length };
  });
  episodes.sort((a, b) => a.startDate < b.startDate ? 1 : -1);
  return { employees, people, episodes, refresh: force, S, R };
}

/* ---------------- Overview ---------------- */
function AbsenceOverview({ data, onView }) {
  const { people, episodes, employees, S } = data;
  const iso = new Date().toISOString().slice(0, 10);

  const offSick = episodes.filter(a => a.startDate <= iso && a.endDate >= iso);
  const totalDays = people.reduce((n, p) => n + p.bradford.days, 0);
  const totalSpells = people.reduce((n, p) => n + p.bradford.spells, 0);
  const rtwDue = people.reduce((n, p) => n + p.outstanding, 0);

  /* Absence rate = days lost ÷ available working days over the last year.
     260 working days is the standard full-time figure. */
  const availableDays = employees.length * 260;
  const rate = availableDays ? Math.round(totalDays / availableDays * 1000) / 10 : 0;

  const flagged = people.filter(p => p.bradford.score >= 200).sort((a, b) => b.bradford.score - a.bradford.score);

  const byReason = {};
  episodes.forEach(a => { byReason[a.reason] = (byReason[a.reason] || 0) + a.days; });
  const reasonBars = Object.keys(byReason)
    .map(k => ({ label: k.split(' ')[0], value: byReason[k] }))
    .sort((a, b) => b.value - a.value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Off sick today" value={String(offSick.length)} caption={'of ' + employees.length + ' people'} icon={<Icon name="Thermometer" size={18} />} />
        <StatTile label="Absence rate" value={rate + '%'} caption="Days lost, last 12 months" icon={<Icon name="Activity" size={18} />} />
        <StatTile label="Days lost" value={String(totalDays)} caption={totalSpells + ' spells'} icon={<Icon name="CalendarX" size={18} />} />
        <StatTile label="Return-to-work due" value={String(rtwDue)} caption="Not yet completed" icon={<Icon name="ClipboardCheck" size={18} />} />
      </div>

      {rtwDue > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="ClipboardCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {rtwDue} return-to-work {rtwDue === 1 ? 'meeting has' : 'meetings have'} not been recorded.
          </span>
          <Button size="sm" onClick={() => onView('Return to Work')}>Review</Button>
        </Card>
      )}

      <div className="abs-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <DashboardCard title="Off sick today" padding={16}>
          {offSick.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offSick.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <Avatar employee={a.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{a.employeeName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {a.department} · due back {window.shortDate(new Date(new Date(a.endDate).getTime() + ABS_DAY))}
                    </span>
                  </span>
                  <Badge tone={a.fitNote ? 'warning' : 'dark'}>{a.reason}</Badge>
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nobody is recorded as off sick today.</span>}
        </DashboardCard>

        <DashboardCard title="Days lost by reason" action={<Badge tone="dark">12 months</Badge>}>
          {reasonBars.length ? <BarChart unit="d" height={175} data={reasonBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No absence recorded.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="Past the review threshold" padding={16}
        action={<Badge tone={flagged.length ? 'warning' : 'success'}>{flagged.length} flagged</Badge>}>
        {flagged.length ? (
          <DataTable compact columns={[
            { key: 'name', label: 'Employee' }, { key: 'department', label: 'Department' },
            { key: 'score', label: 'Bradford', mono: true, align: 'right' },
            { key: 'spells', label: 'Spells', mono: true, align: 'right' },
            { key: 'days', label: 'Days', mono: true, align: 'right' },
            { key: 'band', label: 'Band' }
          ]} rows={flagged.map(p => ({
            id: p.employee.id, name: S.fullName(p.employee), department: p.employee.department,
            score: p.bradford.score, spells: p.bradford.spells, days: p.bradford.days,
            band: <Badge tone={BAND_TONES[p.bradford.band] || 'dark'}>{p.bradford.band}</Badge>
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nobody is above a Bradford score of 200.</span>}
      </DashboardCard>

      <DashboardCard title="Bradford trigger points" padding={16} action={<Badge tone="dark">Illustrative</Badge>}>
        <DataTable compact columns={[
          { key: 'band', label: 'Band' }, { key: 'range', label: 'Score', mono: true },
          { key: 'action', label: 'Suggested response' }, { key: 'count', label: 'People', mono: true, align: 'right' }
        ]} rows={BRADFORD_BANDS.map(([band, lo, hi, action]) => ({
          id: band,
          band: <Badge tone={BAND_TONES[band] || 'dark'}>{band}</Badge>,
          range: hi === Infinity ? lo + '+' : lo + '–' + hi,
          action,
          count: people.filter(p => p.bradford.score >= lo && p.bradford.score <= hi).length
        }))} />
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          These bands are defaults, not policy. Set your own trigger points in Settings before using them in a formal attendance process,
          and take advice where a disability or pregnancy-related absence may be involved — those are usually discounted.
        </span>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Episodes ---------------- */
function AbsenceEpisodes({ data }) {
  const { employees, episodes, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [dept, setDept] = React.useState('All');
  const [reason, setReason] = React.useState('All');
  const [q, setQ] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  const filtered = episodes
    .filter(a => dept === 'All' || a.department === dept)
    .filter(a => reason === 'All' || a.reason === reason)
    .filter(a => !q || a.employeeName.toLowerCase().includes(q.toLowerCase()));

  function exportEpisodes() {
    window.downloadCsv('nhr-absence-' + new Date().toISOString().slice(0, 10) + '.csv',
      [{ label: 'Employee', key: 'name' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
      { label: 'First day', key: 'start' }, { label: 'Last day', key: 'end' }, { label: 'Days', key: 'days' },
      { label: 'Reason', key: 'reason' }, { label: 'Fit note', key: 'fit' },
      { label: 'Return to work', key: 'rtw' }, { label: 'RTW date', key: 'rtwDate' }],
      filtered.map(a => ({
        name: a.employeeName, ref: a.employeeRef, dept: a.department,
        start: a.startDate, end: a.endDate, days: a.days, reason: a.reason,
        fit: a.fitNote ? 'Required' : 'Self-certified',
        rtw: a.returnToWork.completed ? 'Complete' : 'Outstanding',
        rtwDate: a.returnToWork.date || ''
      })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search episodes"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All reasons</option>
          {R.ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <Button size="sm" variant="secondary" tone="dark" onClick={exportEpisodes} iconLeft={<Icon name="Download" size={15} />}>Export</Button>
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>Record Absence</Button>}
      </Card>

      <DashboardCard title={'Episodes (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(a => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={a.employee} size={36} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 170 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.employeeName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{a.jobTitle} · {a.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 148 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{a.reason}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                      {window.shortDate(a.startDate)} – {window.shortDate(a.endDate)}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 50 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{a.days}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{a.days === 1 ? 'day' : 'days'}</span>
                  </span>
                  <Badge tone={a.fitNote ? 'warning' : 'dark'}>{a.fitNote ? 'Fit note' : 'Self-certified'}</Badge>
                  <Badge tone={a.returnToWork.completed ? 'success' : 'warning'}>{a.returnToWork.completed ? 'RTW done' : 'RTW due'}</Badge>
                  {canWrite && (
                    <IconButton tone="dark" size={30} label="Delete episode"
                      onClick={() => { R.remove(a.employeeKey, 'absences', a.id); S.logActivity(a.employeeKey, 'Absence episode from ' + window.shortDate(a.startDate) + ' deleted'); refresh(); }}>
                      <Icon name="Trash2" size={14} />
                    </IconButton>
                  )}
                </div>
                {(a.notes || a.returnToWork.completed) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    {a.notes && <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>{a.notes}</span>}
                    {a.returnToWork.completed && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                        RTW {window.shortDate(a.returnToWork.date)} by {a.returnToWork.by} — {a.returnToWork.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing matches those filters.</span>}
      </DashboardCard>

      {adding && <RecordAbsenceDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------------- Record absence (company-wide) ---------------- */
function RecordAbsenceDialog({ data, onClose }) {
  const { employees, S, R, refresh } = data;
  const [form, setForm] = React.useState({ employeeId: '', reason: 'Sickness', startDate: '', endDate: '', notes: '' });
  const [error, setError] = React.useState('');
  const days = form.startDate && form.endDate ? R.workingDays(form.startDate, form.endDate) : 0;
  const employee = form.employeeId ? S.get(form.employeeId) : null;
  const bf = form.employeeId ? R.bradford(form.employeeId) : null;

  /* What the score becomes once this episode is added. */
  const projected = bf ? (bf.spells + 1) * (bf.spells + 1) * (bf.days + days) : 0;

  function submit() {
    if (!form.employeeId) return setError('Choose an employee.');
    if (!form.startDate || !form.endDate) return setError('Enter the first and last day of absence.');
    if (days <= 0) return setError('The last day must be on or after the first day and cover a working day.');
    R.add(form.employeeId, 'absences', {
      startDate: form.startDate, endDate: form.endDate, days, reason: form.reason,
      selfCertified: days <= 7, fitNote: days > 7,
      returnToWork: { completed: false, date: '', by: '', notes: '' }, notes: form.notes
    });
    S.logActivity(form.employeeId, form.reason + ' absence recorded: ' + days + ' day' + (days > 1 ? 's' : '') + ' from ' + window.shortDate(form.startDate));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Record Absence"
      subtitle="Logs the episode on the employee record and recalculates their Bradford Factor." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Reason" value={form.reason} onChange={v => setForm(p => Object.assign({}, p, { reason: v }))} options={R.ABSENCE_REASONS} />
          <TextField label="First day" required type="date" value={form.startDate} onChange={v => setForm(p => Object.assign({}, p, { startDate: v }))} />
          <TextField label="Last day" required type="date" value={form.endDate} onChange={v => setForm(p => Object.assign({}, p, { endDate: v }))} />
          <TextareaField label="Notes (optional)" span={2} rows={2} value={form.notes} onChange={v => setForm(p => Object.assign({}, p, { notes: v }))}
            placeholder="Keep factual. Hold medical detail only where genuinely necessary." />
        </FormGrid>
        {days > 0 && (
          <Notice icon="Info">
            {days} working day{days > 1 ? 's' : ''} (weekends excluded).
            {days > 7 ? ' Over 7 days — a fit note is expected.' : ' Self-certification applies up to 7 days.'}
          </Notice>
        )}
        {bf && days > 0 && (
          <Notice icon="Activity">
            {S.fullName(employee)}'s Bradford Factor would move from {bf.score} to {projected}
            {projected >= 200 ? ' — that crosses the review threshold.' : '.'}
          </Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Record Absence</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { BAND_TONES, BRADFORD_BANDS, AbsenceSubnav, useAbsenceData, AbsenceOverview, AbsenceEpisodes, RecordAbsenceDialog });
