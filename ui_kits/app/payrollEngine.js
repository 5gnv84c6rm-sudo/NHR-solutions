/* NHR Solution — payroll engine.

   Gross-to-net for a single pay period, using 2025/26 UK rates for England,
   Wales and Northern Ireland. Deliberately kept as pure functions so a real
   deployment can swap it for an HMRC-recognised calculation without touching
   the UI.

   Scope and limits, stated plainly because payroll errors are expensive:
   - Cumulative (Month 1 basis) PAYE is approximated by applying annual bands to
     annualised pay, then dividing by the period count. Real PAYE is cumulative
     across the tax year and uses HMRC's exact tax tables.
   - Scottish rates are not applied. Scottish taxpayers (S-prefixed codes) are
     flagged, not calculated.
   - Student loans, postgraduate loans, salary sacrifice, statutory payments
     (SSP/SMP), attachment of earnings and NI categories other than A are out of
     scope and surfaced as warnings rather than silently ignored.

   window.PayrollEngine = { RATES, calculate, periodsPerYear, parseTaxCode }
*/
(function () {
  const RATES = {
    taxYear: '2025/26',
    personalAllowance: 12570,
    taperStart: 100000,
    basicTo: 50270,
    higherTo: 125140,
    basicRate: 0.20,
    higherRate: 0.40,
    additionalRate: 0.45,
    /* Employee (primary) Class 1 NI */
    niPrimaryThreshold: 12570,
    niUpperLimit: 50270,
    niMainRate: 0.08,
    niUpperRate: 0.02,
    /* Employer (secondary) Class 1 NI — 2025/26 */
    niSecondaryThreshold: 5000,
    niEmployerRate: 0.15,
    /* Auto-enrolment qualifying earnings band */
    pensionLower: 6240,
    pensionUpper: 50270,
    pensionEmployeeMin: 0.05,
    pensionEmployerMin: 0.03
  };

  const PERIODS = { Monthly: 12, Fortnightly: 26, Weekly: 52, 'Four-weekly': 13 };
  function periodsPerYear(freq) { return PERIODS[freq] || 12; }

  /* Reads the numeric allowance out of a tax code. Handles the common shapes:
     1257L, BR, D0, D1, NT, 0T, K475, and S/C nation prefixes. */
  function parseTaxCode(code) {
    const raw = String(code || '').toUpperCase().replace(/\s/g, '');
    const scottish = /^S/.test(raw);
    const welsh = /^C/.test(raw);
    const body = raw.replace(/^[SC]/, '');
    if (body === 'NT') return { allowance: Infinity, flatRate: null, scottish, welsh, code: raw, note: 'No tax' };
    if (body === 'BR') return { allowance: 0, flatRate: RATES.basicRate, scottish, welsh, code: raw, note: 'All pay at basic rate' };
    if (body === 'D0') return { allowance: 0, flatRate: RATES.higherRate, scottish, welsh, code: raw, note: 'All pay at higher rate' };
    if (body === 'D1') return { allowance: 0, flatRate: RATES.additionalRate, scottish, welsh, code: raw, note: 'All pay at additional rate' };
    if (body === '0T') return { allowance: 0, flatRate: null, scottish, welsh, code: raw, note: 'No allowance' };
    const k = body.match(/^K(\d+)/);
    if (k) return { allowance: -Number(k[1]) * 10, flatRate: null, scottish, welsh, code: raw, note: 'K code — added to taxable pay' };
    const n = body.match(/^(\d+)/);
    if (n) return { allowance: Number(n[1]) * 10, flatRate: null, scottish, welsh, code: raw, note: '' };
    return { allowance: RATES.personalAllowance, flatRate: null, scottish, welsh, code: raw || '1257L', note: 'Unrecognised code — emergency allowance applied' };
  }

  function annualIncomeTax(taxable) {
    const basicBand = RATES.basicTo - RATES.personalAllowance;
    const higherBand = RATES.higherTo - RATES.basicTo;
    const basic = Math.min(Math.max(taxable, 0), basicBand);
    const higher = Math.min(Math.max(taxable - basicBand, 0), higherBand);
    const additional = Math.max(taxable - basicBand - higherBand, 0);
    return {
      basic: basic * RATES.basicRate,
      higher: higher * RATES.higherRate,
      additional: additional * RATES.additionalRate,
      total: basic * RATES.basicRate + higher * RATES.higherRate + additional * RATES.additionalRate
    };
  }

  const r2 = n => Math.round(n * 100) / 100;

  /* input:
     { annualSalary, hourlyRate, hours, overtimeHours, overtimeMultiplier,
       bonus, expenses, frequency, taxCode, pensionPercent, employerPensionPercent,
       niCategory }
     Returns every line needed for a payslip plus employer cost. */
  function calculate(input) {
    const freq = input.frequency || 'Monthly';
    const n = periodsPerYear(freq);
    const warnings = [];

    /* --- gross for the period --- */
    const salaried = Number(input.annualSalary) > 0;
    const basePeriod = salaried
      ? Number(input.annualSalary) / n
      : (Number(input.hourlyRate) || 0) * (Number(input.hours) || 0);

    const otRate = (Number(input.hourlyRate) > 0
      ? Number(input.hourlyRate)
      : (Number(input.annualSalary) || 0) / 52 / (Number(input.contractedWeekly) || 37.5))
      * (Number(input.overtimeMultiplier) || 1.5);
    const overtime = otRate * (Number(input.overtimeHours) || 0);
    const bonus = Number(input.bonus) || 0;
    const expenses = Number(input.expenses) || 0;   /* reimbursed, not taxed */

    const grossPeriod = basePeriod + overtime + bonus;
    const grossAnnual = grossPeriod * n;

    /* --- pension: auto-enrolment on qualifying earnings --- */
    const empPct = input.pensionPercent == null ? RATES.pensionEmployeeMin * 100 : Number(input.pensionPercent);
    const erPct = input.employerPensionPercent == null ? RATES.pensionEmployerMin * 100 : Number(input.employerPensionPercent);
    const qualifyingAnnual = Math.max(0, Math.min(grossAnnual, RATES.pensionUpper) - RATES.pensionLower);
    const pensionAnnual = qualifyingAnnual * (empPct / 100);
    const employerPensionAnnual = qualifyingAnnual * (erPct / 100);
    const pensionPeriod = pensionAnnual / n;
    const employerPensionPeriod = employerPensionAnnual / n;

    /* --- income tax (relief-at-source order: pension before tax) --- */
    const tc = parseTaxCode(input.taxCode);
    if (tc.scottish) warnings.push('Tax code is Scottish (S prefix). This calculation uses England, Wales and Northern Ireland bands — the figure will be wrong.');
    if (tc.note && !tc.scottish) warnings.push('Tax code ' + tc.code + ': ' + tc.note + '.');

    const afterPension = Math.max(0, grossAnnual - pensionAnnual);
    let allowance;
    if (tc.allowance === Infinity) allowance = afterPension;
    else if (afterPension > RATES.taperStart) {
      allowance = Math.max(0, tc.allowance - (afterPension - RATES.taperStart) / 2);
      if (tc.allowance > 0) warnings.push('Earnings above £100,000 — personal allowance tapered by £1 for every £2 over.');
    } else allowance = tc.allowance;

    const taxableAnnual = Math.max(0, afterPension - Math.max(0, allowance)) + (tc.allowance < 0 ? -tc.allowance : 0);
    const taxBands = tc.flatRate != null
      ? { basic: 0, higher: 0, additional: 0, total: afterPension * tc.flatRate }
      : annualIncomeTax(taxableAnnual);
    const taxPeriod = taxBands.total / n;

    /* --- National Insurance: charged per period on gross, not annualised --- */
    const cat = input.niCategory || 'A';
    if (cat !== 'A') warnings.push('NI category ' + cat + ' is not modelled. Category A rates have been applied.');
    const niPT = RATES.niPrimaryThreshold / n;
    const niUEL = RATES.niUpperLimit / n;
    const niMain = Math.max(0, Math.min(grossPeriod, niUEL) - niPT) * RATES.niMainRate;
    const niUpper = Math.max(0, grossPeriod - niUEL) * RATES.niUpperRate;
    const niPeriod = niMain + niUpper;

    /* --- employer costs --- */
    const secondary = RATES.niSecondaryThreshold / n;
    const employerNi = Math.max(0, grossPeriod - secondary) * RATES.niEmployerRate;

    const deductions = taxPeriod + niPeriod + pensionPeriod;
    const net = grossPeriod - deductions + expenses;

    return {
      taxYear: RATES.taxYear, frequency: freq, periods: n, taxCode: tc.code,
      gross: r2(grossPeriod), grossAnnual: r2(grossAnnual),
      base: r2(basePeriod), overtime: r2(overtime), overtimeRate: r2(otRate), bonus: r2(bonus),
      expenses: r2(expenses),
      tax: r2(taxPeriod), ni: r2(niPeriod), pension: r2(pensionPeriod),
      pensionPercent: empPct, employerPensionPercent: erPct,
      employerNi: r2(employerNi), employerPension: r2(employerPensionPeriod),
      employerCost: r2(grossPeriod + employerNi + employerPensionPeriod),
      deductions: r2(deductions), net: r2(net),
      allowanceUsed: r2(Math.max(0, allowance)),
      taxableAnnual: r2(taxableAnnual),
      ytd: null,
      warnings
    };
  }

  window.PayrollEngine = { RATES, PERIODS, calculate, periodsPerYear, parseTaxCode };
})();
