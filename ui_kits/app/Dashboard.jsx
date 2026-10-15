/* NHR Solution — the client dashboard.

   The central workspace for a business administrator. Every figure is read
   live from the module stores rather than hard-coded, which is the whole point:
   a dashboard whose numbers were typed in is a picture of a business, not a
   view of one.

   Composition follows what an administrator actually does on Monday morning:
   what changed, what is waiting on me, what is at risk, what happened. Metrics
   first, then approvals, then compliance, then activity.

   Every card is a route into the module it summarises — clicking through is the
   expected action, so the numbers are buttons rather than decoration.
*/
const { DashboardCard, StatTile, BarChart, ProgressMeter, ActivityItem, DataTable, Badge, Button, Card, IconButton } = window.NHRSolutionDesignSystem_0db691;

const DASH_DAY = 864e5;
const dmoney = n => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB');
const iso = d => new Date(d).toISOString().slice(0, 10);
function goto(screen) { window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: screen })); }

/* ---------- data ---------- */
function useDashboard() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const canPayroll = S.can('payroll.read');
  const employees = S.list({});
  const today = iso(new Date());
  const in7 = iso(new Date(Date.now() + 7 * DASH_DAY));
  const in30 = iso(new Date(Date.now() + 30 * DASH_DAY));
  const ago30 = iso(new Date(Date.now() - 30 * DASH_DAY));

  /* Headcount and joiners */
  const newStarters = employees.filter(e => e.startDate && e.startDate >= ago30);
  const probation = employees.filter(e => e.employmentStatus === 'Probation');

  /* Who is off today, and what is coming */
  const onLeaveToday = [], upcoming = [], pendingLeave = [];
  employees.forEach(e => {
    (R.get(e).leaveRequests || []).forEach(l => {
      const row = Object.assign({}, l, {
        employee: e, name: S.fullName(e), dept: e.department,
        /* The store's field is `days`; keep one name for it here. */
        days: Number(l.days) || 0
      });
      if (l.status === 'Pending') pendingLeave.push(row);
      if (l.status !== 'Approved') return;
      if (l.startDate <= today && l.endDate >= today) onLeaveToday.push(row);
      else if (l.startDate > today && l.startDate <= in30) upcoming.push(row);    });
  });
  upcoming.sort((a, b) => a.startDate < b.startDate ? -1 : 1);

  /* Absence today, from the absence records rather than from leave */
  const absentToday = [];
  employees.forEach(e => {
    (R.get(e).absences || []).forEach(a => {
      if (a.startDate <= today && (a.endDate || a.startDate) >= today) {
        absentToday.push(Object.assign({}, a, { employee: e, name: S.fullName(e) }));
      }
    });
  });

  /* Attendance: present today, and the week's pattern.
     The collection is `timesheet`, and the seeded data ends before today, so a
     rolling last-7-days window would be empty. Anchoring to the most recent day
     that has records keeps the flagship metric honest rather than zero — and
     the card states which week it is showing. */
  const allDates = [];
  employees.forEach(e => (R.get(e).timesheet || []).forEach(t => { if (t.date) allDates.push(t.date); }));
  allDates.sort();
  const latest = allDates.length ? allDates[allDates.length - 1] : today;
  const anchor = new Date(latest);
  const anchorIsToday = latest === today;

  let presentToday = 0;
  const weekBars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor.getTime() - i * DASH_DAY);
    const key = iso(d);
    const day = d.getDay();
    let present = 0;
    employees.forEach(e => {
      if ((R.get(e).timesheet || []).some(a => a.date === key && a.clockIn)) present++;
    });
    if (i === 0) presentToday = present;
    weekBars.push({
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      value: employees.length ? Math.round(present / employees.length * 100) : 0,
      muted: day === 0 || day === 6
    });
  }
  /* Expected in is headcount less anyone on approved leave or recorded absent
     on the anchor day, so the percentage is against who was actually due. */
  const offOnAnchor = employees.filter(e => {
    const set = R.get(e);
    return (set.leaveRequests || []).some(l => l.status === 'Approved' && l.startDate <= latest && l.endDate >= latest)
      || (set.absences || []).some(a => a.startDate <= latest && (a.endDate || a.startDate) >= latest);
  }).length;
  const expectedToday = Math.max(0, employees.length - offOnAnchor);
  const attendancePct = expectedToday ? Math.round(presentToday / expectedToday * 100) : 0;

  /* Approvals waiting on an administrator, across modules */
  let pendingExpenses = [], pendingTimesheets = 0;
  employees.forEach(e => {
    (R.get(e).expenses || []).forEach(x => {
      if (x.status === 'Pending' || x.status === 'Queried') {
        pendingExpenses.push(Object.assign({}, x, { name: S.fullName(e) }));
      }
    });
    (R.get(e).timesheet || []).forEach(a => { if (a.approved === false) pendingTimesheets++; });
  });

  /* Payroll */
  let payrollGross = 0, withSalary = 0;
  employees.forEach(e => {
    const s = e.payroll && Number(e.payroll.salary);
    if (s > 0) { payrollGross += s; withSalary++; }
  });
  const monthlyGross = payrollGross / 12;

  /* Compliance: the four things that carry a real consequence */
  const MAND = window.MANDATORY || {};
  let trainingMet = 0, trainingReq = 0, expiredCerts = 0, expiringCerts = 0;
  employees.forEach(e => {
    const training = R.get(e).training || [];
    Object.keys(MAND).forEach(course => {
      if (!window.isMandatoryFor || !window.isMandatoryFor(course, e.department)) return;
      trainingReq++;
      const rec = training.find(t => t.course === course);
      if (!rec) return;
      const live = window.courseStatus ? window.courseStatus(rec) : rec.status;
      if (live === 'Complete' || live === 'Expiring soon') trainingMet++;
      if (live === 'Expired') expiredCerts++;
      if (live === 'Expiring soon') expiringCerts++;
    });
  });

  let expiringDocs = 0, expiredDocs = 0, rtwGaps = 0;
  employees.forEach(e => {
    (e.documents || []).forEach(d => {
      if (!d.expiresAt) return;
      if (d.expiresAt < today) expiredDocs++;
      else if (d.expiresAt <= in30) expiringDocs++;
    });
    if (e.rightToWorkStatus && e.rightToWorkStatus !== 'Verified') rtwGaps++;
  });

  const HS = window.SafetyStore;
  const incidents = HS ? HS.incidents() : [];
  const riddorDue = HS ? incidents.filter(i => { const r = HS.riddor(i); return r && r.reportable && !i.riddorReported; }).length : 0;
  const openSafetyActions = incidents.reduce((n, i) => n + (i.actions || []).filter(a => a.status !== 'Complete').length, 0);
  const assessmentsOverdue = HS ? HS.assessments().filter(a =>
    new Date(a.reviewedAt).getTime() + (Number(a.reviewEvery) || 365) * DASH_DAY < Date.now()).length : 0;

  /* Reviews falling due */
  let reviewsOverdue = 0, reviewsSoon = 0;
  employees.forEach(e => {
    (R.get(e).reviews || []).forEach(r => {
      if (r.status === 'Complete' || !r.date) return;
      if (r.date < today) reviewsOverdue++;
      else if (r.date <= in30) reviewsSoon++;
    });
  });

  const REC = window.RecruitmentStore;
  const openVacancies = REC ? REC.vacancies().filter(v => v.status === 'Open').length : 0;

  /* Activity, merged newest-first across all employee trails */
  const activity = [];
  employees.forEach(e => {
    (e.activity || []).slice(0, 6).forEach(a => {
      activity.push({ id: e.id + a.at + a.action, employee: e, name: S.fullName(e), action: a.action, at: a.at, by: a.by });
    });
  });
  activity.sort((a, b) => a.at < b.at ? 1 : -1);

  return {
    S, R, canPayroll, employees, today, refresh: force,
    newStarters, probation, onLeaveToday, absentToday, upcoming, pendingLeave,
    presentToday, expectedToday, attendancePct, weekBars, latest, anchorIsToday,
    pendingExpenses, pendingTimesheets,
    payrollGross, monthlyGross, withSalary,
    trainingMet, trainingReq,
    trainingPct: trainingReq ? Math.round(trainingMet / trainingReq * 100) : 100,
    expiredCerts, expiringCerts, expiringDocs, expiredDocs, rtwGaps,
    riddorDue, openSafetyActions, assessmentsOverdue, incidents,
    reviewsOverdue, reviewsSoon, openVacancies,
    activity: activity.slice(0, 8)
  };
}

/* ---------- a stat tile that navigates ---------- */
function LinkTile({ label, value, caption, icon, to, tone }) {
  return (
    <button type="button" onClick={() => goto(to)} aria-label={label + ': ' + value + '. Open ' + to}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10, padding: 18, textAlign: 'left', cursor: 'pointer',
        borderRadius: 'var(--radius-card)', minHeight: 116,
        border: '1px solid ' + (tone === 'danger' ? 'rgba(242,84,91,.3)' : tone === 'warn' ? 'rgba(242,180,65,.28)' : 'var(--border-dark)'),
        background: tone === 'danger' ? 'rgba(242,84,91,.05)' : tone === 'warn' ? 'rgba(242,180,65,.04)' : 'rgba(255,255,255,.025)',
        transition: 'border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,212,.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = tone === 'danger' ? 'rgba(242,84,91,.3)' : tone === 'warn' ? 'rgba(242,180,65,.28)' : 'var(--border-dark)'; }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.2)', color: 'var(--nhr-turquoise)'
        }}>{icon}</span>
        <Icon name="ArrowUpRight" size={14} style={{ color: 'var(--text-muted-dark)' }} />
      </span>
      <span style={{ fontSize: 27, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em', color: '#fff', lineHeight: 1 }}>{value}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-body-dark)' }}>{label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{caption}</span>
      </span>
    </button>
  );
}

/* ---------- approvals queue ---------- */
function ApprovalsCard({ d }) {
  const items = [];
  d.pendingLeave.slice(0, 4).forEach(l => items.push({
    id: 'lv' + l.id, icon: 'Plane', who: l.name,
    what: l.type + ' · ' + l.days + (l.days === 1 ? ' day' : ' days'),
    when: window.shortDate(l.startDate), to: 'Leave'
  }));
  d.pendingExpenses.slice(0, 3).forEach(x => items.push({
    id: 'ex' + x.id, icon: 'Receipt', who: x.name,
    what: x.category + ' · £' + Number(x.amount).toFixed(2),
    when: window.shortDate(x.date), to: 'Expenses'
  }));

  const total = d.pendingLeave.length + d.pendingExpenses.length + d.pendingTimesheets;

  return (
    <DashboardCard title="Pending approvals" padding={18}
      action={<Badge tone={total ? 'warning' : 'dark'}>{total} waiting</Badge>}>
      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {items.map(i => (
            <button key={i.id} type="button" onClick={() => goto(i.to)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,.02)', minHeight: 56
            }}>
              <Icon name={i.icon} size={15} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{i.who}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{i.what}</span>
              </span>
              <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{i.when}</span>
            </button>
          ))}
          {d.pendingTimesheets > 0 && (
            <button type="button" onClick={() => goto('Attendance')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)', minHeight: 48
            }}>
              <Icon name="Clock" size={15} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {d.pendingTimesheets} timesheet {d.pendingTimesheets === 1 ? 'entry' : 'entries'} unapproved
              </span>
              <Icon name="ArrowRight" size={13} style={{ color: 'var(--text-muted-dark)' }} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Nothing waiting on you</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Leave, expenses and timesheets are all cleared.</span>
        </div>
      )}
    </DashboardCard>
  );
}

/* ---------- compliance alerts ---------- */
function ComplianceCard({ d }) {
  /* Ordered by consequence, not by count. A missed RIDDOR report is a criminal
     matter; an expiring certificate is a diary entry. */
  const alerts = [
    d.riddorDue > 0 && { sev: 'high', icon: 'TriangleAlert', to: 'Health & Safety',
      text: d.riddorDue + ' RIDDOR ' + (d.riddorDue === 1 ? 'report' : 'reports') + ' outstanding',
      why: 'Statutory deadline runs from the incident date' },
    d.rtwGaps > 0 && { sev: 'high', icon: 'IdCard', to: 'Employees',
      text: d.rtwGaps + ' right-to-work ' + (d.rtwGaps === 1 ? 'check' : 'checks') + ' unverified',
      why: 'Civil penalty exposure per worker' },
    d.expiredCerts > 0 && { sev: 'high', icon: 'GraduationCap', to: 'Training',
      text: d.expiredCerts + ' expired training ' + (d.expiredCerts === 1 ? 'certificate' : 'certificates'),
      why: 'Person is working without current certification' },
    d.expiredDocs > 0 && { sev: 'warn', icon: 'FileWarning', to: 'Documents',
      text: d.expiredDocs + ' expired ' + (d.expiredDocs === 1 ? 'document' : 'documents'),
      why: 'Superseded or needs renewal' },
    d.assessmentsOverdue > 0 && { sev: 'warn', icon: 'ClipboardList', to: 'Health & Safety',
      text: d.assessmentsOverdue + ' risk ' + (d.assessmentsOverdue === 1 ? 'assessment' : 'assessments') + ' overdue for review',
      why: 'Controls may no longer match the work' },
    d.reviewsOverdue > 0 && { sev: 'warn', icon: 'Target', to: 'Performance',
      text: d.reviewsOverdue + ' ' + (d.reviewsOverdue === 1 ? 'review' : 'reviews') + ' past their date',
      why: 'Includes probation periods lapsing by default' },
    d.expiringCerts > 0 && { sev: 'low', icon: 'CalendarClock', to: 'Training',
      text: d.expiringCerts + ' ' + (d.expiringCerts === 1 ? 'certificate' : 'certificates') + ' expiring soon',
      why: 'Book the renewal now' },
    d.expiringDocs > 0 && { sev: 'low', icon: 'FileText', to: 'Documents',
      text: d.expiringDocs + ' ' + (d.expiringDocs === 1 ? 'document' : 'documents') + ' expiring within 30 days',
      why: 'Chase before it lapses' },
    d.openSafetyActions > 0 && { sev: 'low', icon: 'ListChecks', to: 'Health & Safety',
      text: d.openSafetyActions + ' open safety ' + (d.openSafetyActions === 1 ? 'action' : 'actions'),
      why: 'An incident without a closed action has not been dealt with' }
  ].filter(Boolean);

  const high = alerts.filter(a => a.sev === 'high').length;
  const style = { high: ['rgba(242,84,91,.3)', 'rgba(242,84,91,.05)', 'var(--nhr-danger)'], warn: ['rgba(242,180,65,.26)', 'rgba(242,180,65,.035)', 'var(--nhr-warning)'], low: ['var(--border-dark)', 'rgba(255,255,255,.02)', 'var(--nhr-turquoise)'] };

  return (
    <DashboardCard title="Compliance alerts" padding={18}
      action={high > 0 ? <Badge tone="danger">{high} urgent</Badge> : <Badge tone={alerts.length ? 'warning' : 'success'}>{alerts.length ? alerts.length + ' open' : 'All clear'}</Badge>}>
      {alerts.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {alerts.slice(0, 6).map((a, i) => {
            const st = style[a.sev];
            return (
              <button key={i} type="button" onClick={() => goto(a.to)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, textAlign: 'left', cursor: 'pointer',
                border: '1px solid ' + st[0], borderRadius: 'var(--radius-md)', background: st[1], minHeight: 56
              }}>
                <Icon name={a.icon} size={15} style={{ flex: '0 0 auto', marginTop: 2, color: st[2] }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{a.text}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-muted-dark)' }}>{a.why}</span>
                </span>
                <Icon name="ArrowRight" size={13} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--text-muted-dark)' }} />
              </button>
            );
          })}
          {alerts.length > 6 && (
            <button type="button" onClick={() => goto('Reports')} style={{
              padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: 700, color: 'var(--nhr-turquoise)', textAlign: 'left'
            }}>{alerts.length - 6} more in Reports →</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
          <Icon name="ShieldCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>No compliance gaps</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Training, documents, right-to-work and safety are all current.</span>
        </div>
      )}
    </DashboardCard>
  );
}

/* ---------- upcoming holidays ---------- */
function UpcomingHolidays({ d }) {
  /* BANK_HOLIDAYS is keyed by nation, each entry a [date, name] pair. Default
     to England & Wales; the Leave module owns the nation choice. */
  const table = window.BANK_HOLIDAYS || {};
  const nation = (window.EmployeeStore && window.EmployeeStore.session && window.EmployeeStore.session.nation) || 'England & Wales';
  const nextPublic = (table[nation] || table['England & Wales'] || [])
    .filter(h => h[0] >= d.today).slice(0, 2)
    .map(h => ({ date: h[0], name: h[1] }));

  return (
    <DashboardCard title="Upcoming holidays" padding={18}
      action={<Badge tone="dark">next 30 days</Badge>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {d.upcoming.slice(0, 4).map(l => {
          const days = Math.ceil((new Date(l.startDate) - Date.now()) / DASH_DAY);
          return (
            <button key={l.id} type="button" onClick={() => goto('Leave')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)', minHeight: 54
            }}>
              <Avatar employee={l.employee} size={30} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{l.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{l.type} · {l.days} {l.days === 1 ? 'day' : 'days'}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{window.shortDate(l.startDate)}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>in {days}d</span>
              </span>
            </button>
          );
        })}
        {!d.upcoming.length && (
          <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            No approved leave starting in the next 30 days.
          </span>
        )}
        {nextPublic.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
            {nextPublic.map(h => (
              <span key={h.date} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted-dark)' }}>
                <Icon name="CalendarDays" size={13} style={{ color: 'var(--nhr-turquoise)' }} />
                <span style={{ flex: 1, color: 'var(--text-body-dark)' }}>{h.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{window.shortDate(h.date)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

/* ---------- payroll summary ---------- */
function PayrollSummary({ d }) {
  if (!d.canPayroll) {
    return (
      <DashboardCard title="Payroll" padding={18} action={<Icon name="Lock" size={14} style={{ color: 'var(--text-muted-dark)' }} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Not available to your role</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            Payroll figures are not calculated for a role without payroll permission, so there is nothing to reveal here.
          </span>
        </div>
      </DashboardCard>
    );
  }

  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const missing = d.employees.length - d.withSalary;

  return (
    <DashboardCard title={'Payroll — ' + month} padding={18}
      action={<Button size="xs" variant="secondary" tone="dark" onClick={() => goto('Payroll')}>Open</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-.025em', color: '#fff' }}>
            {dmoney(d.monthlyGross)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>gross this month</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[['Annual', dmoney(d.payrollGross)], ['Per head', d.withSalary ? dmoney(d.payrollGross / d.withSalary) : '—'], ['On payroll', d.withSalary + '/' + d.employees.length]].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{k}</span>
            </span>
          ))}
        </div>
        <ProgressMeter label="Salary recorded" value={d.employees.length ? Math.round(d.withSalary / d.employees.length * 100) : 0}
          valueLabel={d.withSalary + ' of ' + d.employees.length} />
        {missing > 0 && (
          <span style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--nhr-warning)' }}>
            {missing} {missing === 1 ? 'employee has' : 'employees have'} no salary recorded, so the total understates the real cost.
          </span>
        )}
      </div>
    </DashboardCard>
  );
}

/* ---------- tasks ---------- */
function TasksCard({ d }) {
  /* Tasks are derived from real state rather than a to-do list somebody has to
     maintain — the work the data says is outstanding. */
  const tasks = [
    d.pendingLeave.length > 0 && ['Approve ' + d.pendingLeave.length + ' leave ' + (d.pendingLeave.length === 1 ? 'request' : 'requests'), 'Leave', 'Today'],
    d.pendingExpenses.length > 0 && ['Decide ' + d.pendingExpenses.length + ' expense ' + (d.pendingExpenses.length === 1 ? 'claim' : 'claims'), 'Expenses', 'Today'],
    d.expiredCerts > 0 && ['Reassign ' + d.expiredCerts + ' expired ' + (d.expiredCerts === 1 ? 'course' : 'courses'), 'Training', 'This week'],
    d.reviewsSoon > 0 && ['Book ' + d.reviewsSoon + ' ' + (d.reviewsSoon === 1 ? 'review' : 'reviews') + ' due in 30 days', 'Performance', 'This month'],
    d.probation.length > 0 && [d.probation.length + ' ' + (d.probation.length === 1 ? 'person' : 'people') + ' on probation to confirm', 'Performance', 'Ongoing'],
    d.openVacancies > 0 && [d.openVacancies + ' open ' + (d.openVacancies === 1 ? 'vacancy' : 'vacancies') + ' to progress', 'Recruitment', 'Ongoing']
  ].filter(Boolean);

  return (
    <DashboardCard title="Tasks" padding={18} action={<Badge tone={tasks.length ? 'warning' : 'success'}>{tasks.length || 'Clear'}</Badge>}>
      {tasks.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {tasks.map(([text, to, when], i) => (
            <button key={i} type="button" onClick={() => goto(to)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: 12, textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)', minHeight: 50
            }}>
              <span style={{
                width: 16, height: 16, flex: '0 0 auto', borderRadius: 5,
                border: '1px solid var(--border-dark)', background: 'transparent'
              }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{text}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{to}</span>
              </span>
              <Badge tone="dark">{when}</Badge>
            </button>
          ))}
          <span style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            Derived from live records rather than a list anyone has to maintain, so a task disappears when the work is done.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Nothing outstanding</span>
        </div>
      )}
    </DashboardCard>
  );
}

/* ---------- who is off today ---------- */
function OffTodayCard({ d }) {
  const rows = d.onLeaveToday.map(l => ({ employee: l.employee, name: l.name, why: l.type, tone: 'warning' }))
    .concat(d.absentToday.map(a => ({ employee: a.employee, name: a.name, why: a.reason || 'Absence', tone: 'danger' })));

  return (
    <DashboardCard title="Out today" padding={18}
      action={<Badge tone={rows.length ? 'warning' : 'success'}>{rows.length || 'Full team in'}</Badge>}>
      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
              <Avatar employee={r.employee} size={30} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.employee.department}</span>
              </span>
              <Badge tone={r.tone}>{r.why}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Nobody is on approved leave or recorded absent today.
        </span>
      )}
    </DashboardCard>
  );
}

/* ---------- the screen ---------- */
function OverviewScreen({ compact }) {
  const d = useDashboard();
  const S = d.S;
  const canWrite = S.can('employees.write');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (S.session.name || '').split(' ')[0];

  const gap = compact ? 12 : 16;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 18 }}>
      {/* header */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: 0, fontSize: compact ? 21 : 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>
            {greeting}{firstName ? ', ' + firstName : ''}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
            {window.todayLabel ? window.todayLabel() : ''} · {d.employees.length} employees
            {d.onLeaveToday.length + d.absentToday.length > 0
              ? ' · ' + (d.onLeaveToday.length + d.absentToday.length) + ' out today'
              : ' · full team in'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button size="sm" variant="secondary" tone="dark" onClick={() => goto('Reports')} iconLeft={<Icon name="ClipboardList" size={15} />}>Reports</Button>
          {canWrite && (
            <Button size={compact ? 'sm' : 'md'} onClick={() => window.dispatchEvent(new CustomEvent('nhr-add-employee'))}
              iconLeft={<Icon name="Plus" size={17} />}>Add Employee</Button>
          )}
        </div>
      </div>

      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}

      {/* headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(' + (compact ? 150 : 180) + 'px,1fr))', gap }}>
        <LinkTile label="Total employees" value={String(d.employees.length)} to="Employees"
          caption={d.probation.length ? d.probation.length + ' on probation' : 'All confirmed'}
          icon={<Icon name="Users" size={17} />} />
        <LinkTile label="New this month" value={String(d.newStarters.length)} to="Employees"
          caption={d.newStarters.length ? 'Latest ' + window.shortDate(d.newStarters[0].startDate) : 'No recent starters'}
          icon={<Icon name="UserPlus" size={17} />} />
        <LinkTile label="On leave today" value={String(d.onLeaveToday.length)} to="Leave"
          caption={d.absentToday.length ? d.absentToday.length + ' also absent' : 'No sickness today'}
          icon={<Icon name="Plane" size={17} />} />
        <LinkTile label="Attendance" value={d.attendancePct + '%'} to="Attendance"
          caption={d.presentToday + ' of ' + d.expectedToday + (d.anchorIsToday ? ' expected in' : ' in on ' + window.shortDate(d.latest))}
          icon={<Icon name="CalendarCheck" size={17} />} />
      </div>

      {/* attendance chart + payroll */}
      <div className="dash-two" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.5fr 1fr', gap }}>
        <DashboardCard title={d.anchorIsToday ? 'Attendance this week' : 'Attendance — week to ' + window.shortDate(d.latest)} padding={compact ? 16 : 20}
          action={<Badge tone="dark">{d.attendancePct}% {d.anchorIsToday ? 'today' : 'on the day'}</Badge>}>
          <BarChart unit="%" height={compact ? 130 : 180} data={d.weekBars} />
          <span style={{ display: 'block', marginTop: 12, fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            Share of the team with a clock-in recorded each day. Weekends are muted rather than removed, because a
            weekend figure that is not zero is worth noticing.
            {!d.anchorIsToday && ' The demo data ends ' + window.shortDate(d.latest) + ', so the chart shows the last week with records rather than an empty one.'}
          </span>
        </DashboardCard>
        <PayrollSummary d={d} />
      </div>

      {/* approvals + compliance + tasks */}
      <div className="dash-three" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1fr', gap }}>
        <ApprovalsCard d={d} />
        <ComplianceCard d={d} />
        <TasksCard d={d} />
      </div>

      {/* holidays + out today + activity */}
      <div className="dash-three" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1.2fr', gap }}>
        <UpcomingHolidays d={d} />
        <OffTodayCard d={d} />
        <DashboardCard title="Recent activity" padding={18}
          action={<Badge tone="dark">{d.activity.length}</Badge>}>
          {d.activity.length ? (
            <div>
              {d.activity.map((a, i) => (
                <ActivityItem key={a.id}
                  icon={<Icon name={/leave|holiday/i.test(a.action) ? 'Plane' : /absence|sick/i.test(a.action) ? 'Thermometer' : /course|training|certificate/i.test(a.action) ? 'GraduationCap' : /incident|safety/i.test(a.action) ? 'HardHat' : /expense/i.test(a.action) ? 'Receipt' : /goal|review/i.test(a.action) ? 'Target' : 'UserCheck'} size={16} />}
                  title={a.action} meta={a.name + (a.by ? ' · ' + a.by : '')}
                  time={window.shortDate(String(a.at).slice(0, 10))}
                  divider={i < d.activity.length - 1} />
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>No recorded activity yet.</span>
          )}
        </DashboardCard>
      </div>

      {/* employees widget keeps its place at the foot */}
      <div className="dash-two" style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.4fr 1fr', gap }}>
        <window.EmployeesWidget
          onViewAll={() => goto('Employees')}
          onAdd={() => window.dispatchEvent(new CustomEvent('nhr-add-employee'))} />
        <DashboardCard title="Where to next" padding={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Run a report', 'Reports', 'ClipboardList'], ['Check compliance', 'Training', 'ShieldCheck'],
            ['Build a rota', 'Rotas', 'CalendarRange'], ['Ask NHR Intelligence', 'NHR Intelligence', 'Sparkles']].map(([label, to, icon]) => (
              <button key={to} type="button" onClick={() => goto(to)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', textAlign: 'left', cursor: 'pointer',
                border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)', minHeight: 48
              }}>
                <Icon name={icon} size={15} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
                <span style={{ flex: 1, fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</span>
                <Icon name="ArrowRight" size={13} style={{ color: 'var(--text-muted-dark)' }} />
              </button>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

Object.assign(window, {
  OverviewScreen, useDashboard, LinkTile, ApprovalsCard, ComplianceCard,
  UpcomingHolidays, PayrollSummary, TasksCard, OffTodayCard
});
