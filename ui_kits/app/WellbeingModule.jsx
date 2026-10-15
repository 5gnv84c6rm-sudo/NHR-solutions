/* Wellbeing — shared hook, personal check-in and the support directory. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const WB_DAY = 864e5;

function WellbeingSubnav({ view, onSelect, allow, counts }) {
  const items = [['Check In', 'HeartHandshake'], ['Support', 'LifeBuoy'], ['Team Insights', 'ChartColumn'], ['Adjustments', 'Settings2']]
    .filter(([label]) => !allow || allow.indexOf(label) > -1);
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Adjustments' ? counts.reviewsDue : 0;
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
            {n > 0 && <Badge tone="warning">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useWellbeingData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords, W = window.WellbeingStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => W.subscribe(force), []);
  React.useEffect(() => S.subscribe(force), []);

  const employees = S.list({});
  const me = employees.find(e => e.employeeId === S.session.employeeId) || employees[0] || null;
  const checkIns = W.checkIns();
  const adjustments = W.adjustments().map(a => {
    const emp = a.employeeId ? S.get(a.employeeId) : null;
    const days = a.reviewAt ? Math.floor((new Date(a.reviewAt) - Date.now()) / WB_DAY) : null;
    return Object.assign({}, a, {
      employee: emp,
      employeeName: emp ? S.fullName(emp) : 'Not linked to a record',
      daysToReview: days,
      reviewDue: days != null && days <= 14
    });
  });

  /* Workload signals, built only from operational data the platform already
     holds for other purposes: absence frequency, lateness, and annual leave
     left unused. Nothing here is health data. */
  const signals = employees.map(e => {
    const set = R.get(e);
    const bradford = R.bradford ? (R.bradford(e).score || 0) : 0;
    const balance = R.leaveBalance ? R.leaveBalance(e) : { remaining: 0, entitlement: 0, taken: 0 };
    const sheet = (set.timesheet || []);
    const late = sheet.filter(t => t.status === 'Late').length;
    const leaveUsedPct = balance.entitlement ? Math.round(balance.taken / balance.entitlement * 100) : null;
    /* Lateness as a rate, not a count — two late starts means something
       different across 20 recorded days than across 200. */
    const latePct = sheet.length ? Math.round(late / sheet.length * 100) : 0;

    /* Three flags, each from a different direction. One flag is noise; two or
       more is worth a conversation. */
    const flags = [];
    if (bradford >= 50) flags.push('Bradford ' + bradford + ' — frequent short absences');
    if (latePct >= 10) flags.push(late + ' late starts in ' + sheet.length + ' days (' + latePct + '%)');
    if (leaveUsedPct != null && leaveUsedPct < 30) flags.push('Only ' + leaveUsedPct + '% of leave taken');

    return {
      id: e.id, employee: e, name: S.fullName(e), department: e.department,
      bradford, late, latePct, leaveUsedPct,
      leaveRemaining: balance.remaining,
      recordedDays: sheet.length,
      flags
    };
  });

  return { employees, me, checkIns, adjustments, signals, refresh: force, S, R, W };
}

/* ---------------- Check in ---------------- */
function WellbeingCheckIn({ data, onView }) {
  const { me, W, refresh } = data;
  const [answers, setAnswers] = React.useState({});
  const [comment, setComment] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const already = me ? W.checkedInThisWeek(me.id) : false;

  const answeredAll = W.QUESTIONS.every(q => answers[q.id] != null);

  function submit() {
    W.submitCheckIn(me ? me.id : '', me ? me.department : '', answers, comment);
    setSent(true);
    refresh();
  }

  if (sent || already) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card tone="dark" padding="var(--card-padding-lg)" style={{
          display: 'flex', flexDirection: 'column', gap: 13, alignItems: 'flex-start',
          borderColor: 'rgba(0,229,212,.26)', background: 'rgba(0,229,212,.04)'
        }}>
          <Icon name="CircleCheck" size={24} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {sent ? 'Thank you — your check-in was recorded' : 'You have already checked in this week'}
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Your answers were stored against your team and the date, with no link to you. Nobody — including HR and your
            manager — can see how you personally responded. Team figures only appear once at least {W.MIN_GROUP} people
            have replied.
          </span>
          {sent && (
            <Button size="sm" variant="secondary" tone="dark" onClick={() => onView('Support')} iconLeft={<Icon name="LifeBuoy" size={15} />}>
              See what support is available
            </Button>
          )}
        </Card>

        <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Icon name="ShieldCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
            Check-ins ask about work, not health — workload, support, clarity and pressure are things an employer can
            change. If you want to raise something about your health, speak to your manager or use the confidential
            support routes rather than this form.
          </span>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="EyeOff" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          <strong style={{ color: '#fff' }}>This check-in is anonymous.</strong> Your answers are saved against your team
          and this week's date only. There is no individual record, so no one can see your responses — not your manager,
          not HR. Results are reported per team and only once {W.MIN_GROUP} or more people have replied.
        </span>
      </Card>

      {W.QUESTIONS.map((q, qi) => (
        <Card key={q.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, color: '#fff' }}>
            {qi + 1}. {q.label}
          </span>
          <div className="wb-scale" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {W.SCALE.map((label, si) => {
              const value = si + 1;
              const picked = answers[q.id] === (q.invert ? 6 - value : value);
              return (
                <button key={label} type="button"
                  onClick={() => setAnswers(a => Object.assign({}, a, { [q.id]: q.invert ? 6 - value : value }))}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '13px 8px', minHeight: 72, cursor: 'pointer',
                    borderRadius: 'var(--radius-md)', textAlign: 'center',
                    border: '1px solid ' + (picked ? 'rgba(0,229,212,.45)' : 'var(--border-dark)'),
                    background: picked ? 'rgba(0,229,212,.10)' : 'rgba(255,255,255,.02)',
                    color: picked ? '#fff' : 'var(--text-body-dark)',
                    fontFamily: 'var(--font-core)', fontSize: 11.5, lineHeight: 1.35, fontWeight: picked ? 700 : 500,
                    transition: 'all var(--dur-base) var(--ease-out)'
                  }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '1px solid ' + (picked ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
                    background: picked ? 'var(--nhr-turquoise)' : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                  }}>{picked && <Icon name="Check" size={10} style={{ color: '#000' }} />}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextareaField label="Anything else? (optional)" rows={3} value={comment} onChange={setComment}
          placeholder="What would make the biggest difference to your week?" />
        <span style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Comments are shown with the team results and are not attributed. Please avoid naming individuals or including
          anything about your health — an anonymous box is the wrong place for either.
        </span>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button disabled={!answeredAll} onClick={submit} iconLeft={<Icon name="Send" size={15} />}>
          {answeredAll ? 'Submit Anonymously' : 'Answer all ' + W.QUESTIONS.length + ' questions'}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Support directory ---------------- */
function WellbeingSupport({ data, onRequest }) {
  const { W } = data;
  const categories = Array.from(new Set(W.RESOURCES.map(r => r.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,180,65,.26)' }}>
        <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-warning)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          This is a signposting page, not a clinical service. Nothing here is medical advice, and nobody monitors this
          platform out of hours. If you or someone else is at immediate risk, contact emergency services.
        </span>
      </Card>

      {categories.map(cat => (
        <DashboardCard key={cat} title={cat} padding={16}>
          <div className="wb-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
            {W.RESOURCES.filter(r => r.category === cat).map(r => (
              <div key={r.id} style={{
                display: 'flex', flexDirection: 'column', gap: 11, padding: 16,
                border: '1px solid ' + (r.id === 'urgent' ? 'rgba(242,84,91,.26)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: r.id === 'urgent' ? 'rgba(242,84,91,.04)' : 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{
                    width: 34, height: 34, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r.id === 'urgent' ? 'rgba(242,84,91,.10)' : 'rgba(0,229,212,.08)',
                    border: '1px solid ' + (r.id === 'urgent' ? 'rgba(242,84,91,.24)' : 'rgba(0,229,212,.22)'),
                    color: r.id === 'urgent' ? 'var(--nhr-danger)' : 'var(--nhr-turquoise)'
                  }}>
                    <Icon name={r.id === 'urgent' ? 'Phone' : r.id === 'eap' ? 'MessageCircle' : r.id === 'oh' ? 'Stethoscope' : r.id === 'financial' ? 'PiggyBank' : r.id === 'adjust' ? 'Settings2' : 'Users'} size={16} />
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{r.title}</span>
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)', flex: 1 }}>{r.body}</span>
                {r.id === 'adjust' ? (
                  <Button size="sm" onClick={onRequest} iconLeft={<Icon name="Plus" size={14} />}>Request an Adjustment</Button>
                ) : (
                  <Badge tone={r.placeholder ? 'warning' : 'dark'}>{r.action}</Badge>
                )}
              </div>
            ))}
          </div>
        </DashboardCard>
      ))}

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Entries marked as not configured are placeholders. Before this page goes live to staff, each one needs a real
          provider, a real contact route and a named owner — a support directory that leads nowhere is worse than no
          directory, because people stop trusting the next thing you offer.
        </span>
      </Card>
    </div>
  );
}

Object.assign(window, { WB_DAY, WellbeingSubnav, useWellbeingData, WellbeingCheckIn, WellbeingSupport });
