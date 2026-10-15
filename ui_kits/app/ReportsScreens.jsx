/* Reports & Analytics — report library, custom builder, headcount view, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* Report definitions. Each builds its own rows from the live stores, so a
   report cannot drift from the module it reports on. `requires` gates a report
   behind a permission; `note` states the definition being used, because a
   number without its definition is not a report. */
function reportLibrary(a) {
  const { S, R } = a;
  const employees = a.employees;
  const cutoff = new Date(Date.now() - a.windowDays * window.RP_DAY).toISOString().slice(0, 10);

  return [
    {
      id: 'directory', name: 'Employee directory', category: 'People',
      description: 'Every employee in your scope with role, department, start date and status.',
      note: 'Scope follows your role — Managers see their team, Employees see themselves.',
      columns: [
        { label: 'Reference', key: 'ref' }, { label: 'Name', key: 'name' }, { label: 'Job title', key: 'job' },
        { label: 'Department', key: 'dept' }, { label: 'Location', key: 'loc' }, { label: 'Type', key: 'type' },
        { label: 'Status', key: 'status' }, { label: 'Start date', key: 'start' }
      ],
      rows: () => employees.map(e => ({
        ref: e.employeeId, name: S.fullName(e), job: e.jobTitle, dept: e.department,
        loc: e.location, type: e.employmentType, status: e.employmentStatus, start: e.startDate
      }))
    },
    {
      id: 'starters', name: 'Starters and leavers', category: 'People',
      description: 'Joiners and leavers over the last 12 months, with turnover on the standard basis.',
      note: 'Turnover = leavers ÷ average headcount for the period. Leavers are archived records.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Department', key: 'dept' },
        { label: 'Movement', key: 'movement' }, { label: 'Date', key: 'date' }
      ],
      rows: () => a.joiners.map(e => ({
        name: S.fullName(e), dept: e.department, movement: 'Joined', date: e.startDate
      })).concat(a.recentLeavers.map(e => ({
        name: S.fullName(e), dept: e.department, movement: 'Left', date: (e.updatedAt || '').slice(0, 10)
      }))).sort((x, y) => x.date < y.date ? 1 : -1)
    },
    {
      id: 'absence', name: 'Absence and Bradford', category: 'Absence',
      description: 'Absence days, spells and Bradford score per employee, with the trigger band.',
      note: 'Bradford = spells² × total days. Bands are a trigger for a conversation, not grounds for action.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Department', key: 'dept' },
        { label: 'Spells', key: 'spells' }, { label: 'Days', key: 'days' },
        { label: 'Bradford', key: 'score' }, { label: 'Band', key: 'band' }
      ],
      rows: () => employees.map(e => {
        const b = R.bradford ? R.bradford(e) : { score: 0, spells: 0, days: 0, band: 'None' };
        return { name: S.fullName(e), dept: e.department, spells: b.spells, days: b.days, score: b.score, band: b.band };
      }).sort((x, y) => y.score - x.score)
    },
    {
      id: 'leave', name: 'Leave liability', category: 'Absence',
      description: 'Entitlement, days taken and untaken balance per employee.',
      note: a.canPayroll ? 'Cost values untaken days at salary ÷ 260 working days.' : 'Cost column omitted — your role cannot read payroll.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Department', key: 'dept' },
        { label: 'Entitlement', key: 'ent' }, { label: 'Taken', key: 'taken' }, { label: 'Remaining', key: 'rem' }
      ].concat(a.canPayroll ? [{ label: 'Estimated cost', key: 'cost' }] : []),
      rows: () => employees.map(e => {
        const bal = R.leaveBalance ? R.leaveBalance(e) : { entitlement: 0, taken: 0, remaining: 0 };
        const salary = (e.payroll && Number(e.payroll.salary)) || 0;
        const row = {
          name: S.fullName(e), dept: e.department,
          ent: bal.entitlement, taken: bal.taken, rem: bal.remaining
        };
        if (a.canPayroll) row.cost = salary ? Math.round(salary / 260 * bal.remaining) : '';
        return row;
      }).sort((x, y) => y.rem - x.rem)
    },
    {
      id: 'training', name: 'Mandatory training compliance', category: 'Compliance',
      description: 'Every required course per employee and its live status, including gaps never assigned.',
      note: 'A course with no record shows as Not assigned — the gap only exists because the requirement is defined.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Department', key: 'dept' },
        { label: 'Course', key: 'course' }, { label: 'Status', key: 'status' },
        { label: 'Completed', key: 'done' }, { label: 'Expires', key: 'exp' }
      ],
      rows: () => {
        const out = [];
        const MAND = window.MANDATORY || {};
        employees.forEach(e => {
          const training = R.get(e).training || [];
          Object.keys(MAND).forEach(course => {
            if (!window.isMandatoryFor || !window.isMandatoryFor(course, e.department)) return;
            const rec = training.find(t => t.course === course);
            out.push({
              name: S.fullName(e), dept: e.department, course,
              status: rec ? (window.courseStatus ? window.courseStatus(rec) : rec.status) : 'Not assigned',
              done: rec ? (rec.completedAt || '') : '', exp: rec ? (rec.expiresAt || '') : ''
            });
          });
        });
        return out.sort((x, y) => x.status === y.status ? 0 : x.status === 'Not assigned' ? -1 : 1);
      }
    },
    {
      id: 'incidents', name: 'Incidents and RIDDOR', category: 'Compliance',
      description: 'Every recorded incident with its reportability and whether the report has been made.',
      note: 'Reportability is derived from severity, type and days off — not from a manual flag.',
      columns: [
        { label: 'Reference', key: 'ref' }, { label: 'Date', key: 'date' }, { label: 'Type', key: 'type' },
        { label: 'Category', key: 'cat' }, { label: 'Severity', key: 'sev' }, { label: 'Location', key: 'loc' },
        { label: 'RIDDOR', key: 'rid' }, { label: 'Reported', key: 'sent' }, { label: 'Investigation', key: 'inv' }
      ],
      rows: () => {
        const HS = window.SafetyStore;
        if (!HS) return [];
        return HS.incidents().map(i => {
          const r = HS.riddor(i);
          return {
            ref: i.reference, date: i.date, type: i.type, cat: i.category, sev: i.severity, loc: i.location,
            rid: r ? (r.reportable ? 'Reportable' : 'Record only') : 'Not reportable',
            sent: i.riddorReported ? i.riddorReportedAt : '', inv: i.investigation.status
          };
        });
      }
    },
    {
      id: 'payroll', name: 'Payroll cost summary', category: 'Pay', requires: 'payroll.read',
      description: 'Salary by employee and department, with employer cost estimate.',
      note: 'Employer cost adds 15% as an illustrative allowance for NI and pension — replace with your real rates.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Department', key: 'dept' },
        { label: 'Salary', key: 'salary' }, { label: 'Estimated employer cost', key: 'cost' }
      ],
      rows: () => employees.map(e => {
        const salary = (e.payroll && Number(e.payroll.salary)) || 0;
        return {
          name: S.fullName(e), dept: e.department,
          salary: salary || '', cost: salary ? Math.round(salary * 1.15) : ''
        };
      }).sort((x, y) => (y.salary || 0) - (x.salary || 0))
    },
    {
      id: 'expenses', name: 'Expense claims', category: 'Pay',
      description: 'Claims in the reporting window with status, category and decision.',
      note: 'Rejected claims are included here but excluded from spend totals on the dashboard.',
      columns: [
        { label: 'Name', key: 'name' }, { label: 'Date', key: 'date' }, { label: 'Category', key: 'cat' },
        { label: 'Description', key: 'desc' }, { label: 'Amount', key: 'amount' },
        { label: 'Receipt', key: 'rec' }, { label: 'Status', key: 'status' }
      ],
      rows: () => {
        const out = [];
        employees.forEach(e => (R.get(e).expenses || []).forEach(x => {
          if (x.date < cutoff) return;
          out.push({
            name: S.fullName(e), date: x.date, cat: x.category, desc: x.description,
            amount: Number(x.amount).toFixed(2), rec: x.receipt ? 'Yes' : 'No', status: x.status
          });
        }));
        return out.sort((p, q) => p.date < q.date ? 1 : -1);
      }
    },
    {
      id: 'recruitment', name: 'Recruitment pipeline', category: 'People',
      description: 'Candidates by vacancy and stage, with source and rating.',
      note: 'Candidate data is personal data with a short retention period — delete exports when finished with them.',
      columns: [
        { label: 'Candidate', key: 'name' }, { label: 'Vacancy', key: 'vac' }, { label: 'Stage', key: 'stage' },
        { label: 'Source', key: 'source' }, { label: 'Rating', key: 'rating' }, { label: 'Applied', key: 'applied' }
      ],
      rows: () => {
        const REC = window.RecruitmentStore;
        if (!REC) return [];
        const vacs = {};
        REC.vacancies().forEach(v => { vacs[v.id] = v; });
        return REC.candidates().map(c => ({
          name: c.firstName + ' ' + c.lastName,
          vac: vacs[c.vacancyId] ? vacs[c.vacancyId].title : 'Unassigned',
          stage: c.stage, source: c.source, rating: c.rating || '', applied: c.appliedAt
        }));
      }
    },
    {
      id: 'wellbeing', name: 'Wellbeing by team', category: 'Wellbeing',
      description: 'Anonymous check-in averages per team, suppressed below the reporting threshold.',
      note: 'Teams with fewer than 5 responses return no figure. The export carries the same suppression.',
      columns: [
        { label: 'Team', key: 'team' }, { label: 'Headcount', key: 'head' },
        { label: 'Responses', key: 'responses' }, { label: 'Score', key: 'score' }
      ],
      rows: () => {
        const W = window.WellbeingStore;
        if (!W) return [];
        const all = W.checkIns().filter(c => c.date >= cutoff);
        return S.DEPARTMENTS.map(d => {
          const list = all.filter(c => c.department === d);
          const head = employees.filter(e => e.department === d).length;
          const score = W.overall(list);
          return {
            team: d, head, responses: list.length,
            score: score == null ? 'Suppressed (under ' + W.MIN_GROUP + ')' : score
          };
        }).filter(r => r.head > 0 || r.responses > 0);
      }
    }
  ];
}

/* ---------------- Report library ---------------- */
function ReportList({ a }) {
  const { S } = a;
  const [cat, setCat] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const all = reportLibrary(a).filter(r => !r.requires || S.can(r.requires));
  const blocked = reportLibrary(a).filter(r => r.requires && !S.can(r.requires));
  const categories = Array.from(new Set(all.map(r => r.category)));
  const list = all.filter(r => cat === 'All' || r.category === cat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Reports available" value={String(all.length)} caption={categories.length + ' categories'} icon={<Icon name="FileBarChart" size={18} />} />
        <StatTile label="Restricted" value={String(blocked.length)} caption="Blocked by your role" icon={<Icon name="Lock" size={18} />} />
        <StatTile label="Employees in scope" value={String(a.employees.length)} caption="Follows your role" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Reporting window" value={Math.round(a.windowDays / 7) + ' weeks'} caption="For dated reports" icon={<Icon name="CalendarRange" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All'].concat(categories).map(k => (
            <button key={k} type="button" onClick={() => setCat(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (cat === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: cat === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: cat === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: cat === k ? 700 : 600
            }}>{k}</button>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(r => {
          const rows = open === r.id ? r.rows() : null;
          return (
            <Card key={r.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{
                  width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name="FileBarChart" size={18} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 210 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{r.name}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>{r.description}</span>
                </span>
                <Badge tone="dark">{r.category}</Badge>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? 'Close' : 'Run'}
                  </Button>
                  <Button size="xs" iconLeft={<Icon name="Download" size={13} />}
                    onClick={() => window.downloadCsv('nhr-' + r.id + '-' + new Date().toISOString().slice(0, 10) + '.csv', r.columns, r.rows())}>
                    Export
                  </Button>
                </span>
              </div>

              {open === r.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                    <Icon name="Info" size={13} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--nhr-turquoise)' }} />
                    <span>{r.note}</span>
                  </span>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
                    {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                  </span>
                  {rows.length ? (
                    <DataTable compact
                      columns={r.columns.map(c => ({ key: c.key, label: c.label, mono: /date|amount|salary|cost|score|days|spells|rating|ent|taken|rem|head|responses/i.test(c.key) }))}
                      rows={rows.slice(0, 25).map((row, i) => Object.assign({ id: r.id + '-' + i }, row))} />
                  ) : <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>No rows for the current scope and period.</span>}
                  {rows.length > 25 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                      Showing the first 25 of {rows.length}. Export for the full set.
                    </span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {blocked.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="Lock" size={18} style={{ color: 'var(--text-muted-dark)', flex: '0 0 auto', marginTop: 2 }} />
          <span style={{ flex: 1, minWidth: 240, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
            {blocked.length} {blocked.length === 1 ? 'report is' : 'reports are'} unavailable to your role
            ({blocked.map(r => r.name).join(', ')}). The rows are never built, so there is nothing to export.
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Custom builder ---------------- */
const BUILDER_FIELDS = [
  { key: 'name', label: 'Name', get: (e, S) => S.fullName(e) },
  { key: 'ref', label: 'Reference', get: e => e.employeeId },
  { key: 'jobTitle', label: 'Job title', get: e => e.jobTitle },
  { key: 'department', label: 'Department', get: e => e.department },
  { key: 'location', label: 'Location', get: e => e.location },
  { key: 'employmentType', label: 'Employment type', get: e => e.employmentType },
  { key: 'employmentStatus', label: 'Status', get: e => e.employmentStatus },
  { key: 'startDate', label: 'Start date', get: e => e.startDate },
  { key: 'tenure', label: 'Tenure (years)', get: e => e.startDate ? (Math.round((Date.now() - new Date(e.startDate)) / (365 * window.RP_DAY) * 10) / 10) : '' },
  { key: 'hoursPerWeek', label: 'Hours per week', get: e => e.hoursPerWeek },
  { key: 'rtw', label: 'Right to work', get: e => e.rightToWorkStatus },
  { key: 'bradford', label: 'Bradford score', get: (e, S, R) => R.bradford ? R.bradford(e).score : '' },
  { key: 'leaveRemaining', label: 'Leave remaining', get: (e, S, R) => R.leaveBalance ? R.leaveBalance(e).remaining : '' },
  { key: 'trainingDone', label: 'Courses complete', get: (e, S, R) => (R.get(e).training || []).filter(t => t.status === 'Complete').length },
  { key: 'salary', label: 'Salary', requires: 'payroll.read', get: e => (e.payroll && e.payroll.salary) || '' }
];

function ReportBuilder({ a }) {
  const { S, R } = a;
  const [fields, setFields] = React.useState(['name', 'department', 'employmentStatus', 'startDate']);
  const [dept, setDept] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const [groupBy, setGroupBy] = React.useState('None');

  const available = BUILDER_FIELDS.filter(f => !f.requires || S.can(f.requires));
  const chosen = available.filter(f => fields.indexOf(f.key) > -1);

  const scoped = a.employees
    .filter(e => dept === 'All' || e.department === dept)
    .filter(e => status === 'All' || e.employmentStatus === status);

  const rows = scoped.map((e, i) => {
    const row = { id: e.id || ('row-' + i) };
    chosen.forEach(f => { row[f.key] = f.get(e, S, R); });
    return row;
  });

  /* Grouping counts rather than sums, because most chosen fields are not
     numeric — a count per group is the honest default. */
  const groups = {};
  if (groupBy !== 'None') {
    scoped.forEach(e => {
      const k = (groupBy === 'Department' ? e.department : groupBy === 'Status' ? e.employmentStatus : e.employmentType) || 'Not set';
      groups[k] = (groups[k] || 0) + 1;
    });
  }
  const groupBars = Object.keys(groups).map(k => ({ label: k.slice(0, 7), value: groups[k] })).sort((x, y) => y.value - x.value);

  function toggle(key) {
    setFields(f => f.indexOf(key) > -1 ? f.filter(k => k !== key) : f.concat([key]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DashboardCard title="Choose columns" padding={16} action={<Badge tone="dark">{chosen.length} selected</Badge>}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {available.map(f => {
            const on = fields.indexOf(f.key) > -1;
            return (
              <button key={f.key} type="button" onClick={() => toggle(f.key)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', minHeight: 40,
                borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (on ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                background: on ? 'rgba(0,229,212,.10)' : 'rgba(255,255,255,.02)',
                color: on ? '#fff' : 'var(--text-body-dark)',
                fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: on ? 700 : 500
              }}>
                <Icon name={on ? 'Check' : 'Plus'} size={12} />{f.label}
              </button>
            );
          })}
        </div>
        {BUILDER_FIELDS.some(f => f.requires && !S.can(f.requires)) && (
          <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
            Salary is not offered as a column because your role cannot read payroll.
          </span>
        )}
      </DashboardCard>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All statuses</option>
          {S.STATUSES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} aria-label="Group by" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {['None', 'Department', 'Status', 'Employment type'].map(d => <option key={d} value={d}>{d === 'None' ? 'No grouping' : 'Group by ' + d.toLowerCase()}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>{rows.length} rows</span>
        <Button size="sm" disabled={!chosen.length} iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-custom-report-' + new Date().toISOString().slice(0, 10) + '.csv',
            chosen.map(f => ({ label: f.label, key: f.key })), rows)}>Export</Button>
      </Card>

      {groupBy !== 'None' && groupBars.length > 0 && (
        <DashboardCard title={'Count by ' + groupBy.toLowerCase()} action={<Badge tone="dark">{rows.length} total</Badge>}>
          <BarChart height={160} data={groupBars} />
        </DashboardCard>
      )}

      <DashboardCard title="Result" padding={16} action={<Badge tone="dark">{chosen.length} columns</Badge>}>
        {!chosen.length ? (
          <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Choose at least one column.</span>
        ) : rows.length ? (
          <DataTable compact
            columns={chosen.map(f => ({ key: f.key, label: f.label, mono: /date|salary|bradford|leave|hours|tenure|training/i.test(f.key) }))}
            rows={rows.slice(0, 30)} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No employees match those filters.</span>}
        {rows.length > 30 && (
          <span style={{ display: 'block', marginTop: 11, fontSize: 12, color: 'var(--text-muted-dark)' }}>
            Showing the first 30 of {rows.length}. Export for the full set.
          </span>
        )}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Headcount view ---------------- */
function HeadcountView({ a }) {
  const { S } = a;
  const employees = a.employees;

  const byType = {};
  employees.forEach(e => { byType[e.employmentType || 'Not set'] = (byType[e.employmentType || 'Not set'] || 0) + 1; });
  const typeBars = Object.keys(byType).map(k => ({ label: k.slice(0, 7), value: byType[k] })).sort((x, y) => y.value - x.value);

  const byStatus = {};
  employees.forEach(e => { byStatus[e.employmentStatus || 'Not set'] = (byStatus[e.employmentStatus || 'Not set'] || 0) + 1; });

  /* Tenure bands — the shape of this tells you more about retention than a
     single turnover figure does. */
  const bands = [['Under 1 year', 0, 1], ['1 to 2 years', 1, 2], ['2 to 5 years', 2, 5], ['Over 5 years', 5, 99]];
  const tenureRows = bands.map(([label, lo, hi]) => {
    const list = employees.filter(e => {
      if (!e.startDate) return false;
      const yrs = (Date.now() - new Date(e.startDate)) / (365 * window.RP_DAY);
      return yrs >= lo && yrs < hi;
    });
    return { id: label, band: label, count: list.length, pct: employees.length ? Math.round(list.length / employees.length * 100) : 0 };
  });

  const noStart = employees.filter(e => !e.startDate).length;

  const locMap = {};
  employees.forEach(e => { locMap[e.location || 'Not set'] = (locMap[e.location || 'Not set'] || 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Headcount" value={String(employees.length)} caption={Object.keys(locMap).length + ' locations'} icon={<Icon name="Users" size={18} />} />
        <StatTile label="Average tenure" value={(() => {
          const yrs = employees.filter(e => e.startDate).map(e => (Date.now() - new Date(e.startDate)) / (365 * window.RP_DAY));
          return yrs.length ? (Math.round(yrs.reduce((x, y) => x + y, 0) / yrs.length * 10) / 10) + ' yrs' : '—';
        })()} caption={noStart ? noStart + ' without a start date' : 'All start dates recorded'} icon={<Icon name="Clock" size={18} />} />
        <StatTile label="On probation" value={String(byStatus['Probation'] || 0)} caption="Needs a review booked" icon={<Icon name="UserCheck" size={18} />} />
        <StatTile label="Part-time" value={String((byType['Part-time'] || 0) + (byType['Casual'] || 0))} caption="Part-time or casual" icon={<Icon name="UserMinus" size={18} />} />
      </div>

      <div className="rp-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="By employment type" action={<Badge tone="dark">{employees.length}</Badge>}>
          {typeBars.length ? <BarChart height={165} data={typeBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No employees in scope.</span>}
        </DashboardCard>
        <DashboardCard title="Tenure" padding={16} action={<Badge tone="dark">Bands</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {tenureRows.map(t => (
              <ProgressMeter key={t.id} label={t.band} value={t.pct} valueLabel={t.count + ' · ' + t.pct + '%'} />
            ))}
            {noStart > 0 && (
              <span style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                {noStart} {noStart === 1 ? 'record has' : 'records have'} no start date and are excluded from the bands, so the percentages are of those with a date.
              </span>
            )}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="By location" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-headcount-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Location', key: 'location' }, { label: 'Headcount', key: 'count' }, { label: 'Share', key: 'pct' }],
            Object.keys(locMap).map(k => ({
              location: k, count: locMap[k],
              pct: employees.length ? Math.round(locMap[k] / employees.length * 100) + '%' : '0%'
            })))}>Export</Button>}>
        <DataTable compact columns={[
          { key: 'location', label: 'Location' },
          { key: 'count', label: 'Headcount', mono: true, align: 'right' },
          { key: 'pctLabel', label: 'Share', mono: true, align: 'right' }
        ]} rows={Object.keys(locMap).sort((x, y) => locMap[y] - locMap[x]).map(k => ({
          id: k, location: k, count: locMap[k],
          pctLabel: employees.length ? Math.round(locMap[k] / employees.length * 100) + '%' : '0%'
        }))} />
      </DashboardCard>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function ReportsScreen() {
  const a = window.useAnalytics();
  const canAll = a.S.can('employees.read.all') || a.S.can('employees.read.team');
  const allow = canAll ? ['Dashboard', 'Reports', 'Builder', 'Headcount'] : ['Reports'];
  const [view, setView] = React.useState(canAll ? 'Dashboard' : 'Reports');
  const active = allow.indexOf(view) > -1 ? view : allow[0];

  const body = {
    'Dashboard': <window.AnalyticsDashboard a={a} onView={setView} />,
    'Reports': <ReportList a={a} />,
    'Builder': <ReportBuilder a={a} />,
    'Headcount': <HeadcountView a={a} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Reports &amp; Analytics</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 610 }}>
            Figures pulled across every module, with each one's restrictions carried over — payroll stays hidden without permission, wellbeing stays suppressed, and scope follows your role.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Reports')} iconLeft={<Icon name="FileBarChart" size={15} />}>All Reports</Button>
          {canAll && <Button size="sm" onClick={() => setView('Builder')} iconLeft={<Icon name="Wrench" size={15} />}>Build a Report</Button>}
        </div>
      </div>

      <window.ReportsSubnav view={active} onSelect={setView} allow={allow} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[active]}</div>
    </div>
  );
}

Object.assign(window, { ReportsScreen, ReportList, ReportBuilder, HeadcountView, reportLibrary, BUILDER_FIELDS });
