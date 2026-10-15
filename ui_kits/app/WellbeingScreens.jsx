/* Wellbeing — team insights with suppression, adjustments register, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const WB_TONE = score => score == null ? 'dark' : score >= 3.8 ? 'success' : score >= 3.2 ? 'warning' : 'danger';

/* ---------------- Team insights ---------------- */
function TeamInsights({ data }) {
  const { checkIns, signals, employees, S, W } = data;
  const [weeks, setWeeks] = React.useState('12');
  const [dept, setDept] = React.useState('All');

  const cutoff = new Date(Date.now() - Number(weeks) * 7 * window.WB_DAY).toISOString().slice(0, 10);
  const scoped = checkIns.filter(c => c.date >= cutoff);
  const deptScoped = scoped.filter(c => dept === 'All' || c.department === dept);

  const overall = W.overall(deptScoped);
  const suppressed = deptScoped.length < W.MIN_GROUP;

  /* Per-question scores, each suppressed independently. */
  const perQuestion = W.QUESTIONS.map(q => ({
    id: q.id, label: q.label,
    score: W.score(deptScoped, q.id)
  }));

  /* Per-department, each with its own suppression check — this is the point of
     the threshold: a small team simply does not get a number. */
  const deptRows = S.DEPARTMENTS.map(d => {
    const list = scoped.filter(c => c.department === d);
    const headcount = employees.filter(e => e.department === d).length;
    return {
      id: d, department: d, responses: list.length, headcount,
      score: W.overall(list),
      reportable: list.length >= W.MIN_GROUP
    };
  }).filter(r => r.headcount > 0 || r.responses > 0);

  const reportableDepts = deptRows.filter(r => r.reportable);
  const lowest = reportableDepts.slice().sort((a, b) => a.score - b.score)[0];

  /* Trend by month over the window. A suppressed bucket is omitted entirely —
     plotting it as zero would read as a catastrophic score rather than as a
     figure withheld. */
  const monthMap = {};
  deptScoped.forEach(c => {
    const k = c.date.slice(0, 7);
    (monthMap[k] = monthMap[k] || []).push(c);
  });
  const monthKeys = Object.keys(monthMap).sort();
  const suppressedMonths = monthKeys.filter(k => monthMap[k].length < W.MIN_GROUP).length;
  const trendBars = monthKeys
    .filter(k => monthMap[k].length >= W.MIN_GROUP)
    .map(k => ({
      label: new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short' }),
      value: Math.round(W.overall(monthMap[k]) * 20)
    }));

  const comments = deptScoped.filter(c => c.comment).slice(0, 6);
  const flagged = signals.filter(s => s.flags.length >= 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="EyeOff" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Check-ins carry no employee id, so there is nothing to drill into. Any group with fewer than {W.MIN_GROUP}
          {' '}responses shows no figures at all — with three replies in a team of four, an average identifies people.
        </span>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Overall score" value={overall == null ? '—' : overall + '/5'} caption={suppressed ? 'Too few responses to report' : deptScoped.length + ' responses'} icon={<Icon name="HeartHandshake" size={18} />} />
        <StatTile label="Responses" value={String(deptScoped.length)} caption={'Last ' + weeks + ' weeks'} icon={<Icon name="MessageSquare" size={18} />} />
        <StatTile label="Teams reporting" value={reportableDepts.length + '/' + deptRows.length} caption={'Need ' + W.MIN_GROUP + '+ responses'} icon={<Icon name="Users" size={18} />} />
        <StatTile label="Workload flags" value={String(flagged.length)} caption="Two or more signals" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['4', '4 weeks'], ['12', '12 weeks'], ['26', '6 months']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setWeeks(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (weeks === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: weeks === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: weeks === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: weeks === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All teams</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-wellbeing-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Team', key: 'department' }, { label: 'Headcount', key: 'headcount' },
            { label: 'Responses', key: 'responses' }, { label: 'Score', key: 'score' }],
            /* The export honours suppression too — otherwise the safeguard is
               one click away from being bypassed. */
            deptRows.map(r => ({
              department: r.department, headcount: r.headcount, responses: r.responses,
              score: r.reportable ? r.score : 'Suppressed (under ' + W.MIN_GROUP + ' responses)'
            })))}>Export</Button>
      </Card>

      {suppressed ? (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="EyeOff" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Not enough responses to report</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 520 }}>
            {deptScoped.length} {deptScoped.length === 1 ? 'response' : 'responses'} in this selection, and {W.MIN_GROUP} are
            needed. Widen the period or select all teams.
          </span>
        </Card>
      ) : (
        <React.Fragment>
          <div className="wb-split" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
            <DashboardCard title="By question" padding={16} action={<Badge tone={WB_TONE(overall)}>{overall}/5</Badge>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {perQuestion.map(q => (
                  <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', lineHeight: 1.45 }}>{q.label}</span>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap', color: q.score == null ? 'var(--text-muted-dark)' : q.score >= 3.8 ? 'var(--nhr-turquoise)' : q.score >= 3.2 ? 'var(--nhr-warning)' : 'var(--nhr-danger)' }}>
                        {q.score == null ? '—' : q.score}
                      </span>
                    </div>
                    <span style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', display: 'block' }}>
                      <span style={{
                        display: 'block', height: '100%', width: (q.score == null ? 0 : q.score / 5 * 100) + '%', borderRadius: 999,
                        background: q.score >= 3.8 ? 'var(--nhr-turquoise)' : q.score >= 3.2 ? 'var(--nhr-warning)' : 'var(--nhr-danger)'
                      }} />
                    </span>
                  </div>
                ))}
              </div>
              <span style={{ display: 'block', marginTop: 13, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                "I have felt under unreasonable pressure" is reverse-scored, so a high number is always good on every row.
              </span>
            </DashboardCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DashboardCard title="Score by month" action={<Badge tone="dark">out of 100</Badge>}>
                {trendBars.length ? <BarChart height={150} data={trendBars} />
                  : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No month has enough responses to report.</span>}
                {suppressedMonths > 0 && (
                  <span style={{ display: 'block', marginTop: 11, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                    {suppressedMonths} {suppressedMonths === 1 ? 'month is' : 'months are'} not plotted — fewer than {W.MIN_GROUP} responses, so the figure is withheld rather than shown as a low score.
                  </span>
                )}
              </DashboardCard>
              {lowest && (
                <DashboardCard title="Lowest reporting team">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: WB_TONE(lowest.score) === 'danger' ? 'var(--nhr-danger)' : 'var(--nhr-warning)' }}>
                        {lowest.score}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{lowest.department}</span>
                    </div>
                    <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                      {lowest.responses} responses from {lowest.headcount} people. A low score is a prompt to ask the team
                      what would help, not to work out who replied.
                    </span>
                  </div>
                </DashboardCard>
              )}
            </div>
          </div>

          <DashboardCard title="By team" padding={16} action={<Badge tone="dark">{reportableDepts.length} reporting</Badge>}>
            <DataTable compact columns={[
              { key: 'department', label: 'Team' },
              { key: 'headcount', label: 'Headcount', mono: true, align: 'right' },
              { key: 'responses', label: 'Responses', mono: true, align: 'right' },
              { key: 'scoreLabel', label: 'Score', mono: true, align: 'right' },
              { key: 'badge', label: '' }
            ]} rows={deptRows.map(r => ({
              id: r.id, department: r.department, headcount: r.headcount, responses: r.responses,
              scoreLabel: r.reportable ? r.score + '/5' : '—',
              badge: r.reportable
                ? <Badge tone={WB_TONE(r.score)}>{r.score >= 3.8 ? 'Healthy' : r.score >= 3.2 ? 'Watch' : 'Needs attention'}</Badge>
                : <Badge tone="dark">Suppressed</Badge>
            }))} />
          </DashboardCard>

          {comments.length > 0 && (
            <DashboardCard title={'Comments (' + comments.length + ')'} padding={16} action={<Badge tone="dark">Unattributed</Badge>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 13, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>{c.comment}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{c.department} · {window.shortDate(c.date)}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}
        </React.Fragment>
      )}

      <DashboardCard title={'Workload signals (' + flagged.length + ')'} padding={16}
        action={<Badge tone="dark">From operational data</Badge>}>
        {flagged.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {flagged.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', padding: 13, border: '1px solid rgba(242,180,65,.24)', borderRadius: 'var(--radius-md)', background: 'rgba(242,180,65,.03)' }}>
                <Avatar employee={s.employee} size={34} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{s.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{s.employee.jobTitle} · {s.department}</span>
                </span>
                <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {s.flags.map(f => <Badge key={f} tone="warning">{f}</Badge>)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            No one currently shows two or more workload signals.
          </span>
        )}
        <span style={{ display: 'block', marginTop: 13, fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-muted-dark)' }}>
          These flags come from absence frequency, late starts and untaken leave — operational data the platform already
          holds. They are not a health assessment and say nothing about anyone's wellbeing. Treat them as a reason to ask
          how someone is, and never as a performance measure.
        </span>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Adjustments register ---------------- */
function Adjustments({ data }) {
  const { adjustments, employees, S, W, refresh } = data;
  const canWrite = S.can('employees.write');
  const [adding, setAdding] = React.useState(false);
  const [show, setShow] = React.useState('Active');

  const active = adjustments.filter(a => a.status === 'Active');
  const ended = adjustments.filter(a => a.status !== 'Active');
  const due = active.filter(a => a.reviewDue);
  const list = show === 'Active' ? active : ended;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Active adjustments" value={String(active.length)} caption="Currently in place" icon={<Icon name="Settings2" size={18} />} />
        <StatTile label="Review due" value={String(due.length)} caption="Within 14 days" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Ended" value={String(ended.length)} caption="No longer in place" icon={<Icon name="Archive" size={18} />} />
        <StatTile label="No review date" value={String(active.filter(a => !a.reviewAt).length)} caption="Permanent or open ended" icon={<Icon name="Infinity" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="ShieldCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          This register records <strong style={{ color: '#fff' }}>what was agreed, not why</strong>. A manager needs to know
          someone finishes at 3pm on Wednesdays; recording the reason would create a special category health record with a
          much higher bar to hold it. Keep any medical detail with occupational health, not here.
        </span>
      </Card>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Active', active.length], ['Ended', ended.length]].map(([k, n]) => (
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
        <span style={{ flex: 1 }} />
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>Record Adjustment</Button>}
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(a => (
            <Card key={a.id} tone="dark" padding={16} style={{
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              borderColor: a.reviewDue && a.status === 'Active' ? 'rgba(242,180,65,.26)' : undefined
            }}>
              {a.employee ? <Avatar employee={a.employee} size={36} /> : (
                <span style={{
                  width: 36, height: 36, flex: '0 0 auto', borderRadius: '50%',
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted-dark)'
                }}><Icon name="User" size={16} /></span>
              )}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.type}</span>
                <span style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>{a.detail}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {a.employeeName} · agreed {window.shortDate(a.agreedAt)}{a.agreedBy ? ' by ' + a.agreedBy : ''}
                </span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 92 }}>
                <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.daysToReview != null && a.daysToReview < 0 ? 'var(--nhr-danger)' : '#fff' }}>
                  {a.reviewAt ? window.shortDate(a.reviewAt) : 'Open ended'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                  {a.daysToReview == null ? 'no review set'
                    : a.daysToReview < 0 ? Math.abs(a.daysToReview) + 'd overdue' : 'review in ' + a.daysToReview + 'd'}
                </span>
              </span>
              <Badge tone={a.status === 'Active' ? 'success' : 'dark'}>{a.status}</Badge>
              {canWrite && a.status === 'Active' && (
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="xs" variant="secondary" tone="dark"
                    onClick={() => {
                      W.updateAdjustment(a.id, { reviewAt: new Date(Date.now() + 90 * window.WB_DAY).toISOString().slice(0, 10) });
                      if (a.employeeId) S.logActivity(a.employeeId, 'Adjustment reviewed and continued: ' + a.type);
                      refresh();
                    }}>Reviewed</Button>
                  <Button size="xs" variant="ghost" tone="dark"
                    onClick={() => {
                      W.updateAdjustment(a.id, { status: 'Ended', endedAt: new Date().toISOString().slice(0, 10) });
                      if (a.employeeId) S.logActivity(a.employeeId, 'Adjustment ended: ' + a.type);
                      refresh();
                    }}>End</Button>
                </span>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="Settings2" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Active' ? 'No adjustments recorded' : 'Nothing ended'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            Record what has been agreed so it survives a change of manager.
          </span>
        </Card>
      )}

      {adding && <AdjustmentDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------------- Record adjustment ---------------- */
function AdjustmentDialog({ data, onClose }) {
  const { employees, S, W, refresh } = data;
  const [form, setForm] = React.useState({
    employeeId: '', type: W.ADJUSTMENT_TYPES[0], detail: '',
    reviewAt: new Date(Date.now() + 90 * window.WB_DAY).toISOString().slice(0, 10),
    agreedBy: S.session.name
  });
  const [error, setError] = React.useState('');
  const mentionsHealth = /diagnos|condition|depress|anxiet|cancer|disab|medicat|illness|surgery|therapy/i.test(form.detail);

  function submit() {
    if (!form.employeeId) return setError('Choose whose adjustment this is.');
    if (!form.detail.trim()) return setError('Describe what has been agreed.');
    W.addAdjustment(Object.assign({}, form));
    S.logActivity(form.employeeId, 'Workplace adjustment agreed: ' + form.type + ' — ' + form.detail);
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Record Adjustment"
      subtitle="What was agreed and when it is reviewed. Not the reason behind it." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Type" value={form.type} onChange={v => setForm(p => Object.assign({}, p, { type: v }))} options={W.ADJUSTMENT_TYPES} />
          <TextField label="Review date" type="date" value={form.reviewAt} onChange={v => setForm(p => Object.assign({}, p, { reviewAt: v }))}
            hint="Leave blank if permanent." />
          <TextareaField label="What has been agreed" required span={2} rows={3} value={form.detail} onChange={v => setForm(p => Object.assign({}, p, { detail: v }))}
            placeholder="Starts at 10am Mondays and Wednesdays; team meeting moved to 10.30am." />
          <TextField label="Agreed by" span={2} value={form.agreedBy} onChange={v => setForm(p => Object.assign({}, p, { agreedBy: v }))} />
        </FormGrid>

        {mentionsHealth && (
          <Notice icon="TriangleAlert" tone="warn">
            That description looks like it includes health information. Record only the practical arrangement here —
            anything about a condition, diagnosis or treatment belongs with occupational health, where the higher
            protections for special category data apply.
          </Notice>
        )}
        <Notice icon="Info">
          Where an adjustment relates to a disability, the duty is to make it reasonable and effective — and to review it
          when the job or the person's needs change. An adjustment with no review date and no owner tends to quietly stop
          working.
        </Notice>
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Record Adjustment</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Screen shell ---------------- */
function WellbeingScreen() {
  const data = window.useWellbeingData();
  const canManage = data.S.can('employees.write');
  const allow = canManage
    ? ['Check In', 'Support', 'Team Insights', 'Adjustments']
    : ['Check In', 'Support'];
  const [view, setView] = React.useState('Check In');
  const [adjusting, setAdjusting] = React.useState(false);
  const active = allow.indexOf(view) > -1 ? view : 'Check In';

  const reviewsDue = data.adjustments.filter(a => a.status === 'Active' && a.reviewDue).length;

  const body = {
    'Check In': <window.WellbeingCheckIn data={data} onView={setView} />,
    'Support': <window.WellbeingSupport data={data} onRequest={() => (canManage ? setAdjusting(true) : setView('Support'))} />,
    'Team Insights': <TeamInsights data={data} />,
    'Adjustments': <Adjustments data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Wellbeing</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 600 }}>
            An anonymous weekly check-in about work, aggregated per team and suppressed below {data.W.MIN_GROUP} responses. Support routes, and a register of what has been agreed — never why.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Support')} iconLeft={<Icon name="LifeBuoy" size={15} />}>Get Support</Button>
          {active !== 'Check In' && (
            <Button size="sm" onClick={() => setView('Check In')} iconLeft={<Icon name="HeartHandshake" size={15} />}>Check In</Button>
          )}
        </div>
      </div>

      <window.WellbeingSubnav view={active} onSelect={setView} allow={allow} counts={{ reviewsDue }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[active]}</div>
      {adjusting && <AdjustmentDialog data={data} onClose={() => setAdjusting(false)} />}
    </div>
  );
}

Object.assign(window, { WellbeingScreen, TeamInsights, Adjustments, AdjustmentDialog });
