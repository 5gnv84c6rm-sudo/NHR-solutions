/* Health & Safety — risk assessments, action tracker and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Risk assessments ---------------- */
function RiskAssessments({ data }) {
  const { assessments, S, HS, refresh } = data;
  const canWrite = S.can('employees.write');
  const [adding, setAdding] = React.useState(false);
  const [show, setShow] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const list = assessments.filter(a => show === 'All'
    || (show === 'Review due' ? (a.reviewOverdue || a.daysToReview <= 30)
      : show === 'High risk' ? (a.residualBand === 'High' || a.residualBand === 'Intolerable') : true));

  const overdue = assessments.filter(a => a.reviewOverdue);
  const high = assessments.filter(a => a.residualBand === 'High' || a.residualBand === 'Intolerable');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Assessments" value={String(assessments.length)} caption="On record" icon={<Icon name="ClipboardList" size={18} />} />
        <StatTile label="Review overdue" value={String(overdue.length)} caption="Past the review date" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="High residual risk" value={String(high.length)} caption="After controls" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Risk reduced" value={assessments.length ? Math.round(assessments.reduce((n, a) => n + (a.score ? (a.score - a.residual) / a.score : 0), 0) / assessments.length * 100) + '%' : '—'} caption="Average, controls applied" icon={<Icon name="ShieldCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All', 'Review due', 'High risk'].map(k => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-risk-assessments-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Reference', key: 'ref' }, { label: 'Title', key: 'title' }, { label: 'Location', key: 'loc' },
            { label: 'Likelihood', key: 'l' }, { label: 'Severity', key: 's' }, { label: 'Initial score', key: 'score' },
            { label: 'Initial band', key: 'band' }, { label: 'Controls', key: 'ctrl' },
            { label: 'Residual score', key: 'res' }, { label: 'Residual band', key: 'resBand' },
            { label: 'Assessor', key: 'by' }, { label: 'Reviewed', key: 'rev' }, { label: 'Next review', key: 'next' }],
            assessments.map(a => ({
              ref: a.reference, title: a.title, loc: a.location, l: a.likelihood, s: a.severity,
              score: a.score, band: a.band, ctrl: a.controls, res: a.residual, resBand: a.residualBand,
              by: a.assessor, rev: a.reviewedAt, next: a.nextReview
            })))}>Export</Button>
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>New Assessment</Button>}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(a => (
          <Card key={a.id} tone="dark" padding={16} style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            borderColor: a.reviewOverdue ? 'rgba(242,84,91,.28)' : a.residualBand === 'High' || a.residualBand === 'Intolerable' ? 'rgba(242,180,65,.26)' : undefined
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{
                width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
              }}><Icon name="ClipboardList" size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{a.title}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {a.reference} · {a.location} · assessed by {a.assessor}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone={window.RISK_TONE[a.band]}>{a.score} {a.band}</Badge>
                <Icon name="ArrowRight" size={13} style={{ color: 'var(--text-muted-dark)' }} />
                <Badge tone={window.RISK_TONE[a.residualBand]}>{a.residual} {a.residualBand}</Badge>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 90 }}>
                <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.reviewOverdue ? 'var(--nhr-danger)' : '#fff' }}>
                  {window.shortDate(a.nextReview)}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                  {a.reviewOverdue ? Math.abs(a.daysToReview) + ' days overdue' : 'review in ' + a.daysToReview + 'd'}
                </span>
              </span>
              {canWrite && (
                <span style={{ display: 'flex', gap: 8 }}>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(open === a.id ? null : a.id)}>
                    {open === a.id ? 'Close' : 'Controls'}
                  </Button>
                  <Button size="xs" onClick={() => { HS.reviewAssessment(a.id, S.session.name); refresh(); }}>Mark Reviewed</Button>
                </span>
              )}
            </div>

            {open === a.id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                <DataTable compact columns={[{ key: 'k', label: '' }, { key: 'l', label: 'Likelihood', mono: true, align: 'right' }, { key: 's', label: 'Severity', mono: true, align: 'right' }, { key: 'sc', label: 'Score', mono: true, align: 'right' }, { key: 'b', label: 'Band' }]} rows={[
                  { id: 'i', k: 'Before controls', l: a.likelihood, s: a.severity, sc: a.score, b: <Badge tone={window.RISK_TONE[a.band]}>{a.band}</Badge> },
                  { id: 'r', k: 'After controls', l: a.residualLikelihood, s: a.residualSeverity, sc: a.residual, b: <Badge tone={window.RISK_TONE[a.residualBand]}>{a.residualBand}</Badge> }
                ]} />
                <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
                  <strong style={{ color: '#fff' }}>Controls: </strong>{a.controls}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                  Reviewed {window.shortDate(a.reviewedAt)} · review interval {a.reviewEvery} days
                  {a.score >= 15 ? ' (shortened because the untreated risk is high)' : ''}
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Scores use the common 5×5 likelihood × severity matrix. A matrix is a way of ordering priorities, not a
          substitute for judgement — the legal test is whether risk is reduced so far as is reasonably practicable.
          Employers with five or more employees must record the significant findings of their assessments.
        </span>
      </Card>

      {adding && <NewAssessmentDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------------- New assessment ---------------- */
function NewAssessmentDialog({ data, onClose }) {
  const { S, HS, refresh } = data;
  const [form, setForm] = React.useState({
    title: '', location: '', category: HS.CATEGORIES[0],
    likelihood: '3', severity: '3', controls: '',
    residualLikelihood: '2', residualSeverity: '2',
    assessor: S.session.name
  });
  const [error, setError] = React.useState('');

  const score = (Number(form.likelihood) || 0) * (Number(form.severity) || 0);
  const residual = (Number(form.residualLikelihood) || 0) * (Number(form.residualSeverity) || 0);
  const band = HS.riskBand(score), resBand = HS.riskBand(residual);
  const worse = residual > score;

  function submit() {
    if (!form.title.trim()) return setError('Give the assessment a title.');
    if (!form.controls.trim()) return setError('Describe the control measures — an assessment without controls is not finished.');
    if (worse) return setError('The residual risk cannot be higher than the untreated risk.');
    HS.addAssessment(Object.assign({}, form, {
      likelihood: Number(form.likelihood), severity: Number(form.severity),
      residualLikelihood: Number(form.residualLikelihood), residualSeverity: Number(form.residualSeverity),
      reviewEvery: score >= 15 ? 182 : 365
    }));
    refresh(); onClose();
  }

  const scale = ['1', '2', '3', '4', '5'];

  return (
    <Drawer open onClose={onClose} title="New Risk Assessment"
      subtitle="Score the untreated risk, record the controls, then score what is left." width={660}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <TextField label="Activity or hazard" required span={2} value={form.title} onChange={v => setForm(p => Object.assign({}, p, { title: v }))}
            placeholder="Warehouse racking and forklift operation" />
          <TextField label="Location" value={form.location} onChange={v => setForm(p => Object.assign({}, p, { location: v }))} placeholder="Warehouse" />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={HS.CATEGORIES} />
          <SelectField label="Likelihood before controls" value={form.likelihood} onChange={v => setForm(p => Object.assign({}, p, { likelihood: v }))} options={scale} />
          <SelectField label="Severity before controls" value={form.severity} onChange={v => setForm(p => Object.assign({}, p, { severity: v }))} options={scale} />
          <TextareaField label="Control measures" required span={2} rows={3} value={form.controls} onChange={v => setForm(p => Object.assign({}, p, { controls: v }))}
            placeholder="What is already in place, and what you are adding. Be specific enough that someone else could check it." />
          <SelectField label="Likelihood after controls" value={form.residualLikelihood} onChange={v => setForm(p => Object.assign({}, p, { residualLikelihood: v }))} options={scale} />
          <SelectField label="Severity after controls" value={form.residualSeverity} onChange={v => setForm(p => Object.assign({}, p, { residualSeverity: v }))} options={scale} />
          <TextField label="Assessor" span={2} value={form.assessor} onChange={v => setForm(p => Object.assign({}, p, { assessor: v }))} />
        </FormGrid>

        <Card tone="dark" padding={14} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted-dark)' }}>Before controls</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{score}</span>
              <Badge tone={window.RISK_TONE[band]}>{band}</Badge>
            </span>
          </span>
          <Icon name="ArrowRight" size={16} style={{ color: 'var(--text-muted-dark)' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted-dark)' }}>After controls</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{residual}</span>
              <Badge tone={window.RISK_TONE[resBand]}>{resBand}</Badge>
            </span>
          </span>
          <span style={{ flex: 1 }} />
          {score > 0 && !worse && (
            <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
              {Math.round((score - residual) / score * 100)}% reduction
            </span>
          )}
        </Card>

        {score >= 15 && (
          <Notice icon="TriangleAlert" tone="warn">
            An untreated score of {score} is in the {band.toLowerCase()} band. Work should not proceed on this basis until
            controls bring it down, and the review interval will be set to 6 months rather than a year.
          </Notice>
        )}
        {resBand === 'High' || resBand === 'Intolerable' ? (
          <Notice icon="TriangleAlert" tone="warn">
            The risk remains {resBand.toLowerCase()} even after controls. Consider whether the activity can be eliminated,
            substituted or engineered out before relying on procedure and protective equipment.
          </Notice>
        ) : null}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Create Assessment</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Action tracker ---------------- */
function SafetyActions({ data }) {
  const { actions, S, HS, refresh } = data;
  const canWrite = S.can('employees.write');
  const [show, setShow] = React.useState('Open');

  const open = actions.filter(a => a.status !== 'Complete');
  const done = actions.filter(a => a.status === 'Complete');
  const overdue = open.filter(a => a.overdue);
  const list = show === 'Open' ? open : done;

  /* Average days to close — the number that tells you whether actions are
     actually worked or just logged. */
  const closed = done.filter(a => a.completedAt && a.due);
  const avgLate = closed.length
    ? Math.round(closed.reduce((n, a) => n + Math.floor((new Date(a.completedAt) - new Date(a.due)) / window.HS_DAY), 0) / closed.length)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open actions" value={String(open.length)} caption="Not yet done" icon={<Icon name="ListChecks" size={18} />} />
        <StatTile label="Overdue" value={String(overdue.length)} caption="Past the due date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Completed" value={String(done.length)} caption="Closed out" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Closed on time" value={avgLate == null ? '—' : (avgLate <= 0 ? 'Yes' : avgLate + 'd late')} caption="Average against due date" icon={<Icon name="Clock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Open', open.length], ['Completed', done.length]].map(([k, n]) => (
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
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Actions are added from an incident.</span>
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(a => (
            <Card key={a.incidentId + a.id} tone="dark" padding={16} style={{
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              borderColor: a.overdue ? 'rgba(242,84,91,.28)' : undefined
            }}>
              <Icon name={a.status === 'Complete' ? 'CircleCheck' : 'Circle'} size={17}
                style={{ flex: '0 0 auto', color: a.status === 'Complete' ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{a.title}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {a.incidentRef} · {a.location} · {a.owner}
                </span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 88 }}>
                <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.overdue ? 'var(--nhr-danger)' : '#fff' }}>
                  {a.due ? window.shortDate(a.due) : '—'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                  {a.status === 'Complete' ? 'done ' + window.shortDate(a.completedAt)
                    : a.daysToDue == null ? 'no date'
                      : a.daysToDue < 0 ? Math.abs(a.daysToDue) + 'd overdue' : 'in ' + a.daysToDue + 'd'}
                </span>
              </span>
              <Badge tone={a.status === 'Complete' ? 'success' : a.overdue ? 'danger' : 'warning'}>{a.status === 'Complete' ? 'Complete' : a.overdue ? 'Overdue' : 'Open'}</Badge>
              {canWrite && a.status !== 'Complete' && (
                <Button size="xs" onClick={() => { HS.completeAction(a.incidentId, a.id); refresh(); }} iconLeft={<Icon name="Check" size={13} />}>Mark Done</Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Open' ? 'No open actions' : 'Nothing completed yet'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {show === 'Open' ? 'Every corrective action has been closed out.' : 'Completed actions appear here with the date they were closed.'}
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function SafetyScreen() {
  const data = window.useSafetyData();
  const [view, setView] = React.useState('Overview');
  const [reporting, setReporting] = React.useState(false);
  const canWrite = data.S.can('employees.write');

  const riddor = data.incidents.filter(i => i.riddorDue).length;
  const overdueActions = data.actions.filter(a => a.status !== 'Complete' && a.overdue).length;
  const reviewsDue = data.assessments.filter(a => a.reviewOverdue).length;

  const body = {
    'Overview': <window.SafetyOverview data={data} onView={setView} />,
    'Incidents': <window.IncidentLog data={data} />,
    'Risk Assessments': <RiskAssessments data={data} />,
    'Actions': <SafetyActions data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Health &amp; Safety</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Incidents and near misses with RIDDOR reporting worked out for you, risk assessments with review dates, and the corrective actions that came out of them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canWrite && (
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Actions')} iconLeft={<Icon name="ListChecks" size={15} />}>
              Actions{overdueActions > 0 ? ' (' + overdueActions + ')' : ''}
            </Button>
          )}
          <Button size="sm" onClick={() => setReporting(true)} iconLeft={<Icon name="Plus" size={16} />}>Report Incident</Button>
        </div>
      </div>

      <window.SafetySubnav view={view} onSelect={setView} counts={{ riddor, overdueActions, reviewsDue }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {reporting && <window.ReportIncidentDialog data={data} onClose={() => setReporting(false)} />}
    </div>
  );
}

Object.assign(window, { SafetyScreen, RiskAssessments, NewAssessmentDialog, SafetyActions });
