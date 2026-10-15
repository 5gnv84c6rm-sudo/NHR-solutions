/* NHR Solution — NHR Intelligence.

   The intelligent layer over the platform's own data. Two rules shape it:

   1. EVERY INSIGHT SHOWS ITS WORKING. Each one carries the figures it was
      derived from and which module they came from. An insight you cannot check
      is a guess with better typography, and in HR a guess gets acted on.

   2. THE ASSISTANT IS GROUNDED, NOT GENERATIVE ABOUT FACTS. It answers from a
      snapshot of live platform figures passed in as context. Where the model is
      unavailable it falls back to the same retrieval, so the numbers are
      identical either way — the model changes the wording, never the data.

   What it is deliberately not given: individual wellbeing responses (they do
   not exist — check-ins are anonymous), absence reasons, notes, and payroll
   where the reader lacks permission. The assistant inherits the reader's
   permissions rather than working around them.

   Nothing here is legal, medical or financial advice, and the UI says so at
   the point of output rather than in a footer nobody reads.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const AI_DAY = 864e5;

function IntelligenceSubnav({ view, onSelect, counts }) {
  const items = [['Insights', 'Sparkles'], ['Assistant', 'MessageCircle'], ['Ask the Data', 'Database']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Insights' ? counts.priority : 0;
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

/* A small, explicit marker. Used on everything the model wrote, and never on
   anything derived from the data directly — the distinction only means
   something if it is applied consistently. */
function AILabel({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
      borderRadius: 999, background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.28)',
      color: 'var(--nhr-turquoise)', fontFamily: 'var(--font-core)', fontSize: 10.5,
      fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap'
    }}>
      <Icon name="Sparkles" size={11} />{children || 'AI generated'}
    </span>
  );
}

/* ---------------- Insight engine ----------------
   Insights are computed, not predicted. Each returns the numbers behind it so
   the card can show its working, and a confidence grounded in how much data
   supports it rather than in how confident the sentence sounds. */
function buildInsights(a) {
  const { S, R } = a;
  const out = [];
  const push = i => { if (i) out.push(i); };

  function confidence(n, strong) {
    if (n >= strong) return 'High';
    if (n >= Math.ceil(strong / 2)) return 'Medium';
    return 'Low';
  }

  /* Training compliance gaps — the largest single compliance exposure. */
  if (a.mandatoryRequired > 0 && a.trainingRate < 90) {
    const missing = a.mandatoryRequired - a.mandatoryMet;
    push({
      id: 'training', severity: a.trainingRate < 60 ? 'high' : 'medium',
      module: 'Training', icon: 'GraduationCap',
      title: 'Mandatory training is ' + a.trainingRate + '% complete',
      body: missing + ' required ' + (missing === 1 ? 'course is' : 'courses are') + ' outstanding across the business'
        + (a.expiredCerts ? ', and ' + a.expiredCerts + ' ' + (a.expiredCerts === 1 ? 'certificate has' : 'certificates have') + ' expired' : '') + '.',
      working: [
        ['Required course records', a.mandatoryRequired],
        ['Met or expiring soon', a.mandatoryMet],
        ['Expired certificates', a.expiredCerts]
      ],
      action: 'Open Training → Compliance to assign the gaps in one pass.',
      confidence: confidence(a.mandatoryRequired, 20)
    });
  }

  /* RIDDOR is time-bound, so it outranks everything else when outstanding. */
  if (a.riddorDue > 0) {
    push({
      id: 'riddor', severity: 'high', module: 'Health & Safety', icon: 'TriangleAlert',
      title: a.riddorDue + ' RIDDOR ' + (a.riddorDue === 1 ? 'report is' : 'reports are') + ' outstanding',
      body: 'These meet the reporting criteria and have not been marked as reported. RIDDOR deadlines run from the date of the incident, not from when someone noticed.',
      working: [
        ['Incidents on record', a.incidents.length],
        ['Reportable, not sent', a.riddorDue],
        ['Open corrective actions', a.openActions]
      ],
      action: 'Open Health & Safety → Incidents, submit on the HSE site, then record it.',
      confidence: 'High'
    });
  }

  /* Absence: compare each department against the company rate rather than a
     national benchmark, because the comparison you can act on is internal. */
  const deptAbsence = S.DEPARTMENTS.map(d => {
    const list = a.employees.filter(e => e.department === d);
    if (!list.length) return null;
    let days = 0;
    const cutoff = new Date(Date.now() - a.windowDays * AI_DAY).toISOString().slice(0, 10);
    list.forEach(e => (R.get(e).absences || []).forEach(x => { if (x.startDate >= cutoff) days += Number(x.days) || 0; }));
    const available = list.length * Math.round(a.windowDays / 7 * 5);
    return { dept: d, headcount: list.length, days, rate: available ? Math.round(days / available * 1000) / 10 : 0 };
  }).filter(Boolean);
  const worstAbsence = deptAbsence.slice().sort((x, y) => y.rate - x.rate)[0];
  if (worstAbsence && worstAbsence.rate > a.absenceRate * 1.5 && worstAbsence.days > 0) {
    push({
      id: 'absence', severity: 'medium', module: 'Absence', icon: 'Thermometer',
      title: worstAbsence.dept + ' absence is running above the company rate',
      body: worstAbsence.rate + '% against ' + a.absenceRate + '% company-wide over the last '
        + Math.round(a.windowDays / 7) + ' weeks. With ' + worstAbsence.headcount
        + (worstAbsence.headcount === 1 ? ' person' : ' people') + ' in the team, one individual moves this figure a long way.',
      working: [
        ['Team absence rate', worstAbsence.rate + '%'],
        ['Company rate', a.absenceRate + '%'],
        ['Absence days in window', worstAbsence.days],
        ['Team headcount', worstAbsence.headcount]
      ],
      action: 'Open Absence to see the pattern before drawing a conclusion about the team.',
      confidence: confidence(worstAbsence.headcount, 8)
    });
  }

  /* Leave hoarding: a real operational risk, both for burnout and for the
     year-end crunch. */
  const lowLeave = a.employees.filter(e => {
    const bal = R.leaveBalance ? R.leaveBalance(e) : null;
    return bal && bal.entitlement && (bal.taken / bal.entitlement) < 0.3;
  });
  if (lowLeave.length >= 2) {
    push({
      id: 'leave', severity: 'medium', module: 'Leave', icon: 'CalendarDays',
      title: lowLeave.length + ' people have taken under 30% of their leave',
      body: a.leaveRemaining + ' days are untaken across the team'
        + (a.canPayroll ? ', worth roughly ' + window.money0(a.leaveLiability) + ' as an accrued liability' : '')
        + '. Leave that stacks up becomes a staffing problem at year end and a wellbeing one before that.',
      working: [
        ['People under 30% used', lowLeave.length],
        ['Total days untaken', a.leaveRemaining]
      ].concat(a.canPayroll ? [['Estimated liability', window.money0(a.leaveLiability)]] : []),
      action: 'Open Leave to see who, and prompt bookings before the year end.',
      confidence: confidence(a.employees.length, 10)
    });
  }

  /* Recruitment stalls — candidates leave when nothing happens. */
  const REC = window.RecruitmentStore;
  if (REC) {
    const stalled = REC.candidates().filter(c => {
      if (REC.STAGES.indexOf(c.stage) < 0) return false;
      return Math.floor((Date.now() - new Date(c.movedAt || c.appliedAt)) / AI_DAY) > 14;
    });
    if (stalled.length > 0) {
      push({
        id: 'pipeline', severity: 'medium', module: 'Recruitment', icon: 'UserPlus',
        title: stalled.length + ' ' + (stalled.length === 1 ? 'candidate has' : 'candidates have') + ' been in the same stage over a fortnight',
        body: 'Good candidates accept other offers while they wait. ' + a.vacancies.length + ' '
          + (a.vacancies.length === 1 ? 'vacancy is' : 'vacancies are') + ' currently open.',
        working: [
          ['Stalled candidates', stalled.length],
          ['Open vacancies', a.vacancies.length],
          ['Average time to hire', a.timeToHire == null ? 'No hires yet' : a.timeToHire + ' days']
        ],
        action: 'Open Recruitment → Pipeline and move or close each one.',
        confidence: confidence(REC.candidates().length, 10)
      });
    }
  }

  /* Wellbeing: reported only where the source module would report it. */
  if (a.wellbeingScore != null && a.wellbeingScore < 3.2) {
    push({
      id: 'wellbeing', severity: 'medium', module: 'Wellbeing', icon: 'HeartHandshake',
      title: 'Wellbeing check-in average is ' + a.wellbeingScore + ' out of 5',
      body: 'This is the anonymous team average across the last ' + Math.round(a.windowDays / 7)
        + ' weeks. Individual responses do not exist, so there is nobody to follow up with — the response is a team conversation, not a list of names.',
      working: [['Company average', a.wellbeingScore + '/5']],
      action: 'Open Wellbeing → Team Insights for the per-question breakdown.',
      confidence: 'Medium'
    });
  }

  /* Probation reviews falling due — cheap to fix, expensive to miss. */
  const probation = a.employees.filter(e => e.employmentStatus === 'Probation');
  const probationSoon = probation.filter(e => {
    if (!e.probationEndDate) return false;
    const d = Math.floor((new Date(e.probationEndDate) - Date.now()) / AI_DAY);
    return d <= 30;
  });
  if (probationSoon.length > 0) {
    push({
      id: 'probation', severity: 'low', module: 'Performance', icon: 'UserCheck',
      title: probationSoon.length + ' probation ' + (probationSoon.length === 1 ? 'period ends' : 'periods end') + ' within 30 days',
      body: 'A probation period that quietly lapses usually means the employee passes by default, which removes the point of having one.',
      working: [
        ['On probation', probation.length],
        ['Ending within 30 days', probationSoon.length]
      ],
      action: 'Open Performance → Reviews and book the conversations.',
      confidence: 'High'
    });
  }

  /* Expenses waiting on a decision. */
  if (a.expensePending >= 3) {
    push({
      id: 'expenses', severity: 'low', module: 'Expenses', icon: 'Receipt',
      title: a.expensePending + ' expense claims are waiting for a decision',
      body: 'People fund these from their own account until they are paid. Slow approval is a quiet source of resentment that never shows up in a survey.',
      working: [
        ['Claims awaiting decision', a.expensePending],
        ['Spend in window', window.money0(a.expenseSpend)]
      ],
      action: 'Open Expenses → Approvals; straightforward claims can be cleared in bulk.',
      confidence: 'High'
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((x, y) => order[x.severity] - order[y.severity]);
}

/* A compact factual snapshot for the assistant. Only figures the current role
   is entitled to see, and nothing at individual level beyond names already
   visible in their directory scope. */
function buildContext(a) {
  const lines = [
    'Headcount: ' + a.employees.length,
    'Joiners in last 12 months: ' + a.joiners.length,
    'Leavers in last 12 months: ' + a.recentLeavers.length,
    'Turnover: ' + a.turnover + '% (leavers over average headcount ' + a.avgHeadcount + ')',
    'Absence rate last ' + Math.round(a.windowDays / 7) + ' weeks: ' + a.absenceRate + '% (' + a.absenceDays + ' days of ' + a.availableDays + ' available)',
    'Average Bradford score: ' + a.bradfordAvg + '; employees at or above 50: ' + a.bradfordHigh,
    'Annual leave untaken: ' + a.leaveRemaining + ' days',
    'Mandatory training: ' + a.mandatoryMet + ' of ' + a.mandatoryRequired + ' met (' + a.trainingRate + '%); expired certificates: ' + a.expiredCerts,
    'Safety: ' + a.incidents.length + ' incidents recorded, ' + a.riddorDue + ' RIDDOR reports outstanding, ' + a.openActions + ' open corrective actions, ' + a.assessmentsOverdue + ' risk assessments overdue for review',
    'Recruitment: ' + a.vacancies.length + ' open vacancies, ' + a.candidates.length + ' candidates, average time to hire ' + (a.timeToHire == null ? 'not yet measurable' : a.timeToHire + ' days'),
    'Expenses: ' + window.money0(a.expenseSpend) + ' in the last ' + Math.round(a.windowDays / 7) + ' weeks, ' + a.expensePending + ' claims awaiting a decision',
    'Wellbeing check-in average: ' + (a.wellbeingScore == null ? 'withheld — too few responses to report' : a.wellbeingScore + ' out of 5')
  ];
  if (a.canPayroll) {
    lines.push('Total annual salary cost: ' + window.money0(a.payrollTotal));
    lines.push('Accrued untaken leave liability: ' + window.money0(a.leaveLiability));
  } else {
    lines.push('Payroll figures: not available to this user.');
  }
  const byDept = a.S.DEPARTMENTS.map(d => {
    const n = a.employees.filter(e => e.department === d).length;
    return n ? d + ' ' + n : null;
  }).filter(Boolean).join(', ');
  lines.push('Headcount by department: ' + byDept);
  return lines.join('\n');
}

Object.assign(window, { AI_DAY, IntelligenceSubnav, AILabel, buildInsights, buildContext });
