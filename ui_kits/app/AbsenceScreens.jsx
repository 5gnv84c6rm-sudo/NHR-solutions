/* Absence — return-to-work queue, patterns and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Return to work ---------------- */
function ReturnToWork({ data }) {
  const { episodes, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [open, setOpen] = React.useState(null);
  const [notes, setNotes] = React.useState('');
  const [adjust, setAdjust] = React.useState('None');
  const [show, setShow] = React.useState('Outstanding');

  const outstanding = episodes.filter(a => !a.returnToWork.completed);
  const done = episodes.filter(a => a.returnToWork.completed);
  const list = show === 'Outstanding' ? outstanding : done;

  /* Days since the employee was due back — an overdue meeting matters. */
  function daysSince(a) {
    return Math.max(0, Math.floor((Date.now() - new Date(a.endDate).getTime()) / 864e5));
  }

  function complete(a) {
    const text = (notes || 'Return-to-work discussion held.') + (adjust !== 'None' ? ' Adjustments: ' + adjust + '.' : '');
    R.update(a.employeeKey, 'absences', a.id, {
      returnToWork: { completed: true, date: new Date().toISOString().slice(0, 10), by: S.session.name, notes: text }
    });
    S.logActivity(a.employeeKey, 'Return-to-work completed for absence from ' + window.shortDate(a.startDate));
    setOpen(null); setNotes(''); setAdjust('None'); refresh();
  }

  const overdue = outstanding.filter(a => daysSince(a) > 7).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Outstanding" value={String(outstanding.length)} caption="Meetings not recorded" icon={<Icon name="ClipboardCheck" size={18} />} />
        <StatTile label="Overdue" value={String(overdue)} caption="More than 7 days since return" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Completed" value={String(done.length)} caption="On record" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Completion rate" value={episodes.length ? Math.round(done.length / episodes.length * 100) + '%' : '—'} caption="All episodes" icon={<Icon name="ChartColumn" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Outstanding', outstanding.length], ['Completed', done.length]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k}<Badge tone="dark">{n}</Badge></button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>A return-to-work meeting is expected after every absence.</span>
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(a => {
            const since = daysSince(a);
            const late = show === 'Outstanding' && since > 7;
            return (
              <Card key={a.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: late ? 'rgba(242,180,65,.30)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={a.employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 175 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{a.employeeName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{a.jobTitle} · {a.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{a.reason} · {a.days} day{a.days > 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                      Returned {window.shortDate(new Date(new Date(a.endDate).getTime() + 864e5))}
                    </span>
                  </span>
                  {show === 'Outstanding'
                    ? <Badge tone={late ? 'danger' : 'warning'}>{since === 0 ? 'Due today' : since + ' day' + (since === 1 ? '' : 's') + ' ago'}</Badge>
                    : <Badge tone="success">Completed {window.shortDate(a.returnToWork.date)}</Badge>}
                  {show === 'Outstanding' && canWrite && (
                    <Button size="xs" onClick={() => { setOpen(open === a.id ? null : a.id); setNotes(''); setAdjust('None'); }}>
                      {open === a.id ? 'Close' : 'Record Meeting'}
                    </Button>
                  )}
                </div>

                {show === 'Completed' && (
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    Recorded by {a.returnToWork.by} — {a.returnToWork.notes}
                  </span>
                )}

                {open === a.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    <FormGrid cols={2}>
                      <SelectField label="Adjustments agreed" value={adjust} onChange={setAdjust}
                        options={['None', 'Phased return', 'Reduced hours', 'Amended duties', 'Workplace assessment', 'Occupational health referral']} />
                      <TextField label="Fit note held" value={a.fitNote ? 'Yes — over 7 days' : 'Not required'} disabled />
                      <TextareaField label="Discussion notes" span={2} rows={2} value={notes} onChange={setNotes}
                        placeholder="Fit to return, no ongoing concerns raised." />
                    </FormGrid>
                    <Notice icon="Info">
                      Record what was agreed, not medical detail. Where a condition may amount to a disability, take advice before setting expectations.
                    </Notice>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <Button size="sm" variant="ghost" tone="dark" onClick={() => setOpen(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => complete(a)} iconLeft={<Icon name="Check" size={15} />}>Mark Complete</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Outstanding' ? 'Nothing outstanding' : 'Nothing completed yet'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {show === 'Outstanding' ? 'Every absence episode has a return-to-work meeting on record.' : 'Completed meetings will appear here.'}
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Patterns ---------------- */
function AbsencePatterns({ data }) {
  const { people, episodes, employees, S } = data;
  const [days, setDays] = React.useState('365');
  const cutoff = new Date(Date.now() - Number(days) * 864e5).toISOString().slice(0, 10);
  const scoped = episodes.filter(a => a.startDate >= cutoff);

  /* Which weekday absences start on. A Monday/Friday skew is the classic
     pattern managers look for. */
  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowCount = new Array(7).fill(0);
  scoped.forEach(a => { dowCount[(new Date(a.startDate).getDay() + 6) % 7]++; });
  const dowBars = dowNames.map((label, i) => ({ label, value: dowCount[i], muted: i > 4 }));
  const mondayFriday = dowCount[0] + dowCount[4];
  const skew = scoped.length ? Math.round(mondayFriday / scoped.length * 100) : 0;

  /* Short spells (1–2 days) versus longer ones. */
  const shortSpells = scoped.filter(a => a.days <= 2).length;
  const longSpells = scoped.filter(a => a.days > 7).length;

  const deptMap = {};
  scoped.forEach(a => {
    const d = deptMap[a.department] || (deptMap[a.department] = { spells: 0, days: 0 });
    d.spells++; d.days += a.days;
  });
  const deptRows = Object.keys(deptMap).map(k => {
    const head = employees.filter(e => e.department === k).length || 1;
    return {
      id: k, department: k, spells: deptMap[k].spells, days: deptMap[k].days,
      headcount: head, perHead: Math.round(deptMap[k].days / head * 10) / 10
    };
  }).sort((a, b) => b.perHead - a.perHead);

  const worst = people.slice().sort((a, b) => b.bradford.score - a.bradford.score).slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Episodes" value={String(scoped.length)} caption={'Last ' + (days === '365' ? '12 months' : days + ' days')} icon={<Icon name="ListOrdered" size={18} />} />
        <StatTile label="Mon/Fri starts" value={skew + '%'} caption="Of all episodes" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Short spells" value={String(shortSpells)} caption="Two days or fewer" icon={<Icon name="Zap" size={18} />} />
        <StatTile label="Long-term" value={String(longSpells)} caption="Over seven days" icon={<Icon name="Hourglass" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Period</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['90', '3 months'], ['180', '6 months'], ['365', '12 months']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setDays(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (days === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: days === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: days === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: days === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
      </Card>

      <div className="abs-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Absence start day" action={<Badge tone="dark">Episodes</Badge>}>
          <BarChart height={175} data={dowBars} />
          <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            {skew >= 55
              ? skew + '% of episodes start on a Monday or Friday, which is worth a look — though a genuine pattern needs more than one quarter of data.'
              : 'No strong weekday skew in this period.'}
          </span>
        </DashboardCard>
        <DashboardCard title="Highest Bradford scores" padding={16}>
          <DataTable compact columns={[
            { key: 'name', label: 'Employee' },
            { key: 'score', label: 'Score', mono: true, align: 'right' },
            { key: 'spells', label: 'Spells', mono: true, align: 'right' },
            { key: 'band', label: 'Band' }
          ]} rows={worst.map(p => ({
            id: p.employee.id, name: S.fullName(p.employee),
            score: p.bradford.score, spells: p.bradford.spells,
            band: <Badge tone={window.BAND_TONES[p.bradford.band] || 'dark'}>{p.bradford.band}</Badge>
          }))} />
        </DashboardCard>
      </div>

      <DashboardCard title="By department" padding={16} action={<Badge tone="dark">Days per head</Badge>}>
        {deptRows.length ? (
          <DataTable compact columns={[
            { key: 'department', label: 'Department' },
            { key: 'headcount', label: 'Headcount', mono: true, align: 'right' },
            { key: 'spells', label: 'Spells', mono: true, align: 'right' },
            { key: 'days', label: 'Days lost', mono: true, align: 'right' },
            { key: 'perHead', label: 'Per head', mono: true, align: 'right' }
          ]} rows={deptRows} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No absence recorded in this period.</span>}
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Patterns here are a prompt to ask questions, not evidence on their own. Small teams produce noisy figures, and absence
          related to disability, pregnancy or an industrial injury is normally discounted from trigger calculations. Take advice
          before acting on anything on this page.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function AbsenceScreen() {
  const data = window.useAbsenceData();
  const [view, setView] = React.useState('Overview');
  const [recording, setRecording] = React.useState(false);
  const canWrite = data.S.can('employees.write');
  const rtw = data.people.reduce((n, p) => n + p.outstanding, 0);

  const body = {
    'Overview': <window.AbsenceOverview data={data} onView={setView} />,
    'Episodes': <window.AbsenceEpisodes data={data} />,
    'Return to Work': <ReturnToWork data={data} />,
    'Patterns': <AbsencePatterns data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Absence</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Sickness episodes, Bradford Factor scores and return-to-work meetings across everyone you manage. Everything written here appears on the employee record.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Return to Work')} iconLeft={<Icon name="ClipboardCheck" size={15} />}>
              Return to Work{rtw > 0 ? ' (' + rtw + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setRecording(true)} iconLeft={<Icon name="Plus" size={16} />}>Record Absence</Button>
          </div>
        )}
      </div>

      <window.AbsenceSubnav view={view} onSelect={setView} counts={{ rtw }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {recording && <window.RecordAbsenceDialog data={data} onClose={() => setRecording(false)} />}
    </div>
  );
}

Object.assign(window, { AbsenceScreen, ReturnToWork, AbsencePatterns });
