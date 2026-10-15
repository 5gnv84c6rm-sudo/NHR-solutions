/* NHR Solution — Training module (company-wide).

   The per-employee Training tab shows one person's courses; this screen is the
   compliance view across everyone: who is missing mandatory training, what is
   expiring, and where the gaps sit by department.

   Course records live in EmployeeRecords ('training'), the same store the
   employee tab writes to, so assigning a course here appears on the person's
   profile immediately.

   Mandatory courses are defined once below. A course is mandatory either for
   everyone or for named departments — that is what turns a course library into
   a compliance position, because a missing record is only a gap if the course
   was required in the first place.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const TRN_DAY = 864e5;
const TRN_TONE = { Complete: 'success', 'In progress': 'warning', 'Not started': 'dark', Expired: 'danger', 'Expiring soon': 'warning' };

/* Renewal window — a certificate inside this many days of expiry needs booking. */
const EXPIRY_WARNING_DAYS = 60;

/* Which courses are required, and of whom. Editable in one place. */
const MANDATORY = {
  'Fire Safety Awareness': { scope: 'all', renewEvery: 365 },
  'Manual Handling': { scope: ['Warehouse', 'Operations'], renewEvery: 1095 },
  'GDPR and Data Protection': { scope: 'all', renewEvery: 730 },
  'Equality, Diversity and Inclusion': { scope: 'all', renewEvery: 730 },
  'Safeguarding Level 1': { scope: ['People', 'Support'], renewEvery: 1095 },
  'First Aid at Work': { scope: ['Warehouse', 'Operations'], renewEvery: 1095 },
  'Cyber Security Basics': { scope: 'all', renewEvery: 365 }
};

function isMandatoryFor(courseName, department) {
  const m = MANDATORY[courseName];
  if (!m) return false;
  return m.scope === 'all' || m.scope.indexOf(department) > -1;
}

/* A completed course with a past expiry date is expired, whatever the stored
   status says — the same derivation used for documents and reviews. */
function courseStatus(rec) {
  if (rec.status !== 'Complete') return rec.status || 'Not started';
  if (!rec.expiresAt) return 'Complete';
  const days = Math.floor((new Date(rec.expiresAt) - Date.now()) / TRN_DAY);
  if (days < 0) return 'Expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'Expiring soon';
  return 'Complete';
}

function TrainingSubnav({ view, onSelect, counts }) {
  const items = [['Overview', 'LayoutDashboard'], ['Compliance', 'ShieldCheck'], ['Courses', 'GraduationCap'], ['Renewals', 'CalendarClock']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Compliance' ? counts.gaps : label === 'Renewals' ? counts.renewals : 0;
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

function useTrainingData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const records = [];
  employees.forEach(e => {
    (R.get(e).training || []).forEach(t => {
      const live = courseStatus(t);
      records.push(Object.assign({}, t, {
        employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
        department: e.department, employee: e,
        liveStatus: live,
        mandatory: isMandatoryFor(t.course, e.department),
        daysToExpiry: t.expiresAt ? Math.floor((new Date(t.expiresAt) - Date.now()) / TRN_DAY) : null
      }));
    });
  });

  /* Gaps: a mandatory course with no record at all for that employee. Missing
     records are the ones that never show up in a course list, so they have to
     be derived from the requirement rather than the data. */
  const gaps = [];
  employees.forEach(e => {
    Object.keys(MANDATORY).forEach(course => {
      if (!isMandatoryFor(course, e.department)) return;
      const has = records.some(r => r.employeeKey === e.id && r.course === course);
      if (!has) gaps.push({ employee: e, employeeKey: e.id, employeeName: S.fullName(e), department: e.department, course });
    });
  });

  const courseNames = Array.from(new Set(records.map(r => r.course).concat(Object.keys(MANDATORY)))).sort();

  return { employees, records, gaps, courseNames, refresh: force, S, R };
}

/* ---------------- Overview ---------------- */
function TrainingOverview({ data, onView }) {
  const { employees, records, gaps } = data;

  const mandatoryRecs = records.filter(r => r.mandatory);
  const compliant = mandatoryRecs.filter(r => r.liveStatus === 'Complete' || r.liveStatus === 'Expiring soon');
  const expired = records.filter(r => r.liveStatus === 'Expired');
  const expiring = records.filter(r => r.liveStatus === 'Expiring soon');
  const inProgress = records.filter(r => r.liveStatus === 'In progress');

  /* Required = every mandatory record plus every gap. Compliance is what share
     of the requirement is actually met. */
  const required = mandatoryRecs.length + gaps.length;
  const rate = required ? Math.round(compliant.length / required * 100) : 100;

  /* Per-employee compliance, so the worst records surface first. */
  const perPerson = employees.map(e => {
    const mine = mandatoryRecs.filter(r => r.employeeKey === e.id);
    const myGaps = gaps.filter(g => g.employeeKey === e.id);
    const ok = mine.filter(r => r.liveStatus === 'Complete' || r.liveStatus === 'Expiring soon').length;
    const need = mine.length + myGaps.length;
    return {
      id: e.id, employee: e, name: window.EmployeeStore.fullName(e), department: e.department,
      ok, need, outstanding: need - ok,
      pct: need ? Math.round(ok / need * 100) : 100
    };
  }).sort((a, b) => a.pct - b.pct);

  const deptMap = {};
  perPerson.forEach(p => {
    const d = deptMap[p.department] || (deptMap[p.department] = { ok: 0, need: 0 });
    d.ok += p.ok; d.need += p.need;
  });
  const deptBars = Object.keys(deptMap).map(k => ({
    label: k.slice(0, 6),
    value: deptMap[k].need ? Math.round(deptMap[k].ok / deptMap[k].need * 100) : 100
  })).sort((a, b) => a.value - b.value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Mandatory compliance" value={rate + '%'} caption={compliant.length + ' of ' + required + ' met'} icon={<Icon name="ShieldCheck" size={18} />} />
        <StatTile label="Not on record" value={String(gaps.length)} caption="Required, never assigned" icon={<Icon name="CircleAlert" size={18} />} />
        <StatTile label="Expired" value={String(expired.length)} caption="Certificate out of date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Expiring soon" value={String(expiring.length)} caption={'Within ' + EXPIRY_WARNING_DAYS + ' days'} icon={<Icon name="CalendarClock" size={18} />} />
      </div>

      {(expired.length > 0 || gaps.length > 0) && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,84,91,.28)' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-danger)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 230, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>
            {gaps.length > 0 && gaps.length + ' mandatory ' + (gaps.length === 1 ? 'course has' : 'courses have') + ' never been assigned. '}
            {expired.length > 0 && expired.length + ' ' + (expired.length === 1 ? 'certificate is' : 'certificates are') + ' out of date.'}
          </span>
          <Button size="sm" onClick={() => onView('Compliance')}>Review Gaps</Button>
        </Card>
      )}

      <div className="trn-split" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <DashboardCard title="Lowest compliance" padding={16} action={<Badge tone="dark">{perPerson.filter(p => p.outstanding > 0).length} with gaps</Badge>}>
          {perPerson.filter(p => p.outstanding > 0).length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {perPerson.filter(p => p.outstanding > 0).slice(0, 6).map(p => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar employee={p.employee} size={32} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{p.department}</span>
                    </span>
                    <Badge tone={p.pct < 50 ? 'danger' : 'warning'}>{p.outstanding} outstanding</Badge>
                  </div>
                  <ProgressMeter label={p.ok + ' of ' + p.need + ' mandatory courses'} value={p.pct} valueLabel={p.pct + '%'} />
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>Every employee is up to date on their mandatory training.</span>}
        </DashboardCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DashboardCard title="Compliance by department" action={<Badge tone="dark">%</Badge>}>
            {deptBars.length ? <BarChart unit="%" height={150} data={deptBars} />
              : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No mandatory training defined.</span>}
          </DashboardCard>
          <DashboardCard title="Activity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ProgressMeter label="Courses complete" value={records.length ? Math.round(records.filter(r => r.status === 'Complete').length / records.length * 100) : 0}
                valueLabel={records.filter(r => r.status === 'Complete').length + '/' + records.length} />
              <ProgressMeter label="In progress" value={records.length ? Math.round(inProgress.length / records.length * 100) : 0}
                valueLabel={String(inProgress.length)} />
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                {records.length} course {records.length === 1 ? 'record' : 'records'} across {employees.length} employees.
              </span>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  TRN_DAY, TRN_TONE, EXPIRY_WARNING_DAYS, MANDATORY,
  isMandatoryFor, courseStatus, TrainingSubnav, useTrainingData, TrainingOverview
});
