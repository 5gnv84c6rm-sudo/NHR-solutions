/* NHR Solution — Payroll module: run list, run detail and payslip.
   Reads employees from EmployeeStore and hours/expenses from EmployeeRecords,
   so a pay run is driven by data already captured elsewhere in the platform. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const RUN_TONE = { Draft: 'dark', Calculated: 'warning', Approved: 'success', Paid: 'success' };
const gbp = n => '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = n => '£' + Math.round(Number(n || 0)).toLocaleString('en-GB');

function PayrollSubnav({ view, onSelect, counts }) {
  const items = [['Runs', 'Calculator'], ['Payslips', 'FileText'], ['Employees', 'Users'], ['Reports', 'ChartColumn']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
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
            {label === 'Runs' && counts.open > 0 && <Badge tone="warning">{counts.open}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function usePayrollData() {
  const S = window.EmployeeStore, P = window.PayrollStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => P.subscribe(force), []);
  React.useEffect(() => window.EmployeeRecords.subscribe(force), []);
  return { employees: S.list({}), runs: P.runs(), refresh: force, S, P, E: window.PayrollEngine };
}

/* ---------------- Runs ---------------- */
function PayrollRuns({ data, onOpen }) {
  const { employees, runs, S, P, refresh } = data;
  const canRun = S.can('payroll.read') && S.can('employees.write');
  const [offset, setOffset] = React.useState(0);
  const period = P.currentPeriod(offset);
  const existing = runs.find(r => r.period.key === period.key);

  const lastPaid = runs.find(r => r.status === 'Paid');
  const openRuns = runs.filter(r => r.status === 'Draft' || r.status === 'Calculated');
  const ytdCost = runs.filter(r => r.status === 'Approved' || r.status === 'Paid')
    .reduce((n, r) => n + P.totals(r).cost, 0);

  if (!S.can('payroll.read')) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="Lock" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Payroll is restricted</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 460 }}>
          Your role cannot see pay data. Switch to Super Admin or HR Admin to open payroll.
        </span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open runs" value={String(openRuns.length)} caption="Draft or awaiting approval" icon={<Icon name="Calculator" size={18} />} />
        <StatTile label="On payroll" value={String(employees.filter(e => (e.payroll || {}).salary || (e.payroll || {}).hourlyRate).length)} caption={'of ' + employees.length + ' employees'} icon={<Icon name="Users" size={18} />} />
        <StatTile label="Last paid" value={lastPaid ? lastPaid.period.label.split(' ')[0] : '—'} caption={lastPaid ? gbp0(P.totals(lastPaid).net) + ' net' : 'No runs paid yet'} icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Cost this year" value={gbp0(ytdCost)} caption="Approved and paid runs" icon={<Icon name="Landmark" size={18} />} />
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton tone="dark" size={32} label="Previous period" onClick={() => setOffset(o => o - 1)}><Icon name="ChevronLeft" size={16} /></IconButton>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 160, textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{period.label}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>Pay date {window.shortDate(period.payDate)}</span>
          </span>
          <IconButton tone="dark" size={32} label="Next period" onClick={() => setOffset(o => o + 1)}><Icon name="ChevronRight" size={16} /></IconButton>
        </span>
        {offset !== 0 && <Button size="xs" variant="ghost" tone="dark" onClick={() => setOffset(0)}>This month</Button>}
        <span style={{ flex: 1 }} />
        {existing
          ? <Button size="sm" onClick={() => onOpen(existing.id)} iconRight={<Icon name="ArrowRight" size={15} />}>Open {existing.status} Run</Button>
          : canRun && <Button size="sm" onClick={() => { const r = P.openRun(period, employees); refresh(); onOpen(r.id); }} iconLeft={<Icon name="Plus" size={16} />}>Start Pay Run</Button>}
      </Card>

      <DashboardCard title={'Pay runs (' + runs.length + ')'} padding={16}>
        {runs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runs.map(r => {
              const t = P.totals(r);
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                  <span style={{
                    width: 46, height: 46, flex: '0 0 auto', borderRadius: 'var(--radius-md)',
                    background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.24)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                  }}><Icon name="Calculator" size={19} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 160 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{r.period.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                      Pay date {window.shortDate(r.period.payDate)} · {t.count} {t.count === 1 ? 'employee' : 'employees'}
                    </span>
                  </span>
                  {[['Gross', t.gross], ['Net', t.net], ['Cost', t.cost]].map(([label, v]) => (
                    <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 84 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: label === 'Net' ? 'var(--nhr-turquoise)' : '#fff' }}>{gbp0(v)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                    </span>
                  ))}
                  <Badge tone={RUN_TONE[r.status] || 'dark'}>{r.status}</Badge>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => onOpen(r.id)}>Open</Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="Calculator" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>No pay runs yet</span>
            <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)', maxWidth: 460 }}>
              Start a run for the current period. Salaries, approved overtime and approved expenses are read from the employee records.
            </span>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Run detail ---------------- */
function PayrollRunDetail({ data, runId, onBack, onPayslip }) {
  const { S, P, refresh } = data;
  const run = P.get(runId);
  const [adjusting, setAdjusting] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const canWrite = S.can('employees.write') && S.can('payroll.read');
  if (!run) return null;

  const t = P.totals(run);
  const locked = run.status === 'Approved' || run.status === 'Paid';
  const calculated = run.lines.some(l => l.result);
  const allWarnings = run.lines.filter(l => l.result && l.result.warnings.length);
  const missing = run.lines.filter(l => {
    const e = S.get(l.employeeKey);
    const p = (e && e.payroll) || {};
    return l.include && !p.salary && !p.hourlyRate;
  });

  const steps = ['Draft', 'Calculated', 'Approved', 'Paid'];
  const stepIndex = steps.indexOf(run.status);

  function exportRun() {
    window.downloadCsv('nhr-payroll-' + run.period.key + '.csv',
      [{ label: 'Employee', key: 'name' }, { label: 'Reference', key: 'ref' }, { label: 'Payroll ID', key: 'pid' },
      { label: 'Department', key: 'dept' }, { label: 'Tax code', key: 'code' }, { label: 'Gross', key: 'gross' },
      { label: 'Overtime', key: 'ot' }, { label: 'Income tax', key: 'tax' }, { label: 'Employee NI', key: 'ni' },
      { label: 'Pension', key: 'pension' }, { label: 'Expenses', key: 'exp' }, { label: 'Net pay', key: 'net' },
      { label: 'Employer NI', key: 'erni' }, { label: 'Employer pension', key: 'erp' }, { label: 'Total cost', key: 'cost' }],
      run.lines.filter(l => l.include && l.result).map(l => ({
        name: l.employeeName, ref: l.employeeRef, pid: l.payrollId, dept: l.department,
        code: l.result.taxCode, gross: l.result.gross.toFixed(2), ot: l.result.overtime.toFixed(2),
        tax: l.result.tax.toFixed(2), ni: l.result.ni.toFixed(2), pension: l.result.pension.toFixed(2),
        exp: l.result.expenses.toFixed(2), net: l.result.net.toFixed(2),
        erni: l.result.employerNi.toFixed(2), erp: l.result.employerPension.toFixed(2),
        cost: l.result.employerCost.toFixed(2)
      })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button type="button" onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nhr-turquoise)',
        fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: 700, padding: 0, whiteSpace: 'nowrap'
      }}><Icon name="ArrowLeft" size={15} />All pay runs</button>

      <Card tone="dark" padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>{run.period.label}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
              {window.shortDate(run.period.periodStart)} – {window.shortDate(run.period.periodEnd)} · pay date {window.shortDate(run.period.payDate)}
            </span>
          </span>
          <Badge tone={RUN_TONE[run.status] || 'dark'}>{run.status}</Badge>
          {canWrite && (
            <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!locked && <Button size="sm" variant="secondary" tone="dark" onClick={() => { P.calculate(run.id); refresh(); }} iconLeft={<Icon name="RefreshCw" size={15} />}>
                {calculated ? 'Recalculate' : 'Calculate'}
              </Button>}
              {run.status === 'Calculated' && <Button size="sm" onClick={() => { P.approve(run.id, S.session.name); refresh(); }} iconLeft={<Icon name="Check" size={15} />}>Approve Run</Button>}
              {run.status === 'Approved' && <Button size="sm" onClick={() => { P.markPaid(run.id); refresh(); }} iconLeft={<Icon name="Banknote" size={15} />}>Mark as Paid</Button>}
              {run.status === 'Calculated' && <Button size="sm" variant="ghost" tone="dark" onClick={() => { P.reopen(run.id); refresh(); }}>Reopen</Button>}
              {calculated && <Button size="sm" variant="secondary" tone="dark" onClick={exportRun} iconLeft={<Icon name="Download" size={15} />}>Export</Button>}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: '1 1 120px', minWidth: 0 }}>
              <span style={{
                width: 24, height: 24, flex: '0 0 auto', borderRadius: '50%', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                background: i <= stepIndex ? 'rgba(0,229,212,.16)' : 'rgba(255,255,255,.05)',
                border: '1px solid ' + (i <= stepIndex ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                color: i <= stepIndex ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)'
              }}>{i < stepIndex ? <Icon name="Check" size={12} /> : i + 1}</span>
              <span style={{ fontSize: 12.5, fontWeight: i === stepIndex ? 700 : 600, color: i <= stepIndex ? '#fff' : 'var(--text-muted-dark)' }}>{s}</span>
              {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: i < stepIndex ? 'rgba(0,229,212,.3)' : 'var(--border-dark)', minWidth: 12 }} />}
            </span>
          ))}
        </div>
        {run.approvedBy && (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
            Approved by {run.approvedBy} on {window.shortDate(run.approvedAt)}{run.paidAt ? ' · marked paid ' + window.shortDate(run.paidAt) : ''}
          </span>
        )}
      </Card>

      {missing.length > 0 && (
        <Notice icon="TriangleAlert" tone="warn">
          {missing.length} {missing.length === 1 ? 'employee has' : 'employees have'} no salary or hourly rate on record and will calculate as zero. Add pay details on their employee record first.
        </Notice>
      )}

      {calculated && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
          <StatTile label="Gross pay" value={gbp0(t.gross)} caption={t.count + ' employees'} icon={<Icon name="Wallet" size={18} />} />
          <StatTile label="Deductions" value={gbp0(t.tax + t.ni + t.pension)} caption="Tax, NI and pension" icon={<Icon name="Minus" size={18} />} />
          <StatTile label="Net pay" value={gbp0(t.net)} caption="Leaving the account" icon={<Icon name="Banknote" size={18} />} />
          <StatTile label="Employer cost" value={gbp0(t.cost)} caption="Gross plus NI and pension" icon={<Icon name="Landmark" size={18} />} />
        </div>
      )}

      {allWarnings.length > 0 && (
        <DashboardCard title={'Exceptions (' + allWarnings.length + ')'} padding={16} action={<Badge tone="warning">Check before approving</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {allWarnings.map(l => (
              <div key={l.employeeKey} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-body-dark)' }}>
                <Icon name="TriangleAlert" size={15} style={{ color: 'var(--nhr-warning)', flex: '0 0 auto', marginTop: 2 }} />
                <span><strong style={{ color: '#fff' }}>{l.employeeName}</strong> — {l.result.warnings.join(' ')}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      <DashboardCard title={'Pay lines (' + run.lines.length + ')'} padding={16}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {run.lines.map(l => {
            const r = l.result;
            return (
              <div key={l.employeeKey} style={{
                display: 'flex', flexDirection: 'column', gap: 11, padding: 14,
                border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
                background: l.include ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.01)',
                opacity: l.include ? 1 : .55
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={S.get(l.employeeKey)} size={36} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{l.employeeName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {l.department}{l.payrollId ? ' · ' + l.payrollId : ''}{r ? ' · ' + r.taxCode : ''}
                    </span>
                  </span>
                  {r ? (
                    <React.Fragment>
                      {[['Gross', r.gross], ['Tax', r.tax], ['NI', r.ni], ['Pension', r.pension]].map(([label, v]) => (
                        <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 70 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{gbp(v)}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                        </span>
                      ))}
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 80 }}>
                        <span style={{ fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{gbp(r.net)}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Net</span>
                      </span>
                      <Button size="xs" variant="secondary" tone="dark" onClick={() => onPayslip(run.id, l.employeeKey)}>Payslip</Button>
                    </React.Fragment>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{l.include ? 'Not calculated yet' : 'Excluded from this run'}</span>
                  )}
                  {canWrite && !locked && (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <IconButton tone="dark" size={30} label={l.include ? 'Exclude from run' : 'Include in run'}
                        onClick={() => { P.setLine(run.id, l.employeeKey, { include: !l.include, result: null }); refresh(); }}>
                        <Icon name={l.include ? 'UserMinus' : 'UserPlus'} size={14} />
                      </IconButton>
                      <IconButton tone="dark" size={30} label="Add bonus or adjustment"
                        onClick={() => { setAdjusting(adjusting === l.employeeKey ? null : l.employeeKey); setDraft(String(l.adjustment || '')); }}>
                        <Icon name="Pencil" size={14} />
                      </IconButton>
                    </span>
                  )}
                </div>
                {l.adjustment ? <span style={{ fontSize: 12, color: 'var(--nhr-turquoise)' }}>Adjustment applied: {gbp(l.adjustment)}{l.note ? ' — ' + l.note : ''}</span> : null}
                {adjusting === l.employeeKey && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    <span style={{ minWidth: 140 }}>
                      <TextField label="Bonus / adjustment (£)" value={draft} onChange={setDraft} mono placeholder="0.00" />
                    </span>
                    <Button size="sm" onClick={() => {
                      P.setLine(run.id, l.employeeKey, { adjustment: Number(draft) || 0 });
                      P.calculate(run.id); setAdjusting(null); refresh();
                    }}>Apply &amp; Recalculate</Button>
                    <Button size="sm" variant="ghost" tone="dark" onClick={() => setAdjusting(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}

Object.assign(window, { RUN_TONE, gbp, gbp0, PayrollSubnav, usePayrollData, PayrollRuns, PayrollRunDetail });
