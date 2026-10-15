/* Expenses — all claims, mileage, reports and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- All claims ---------------- */
function AllClaims({ data }) {
  const { claims, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('All');
  const [cat, setCat] = React.useState('All');
  const [dept, setDept] = React.useState('All');

  const filtered = claims
    .filter(x => status === 'All' || x.status === status)
    .filter(x => cat === 'All' || x.category === cat)
    .filter(x => dept === 'All' || x.department === dept)
    .filter(x => !q || (x.description + ' ' + x.employeeName).toLowerCase().includes(q.toLowerCase()));

  const total = filtered.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const approvedUnpaid = claims.filter(x => x.status === 'Approved');

  function markPaid(x) {
    R.update(x.employeeKey, 'expenses', x.id, { status: 'Paid', paidAt: new Date().toISOString().slice(0, 10) });
    S.logActivity(x.employeeKey, 'Expense reimbursed: ' + x.description + ' — ' + window.money(x.amount));
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Claims shown" value={String(filtered.length)} caption={window.money0(total) + ' in total'} icon={<Icon name="Receipt" size={18} />} />
        <StatTile label="Approved, not paid" value={String(approvedUnpaid.length)} caption={window.money0(approvedUnpaid.reduce((n, x) => n + x.amount, 0)) + ' owed'} icon={<Icon name="Banknote" size={18} />} />
        <StatTile label="Rejected" value={String(claims.filter(x => x.status === 'Rejected').length)} caption="All time" icon={<Icon name="CircleX" size={18} />} />
        <StatTile label="Reimbursed" value={String(claims.filter(x => x.status === 'Paid').length)} caption="Marked paid" icon={<Icon name="CircleCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 185, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search claims or people…" aria-label="Search claims"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        {[[status, setStatus, ['All', 'Pending', 'Queried', 'Approved', 'Paid', 'Rejected'], 'All statuses', 'Status'],
          [cat, setCat, ['All'].concat(R.EXPENSE_CATEGORIES), 'All categories', 'Category'],
          [dept, setDept, ['All'].concat(S.DEPARTMENTS), 'All departments', 'Department']].map(([val, set, opts, allLabel, aria]) => (
          <select key={aria} value={val} onChange={e => set(e.target.value)} aria-label={aria} style={{
            background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
          }}>
            {opts.map(o => <option key={o} value={o}>{o === 'All' ? allLabel : o}</option>)}
          </select>
        ))}
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-expenses-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'emp' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
            { label: 'Date', key: 'date' }, { label: 'Category', key: 'cat' }, { label: 'Description', key: 'desc' },
            { label: 'Miles', key: 'miles' }, { label: 'Amount', key: 'amount' }, { label: 'Receipt', key: 'rec' },
            { label: 'Status', key: 'st' }, { label: 'Decided by', key: 'by' }, { label: 'Note', key: 'note' }],
            filtered.map(x => ({
              emp: x.employeeName, ref: x.employeeRef, dept: x.department, date: x.date,
              cat: x.category, desc: x.description, miles: x.miles || '',
              amount: Number(x.amount).toFixed(2), rec: x.receipt ? 'Yes' : 'No',
              st: x.status, by: x.decidedBy || '', note: x.decisionNote || ''
            })))}>Export</Button>
      </Card>

      <DashboardCard title={'Claims (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(x => (
              <div key={x.employeeKey + x.id} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{
                    width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                  }}><Icon name={x.category === 'Mileage' ? 'Car' : 'Receipt'} size={17} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{x.description}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {x.employeeName} · {x.category} · {window.shortDate(x.date)}{x.miles ? ' · ' + x.miles + ' miles' : ''}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 82 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{window.money(x.amount)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{x.receipt ? 'Receipt' : 'No receipt'}</span>
                  </span>
                  <Badge tone={window.EXP_TONE[x.status] || 'dark'}>{x.status}</Badge>
                  {canWrite && x.status === 'Approved' && (
                    <Button size="xs" variant="secondary" tone="dark" onClick={() => markPaid(x)}>Mark Paid</Button>
                  )}
                  {canWrite && (
                    <IconButton tone="dark" size={30} label="Delete claim"
                      onClick={() => { R.remove(x.employeeKey, 'expenses', x.id); refresh(); }}><Icon name="Trash2" size={14} /></IconButton>
                  )}
                </div>
                {x.decidedBy && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted-dark)', paddingTop: 10, borderTop: '1px solid var(--border-dark)' }}>
                    {x.status} by {x.decidedBy} on {window.shortDate(x.decidedAt)}{x.decisionNote ? ' — ' + x.decisionNote : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing matches those filters.</span>}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Mileage ---------------- */
function MileageView({ data }) {
  const { claims, employees, milesByEmployee, yearStart, S } = data;
  const mileage = claims.filter(x => x.category === 'Mileage' && x.status !== 'Rejected');
  const thisYear = mileage.filter(x => x.date >= yearStart);

  const totalMiles = thisYear.reduce((n, x) => n + (Number(x.miles) || 0), 0);
  const totalValue = thisYear.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const nearThreshold = Object.keys(milesByEmployee).filter(k => milesByEmployee[k] > window.MILEAGE_THRESHOLD * 0.8);

  const rows = employees.map(e => {
    const mine = thisYear.filter(x => x.employeeKey === e.id);
    const miles = mine.reduce((n, x) => n + (Number(x.miles) || 0), 0);
    const value = mine.reduce((n, x) => n + (Number(x.amount) || 0), 0);
    return {
      id: e.id, employee: e, name: S.fullName(e), department: e.department,
      journeys: mine.length, miles,
      value: Math.round(value * 100) / 100,
      avg: miles ? Math.round(value / miles * 100) / 100 : 0,
      pct: Math.min(100, Math.round(miles / window.MILEAGE_THRESHOLD * 100))
    };
  }).filter(r => r.journeys > 0).sort((a, b) => b.miles - a.miles);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Business miles" value={totalMiles.toLocaleString('en-GB')} caption="This tax year" icon={<Icon name="Car" size={18} />} />
        <StatTile label="Mileage value" value={window.money0(totalValue)} caption="At HMRC rates" icon={<Icon name="Banknote" size={18} />} />
        <StatTile label="Journeys" value={String(thisYear.length)} caption="Claims logged" icon={<Icon name="Route" size={18} />} />
        <StatTile label="Near 10,000 miles" value={String(nearThreshold.length)} caption="Rate drops to 25p" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>HMRC approved mileage rates</span>
        <DataTable compact columns={[
          { key: 'vehicle', label: 'Vehicle' },
          { key: 'first', label: 'First 10,000 miles', mono: true, align: 'right' },
          { key: 'after', label: 'Thereafter', mono: true, align: 'right' }
        ]} rows={[
          { id: 'car', vehicle: 'Car or van', first: '45p', after: '25p' },
          { id: 'moto', vehicle: 'Motorcycle', first: '24p', after: '24p' },
          { id: 'bike', vehicle: 'Bicycle', first: '20p', after: '20p' }
        ]} />
        <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          The 10,000-mile threshold counts business miles per employee per tax year, starting 6 April. Paying at or below
          these rates is not taxable; paying above them creates a taxable benefit that must be reported.
        </span>
      </Card>

      {rows.length ? (
        <DashboardCard title={'Mileage by employee (' + rows.length + ')'} padding={16} action={<Badge tone="dark">Highest first</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => (
              <div key={r.id} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                border: '1px solid ' + (r.pct >= 80 ? 'rgba(242,180,65,.26)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: r.pct >= 80 ? 'rgba(242,180,65,.035)' : 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={r.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{r.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.employee.jobTitle} · {r.department}</span>
                  </span>
                  {[['Journeys', r.journeys], ['Miles', r.miles.toLocaleString('en-GB')], ['Avg rate', r.avg ? (r.avg * 100).toFixed(0) + 'p' : '—']].map(([label, v]) => (
                    <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                    </span>
                  ))}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 78 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{window.money(r.value)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Claimed</span>
                  </span>
                </div>
                <ProgressMeter label={r.miles.toLocaleString('en-GB') + ' of 10,000 miles at 45p'} value={r.pct} valueLabel={r.pct + '%'} />
              </div>
            ))}
          </div>
        </DashboardCard>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="Car" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No mileage claimed this tax year</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            Mileage claims are calculated at HMRC rates when the category is set to Mileage on a new claim.
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Reports ---------------- */
function ExpenseReports({ data }) {
  const { claims, employees, S } = data;
  const [days, setDays] = React.useState('90');
  const cutoff = new Date(Date.now() - Number(days) * window.EXP_DAY).toISOString().slice(0, 10);
  const scoped = claims.filter(x => x.date >= cutoff && x.status !== 'Rejected');

  const spend = scoped.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const approved = claims.filter(x => x.status === 'Approved' || x.status === 'Paid');
  const decided = claims.filter(x => x.decidedAt);
  const rejected = claims.filter(x => x.status === 'Rejected');

  /* Average days from submission to decision — the number employees feel. */
  const turnarounds = decided
    .map(x => Math.floor((new Date(x.decidedAt) - new Date(x.submittedAt || x.date)) / window.EXP_DAY))
    .filter(n => n >= 0);
  const avgTurnaround = turnarounds.length ? Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length * 10) / 10 : null;

  const catMap = {};
  scoped.forEach(x => { catMap[x.category] = (catMap[x.category] || 0) + (Number(x.amount) || 0); });
  const catBars = Object.keys(catMap).map(k => ({ label: k.slice(0, 7), value: Math.round(catMap[k]) })).sort((a, b) => b.value - a.value);

  const deptMap = {};
  scoped.forEach(x => {
    const d = deptMap[x.department] || (deptMap[x.department] = { total: 0, count: 0 });
    d.total += Number(x.amount) || 0; d.count++;
  });
  const deptRows = Object.keys(deptMap).map(k => {
    const head = employees.filter(e => e.department === k).length || 1;
    return {
      id: k, department: k, claims: deptMap[k].count,
      total: Math.round(deptMap[k].total * 100) / 100,
      headcount: head,
      perHead: Math.round(deptMap[k].total / head * 100) / 100
    };
  }).sort((a, b) => b.total - a.total);

  /* Monthly trend over the scoped window. */
  const monthMap = {};
  scoped.forEach(x => {
    const k = x.date.slice(0, 7);
    monthMap[k] = (monthMap[k] || 0) + (Number(x.amount) || 0);
  });
  const monthBars = Object.keys(monthMap).sort().map(k => ({
    label: new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short' }),
    value: Math.round(monthMap[k])
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Spend" value={window.money0(spend)} caption={'Last ' + days + ' days'} icon={<Icon name="Receipt" size={18} />} />
        <StatTile label="Claims" value={String(scoped.length)} caption={scoped.length ? window.money0(spend / scoped.length) + ' average' : 'None in period'} icon={<Icon name="Files" size={18} />} />
        <StatTile label="Turnaround" value={avgTurnaround == null ? '—' : avgTurnaround + (avgTurnaround === 1 ? ' day' : ' days')} caption="Submission to decision" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Rejection rate" value={claims.length ? Math.round(rejected.length / claims.length * 100) + '%' : '—'} caption={rejected.length + ' rejected all time'} icon={<Icon name="CircleX" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Period</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['30', '30 days'], ['90', '90 days'], ['365', '12 months']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setDays(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (days === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: days === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: days === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: days === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-expense-report-' + days + 'day.csv',
            [{ label: 'Department', key: 'department' }, { label: 'Headcount', key: 'headcount' },
            { label: 'Claims', key: 'claims' }, { label: 'Total', key: 'total' }, { label: 'Per head', key: 'perHead' }],
            deptRows.map(d => ({
              department: d.department, headcount: d.headcount, claims: d.claims,
              total: d.total.toFixed(2), perHead: d.perHead.toFixed(2)
            })))}>Export Report</Button>
      </Card>

      <div className="exp-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Spend by category" action={<Badge tone="dark">£</Badge>}>
          {catBars.length ? <BarChart height={175} data={catBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No claims in this period.</span>}
        </DashboardCard>
        <DashboardCard title="Spend by month" action={<Badge tone="dark">£</Badge>}>
          {monthBars.length ? <BarChart height={175} data={monthBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No claims in this period.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="By department" padding={16} action={<Badge tone="dark">Highest spend first</Badge>}>
        {deptRows.length ? (
          <DataTable compact columns={[
            { key: 'department', label: 'Department' },
            { key: 'headcount', label: 'Headcount', mono: true, align: 'right' },
            { key: 'claims', label: 'Claims', mono: true, align: 'right' },
            { key: 'totalLabel', label: 'Total', mono: true, align: 'right' },
            { key: 'perHeadLabel', label: 'Per head', mono: true, align: 'right' }
          ]} rows={deptRows.map(d => Object.assign({}, d, {
            totalLabel: window.money(d.total), perHeadLabel: window.money(d.perHead)
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No claims in this period.</span>}
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Figures exclude rejected claims. Receipt and second-approval thresholds are illustrative defaults — set them to
          match your own finance policy. Expenses paid at or below HMRC approved rates are not reportable; other
          reimbursements, round-sum allowances and anything with a personal element may need reporting on a P11D or
          through a PAYE Settlement Agreement. Check with your accountant before treating any category as tax free.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function ExpensesScreen() {
  const data = window.useExpenseData();
  const [view, setView] = React.useState('Approvals');
  const [claiming, setClaiming] = React.useState(false);
  const canWrite = data.S.can('employees.write');
  const pending = data.claims.filter(x => x.status === 'Pending' || x.status === 'Queried').length;

  const body = {
    'Approvals': <window.ExpenseApprovals data={data} />,
    'All Claims': <AllClaims data={data} />,
    'Mileage': <MileageView data={data} />,
    'Reports': <ExpenseReports data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Expenses</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Claims waiting for a decision, mileage at HMRC rates, and where the spend goes. Approving a claim feeds the next pay run as a non-taxable reimbursement.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Approvals')} iconLeft={<Icon name="ClipboardCheck" size={15} />}>
              Approvals{pending > 0 ? ' (' + pending + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setClaiming(true)} iconLeft={<Icon name="Plus" size={16} />}>New Claim</Button>
          </div>
        )}
      </div>

      <window.ExpensesSubnav view={view} onSelect={setView} counts={{ pending }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {claiming && <window.NewClaimDialog data={data} onClose={() => setClaiming(false)} />}
    </div>
  );
}

Object.assign(window, { ExpensesScreen, AllClaims, MileageView, ExpenseReports });
