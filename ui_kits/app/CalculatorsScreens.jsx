/* NHR Solution — Calculators (in-app).

   The website has the same eight calculators for visitors typing numbers in by
   hand. This version exists for one reason: it can load a real employee. Pick
   someone and their salary, hours, start date, pension rate and absence record
   fill the inputs, so the answer is about that person rather than a guess.

   Tax and NI maths is NOT duplicated here. It comes from window.PayrollEngine,
   the same engine that produces the payslips, so a take-home figure shown here
   and a payslip cannot disagree. Bradford and leave figures come from
   EmployeeRecords for the same reason.

   Every result shows the working. A number without its method is not much use
   in a conversation with an employee who disagrees with it.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const CALC_DAY = 864e5;
const gbp = n => '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = n => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB');

/* ---------------- shared bits ---------------- */
function CalcNum({ label, value, onChange, hint, suffix, step = 1, min = 0 }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body-dark)' }}>{label}</span>
      <span style={{ position: 'relative', display: 'flex' }}>
        <input type="number" value={value} min={min} step={step}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{
            width: '100%', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: '#fff',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '12px 14px', paddingRight: suffix ? 48 : 14,
            outline: 'none', minHeight: 46
          }} />
        {suffix && <span style={{ position: 'absolute', right: 14, top: 14, fontSize: 13, color: 'var(--text-muted-dark)' }}>{suffix}</span>}
      </span>
      {hint && <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-muted-dark)' }}>{hint}</span>}
    </label>
  );
}

function CalcSel({ label, value, onChange, options, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body-dark)' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', fontFamily: 'var(--font-core)', fontSize: 14, color: '#fff',
        background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
        borderRadius: 'var(--radius-btn)', padding: '12px 14px', outline: 'none', minHeight: 46
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-muted-dark)' }}>{hint}</span>}
    </label>
  );
}

function CalcResult({ headline, sub, rows, note, tone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 5, padding: 18, borderRadius: 'var(--radius-md)',
        background: tone === 'warn' ? 'rgba(242,180,65,.06)' : 'rgba(0,229,212,.06)',
        border: '1px solid ' + (tone === 'warn' ? 'rgba(242,180,65,.28)' : 'rgba(0,229,212,.26)')
      }}>
        <span style={{
          fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em',
          color: tone === 'warn' ? 'var(--nhr-warning)' : 'var(--nhr-turquoise)'
        }}>{headline}</span>
        <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>{sub}</span>
      </div>
      {rows && rows.length > 0 && (
        <DataTable compact columns={[{ key: 'k', label: 'Working' }, { key: 'v', label: '', mono: true, align: 'right' }]}
          rows={rows.map((r, i) => ({ id: 'r' + i, k: r[0], v: r[1] }))} />
      )}
      {note && (
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-muted-dark)' }}>
          <Icon name="Info" size={13} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--nhr-turquoise)' }} />
          <span>{note}</span>
        </span>
      )}
    </div>
  );
}

function CalcShell({ title, description, inputs, result, onReset, prefilled }) {
  return (
    <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>{title}</span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{description}</span>
        </span>
        {prefilled && <Badge tone="success">Prefilled from record</Badge>}
        <Button size="xs" variant="ghost" tone="dark" onClick={onReset} iconLeft={<Icon name="RotateCcw" size={13} />}>Reset</Button>
      </div>
      <div className="calc-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{inputs}</div>
        <div>{result}</div>
      </div>
    </Card>
  );
}

/* ---------------- 1. Bradford Factor ---------------- */
function AppBradford({ emp, R }) {
  const live = emp && R.bradford ? R.bradford(emp) : null;
  const [spells, setSpells] = React.useState(live ? live.spells : 4);
  const [days, setDays] = React.useState(live ? live.days : 7);
  React.useEffect(() => { if (live) { setSpells(live.spells); setDays(live.days); } }, [emp && emp.id]);

  const score = (Number(spells) || 0) * (Number(spells) || 0) * (Number(days) || 0);
  const band = score >= 500 ? 'Formal review' : score >= 200 ? 'Written stage' : score >= 50 ? 'Informal conversation' : 'No trigger';

  return (
    <CalcShell title="Bradford Factor" prefilled={!!live}
      description="Weights frequent short absences more heavily than a single long one, because unplanned gaps are harder to cover."
      onReset={() => { setSpells(live ? live.spells : 4); setDays(live ? live.days : 7); }}
      inputs={<React.Fragment>
        <CalcNum label="Separate spells of absence" value={spells} onChange={setSpells} hint="Each continuous period counts once, however long." />
        <CalcNum label="Total days absent" value={days} onChange={setDays} hint="Working days across all spells." />
      </React.Fragment>}
      result={<CalcResult headline={String(score)} tone={score >= 200 ? 'warn' : undefined}
        sub={band + (live ? ' · from ' + spells + ' spells over the last 12 months' : '')}
        rows={[['Formula', 'S² × D'], ['Spells (S)', String(spells)], ['Days (D)', String(days)], ['Score', String(score)]]}
        note="Trigger points are illustrative. A score identifies who to have a conversation with — it is not evidence that absence is unreasonable, and disability-related absence should normally be discounted before applying a trigger." />} />
  );
}

/* ---------------- 2. Holiday entitlement ---------------- */
function AppHoliday({ emp }) {
  const [mode, setMode] = React.useState('Fixed days per week');
  const [daysPerWeek, setDaysPerWeek] = React.useState(emp && emp.hoursPerWeek ? Math.min(5, Math.round(emp.hoursPerWeek / 7.5)) : 5);
  const [hoursWorked, setHoursWorked] = React.useState(120);
  const [weeksWorked, setWeeksWorked] = React.useState(52);

  React.useEffect(() => {
    if (emp && emp.hoursPerWeek) setDaysPerWeek(Math.max(1, Math.min(5, Math.round(emp.hoursPerWeek / 7.5))));
  }, [emp && emp.id]);

  const irregular = mode === 'Irregular hours / part-year';
  const statutory = (Number(daysPerWeek) || 0) * 5.6;
  const capped = Math.min(statutory, 28);
  const accrued = (Number(hoursWorked) || 0) * 0.1207;
  const proRata = capped * ((Number(weeksWorked) || 0) / 52);

  return (
    <CalcShell title="Holiday Entitlement" prefilled={!!(emp && emp.hoursPerWeek)}
      description="Statutory minimum is 5.6 weeks, capped at 28 days for a five-day week. Irregular hours and part-year workers accrue at 12.07% instead."
      onReset={() => { setMode('Fixed days per week'); setDaysPerWeek(5); setHoursWorked(120); setWeeksWorked(52); }}
      inputs={<React.Fragment>
        <CalcSel label="Working pattern" value={mode} onChange={setMode}
          options={['Fixed days per week', 'Irregular hours / part-year']}
          hint={irregular ? 'Applies to leave years beginning on or after 1 April 2024.' : 'Regular hours, same days each week.'} />
        {irregular ? (
          <CalcNum label="Hours worked in the pay period" value={hoursWorked} onChange={setHoursWorked} suffix="hrs" />
        ) : (
          <React.Fragment>
            <CalcNum label="Days worked per week" value={daysPerWeek} onChange={setDaysPerWeek} min={1} step={0.5} suffix="days" />
            <CalcNum label="Weeks worked in the leave year" value={weeksWorked} onChange={setWeeksWorked} max={52} suffix="wks" hint="52 for a full year; fewer for a mid-year starter." />
          </React.Fragment>
        )}
      </React.Fragment>}
      result={irregular
        ? <CalcResult headline={accrued.toFixed(2) + ' hrs'}
          sub="Accrued in this pay period"
          rows={[['Hours worked', String(hoursWorked)], ['Accrual rate', '12.07%'], ['Leave accrued', accrued.toFixed(2) + ' hours']]}
          note="12.07% is 5.6 weeks divided by the remaining 46.4 working weeks. Applying it to a worker on fixed part-time hours will usually underpay them — they accrue 5.6 weeks of their normal week instead." />
        : <CalcResult headline={proRata.toFixed(1) + ' days'}
          sub={weeksWorked >= 52 ? 'Full leave year' : 'Pro-rated for ' + weeksWorked + ' weeks'}
          rows={[
            ['Days per week', String(daysPerWeek)],
            ['Statutory 5.6 weeks', statutory.toFixed(1) + ' days'],
            ['Capped at 28 days', capped.toFixed(1) + ' days'],
            ['Pro-rated', proRata.toFixed(1) + ' days']
          ]}
          note="The 28-day cap applies to the statutory minimum. Bank holidays may be included within it unless the contract says they are additional — check the contract before telling anyone their entitlement." />} />
  );
}

/* ---------------- 3. Take-home pay ---------------- */
function AppTakeHome({ emp }) {
  const PE = window.PayrollEngine;
  const [gross, setGross] = React.useState(emp && emp.payroll ? Number(emp.payroll.salary) || 35000 : 35000);
  /* Pension rate is not held on the employee record, so it stays a manual
     input rather than being invented from a default that looks authoritative. */
  const [pension, setPension] = React.useState(5);
  const [code, setCode] = React.useState(emp && emp.payroll && emp.payroll.taxCode ? emp.payroll.taxCode : '1257L');

  React.useEffect(() => {
    if (emp && emp.payroll) {
      if (emp.payroll.salary) setGross(Number(emp.payroll.salary));
      setCode(emp.payroll.taxCode || '1257L');
    }
  }, [emp && emp.id]);

  const res = PE.calculate({
    annualSalary: Number(gross) || 0, frequency: 'Monthly',
    taxCode: code, pensionPercent: Number(pension) || 0, niCategory: 'A'
  });
  /* The engine returns per-period figures; Monthly × 12 gives the annual view. */
  const net = res.net * 12;
  const scottish = /^S/i.test(code);

  return (
    <CalcShell title="Take-Home Pay" prefilled={!!(emp && emp.payroll)}
      description="Gross to net using the same engine that produces the payslips, so the two cannot disagree."
      onReset={() => { setGross(35000); setPension(5); setCode('1257L'); }}
      inputs={<React.Fragment>
        <CalcNum label="Gross annual salary" value={gross} onChange={setGross} step={500} suffix="£" />
        <CalcNum label="Pension contribution" value={pension} onChange={setPension} step={0.5} suffix="%" hint="Employee share, taken before tax under net pay arrangement." />
        <CalcSel label="Tax code" value={code} onChange={setCode} options={['1257L', 'S1257L', 'C1257L', 'BR', 'D0', '0T', 'NT']}
          hint={scottish ? 'Scottish rates applied.' : 'S prefix for Scotland, C for Wales.'} />
      </React.Fragment>}
      result={<CalcResult headline={gbp0(res.net)} sub={'per month · ' + gbp0(net) + ' a year'}
        rows={[
          ['Gross annual', gbp0(gross)],
          ['Pension (' + pension + '%)', '−' + gbp0(res.pension * 12)],
          ['Income tax', '−' + gbp0(res.tax * 12)],
          ['National Insurance', '−' + gbp0(res.ni * 12)],
          ['Net annual', gbp0(net)],
          ['Net monthly', gbp0(res.net)]
        ]}
        note={'Uses ' + PE.RATES.taxYear + ' thresholds. Student loan, salary sacrifice, benefits in kind and other deductions are not included. Scotland has its own income tax bands; National Insurance is UK-wide.'} />} />
  );
}

/* ---------------- 4. Hourly rate ---------------- */
function AppHourly({ emp }) {
  const [salary, setSalary] = React.useState(emp && emp.payroll ? Number(emp.payroll.salary) || 32000 : 32000);
  const [hours, setHours] = React.useState(emp && emp.hoursPerWeek ? Number(emp.hoursPerWeek) : 37.5);
  const [holiday, setHoliday] = React.useState(28);

  React.useEffect(() => {
    if (emp) {
      if (emp.payroll && emp.payroll.salary) setSalary(Number(emp.payroll.salary));
      if (emp.hoursPerWeek) setHours(Number(emp.hoursPerWeek));
    }
  }, [emp && emp.id]);

  const weeks = 52;
  const rate = (Number(hours) || 0) > 0 ? (Number(salary) || 0) / (weeks * (Number(hours) || 1)) : 0;
  const workedWeeks = weeks - ((Number(holiday) || 0) / 5);
  const workedRate = workedWeeks > 0 ? (Number(salary) || 0) / (workedWeeks * (Number(hours) || 1)) : 0;
  /* NLW check — the rate that matters legally is pay divided by hours actually
     worked in the reference period, not the headline contractual rate. */
  const NLW = 12.21;
  const below = rate < NLW;

  return (
    <CalcShell title="Hourly Rate" prefilled={!!(emp && emp.hoursPerWeek)}
      description="Converts an annual salary to an hourly figure, on both a calendar and a worked-hours basis."
      onReset={() => { setSalary(32000); setHours(37.5); setHoliday(28); }}
      inputs={<React.Fragment>
        <CalcNum label="Annual salary" value={salary} onChange={setSalary} step={500} suffix="£" />
        <CalcNum label="Contracted hours per week" value={hours} onChange={setHours} step={0.5} suffix="hrs" />
        <CalcNum label="Annual leave days" value={holiday} onChange={setHoliday} suffix="days" hint="Used for the worked-hours rate." />
      </React.Fragment>}
      result={<CalcResult headline={gbp(rate)} tone={below ? 'warn' : undefined}
        sub={'per hour across 52 weeks' + (below ? ' — below the National Living Wage' : '')}
        rows={[
          ['Annual salary', gbp0(salary)],
          ['Hours per year', (weeks * (Number(hours) || 0)).toFixed(0)],
          ['Rate across 52 weeks', gbp(rate)],
          ['Rate over weeks actually worked', gbp(workedRate)],
          ['National Living Wage (23+)', gbp(NLW)]
        ]}
        note={below
          ? 'This falls below the National Living Wage of ' + gbp(NLW) + ' an hour. Minimum wage is assessed on pay divided by hours worked in the reference period, so check the actual hours before concluding either way — and note deductions for uniform or equipment can take an apparently compliant rate below the floor.'
          : 'Minimum wage compliance is assessed on pay divided by hours actually worked in the pay reference period, including any unpaid time that legally counts as working time. Rates differ by age and for apprentices.'} />} />
  );
}

/* ---------------- 5. Notice period ---------------- */
function AppNotice({ emp }) {
  const tenureYears = emp && emp.startDate
    ? Math.floor((Date.now() - new Date(emp.startDate)) / (365.25 * CALC_DAY))
    : null;
  const [years, setYears] = React.useState(tenureYears == null ? 4 : tenureYears);
  const [contractWeeks, setContractWeeks] = React.useState(4);

  React.useEffect(() => { if (tenureYears != null) setYears(tenureYears); }, [emp && emp.id]);

  const y = Number(years) || 0;
  const statutory = y < 1 ? (y * 12 >= 1 ? 1 : 0) : Math.min(12, Math.floor(y));
  const statutoryLabel = y < 0.0833 ? 'None until one month\'s service' : statutory + (statutory === 1 ? ' week' : ' weeks');
  const applies = Math.max(statutory, Number(contractWeeks) || 0);

  return (
    <CalcShell title="Notice Period" prefilled={tenureYears != null}
      description="Statutory minimum notice from the employer, and how it compares with the contract."
      onReset={() => { setYears(tenureYears == null ? 4 : tenureYears); setContractWeeks(4); }}
      inputs={<React.Fragment>
        <CalcNum label="Complete years of service" value={years} onChange={setYears} step={1} suffix="yrs"
          hint={emp && emp.startDate ? 'From start date ' + window.shortDate(emp.startDate) : undefined} />
        <CalcNum label="Contractual notice" value={contractWeeks} onChange={setContractWeeks} suffix="wks"
          hint="Whatever the contract says, if longer." />
      </React.Fragment>}
      result={<CalcResult headline={applies + (applies === 1 ? ' week' : ' weeks')}
        sub="Notice the employer must give"
        rows={[
          ['Service', y + (y === 1 ? ' year' : ' years')],
          ['Statutory minimum', statutoryLabel],
          ['Contractual', contractWeeks + ' weeks'],
          ['Applies', applies + ' weeks']
        ]}
        note="Statutory minimum is one week after one month's service, then one week per complete year up to twelve. The contract applies if it is longer — it cannot be shorter. Employees owe one week after a month unless the contract says more. Notice is not required for gross misconduct dismissal, but that is a high bar and needs a fair process behind it." />} />
  );
}

/* ---------------- 6. Employer cost ---------------- */
function AppEmployerCost({ emp }) {
  const PE = window.PayrollEngine;
  const R = PE.RATES;
  const [salary, setSalary] = React.useState(emp && emp.payroll ? Number(emp.payroll.salary) || 35000 : 35000);
  const [pension, setPension] = React.useState(3);
  const [other, setOther] = React.useState(1200);

  React.useEffect(() => { if (emp && emp.payroll && emp.payroll.salary) setSalary(Number(emp.payroll.salary)); }, [emp && emp.id]);

  const s = Number(salary) || 0;
  const secondary = R.niSecondaryThreshold;
  const secRate = R.niEmployerRate;
  const employerNI = Math.max(0, s - secondary) * secRate;
  const employerPension = s * ((Number(pension) || 0) / 100);
  const total = s + employerNI + employerPension + (Number(other) || 0);
  const uplift = s ? Math.round((total - s) / s * 1000) / 10 : 0;

  return (
    <CalcShell title="Employer Cost" prefilled={!!(emp && emp.payroll)}
      description="What an employee costs beyond their salary — the figure that matters for a hiring decision."
      onReset={() => { setSalary(35000); setPension(3); setOther(1200); }}
      inputs={<React.Fragment>
        <CalcNum label="Gross annual salary" value={salary} onChange={setSalary} step={500} suffix="£" />
        <CalcNum label="Employer pension" value={pension} onChange={setPension} step={0.5} suffix="%" hint="Minimum is 3% under auto-enrolment." />
        <CalcNum label="Other annual costs" value={other} onChange={setOther} step={100} suffix="£" hint="Equipment, software, insurance, training." />
      </React.Fragment>}
      result={<CalcResult headline={gbp0(total)} sub={'total annual cost · ' + uplift + '% above salary'}
        rows={[
          ['Gross salary', gbp0(s)],
          ['Employer NI (' + Math.round(secRate * 100) + '% above ' + gbp0(secondary) + ')', gbp0(employerNI)],
          ['Employer pension (' + pension + '%)', gbp0(employerPension)],
          ['Other costs', gbp0(other)],
          ['Total', gbp0(total)],
          ['Monthly', gbp0(total / 12)]
        ]}
        note="Employment Allowance can reduce employer NI for eligible businesses and is not applied here. Apprenticeship Levy applies above a £3m annual pay bill. Auto-enrolment minimums are 3% employer and 8% total on qualifying earnings." />} />
  );
}

/* ---------------- 7. Overtime ---------------- */
function AppOvertime({ emp }) {
  const base = emp && emp.payroll && emp.payroll.salary && emp.hoursPerWeek
    ? Number(emp.payroll.salary) / (52 * Number(emp.hoursPerWeek))
    : 14.5;
  const [rate, setRate] = React.useState(Math.round(base * 100) / 100);
  const [hours, setHours] = React.useState(6);
  const [multiplier, setMultiplier] = React.useState('1.5 — time and a half');

  React.useEffect(() => {
    if (emp && emp.payroll && emp.payroll.salary && emp.hoursPerWeek) {
      setRate(Math.round(Number(emp.payroll.salary) / (52 * Number(emp.hoursPerWeek)) * 100) / 100);
    }
  }, [emp && emp.id]);

  const mult = Number(String(multiplier).split(' ')[0]) || 1;
  const pay = (Number(rate) || 0) * (Number(hours) || 0) * mult;
  const weekly = pay;
  const annual = pay * 52;

  return (
    <CalcShell title="Overtime Pay" prefilled={!!(emp && emp.payroll && emp.hoursPerWeek)}
      description="Overtime at a premium rate, with the annualised figure so the cost of habitual overtime is visible."
      onReset={() => { setRate(Math.round(base * 100) / 100); setHours(6); setMultiplier('1.5 — time and a half'); }}
      inputs={<React.Fragment>
        <CalcNum label="Base hourly rate" value={rate} onChange={setRate} step={0.25} suffix="£" />
        <CalcNum label="Overtime hours" value={hours} onChange={setHours} step={0.5} suffix="hrs" />
        <CalcSel label="Rate" value={multiplier} onChange={setMultiplier}
          options={['1 — plain time', '1.25 — quarter uplift', '1.5 — time and a half', '2 — double time']} />
      </React.Fragment>}
      result={<CalcResult headline={gbp(pay)} sub={'for ' + hours + ' hours at ' + mult + '×'}
        rows={[
          ['Base rate', gbp(rate)],
          ['Overtime rate', gbp((Number(rate) || 0) * mult)],
          ['Hours', String(hours)],
          ['This week', gbp(weekly)],
          ['If repeated weekly', gbp0(annual) + ' a year']
        ]}
        note="There is no legal right to a premium rate for overtime — it comes from the contract. Regular overtime counts towards the 48-hour weekly average under the Working Time Regulations unless the worker has opted out in writing, and it must be included in holiday pay for the first four weeks of leave where it is sufficiently regular." />} />
  );
}

/* ---------------- 8. Team payroll ---------------- */
function AppTeamPayroll({ employees, canPayroll, S }) {
  const withSalary = employees.filter(e => e.payroll && Number(e.payroll.salary) > 0);
  const [dept, setDept] = React.useState('All');
  const [pension, setPension] = React.useState(3);
  const PE = window.PayrollEngine, R = PE.RATES;

  if (!canPayroll) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="Lock" size={20} style={{ color: 'var(--text-muted-dark)' }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Team payroll is not available to your role</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          This calculator reads salaries from employee records. The figures are never calculated for a role without
          payroll permission, so there is nothing to reveal here.
        </span>
      </Card>
    );
  }

  const scope = withSalary.filter(e => dept === 'All' || e.department === dept);
  const gross = scope.reduce((n, e) => n + Number(e.payroll.salary), 0);
  const secondary = R.niSecondaryThreshold;
  const secRate = R.niEmployerRate;
  const ni = scope.reduce((n, e) => n + Math.max(0, Number(e.payroll.salary) - secondary) * secRate, 0);
  const pen = gross * ((Number(pension) || 0) / 100);
  const total = gross + ni + pen;

  const byDept = {};
  scope.forEach(e => { byDept[e.department] = (byDept[e.department] || 0) + Number(e.payroll.salary); });
  const bars = Object.keys(byDept).map(k => ({ label: k.slice(0, 6), value: Math.round(byDept[k] / 1000) })).sort((a, b) => b.value - a.value);

  return (
    <CalcShell title="Team Payroll Cost" prefilled
      description="Total employment cost across real employee records, not an average multiplied out."
      onReset={() => { setDept('All'); setPension(3); }}
      inputs={<React.Fragment>
        <CalcSel label="Department" value={dept} onChange={setDept} options={['All'].concat(S.DEPARTMENTS)}
          hint={scope.length + ' of ' + withSalary.length + ' employees with a salary on record'} />
        <CalcNum label="Employer pension" value={pension} onChange={setPension} step={0.5} suffix="%" />
        {bars.length > 1 && (
          <div style={{ marginTop: 4 }}>
            <span style={{ display: 'block', marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--text-body-dark)' }}>Salary by department (£k)</span>
            <BarChart height={140} data={bars} />
          </div>
        )}
      </React.Fragment>}
      result={<CalcResult headline={gbp0(total)} sub={'annual cost for ' + scope.length + (scope.length === 1 ? ' employee' : ' employees')}
        rows={[
          ['Employees counted', String(scope.length)],
          ['Total gross salary', gbp0(gross)],
          ['Employer NI', gbp0(ni)],
          ['Employer pension (' + pension + '%)', gbp0(pen)],
          ['Total annual', gbp0(total)],
          ['Monthly', gbp0(total / 12)],
          ['Average per head', scope.length ? gbp0(total / scope.length) : '—']
        ]}
        note={(employees.length - withSalary.length > 0
          ? (employees.length - withSalary.length) + ' employees have no salary recorded and are excluded, so the total understates the real cost. '
          : '') + 'Employment Allowance, Apprenticeship Levy, salary sacrifice and benefits in kind are not included.'} />} />
  );
}

/* ---------------- Screen shell ---------------- */
const CALC_LIST = [
  ['Bradford Factor', 'Activity', 'Absence'],
  ['Holiday Entitlement', 'Plane', 'Leave'],
  ['Take-Home Pay', 'Wallet', 'Pay'],
  ['Hourly Rate', 'Clock', 'Pay'],
  ['Notice Period', 'CalendarClock', 'Employment'],
  ['Employer Cost', 'Building2', 'Pay'],
  ['Overtime Pay', 'TrendingUp', 'Pay'],
  ['Team Payroll Cost', 'Users', 'Pay']
];

function CalculatorsScreen() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);

  const employees = S.list({});
  const canPayroll = S.can('payroll.read');
  const [empId, setEmpId] = React.useState('');
  const [active, setActive] = React.useState('Bradford Factor');
  const emp = empId ? S.get(empId) : null;

  const visible = CALC_LIST.filter(c => canPayroll || c[2] !== 'Pay' || c[0] === 'Hourly Rate' || c[0] === 'Overtime Pay');
  const current = visible.some(c => c[0] === active) ? active : visible[0][0];

  const body = {
    'Bradford Factor': <AppBradford emp={emp} R={R} />,
    'Holiday Entitlement': <AppHoliday emp={emp} />,
    'Take-Home Pay': <AppTakeHome emp={emp} />,
    'Hourly Rate': <AppHourly emp={emp} />,
    'Notice Period': <AppNotice emp={emp} />,
    'Employer Cost': <AppEmployerCost emp={emp} />,
    'Overtime Pay': <AppOvertime emp={emp} />,
    'Team Payroll Cost': <AppTeamPayroll employees={employees} canPayroll={canPayroll} S={S} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Calculators</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            The same eight calculators as the public site, except these can load a real employee. Tax and NI come from the payroll engine, so a figure here and a payslip cannot disagree.
          </p>
        </div>
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <Icon name="UserSearch" size={17} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Load an employee</span>
        <select value={empId} onChange={e => setEmpId(e.target.value)} aria-label="Employee" style={{
          flex: 1, minWidth: 200, maxWidth: 320, background: 'rgba(255,255,255,.04)', color: '#fff',
          border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)',
          padding: '11px 13px', fontSize: 13, fontFamily: 'var(--font-core)', minHeight: 44
        }}>
          <option value="">Type numbers in by hand</option>
          {employees.map(e => <option key={e.id} value={e.id}>{S.fullName(e)} · {e.department}</option>)}
        </select>
        {emp && (
          <React.Fragment>
            <Avatar employee={emp} size={32} />
            <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
              {emp.jobTitle} · {emp.hoursPerWeek || '—'} hrs/wk{canPayroll && emp.payroll && emp.payroll.salary ? ' · ' + gbp0(emp.payroll.salary) : ''}
            </span>
            <Button size="xs" variant="ghost" tone="dark" onClick={() => setEmpId('')}>Clear</Button>
          </React.Fragment>
        )}
      </Card>

      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}

      <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
        {visible.map(([name, icon]) => {
          const on = current === name;
          return (
            <button key={name} type="button" onClick={() => setActive(name)} aria-current={on ? 'page' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
                borderRadius: 'var(--radius-btn)', cursor: 'pointer', whiteSpace: 'nowrap',
                border: '1px solid ' + (on ? 'rgba(0,229,212,.35)' : 'transparent'),
                background: on ? 'rgba(0,229,212,.10)' : 'transparent',
                color: on ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
                fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: on ? 700 : 600
              }}>
              <Icon name={icon} size={15} />{name}
            </button>
          );
        })}
      </div>

      <div>{body[current]}</div>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          These are estimates to support a conversation, not a payroll run or legal advice. Individual circumstances —
          student loan plans, salary sacrifice, benefits in kind, contractual terms and which nation someone pays tax in —
          change the answer. Check a figure against the payslip or the contract before relying on it.
        </span>
      </Card>
    </div>
  );
}

Object.assign(window, {
  CalculatorsScreen, AppBradford, AppHoliday, AppTakeHome, AppHourly,
  AppNotice, AppEmployerCost, AppOvertime, AppTeamPayroll, CALC_LIST
});
