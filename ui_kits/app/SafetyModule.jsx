/* Health & Safety — shared hook, overview and the incident log. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const HS_DAY = 864e5;
const RISK_TONE = { Low: 'success', Medium: 'warning', High: 'danger', Intolerable: 'danger' };
const SEV_TONE = {
  'No injury': 'dark', 'First aid only': 'dark', 'Medical treatment': 'warning',
  'Over-3-day injury': 'warning', 'Over-7-day injury': 'danger',
  'Specified injury': 'danger', 'Fatality': 'danger'
};

function SafetySubnav({ view, onSelect, counts }) {
  const items = [['Overview', 'LayoutDashboard'], ['Incidents', 'TriangleAlert'], ['Risk Assessments', 'ClipboardList'], ['Actions', 'ListChecks']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Incidents' ? counts.riddor : label === 'Actions' ? counts.overdueActions : label === 'Risk Assessments' ? counts.reviewsDue : 0;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)} aria-current={active ? 'page' : undefined}
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
            {n > 0 && <Badge tone="danger">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useSafetyData() {
  const S = window.EmployeeStore, HS = window.SafetyStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => HS.subscribe(force), []);
  React.useEffect(() => S.subscribe(force), []);

  const incidents = HS.incidents().map(i => {
    const emp = i.employeeId ? S.get(i.employeeId) : null;
    const rid = HS.riddor(i);
    const daysSince = Math.floor((Date.now() - new Date(i.date)) / HS_DAY);
    return Object.assign({}, i, {
      employee: emp,
      employeeName: emp ? S.fullName(emp) : 'Not recorded',
      department: emp ? emp.department : '',
      riddor: rid,
      /* A reportable incident that has not been reported, past its deadline, is
         the single most serious state this module can show. */
      riddorOverdue: !!(rid && rid.reportable && !i.riddorReported && daysSince > rid.deadline),
      riddorDue: !!(rid && rid.reportable && !i.riddorReported),
      daysSince,
      openActions: (i.actions || []).filter(a => a.status !== 'Complete').length
    });
  }).sort((a, b) => a.date < b.date ? 1 : -1);

  const assessments = HS.assessments().map(a => {
    const score = (Number(a.likelihood) || 0) * (Number(a.severity) || 0);
    const residual = (Number(a.residualLikelihood) || 0) * (Number(a.residualSeverity) || 0);
    const nextReview = new Date(new Date(a.reviewedAt).getTime() + (Number(a.reviewEvery) || 365) * HS_DAY);
    const daysToReview = Math.floor((nextReview - Date.now()) / HS_DAY);
    return Object.assign({}, a, {
      score, band: HS.riskBand(score),
      residual, residualBand: HS.riskBand(residual),
      nextReview: nextReview.toISOString().slice(0, 10),
      daysToReview,
      reviewOverdue: daysToReview < 0
    });
  }).sort((a, b) => a.daysToReview - b.daysToReview);

  /* Actions are held inside incidents; flattened here so they can be worked
     as one list. */
  const actions = [];
  incidents.forEach(i => (i.actions || []).forEach(a => actions.push(Object.assign({}, a, {
    incidentId: i.id, incidentRef: i.reference, incidentTitle: i.description.slice(0, 70),
    location: i.location, severity: i.severity,
    overdue: a.status !== 'Complete' && a.due && new Date(a.due) < Date.now(),
    daysToDue: a.due ? Math.floor((new Date(a.due) - Date.now()) / HS_DAY) : null
  }))));
  actions.sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1);

  return { incidents, assessments, actions, refresh: force, S, HS };
}

/* ---------------- Overview ---------------- */
function SafetyOverview({ data, onView }) {
  const { incidents, assessments, actions, S } = data;

  const last90 = incidents.filter(i => i.daysSince <= 90);
  const injuries = last90.filter(i => i.type === 'Accident' && i.severity !== 'No injury');
  const nearMisses = last90.filter(i => i.type === 'Near miss');
  const riddorDue = incidents.filter(i => i.riddorDue);
  const riddorOverdue = incidents.filter(i => i.riddorOverdue);
  const openActions = actions.filter(a => a.status !== 'Complete');
  const overdueActions = openActions.filter(a => a.overdue);
  const reviewsDue = assessments.filter(a => a.reviewOverdue || a.daysToReview <= 30);
  const highRisk = assessments.filter(a => a.residualBand === 'High' || a.residualBand === 'Intolerable');

  /* Days since the last injury accident — the number every safety board opens
     with, and the one people actually respond to. */
  const lastInjury = incidents.find(i => i.type === 'Accident' && i.severity !== 'No injury');
  const daysSinceInjury = lastInjury ? lastInjury.daysSince : null;

  /* Near-miss to injury ratio: a healthy reporting culture produces many more
     near misses than injuries. A low ratio usually means under-reporting. */
  const ratio = injuries.length ? Math.round(nearMisses.length / injuries.length * 10) / 10 : null;

  const catMap = {};
  last90.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + 1; });
  const catBars = Object.keys(catMap).map(k => ({ label: k.split(',')[0].split(' ')[0].slice(0, 7), value: catMap[k] })).sort((a, b) => b.value - a.value);

  const monthMap = {};
  incidents.filter(i => i.daysSince <= 365).forEach(i => {
    const k = i.date.slice(0, 7);
    monthMap[k] = (monthMap[k] || 0) + 1;
  });
  const monthBars = Object.keys(monthMap).sort().map(k => ({
    label: new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short' }),
    value: monthMap[k]
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Days since last injury" value={daysSinceInjury == null ? '—' : String(daysSinceInjury)} caption={lastInjury ? lastInjury.location : 'No injuries recorded'} icon={<Icon name="ShieldCheck" size={18} />} />
        <StatTile label="RIDDOR outstanding" value={String(riddorDue.length)} caption={riddorOverdue.length ? riddorOverdue.length + ' past deadline' : 'Reportable, not yet sent'} icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Open actions" value={String(openActions.length)} caption={overdueActions.length + ' overdue'} icon={<Icon name="ListChecks" size={18} />} />
        <StatTile label="Reviews due" value={String(reviewsDue.length)} caption="Risk assessments" icon={<Icon name="CalendarClock" size={18} />} />
      </div>

      {riddorDue.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,84,91,.3)', background: 'rgba(242,84,91,.04)' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-danger)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>
            {riddorDue.length} {riddorDue.length === 1 ? 'incident meets' : 'incidents meet'} the RIDDOR reporting criteria and {riddorDue.length === 1 ? 'has' : 'have'} not been marked as reported.
            {riddorOverdue.length > 0 && ' ' + riddorOverdue.length + ' ' + (riddorOverdue.length === 1 ? 'is' : 'are') + ' past the statutory deadline.'}
          </span>
          <Button size="sm" onClick={() => onView('Incidents')}>Review</Button>
        </Card>
      )}

      <div className="hs-split" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <DashboardCard title="Recent incidents" padding={16} action={<Badge tone="dark">{last90.length} in 90 days</Badge>}>
          {incidents.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {incidents.slice(0, 5).map(i => (
                <div key={i.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  border: '1px solid ' + (i.riddorDue ? 'rgba(242,84,91,.26)' : 'var(--border-dark)'),
                  borderRadius: 'var(--radius-md)'
                }}>
                  <span style={{
                    width: 34, height: 34, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i.type === 'Near miss' ? 'rgba(242,180,65,.10)' : 'rgba(242,84,91,.10)',
                    border: '1px solid ' + (i.type === 'Near miss' ? 'rgba(242,180,65,.26)' : 'rgba(242,84,91,.24)'),
                    color: i.type === 'Near miss' ? 'var(--nhr-warning)' : 'var(--nhr-danger)'
                  }}><Icon name={i.type === 'Near miss' ? 'Eye' : 'TriangleAlert'} size={15} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {i.reference} · {i.category}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{i.location} · {i.daysSince}d ago</span>
                  </span>
                  <Badge tone={SEV_TONE[i.severity] || 'dark'}>{i.severity}</Badge>
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No incidents recorded.</span>}
        </DashboardCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DashboardCard title="Reporting culture">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>
                  {ratio == null ? '—' : ratio + ':1'}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>near misses per injury, last 90 days</span>
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                {ratio == null ? 'No injuries in the period, so no ratio to calculate.'
                  : ratio < 3 ? 'A low ratio usually means near misses are going unreported rather than not happening. Injuries are visible; near misses only appear when people feel able to raise them.'
                    : 'Near misses are being reported in reasonable volume, which is what gives you warning before an injury.'}
              </span>
            </div>
          </DashboardCard>
          <DashboardCard title="Incidents by category" action={<Badge tone="dark">90 days</Badge>}>
            {catBars.length ? <BarChart height={140} data={catBars} />
              : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing in the period.</span>}
          </DashboardCard>
        </div>
      </div>

      <div className="hs-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Incidents by month" action={<Badge tone="dark">12 months</Badge>}>
          {monthBars.length ? <BarChart height={160} data={monthBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No incidents in the last year.</span>}
        </DashboardCard>
        <DashboardCard title={'Highest residual risk (' + highRisk.length + ')'} padding={16}
          action={<Button size="xs" variant="secondary" tone="dark" onClick={() => onView('Risk Assessments')}>View all</Button>}>
          {highRisk.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {highRisk.slice(0, 4).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, border: '1px solid rgba(242,84,91,.24)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{a.reference} · {a.location}</span>
                  </span>
                  <Badge tone={RISK_TONE[a.residualBand]}>{a.residualBand} {a.residual}</Badge>
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>No assessment carries a high residual risk after controls.</span>}
        </DashboardCard>
      </div>
    </div>
  );
}

Object.assign(window, { HS_DAY, RISK_TONE, SEV_TONE, SafetySubnav, useSafetyData, SafetyOverview });
