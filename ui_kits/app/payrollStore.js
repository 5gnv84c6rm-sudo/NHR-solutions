/* NHR Solution — payroll run store.

   A run is one pay period for one frequency: draft → calculated → approved →
   paid. Lines are snapshotted at calculation time so an approved run never
   silently changes when someone edits a salary afterwards — the same reason
   real payroll keeps period records rather than recomputing on read.

   window.PayrollStore = { runs, get, openRun, calculate, approve, markPaid,
                           reopen, remove, currentPeriod, subscribe, reset }
*/
(function () {
  const KEY = 'nhr-payroll-runs-v1';
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid() { return 'run-' + Math.random().toString(36).slice(2, 9); }
  function stamp() { return new Date().toISOString(); }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function write(all) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); return all; }

  /* Period label and pay date for a month offset from now. */
  function currentPeriod(offset) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + (offset || 0));
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    /* Pay date convention: last working day of the month. */
    while (last.getDay() === 0 || last.getDay() === 6) last.setDate(last.getDate() - 1);
    return {
      key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      label, payDate: last.toISOString().slice(0, 10),
      periodStart: d.toISOString().slice(0, 10),
      periodEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    };
  }

  /* Builds the input for one employee from their record plus this period's
     approved overtime and expenses, so the run reads real data. */
  function inputFor(employee, period) {
    const R = window.EmployeeRecords;
    const set = R ? R.get(employee) : { timesheet: [], expenses: [] };
    const p = employee.payroll || {};

    const otHours = (set.timesheet || [])
      .filter(t => t.date >= period.periodStart && t.date <= period.periodEnd && t.approved)
      .reduce((n, t) => n + Math.max(0, (Number(t.hours) || 0) - 7.5), 0);

    const expenses = (set.expenses || [])
      .filter(x => x.status === 'Approved' && x.date >= period.periodStart && x.date <= period.periodEnd)
      .reduce((n, x) => n + (Number(x.amount) || 0), 0);

    const hours = (set.timesheet || [])
      .filter(t => t.date >= period.periodStart && t.date <= period.periodEnd)
      .reduce((n, t) => n + (Number(t.hours) || 0), 0);

    return {
      annualSalary: Number(p.salary) || 0,
      hourlyRate: Number(p.hourlyRate) || 0,
      hours, contractedWeekly: Number(employee.hoursPerWeek) || 37.5,
      overtimeHours: Math.round(otHours * 4) / 4,
      overtimeMultiplier: 1.5,
      bonus: 0,
      expenses: Math.round(expenses * 100) / 100,
      frequency: p.payFrequency || 'Monthly',
      taxCode: p.taxCode || '1257L',
      pensionPercent: p.pensionPercent == null ? 5 : Number(p.pensionPercent),
      employerPensionPercent: p.employerPensionPercent == null ? 3 : Number(p.employerPensionPercent),
      niCategory: p.niCategory || 'A'
    };
  }

  const PayrollStore = {
    runs() { return read().slice().sort((a, b) => a.period.key < b.period.key ? 1 : -1); },
    get(id) { return read().find(r => r.id === id) || null; },

    /* Opens (or returns) the draft run for a period. */
    openRun(period, employees) {
      const all = read();
      const existing = all.find(r => r.period.key === period.key);
      if (existing) return existing;
      const run = {
        id: uid(), period, status: 'Draft', createdAt: stamp(),
        calculatedAt: '', approvedAt: '', approvedBy: '', paidAt: '',
        lines: employees.map(e => ({
          employeeKey: e.id, employeeName: window.EmployeeStore.fullName(e),
          employeeRef: e.employeeId, department: e.department,
          payrollId: (e.payroll || {}).payrollId || '',
          include: true, result: null, adjustment: 0, note: ''
        }))
      };
      all.push(run);
      write(all);
      return run;
    },

    /* Recalculates every included line from the current employee records. */
    calculate(runId) {
      const all = read();
      const run = all.find(r => r.id === runId);
      if (!run || run.status === 'Approved' || run.status === 'Paid') return run;
      const S = window.EmployeeStore, E = window.PayrollEngine;
      run.lines.forEach(line => {
        const e = S.get(line.employeeKey);
        if (!e || !line.include) { line.result = null; return; }
        const input = inputFor(e, run.period);
        input.bonus = Number(line.adjustment) || 0;
        line.result = E.calculate(input);
      });
      run.status = 'Calculated';
      run.calculatedAt = stamp();
      write(all);
      return run;
    },

    setLine(runId, employeeKey, patch) {
      const all = read();
      const run = all.find(r => r.id === runId);
      if (!run || run.status === 'Approved' || run.status === 'Paid') return null;
      run.lines = run.lines.map(l => l.employeeKey === employeeKey ? Object.assign({}, l, patch) : l);
      write(all);
      return run;
    },

    approve(runId, by) {
      const all = read();
      const run = all.find(r => r.id === runId);
      if (!run || run.status !== 'Calculated') return null;
      run.status = 'Approved'; run.approvedAt = stamp(); run.approvedBy = by;
      write(all);
      /* Payslips become visible on the employee record at approval. */
      const S = window.EmployeeStore;
      run.lines.filter(l => l.include && l.result).forEach(l => {
        S.logActivity(l.employeeKey, 'Payslip published for ' + run.period.label + ' — net £' + l.result.net.toFixed(2));
      });
      return run;
    },

    markPaid(runId) {
      const all = read();
      const run = all.find(r => r.id === runId);
      if (!run || run.status !== 'Approved') return null;
      run.status = 'Paid'; run.paidAt = stamp();
      write(all);
      return run;
    },

    reopen(runId) {
      const all = read();
      const run = all.find(r => r.id === runId);
      if (!run || run.status === 'Paid') return null;
      run.status = 'Draft'; run.calculatedAt = ''; run.approvedAt = ''; run.approvedBy = '';
      write(all);
      return run;
    },

    remove(runId) {
      write(read().filter(r => r.id !== runId));
      return true;
    },

    /* Year-to-date totals per employee across approved and paid runs. */
    ytd(employeeKey) {
      const out = { gross: 0, tax: 0, ni: 0, pension: 0, net: 0, periods: 0 };
      read().filter(r => r.status === 'Approved' || r.status === 'Paid').forEach(r => {
        const l = r.lines.find(x => x.employeeKey === employeeKey && x.include && x.result);
        if (!l) return;
        out.gross += l.result.gross; out.tax += l.result.tax; out.ni += l.result.ni;
        out.pension += l.result.pension; out.net += l.result.net; out.periods++;
      });
      Object.keys(out).forEach(k => { if (k !== 'periods') out[k] = Math.round(out[k] * 100) / 100; });
      return out;
    },

    totals(run) {
      const t = { gross: 0, tax: 0, ni: 0, pension: 0, net: 0, employerNi: 0, employerPension: 0, cost: 0, count: 0, expenses: 0 };
      if (!run) return t;
      run.lines.filter(l => l.include && l.result).forEach(l => {
        const r = l.result;
        t.gross += r.gross; t.tax += r.tax; t.ni += r.ni; t.pension += r.pension;
        t.net += r.net; t.employerNi += r.employerNi; t.employerPension += r.employerPension;
        t.cost += r.employerCost; t.expenses += r.expenses; t.count++;
      });
      Object.keys(t).forEach(k => { if (k !== 'count') t[k] = Math.round(t[k] * 100) / 100; });
      return t;
    },

    inputFor, currentPeriod,
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(KEY); notify(); }
  };

  window.PayrollStore = PayrollStore;
})();
