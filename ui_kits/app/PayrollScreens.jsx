/* Payroll — payslip, employee pay details, reports and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Payslip ---------------- */
function Payslip({ data, runId, employeeKey, onClose }) {
  const { S, P } = data;
  const run = P.get(runId);
  const line = run && run.lines.find(l => l.employeeKey === employeeKey);
  const employee = S.get(employeeKey);
  if (!run || !line || !line.result || !employee) return null;
  const r = line.result;
  const ytd = P.ytd(employeeKey);
  const g = window.gbp;

  function download() {
    window.downloadCsv('payslip-' + (line.payrollId || line.employeeRef) + '-' + run.period.key + '.csv',
      [{ label: 'Item', key: 'item' }, { label: 'Detail', key: 'detail' }, { label: 'Amount', key: 'amount' }],
      [
        { item: 'Employee', detail: line.employeeName, amount: '' },
        { item: 'Payroll ID', detail: line.payrollId, amount: '' },
        { item: 'Period', detail: run.period.label, amount: '' },
        { item: 'Pay date', detail: run.period.payDate, amount: '' },
        { item: 'Tax code', detail: r.taxCode, amount: '' },
        { item: 'Basic pay', detail: r.frequency, amount: r.base.toFixed(2) },
        { item: 'Overtime', detail: r.overtime ? 'at ' + g(r.overtimeRate) + '/hr' : '', amount: r.overtime.toFixed(2) },
        { item: 'Bonus', detail: '', amount: r.bonus.toFixed(2) },
        { item: 'Gross pay', detail: '', amount: r.gross.toFixed(2) },
        { item: 'Income tax', detail: r.taxCode, amount: (-r.tax).toFixed(2) },
        { item: 'National Insurance', detail: 'Category A', amount: (-r.ni).toFixed(2) },
        { item: 'Pension', detail: r.pensionPercent + '% qualifying earnings', amount: (-r.pension).toFixed(2) },
        { item: 'Expenses', detail: 'Reimbursed, not taxed', amount: r.expenses.toFixed(2) },
        { item: 'Net pay', detail: '', amount: r.net.toFixed(2) },
        { item: 'YTD gross', detail: ytd.periods + ' periods', amount: ytd.gross.toFixed(2) },
        { item: 'YTD tax', detail: '', amount: ytd.tax.toFixed(2) },
        { item: 'YTD NI', detail: '', amount: ytd.ni.toFixed(2) }
      ]);
  }

  const row = (label, detail, amount, negative) => (
    <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-dark)' }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{label}</span>
        {detail && <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{detail}</span>}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: negative ? 'var(--text-body-dark)' : '#fff', whiteSpace: 'nowrap' }}>
        {negative ? '−' : ''}{g(amount)}
      </span>
    </div>
  );

  return (
    <Drawer open onClose={onClose} title="Payslip"
      subtitle={line.employeeName + ' · ' + run.period.label} width={640}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Close</Button>
          <Button onClick={download} iconLeft={<Icon name="Download" size={16} />}>Download</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar employee={employee} size={44} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 160 }}>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>{line.employeeName}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
              {employee.jobTitle} · {line.payrollId || line.employeeRef} · tax code {r.taxCode}
            </span>
          </span>
          <Badge tone={window.RUN_TONE[run.status] || 'dark'}>{run.status}</Badge>
        </Card>

        <div>
          <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, color: 'var(--nhr-turquoise)', marginBottom: 6 }}>Payments</span>
          {row('Basic pay', r.frequency + ' salary', r.base)}
          {r.overtime > 0 && row('Overtime', 'at ' + g(r.overtimeRate) + ' per hour', r.overtime)}
          {r.bonus > 0 && row('Bonus / adjustment', '', r.bonus)}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>Gross pay</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{g(r.gross)}</span>
          </div>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, color: 'var(--nhr-turquoise)', marginBottom: 6 }}>Deductions</span>
          {row('Income tax', 'PAYE, code ' + r.taxCode, r.tax, true)}
          {row('National Insurance', 'Category A', r.ni, true)}
          {row('Pension', r.pensionPercent + '% of qualifying earnings', r.pension, true)}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>Total deductions</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>−{g(r.deductions)}</span>
          </div>
        </div>

        {r.expenses > 0 && (
          <div>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, color: 'var(--nhr-turquoise)', marginBottom: 6 }}>Reimbursements</span>
            {row('Approved expenses', 'Not subject to tax or NI', r.expenses)}
          </div>
        )}

        <Card tone="dark" padding={18} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'rgba(0,229,212,.06)', borderColor: 'rgba(0,229,212,.26)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Net pay</span>
          <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{g(r.net)}</span>
        </Card>

        <DashboardCard title="Year to date" padding={16} action={<Badge tone="dark">{ytd.periods} periods</Badge>}>
          <DataTable compact columns={[{ key: 'item', label: 'Item' }, { key: 'amount', label: 'Amount', mono: true, align: 'right' }]}
            rows={[
              { id: 'g', item: 'Gross pay', amount: g(ytd.gross) },
              { id: 't', item: 'Income tax', amount: g(ytd.tax) },
              { id: 'n', item: 'National Insurance', amount: g(ytd.ni) },
              { id: 'p', item: 'Pension', amount: g(ytd.pension) },
              { id: 'net', item: 'Net pay', amount: g(ytd.net) }
            ]} />
        </DashboardCard>

        <DashboardCard title="Employer cost" padding={16}>
          <DataTable compact columns={[{ key: 'item', label: 'Item' }, { key: 'amount', label: 'Amount', mono: true, align: 'right' }]}
            rows={[
              { id: 'g', item: 'Gross pay', amount: g(r.gross) },
              { id: 'ni', item: 'Employer NI (15% above £5,000)', amount: g(r.employerNi) },
              { id: 'p', item: 'Employer pension (' + r.employerPensionPercent + '%)', amount: g(r.employerPension) },
              { id: 'c', item: 'Total cost', amount: g(r.employerCost) }
            ]} />
        </DashboardCard>

        {r.warnings.length > 0 && (
          <Notice icon="TriangleAlert" tone="warn">{r.warnings.join(' ')}</Notice>
        )}
        <Notice icon="Info">
          Calculated on {r.taxYear} rates for England, Wales and Northern Ireland. PAYE here is an estimate based on annualised pay,
          not HMRC's cumulative tax tables. Check against your payroll provider before paying anyone.
        </Notice>
      </div>
    </Drawer>
  );
}

/* ---------------- Employee pay details ---------------- */
function PayrollEmployees({ data }) {
  const { employees, S, P, E, refresh } = data;
  const canWrite = S.can('employees.write') && S.can('payroll.read');
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({});
  const [q, setQ] = React.useState('');

  const list = employees.filter(e => !q || S.fullName(e).toLowerCase().includes(q.toLowerCase()));

  function open(e) {
    const p = e.payroll || {};
    setEditing(e.id);
    setForm({
      payrollId: p.payrollId || '', payFrequency: p.payFrequency || 'Monthly',
      salary: p.salary || '', hourlyRate: p.hourlyRate || '', taxCode: p.taxCode || '1257L',
      niCategory: p.niCategory || 'A',
      pensionPercent: p.pensionPercent == null ? 5 : p.pensionPercent,
      employerPensionPercent: p.employerPensionPercent == null ? 3 : p.employerPensionPercent
    });
  }

  function save(e) {
    S.update(e.id, { payroll: Object.assign({}, e.payroll, form) });
    S.logActivity(e.id, 'Payroll details updated');
    setEditing(null); refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={ev => setQ(ev.target.value)} placeholder="Search by name…" aria-label="Search employees"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{list.length} {list.length === 1 ? 'person' : 'people'}</span>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(e => {
          const p = e.payroll || {};
          const set = p.salary || p.hourlyRate;
          const est = set ? E.calculate({
            annualSalary: Number(p.salary) || 0, hourlyRate: Number(p.hourlyRate) || 0,
            hours: 0, contractedWeekly: e.hoursPerWeek, frequency: p.payFrequency || 'Monthly',
            taxCode: p.taxCode || '1257L',
            pensionPercent: p.pensionPercent == null ? 5 : p.pensionPercent,
            employerPensionPercent: p.employerPensionPercent == null ? 3 : p.employerPensionPercent
          }) : null;
          return (
            <Card key={e.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Avatar employee={e} size={36} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 165 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{S.fullName(e)}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    {e.jobTitle} · {p.payrollId || 'No payroll ID'} · {p.payFrequency || 'Monthly'}
                  </span>
                </span>
                {set ? (
                  <React.Fragment>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 92 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                        {p.salary ? window.gbp0(p.salary) : window.gbp(p.hourlyRate) + '/hr'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{p.salary ? 'Annual' : 'Hourly'}</span>
                    </span>
                    <Badge tone="dark">{p.taxCode || '1257L'}</Badge>
                    {est && (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 92 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{window.gbp(est.net)}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Est. net / month</span>
                      </span>
                    )}
                  </React.Fragment>
                ) : <Badge tone="warning">No pay details</Badge>}
                {canWrite && (
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => editing === e.id ? setEditing(null) : open(e)}>
                    {editing === e.id ? 'Close' : 'Edit'}
                  </Button>
                )}
              </div>

              {editing === e.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                  <FormGrid cols={3}>
                    <TextField label="Payroll ID" value={form.payrollId} onChange={v => setForm(f => Object.assign({}, f, { payrollId: v }))} mono />
                    <SelectField label="Frequency" value={form.payFrequency} onChange={v => setForm(f => Object.assign({}, f, { payFrequency: v }))}
                      options={['Monthly', 'Four-weekly', 'Fortnightly', 'Weekly']} />
                    <TextField label="Tax code" value={form.taxCode} onChange={v => setForm(f => Object.assign({}, f, { taxCode: v }))} mono hint="e.g. 1257L, BR, K475" />
                    <TextField label="Annual salary (£)" value={form.salary} onChange={v => setForm(f => Object.assign({}, f, { salary: v }))} mono />
                    <TextField label="Hourly rate (£)" value={form.hourlyRate} onChange={v => setForm(f => Object.assign({}, f, { hourlyRate: v }))} mono hint="Leave blank if salaried." />
                    <SelectField label="NI category" value={form.niCategory} onChange={v => setForm(f => Object.assign({}, f, { niCategory: v }))}
                      options={['A', 'B', 'C', 'H', 'M', 'V']} />
                    <TextField label="Employee pension %" value={form.pensionPercent} onChange={v => setForm(f => Object.assign({}, f, { pensionPercent: v }))} mono />
                    <TextField label="Employer pension %" value={form.employerPensionPercent} onChange={v => setForm(f => Object.assign({}, f, { employerPensionPercent: v }))} mono />
                  </FormGrid>
                  <Notice icon="Info">Auto-enrolment minimums are 5% employee and 3% employer on qualifying earnings between £6,240 and £50,270.</Notice>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button size="sm" variant="ghost" tone="dark" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => save(e)}>Save Pay Details</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Payslips ---------------- */
function PayslipLibrary({ data, onPayslip }) {
  const { runs, S, P } = data;
  const [q, setQ] = React.useState('');
  const published = runs.filter(r => r.status === 'Approved' || r.status === 'Paid');
  const rows = [];
  published.forEach(r => r.lines.filter(l => l.include && l.result).forEach(l => rows.push({ run: r, line: l })));
  const filtered = rows.filter(x => !q || x.line.employeeName.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Payslips published" value={String(rows.length)} caption={published.length + ' approved runs'} icon={<Icon name="FileText" size={18} />} />
        <StatTile label="Periods" value={String(published.length)} caption="Approved or paid" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="People paid" value={String(new Set(rows.map(x => x.line.employeeKey)).size)} caption="Distinct employees" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Net paid" value={window.gbp0(rows.reduce((n, x) => n + x.line.result.net, 0))} caption="All published runs" icon={<Icon name="Banknote" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search payslips by name…" aria-label="Search payslips"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
      </Card>

      <DashboardCard title={'Published payslips (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <DataTable compact columns={[
            { key: 'name', label: 'Employee' }, { key: 'period', label: 'Period' },
            { key: 'payDate', label: 'Pay date', mono: true },
            { key: 'gross', label: 'Gross', mono: true, align: 'right' },
            { key: 'net', label: 'Net', mono: true, align: 'right' },
            { key: 'action', label: '', align: 'right' }
          ]} rows={filtered.map(x => ({
            id: x.run.id + x.line.employeeKey,
            name: x.line.employeeName, period: x.run.period.label,
            payDate: window.shortDate(x.run.period.payDate),
            gross: window.gbp(x.line.result.gross), net: window.gbp(x.line.result.net),
            action: <Button size="xs" variant="secondary" tone="dark" onClick={() => onPayslip(x.run.id, x.line.employeeKey)}>View</Button>
          }))} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="FileText" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>No payslips yet</span>
            <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)', maxWidth: 460 }}>
              Payslips publish when a pay run is approved. Start a run under Runs, calculate it, then approve.
            </span>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Reports ---------------- */
function PayrollReports({ data }) {
  const { runs, employees, S, P } = data;
  const published = runs.filter(r => r.status === 'Approved' || r.status === 'Paid')
    .slice().sort((a, b) => a.period.key < b.period.key ? -1 : 1);

  const trend = published.slice(-6).map(r => ({
    label: r.period.label.split(' ')[0].slice(0, 3),
    value: Math.round(P.totals(r).cost)
  }));

  const latest = published[published.length - 1];
  const t = latest ? P.totals(latest) : null;

  const deptMap = {};
  if (latest) latest.lines.filter(l => l.include && l.result).forEach(l => {
    deptMap[l.department] = (deptMap[l.department] || 0) + l.result.employerCost;
  });
  const deptBars = Object.keys(deptMap).map(k => ({ label: k.slice(0, 6), value: Math.round(deptMap[k]) })).sort((a, b) => b.value - a.value);

  function exportYtd() {
    window.downloadCsv('nhr-payroll-ytd-' + new Date().toISOString().slice(0, 10) + '.csv',
      [{ label: 'Employee', key: 'name' }, { label: 'Reference', key: 'ref' }, { label: 'Department', key: 'dept' },
      { label: 'Periods', key: 'periods' }, { label: 'YTD gross', key: 'gross' }, { label: 'YTD tax', key: 'tax' },
      { label: 'YTD NI', key: 'ni' }, { label: 'YTD pension', key: 'pension' }, { label: 'YTD net', key: 'net' }],
      employees.map(e => {
        const y = P.ytd(e.id);
        return {
          name: S.fullName(e), ref: e.employeeId, dept: e.department, periods: y.periods,
          gross: y.gross.toFixed(2), tax: y.tax.toFixed(2), ni: y.ni.toFixed(2),
          pension: y.pension.toFixed(2), net: y.net.toFixed(2)
        };
      }));
  }

  if (!published.length) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="ChartColumn" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No reporting data yet</span>
        <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)', maxWidth: 460 }}>
          Reports build from approved pay runs. Approve at least one run to see cost trends and department breakdowns.
        </span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Latest gross" value={window.gbp0(t.gross)} caption={latest.period.label} icon={<Icon name="Wallet" size={18} />} />
        <StatTile label="Employer NI" value={window.gbp0(t.employerNi)} caption="15% above £5,000" icon={<Icon name="Landmark" size={18} />} />
        <StatTile label="Pension cost" value={window.gbp0(t.employerPension)} caption="Employer contributions" icon={<Icon name="PiggyBank" size={18} />} />
        <StatTile label="Total cost" value={window.gbp0(t.cost)} caption="Gross plus on-costs" icon={<Icon name="Receipt" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>{published.length} published {published.length === 1 ? 'run' : 'runs'}</span>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" onClick={exportYtd} iconLeft={<Icon name="Download" size={15} />}>Export Year to Date</Button>
      </Card>

      <div className="pay-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Employer cost by period" action={<Badge tone="dark">Last 6</Badge>}>
          <BarChart height={175} data={trend} />
        </DashboardCard>
        <DashboardCard title="Cost by department" action={<Badge tone="dark">{latest.period.label}</Badge>}>
          {deptBars.length ? <BarChart height={175} data={deptBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No lines in the latest run.</span>}
        </DashboardCard>
      </div>

      <DashboardCard title="Year to date by employee" padding={16}>
        <DataTable compact columns={[
          { key: 'name', label: 'Employee' }, { key: 'periods', label: 'Periods', mono: true, align: 'right' },
          { key: 'gross', label: 'Gross', mono: true, align: 'right' },
          { key: 'tax', label: 'Tax', mono: true, align: 'right' },
          { key: 'ni', label: 'NI', mono: true, align: 'right' },
          { key: 'net', label: 'Net', mono: true, align: 'right' }
        ]} rows={employees.map(e => {
          const y = P.ytd(e.id);
          return {
            id: e.id, name: S.fullName(e), periods: y.periods,
            gross: window.gbp0(y.gross), tax: window.gbp0(y.tax),
            ni: window.gbp0(y.ni), net: window.gbp0(y.net)
          };
        }).filter(r => r.periods > 0)} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Figures use {window.PayrollEngine.RATES.taxYear} rates for England, Wales and Northern Ireland. PAYE is estimated from annualised pay
          rather than HMRC's cumulative tables, and Scottish rates, student loans, salary sacrifice and statutory payments are not modelled.
          NHR Solution makes no claim of HMRC recognition or payroll accreditation — do not use these figures to pay anyone without
          checking them against your payroll provider.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function PayrollScreenFull() {
  const data = window.usePayrollData();
  const [view, setView] = React.useState('Runs');
  const [openRunId, setOpenRunId] = React.useState(null);
  const [payslip, setPayslip] = React.useState(null);
  const open = data.runs.filter(r => r.status === 'Draft' || r.status === 'Calculated').length;

  const showPayslip = (runId, employeeKey) => setPayslip({ runId, employeeKey });

  /* Pay data is permission-gated for the whole module, not per tab. */
  if (!data.S.can('payroll.read')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Payroll</h2>
        {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="Lock" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Payroll is restricted</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 470 }}>
            Your role cannot see salary, tax or bank details. Switch to Super Admin or HR Admin to open payroll.
          </span>
        </Card>
      </div>
    );
  }

  const body = openRunId
    ? <window.PayrollRunDetail data={data} runId={openRunId} onBack={() => setOpenRunId(null)} onPayslip={showPayslip} />
    : {
      'Runs': <window.PayrollRuns data={data} onOpen={setOpenRunId} />,
      'Payslips': <PayslipLibrary data={data} onPayslip={showPayslip} />,
      'Employees': <PayrollEmployees data={data} />,
      'Reports': <PayrollReports data={data} />
    }[view];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Payroll</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Pay runs driven by the records you already keep. Salaries, approved overtime and approved expenses feed the calculation, and payslips publish on approval.
          </p>
        </div>
      </div>

      {!openRunId && <window.PayrollSubnav view={view} onSelect={setView} counts={{ open }} />}
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body}</div>
      {payslip && <Payslip data={data} runId={payslip.runId} employeeKey={payslip.employeeKey} onClose={() => setPayslip(null)} />}
    </div>
  );
}

Object.assign(window, { PayrollScreenFull, Payslip, PayrollEmployees, PayslipLibrary, PayrollReports });
