/* NHR Solution — employee detail records.

   The profile's operational tabs (attendance, leave, absence, rotas,
   performance, expenses, training) each need their own record set per employee.
   This module owns them: it derives a stable opening data set from the employee
   id, then persists every change alongside the employee record.

   Deterministic by design — a given employee always opens with the same figures
   across reloads, so the module can be demonstrated without a backend.

   window.EmployeeRecords = { get, add, update, remove, bradford, leaveBalance,
                              attendanceSummary, subscribe }
*/
(function () {
  const KEY = 'nhr-employee-records-v1';
  const DAY = 864e5;

  const LEAVE_TYPES = ['Annual leave', 'Unpaid leave', 'Parental leave', 'Compassionate leave', 'Time off in lieu'];
  const ABSENCE_REASONS = ['Sickness', 'Injury', 'Medical appointment', 'Family emergency', 'Unauthorised'];
  const EXPENSE_CATEGORIES = ['Travel', 'Mileage', 'Accommodation', 'Subsistence', 'Equipment', 'Training', 'Other'];
  const COURSES = [
    ['Fire Safety Awareness', 'Health & Safety', 90],
    ['Manual Handling', 'Health & Safety', 120],
    ['GDPR and Data Protection', 'Compliance', 60],
    ['Equality, Diversity and Inclusion', 'Compliance', 75],
    ['Safeguarding Level 1', 'Compliance', 90],
    ['First Aid at Work', 'Health & Safety', 180],
    ['Cyber Security Basics', 'Technology', 45]
  ];
  const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  function stamp() { return new Date().toISOString(); }

  /* Small deterministic PRNG so each employee's opening figures are stable. */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function write(all) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); return all; }

  function isWeekend(d) { const n = d.getDay(); return n === 0 || n === 6; }

  /* ---------- opening data set ---------- */
  function build(employee) {
    const rnd = seedFrom(employee.id + employee.employeeId);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const partTime = employee.employmentType === 'Part-time';
    const dailyHours = partTime ? 7.5 : 7.5;

    /* --- timesheet: last 28 calendar days, working days only --- */
    const timesheet = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      if (isWeekend(d)) continue;
      if (partTime && d.getDay() >= 4) continue;
      const roll = rnd();
      let status = 'Present', inAt = '08:57', outAt = '17:28', hours = dailyHours, note = '';
      if (roll > 0.94) { status = 'Absent'; inAt = '—'; outAt = '—'; hours = 0; note = 'Recorded as absence'; }
      else if (roll > 0.86) { status = 'Late'; inAt = '09:' + (18 + Math.floor(rnd() * 20)); outAt = '17:31'; hours = dailyHours - 0.4; note = 'Traffic delay reported'; }
      else if (roll > 0.80) { status = 'Annual leave'; inAt = '—'; outAt = '—'; hours = 0; }
      else {
        const m = Math.floor(rnd() * 14);
        inAt = '08:' + String(50 + m).padStart(2, '0');
        outAt = '17:' + String(20 + Math.floor(rnd() * 20)).padStart(2, '0');
        hours = Math.round((dailyHours + (rnd() - 0.4) * 0.6) * 4) / 4;
      }
      timesheet.push({
        id: uid('ts'), date: iso(d), clockIn: inAt, clockOut: outAt,
        breakMins: status === 'Present' || status === 'Late' ? 30 : 0,
        hours, status, note, approved: i > 6
      });
    }

    /* --- leave requests --- */
    const leaveRequests = [];
    const bookedDays = 6 + Math.floor(rnd() * 7);
    let cursor = 40 + Math.floor(rnd() * 40);
    for (let k = 0; k < 3; k++) {
      const start = new Date(Date.now() - cursor * DAY);
      const len = 1 + Math.floor(rnd() * 4);
      leaveRequests.push({
        id: uid('lv'), type: 'Annual leave', startDate: iso(start),
        endDate: iso(new Date(start.getTime() + (len - 1) * DAY)), days: len,
        status: 'Approved', reason: '', requestedAt: iso(new Date(start.getTime() - 14 * DAY)),
        decidedBy: 'Priya Raman', decidedAt: iso(new Date(start.getTime() - 12 * DAY))
      });
      cursor -= 12 + Math.floor(rnd() * 8);
    }
    if (rnd() > 0.45) {
      const start = new Date(Date.now() + (9 + Math.floor(rnd() * 25)) * DAY);
      const len = 1 + Math.floor(rnd() * 5);
      leaveRequests.push({
        id: uid('lv'), type: pick(LEAVE_TYPES), startDate: iso(start),
        endDate: iso(new Date(start.getTime() + (len - 1) * DAY)), days: len,
        status: 'Pending', reason: 'Family holiday', requestedAt: iso(new Date()),
        decidedBy: '', decidedAt: ''
      });
    }

    /* --- absence episodes (drives the Bradford Factor) --- */
    const absences = [];
    const episodes = Math.floor(rnd() * 4);
    for (let k = 0; k < episodes; k++) {
      const start = new Date(Date.now() - (20 + k * 60 + Math.floor(rnd() * 40)) * DAY);
      const len = 1 + Math.floor(rnd() * 3);
      const reason = pick(ABSENCE_REASONS);
      absences.push({
        id: uid('ab'), startDate: iso(start),
        endDate: iso(new Date(start.getTime() + (len - 1) * DAY)),
        days: len, reason,
        selfCertified: len <= 7,
        fitNote: len > 7,
        returnToWork: { completed: k > 0, date: k > 0 ? iso(new Date(start.getTime() + len * DAY)) : '', by: k > 0 ? 'Priya Raman' : '', notes: k > 0 ? 'Fit to return, no adjustments required.' : '' },
        notes: ''
      });
    }

    /* --- shifts: current week plus next --- */
    const shifts = [];
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (let i = 0; i < 14; i++) {
      const d = new Date(monday.getTime() + i * DAY);
      if (isWeekend(d) && rnd() > 0.25) continue;
      if (partTime && d.getDay() >= 4) continue;
      const patterns = [['08:00', '16:30', 'Early'], ['09:00', '17:30', 'Day'], ['12:00', '20:00', 'Late']];
      const p = patterns[Math.floor(rnd() * patterns.length)];
      shifts.push({
        id: uid('sh'), date: iso(d), start: p[0], end: p[1], label: p[2],
        location: employee.location || 'Manchester',
        hours: 8, status: rnd() > 0.92 ? 'Open' : 'Assigned', swapRequested: false
      });
    }

    /* --- performance --- */
    const goals = [
      { id: uid('gl'), title: 'Complete mandatory compliance training', measure: 'All assigned courses passed', due: iso(new Date(Date.now() + 45 * DAY)), progress: 40 + Math.floor(rnd() * 50), status: 'On track', owner: 'Employee' },
      { id: uid('gl'), title: 'Reduce process handling time', measure: '10% improvement on baseline', due: iso(new Date(Date.now() + 90 * DAY)), progress: Math.floor(rnd() * 60), status: rnd() > 0.7 ? 'At risk' : 'On track', owner: 'Employee' }
    ];
    const reviews = [
      { id: uid('rv'), type: 'Probation review', date: employee.probationEndDate || iso(new Date(Date.now() - 200 * DAY)), rating: 'Met expectations', reviewer: 'Priya Raman', status: 'Complete', summary: 'Settled well, objectives agreed for the year.' },
      { id: uid('rv'), type: 'Annual review', date: iso(new Date(Date.now() + 40 * DAY)), rating: '', reviewer: 'Priya Raman', status: 'Scheduled', summary: '' }
    ];

    /* --- expenses --- */
    const expenses = [];
    const claims = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < claims; k++) {
      const cat = pick(EXPENSE_CATEGORIES);
      const amount = Math.round((12 + rnd() * 180) * 100) / 100;
      expenses.push({
        id: uid('ex'), date: iso(new Date(Date.now() - (5 + k * 18) * DAY)),
        category: cat, description: cat === 'Mileage' ? 'Client site visit — 42 miles' : cat + ' claim',
        amount, receipt: rnd() > 0.2,
        status: k === 0 ? 'Pending' : (rnd() > 0.25 ? 'Approved' : 'Rejected'),
        submittedAt: iso(new Date(Date.now() - (4 + k * 18) * DAY)),
        decidedBy: k === 0 ? '' : 'Daniel Whitfield', reimbursedAt: ''
      });
    }

    /* --- training --- */
    const training = COURSES.slice(0, 4 + Math.floor(rnd() * 3)).map((c, k) => {
      const roll = rnd();
      const complete = roll > 0.42;
      const assigned = iso(new Date(Date.now() - (30 + k * 25) * DAY));
      return {
        id: uid('tr'), course: c[0], category: c[1], durationMins: c[2],
        assignedAt: assigned,
        dueDate: iso(new Date(Date.now() + (k === 0 ? 12 : 40 + k * 20) * DAY)),
        progress: complete ? 100 : Math.floor(roll * 90),
        status: complete ? 'Complete' : (roll > 0.2 ? 'In progress' : 'Not started'),
        completedAt: complete ? iso(new Date(Date.now() - (5 + k * 12) * DAY)) : '',
        certificateId: complete ? 'CERT-' + String(40000 + Math.floor(rnd() * 9999)) : '',
        /* Certificates expire on a spread rather than all on one date, so the
           renewal view reflects a real business: a few lapsed, a few due. */
        expiresAt: complete && c[1] !== 'Technology'
          ? iso(new Date(Date.now() + Math.round((rnd() * 700) - 90) * DAY))
          : ''
      };
    });

    return { timesheet, leaveRequests, absences, shifts, goals, reviews, expenses, training, createdAt: stamp() };
  }

  /* ---------- accessors ---------- */
  function get(employee) {
    if (!employee) return null;
    const all = read();
    if (!all[employee.id]) { all[employee.id] = build(employee); localStorage.setItem(KEY, JSON.stringify(all)); }
    return all[employee.id];
  }

  function add(employeeId, collection, record) {
    const all = read();
    const set = all[employeeId];
    if (!set) return null;
    const row = Object.assign({ id: uid(collection.slice(0, 2)) }, record);
    set[collection] = [row].concat(set[collection] || []);
    write(all);
    return row;
  }

  function update(employeeId, collection, recordId, patch) {
    const all = read();
    const set = all[employeeId];
    if (!set) return null;
    set[collection] = (set[collection] || []).map(r => r.id === recordId ? Object.assign({}, r, patch) : r);
    write(all);
    return set[collection].find(r => r.id === recordId);
  }

  function remove(employeeId, collection, recordId) {
    const all = read();
    const set = all[employeeId];
    if (!set) return false;
    set[collection] = (set[collection] || []).filter(r => r.id !== recordId);
    write(all);
    return true;
  }

  /* ---------- derived figures ---------- */

  /* Bradford Factor = spells² × total days, over a rolling 12 months. */
  function bradford(employeeId) {
    const set = read()[employeeId];
    if (!set) return { score: 0, spells: 0, days: 0, band: 'None' };
    const cutoff = Date.now() - 365 * DAY;
    const recent = (set.absences || []).filter(a => new Date(a.startDate).getTime() >= cutoff);
    const spells = recent.length;
    const days = recent.reduce((n, a) => n + (Number(a.days) || 0), 0);
    const score = spells * spells * days;
    const band = score === 0 ? 'None' : score < 50 ? 'Low' : score < 200 ? 'Monitor' : score < 500 ? 'Concern' : 'Review';
    return { score, spells, days, band };
  }

  function leaveBalance(employee) {
    const set = get(employee);
    const entitlement = Number(employee.annualLeaveEntitlement) || 28;
    const approved = (set.leaveRequests || [])
      .filter(r => r.status === 'Approved' && r.type === 'Annual leave')
      .reduce((n, r) => n + (Number(r.days) || 0), 0);
    const pending = (set.leaveRequests || [])
      .filter(r => r.status === 'Pending' && r.type === 'Annual leave')
      .reduce((n, r) => n + (Number(r.days) || 0), 0);
    return { entitlement, taken: approved, pending, remaining: Math.max(0, entitlement - approved - pending) };
  }

  function attendanceSummary(employee) {
    const set = get(employee);
    const rows = set.timesheet || [];
    const working = rows.filter(r => r.status !== 'Annual leave');
    const present = working.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const late = working.filter(r => r.status === 'Late').length;
    const absent = working.filter(r => r.status === 'Absent').length;
    const hours = rows.reduce((n, r) => n + (Number(r.hours) || 0), 0);
    const contracted = working.length * (Number(employee.hoursPerWeek) >= 30 ? 7.5 : 7.5);
    return {
      rate: working.length ? Math.round(present / working.length * 1000) / 10 : 0,
      late, absent, hours: Math.round(hours * 10) / 10,
      contracted: Math.round(contracted * 10) / 10,
      unapproved: rows.filter(r => !r.approved).length
    };
  }

  /* Working days between two dates, inclusive — used when booking leave. */
  function workingDays(start, end) {
    const a = new Date(start), b = new Date(end);
    if (isNaN(a) || isNaN(b) || b < a) return 0;
    let n = 0;
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (!isWeekend(d)) n++;
    return n;
  }

  window.EmployeeRecords = {
    LEAVE_TYPES, ABSENCE_REASONS, EXPENSE_CATEGORIES, COURSES, REQUEST_STATUSES,
    get, add, update, remove, bradford, leaveBalance, attendanceSummary, workingDays,
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(KEY); notify(); }
  };
})();
