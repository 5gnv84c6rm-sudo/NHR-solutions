/* NHR Solution — Expenses module (company-wide).

   The per-employee Expenses tab holds one person's claims; this screen is the
   approver and finance view: what is waiting for a decision, what has been
   approved and is owed, mileage at HMRC rates, and spend by category and
   department.

   Claims live in EmployeeRecords ('expenses'), the same store the employee tab
   writes to. Approved claims in the pay period are read by the Payroll module
   as a non-taxable reimbursement, so approving here changes what someone is
   paid.

   HMRC approved mileage rates (2025/26): 45p per mile for the first 10,000
   business miles in the tax year, 25p thereafter; 24p for motorcycles, 20p for
   bicycles. Anything above those rates is taxable, which is why the claim form
   warns rather than silently accepting it.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const EXP_DAY = 864e5;
const EXP_TONE = { Approved: 'success', Pending: 'warning', Rejected: 'danger', Paid: 'success', Queried: 'dark' };
const MILEAGE_RATES = { Car: [0.45, 0.25], Motorcycle: [0.24, 0.24], Bicycle: [0.20, 0.20] };
const MILEAGE_THRESHOLD = 10000;

/* Claims over this amount need a second approval — an illustrative default,
   set to whatever your finance policy says. */
const SECOND_APPROVAL_OVER = 500;
/* Receipts are expected above this figure. */
const RECEIPT_REQUIRED_OVER = 25;

const money = n => '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => '£' + Math.round(Number(n || 0)).toLocaleString('en-GB');

/* Mileage owed for a journey, honouring the 10,000-mile cliff edge using the
   miles already claimed this tax year. */
function mileageValue(miles, vehicle, priorMiles) {
  const rates = MILEAGE_RATES[vehicle] || MILEAGE_RATES.Car;
  const before = Math.max(0, Math.min(miles, MILEAGE_THRESHOLD - (priorMiles || 0)));
  const after = Math.max(0, miles - before);
  return Math.round((before * rates[0] + after * rates[1]) * 100) / 100;
}

/* UK tax year start for the given date — 6 April. */
function taxYearStart(d) {
  const dt = new Date(d || Date.now());
  const y = dt.getMonth() > 3 || (dt.getMonth() === 3 && dt.getDate() >= 6) ? dt.getFullYear() : dt.getFullYear() - 1;
  return y + '-04-06';
}

function ExpensesSubnav({ view, onSelect, counts }) {
  const items = [['Approvals', 'ClipboardCheck'], ['All Claims', 'Receipt'], ['Mileage', 'Car'], ['Reports', 'ChartColumn']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Approvals' ? counts.pending : 0;
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

function useExpenseData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const claims = [];
  employees.forEach(e => {
    const set = R.get(e);
    (set.expenses || []).forEach(x => {
      /* Older claims recorded an amount without the mileage behind it. Read the
         distance from the description where it is stated, otherwise infer it at
         the 45p rate, so mileage totals and values agree. */
      let miles = Number(x.miles) || 0;
      if (!miles && x.category === 'Mileage') {
        const stated = /(\d+(?:\.\d+)?)\s*miles?/i.exec(x.description || '');
        miles = stated ? Number(stated[1]) : Math.round((Number(x.amount) || 0) / MILEAGE_RATES.Car[0]);
      }
      claims.push(Object.assign({}, x, {
        miles,
        employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
        department: e.department, jobTitle: e.jobTitle, employee: e,
        needsReceipt: Number(x.amount) > RECEIPT_REQUIRED_OVER && !x.receipt,
        needsSecond: Number(x.amount) > SECOND_APPROVAL_OVER
      }));
    });
  });
  claims.sort((a, b) => a.date < b.date ? 1 : -1);

  /* Business miles claimed per employee this tax year, so the next claim uses
     the right rate band. */
  const yearStart = taxYearStart();
  const milesByEmployee = {};
  claims.filter(x => x.category === 'Mileage' && x.date >= yearStart && x.status !== 'Rejected')
    .forEach(x => { milesByEmployee[x.employeeKey] = (milesByEmployee[x.employeeKey] || 0) + (Number(x.miles) || 0); });

  return { employees, claims, milesByEmployee, yearStart, refresh: force, S, R };
}

/* ---------------- Approvals ---------------- */
function ExpenseApprovals({ data }) {
  const { claims, S, R, refresh } = data;
  const canApprove = S.can('employees.write');
  const [dept, setDept] = React.useState('All');
  const [open, setOpen] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [claiming, setClaiming] = React.useState(false);

  const pending = claims.filter(x => x.status === 'Pending' || x.status === 'Queried');
  const list = pending.filter(x => dept === 'All' || x.department === dept);

  const owed = pending.reduce((n, x) => n + (Number(x.amount) || 0), 0);
  const noReceipt = pending.filter(x => x.needsReceipt);
  const bigOnes = pending.filter(x => x.needsSecond);
  const oldest = pending.length ? Math.max.apply(null, pending.map(x => Math.floor((Date.now() - new Date(x.submittedAt || x.date)) / EXP_DAY))) : 0;

  function decide(x, status) {
    R.update(x.employeeKey, 'expenses', x.id, {
      status,
      decidedBy: S.session.name,
      decidedAt: new Date().toISOString().slice(0, 10),
      decisionNote: note || ''
    });
    S.logActivity(x.employeeKey, 'Expense claim ' + status.toLowerCase() + ': ' + x.description + ' — ' + money(x.amount) +
      (note ? ' (' + note + ')' : ''));
    setOpen(null); setNote(''); refresh();
  }

  function approveAll() {
    const safe = list.filter(x => !x.needsReceipt && !x.needsSecond);
    safe.forEach(x => {
      R.update(x.employeeKey, 'expenses', x.id, {
        status: 'Approved', decidedBy: S.session.name,
        decidedAt: new Date().toISOString().slice(0, 10), decisionNote: 'Bulk approved'
      });
      S.logActivity(x.employeeKey, 'Expense claim approved: ' + x.description + ' — ' + money(x.amount));
    });
    refresh();
  }

  const straightforward = list.filter(x => !x.needsReceipt && !x.needsSecond).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Awaiting decision" value={String(pending.length)} caption={money0(owed) + ' in total'} icon={<Icon name="ClipboardCheck" size={18} />} />
        <StatTile label="Oldest claim" value={oldest + (oldest === 1 ? ' day' : ' days')} caption="Since submission" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Missing receipts" value={String(noReceipt.length)} caption={'Over ' + money0(RECEIPT_REQUIRED_OVER)} icon={<Icon name="ReceiptText" size={18} />} />
        <StatTile label="Second approval" value={String(bigOnes.length)} caption={'Over ' + money0(SECOND_APPROVAL_OVER)} icon={<Icon name="ShieldCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
          Approved claims feed the next pay run as a non-taxable reimbursement.
        </span>
        <span style={{ flex: 1 }} />
        {canApprove && straightforward > 0 && (
          <Button size="sm" variant="secondary" tone="dark" onClick={approveAll} iconLeft={<Icon name="CheckCheck" size={15} />}>
            Approve {straightforward} Straightforward
          </Button>
        )}
        {canApprove && <Button size="sm" onClick={() => setClaiming(true)} iconLeft={<Icon name="Plus" size={16} />}>New Claim</Button>}
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(x => {
            const flagged = x.needsReceipt || x.needsSecond;
            const age = Math.floor((Date.now() - new Date(x.submittedAt || x.date)) / EXP_DAY);
            return (
              <Card key={x.employeeKey + x.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: flagged ? 'rgba(242,180,65,.28)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={x.employee} size={38} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 175 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{x.description}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                      {x.employeeName} · {x.category} · {window.shortDate(x.date)}
                      {x.miles ? ' · ' + x.miles + ' miles' : ''}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 86 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{money(x.amount)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{age === 0 ? 'today' : age + 'd ago'}</span>
                  </span>
                  {x.receipt ? <Badge tone="dark">Receipt</Badge> : <Badge tone={x.needsReceipt ? 'warning' : 'dark'}>No receipt</Badge>}
                  <Badge tone={EXP_TONE[x.status] || 'dark'}>{x.status}</Badge>
                  {canApprove && (
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button size="xs" variant="secondary" tone="dark" onClick={() => { setOpen(open === x.id ? null : x.id); setNote(''); }}>
                        {open === x.id ? 'Close' : 'Decide'}
                      </Button>
                      {!flagged && <Button size="xs" onClick={() => { setNote(''); decide(x, 'Approved'); }}>Approve</Button>}
                    </span>
                  )}
                </div>

                {flagged && (
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, lineHeight: 1.55, color: 'var(--nhr-warning)' }}>
                    <Icon name="TriangleAlert" size={14} style={{ flex: '0 0 auto', marginTop: 2 }} />
                    <span>
                      {x.needsReceipt && 'No receipt on a claim over ' + money0(RECEIPT_REQUIRED_OVER) + '. '}
                      {x.needsSecond && 'Over ' + money0(SECOND_APPROVAL_OVER) + ', so a second approver is expected under the illustrative policy.'}
                    </span>
                  </span>
                )}

                {open === x.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    <TextareaField label="Decision note (optional)" rows={2} value={note} onChange={setNote}
                      placeholder="Approved — receipt seen separately." />
                    <Notice icon="Info">
                      The note is written to the employee's activity trail alongside the decision, so there is a record of why.
                    </Notice>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                      <Button size="sm" variant="ghost" tone="dark" onClick={() => setOpen(null)}>Cancel</Button>
                      <Button size="sm" variant="secondary" tone="dark" onClick={() => decide(x, 'Queried')}>Query</Button>
                      <Button size="sm" variant="secondary" tone="dark" onClick={() => decide(x, 'Rejected')}>Reject</Button>
                      <Button size="sm" onClick={() => decide(x, 'Approved')} iconLeft={<Icon name="Check" size={15} />}>Approve</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing awaiting a decision</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>Every claim has been approved, queried or rejected.</span>
        </Card>
      )}

      {claiming && <NewClaimDialog data={data} onClose={() => setClaiming(false)} />}
    </div>
  );
}

/* ---------------- New claim ---------------- */
function NewClaimDialog({ data, onClose }) {
  const { employees, milesByEmployee, S, R, refresh } = data;
  const [form, setForm] = React.useState({
    employeeId: '', category: 'Travel', description: '', amount: '',
    date: new Date().toISOString().slice(0, 10), receipt: false,
    miles: '', vehicle: 'Car'
  });
  const [error, setError] = React.useState('');
  const isMileage = form.category === 'Mileage';
  const prior = form.employeeId ? (milesByEmployee[form.employeeId] || 0) : 0;
  const computed = isMileage ? mileageValue(Number(form.miles) || 0, form.vehicle, prior) : 0;
  const amount = isMileage ? computed : Number(form.amount) || 0;
  const crossesBand = isMileage && prior + (Number(form.miles) || 0) > MILEAGE_THRESHOLD;

  function submit() {
    if (!form.employeeId) return setError('Choose whose claim this is.');
    if (!form.description.trim()) return setError('Describe what the claim is for.');
    if (amount <= 0) return setError(isMileage ? 'Enter the miles travelled.' : 'Enter the amount claimed.');
    R.add(form.employeeId, 'expenses', {
      date: form.date, category: form.category, description: form.description,
      amount: Math.round(amount * 100) / 100, receipt: form.receipt,
      miles: isMileage ? Number(form.miles) || 0 : 0,
      vehicle: isMileage ? form.vehicle : '',
      status: 'Pending', submittedAt: new Date().toISOString().slice(0, 10),
      decidedBy: '', decidedAt: '', decisionNote: ''
    });
    S.logActivity(form.employeeId, 'Expense claim submitted: ' + form.description + ' — ' + money(amount));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="New Expense Claim"
      subtitle="Files against the employee record and enters the approval queue." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={R.EXPENSE_CATEGORIES} />
          <TextField label="Date of expense" type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
          <TextField label="Description" required span={2} value={form.description} onChange={v => setForm(p => Object.assign({}, p, { description: v }))}
            placeholder={isMileage ? 'Client site visit — Manchester to Leeds' : 'Train fare to client meeting'} />
          {isMileage ? (
            <React.Fragment>
              <TextField label="Miles travelled" required value={form.miles} onChange={v => setForm(p => Object.assign({}, p, { miles: v }))} mono />
              <SelectField label="Vehicle" value={form.vehicle} onChange={v => setForm(p => Object.assign({}, p, { vehicle: v }))} options={['Car', 'Motorcycle', 'Bicycle']} />
            </React.Fragment>
          ) : (
            <TextField label="Amount (£)" required value={form.amount} onChange={v => setForm(p => Object.assign({}, p, { amount: v }))} mono />
          )}
          <SelectField label="Receipt" span={isMileage ? 2 : 1} value={form.receipt ? 'Receipt attached' : 'No receipt'}
            onChange={v => setForm(p => Object.assign({}, p, { receipt: /attached/.test(v) }))}
            options={['Receipt attached', 'No receipt']} />
        </FormGrid>

        {isMileage && Number(form.miles) > 0 && (
          <Notice icon="Car">
            {form.miles} miles at HMRC approved rates comes to <strong style={{ color: '#fff' }}>{money(computed)}</strong>.
            {form.vehicle === 'Car'
              ? (crossesBand
                ? ' This crosses 10,000 business miles for the tax year, so part is at 45p and the rest at 25p.'
                : ' 45p per mile for the first 10,000 business miles (' + prior.toLocaleString('en-GB') + ' claimed so far this tax year).')
              : ' ' + (MILEAGE_RATES[form.vehicle][0] * 100) + 'p per mile for a ' + form.vehicle.toLowerCase() + '.'}
          </Notice>
        )}
        {!isMileage && amount > RECEIPT_REQUIRED_OVER && !form.receipt && (
          <Notice icon="TriangleAlert" tone="warn">
            Over {money0(RECEIPT_REQUIRED_OVER)} without a receipt — it will be flagged to the approver.
          </Notice>
        )}
        {amount > SECOND_APPROVAL_OVER && (
          <Notice icon="ShieldCheck">Over {money0(SECOND_APPROVAL_OVER)}, so a second approver is expected under the illustrative policy.</Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <Notice icon="Info">
          This prototype records the claim only — no receipt image is uploaded or stored. Reimbursement at or below HMRC
          approved mileage rates is not taxable; anything above them is, and needs reporting.
        </Notice>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Submit Claim</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, {
  EXP_TONE, EXP_DAY, MILEAGE_RATES, MILEAGE_THRESHOLD, SECOND_APPROVAL_OVER, RECEIPT_REQUIRED_OVER,
  money, money0, mileageValue, taxYearStart,
  ExpensesSubnav, useExpenseData, ExpenseApprovals, NewClaimDialog
});
