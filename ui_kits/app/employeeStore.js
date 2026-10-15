/* NHR Solution — employee data layer.
   A deliberate stand-in for a real API: one module owns the shape of an employee
   record, all reads/writes, and change notification. Swap the bodies of the
   functions for fetch() calls and the UI needs no changes.

   window.EmployeeStore = { list, get, create, update, addDocument, addNote, logActivity,
                            setStatus, assignManager, archive, importMany,
                            nextEmployeeId, subscribe, reset, session, can }
*/
(function () {
  const KEY = 'nhr-employees-v1';

  /* ---------- reference data ---------- */
  const DEPARTMENTS = ['Operations', 'Finance', 'People', 'Support', 'Sales', 'Warehouse'];
  const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Temporary', 'Contractor', 'Apprentice', 'Casual'];
  const STATUSES = ['Active', 'On Leave', 'Probation', 'Pending', 'Inactive'];
  const WORKING_PATTERNS = ['Fixed', 'Flexible', 'Shift-based'];
  const PAY_FREQUENCIES = ['Weekly', 'Fortnightly', 'Four-weekly', 'Monthly'];
  const RTW_STATUSES = ['Verified', 'Pending', 'Expired', 'Not required'];
  const DOC_CATEGORIES = ['Employment contract', 'Right-to-work document', 'ID document', 'Qualification',
    'Training certificate', 'DBS certificate', 'Policy acknowledgement', 'Medical/occupational document', 'Other'];
  const DOC_STATUSES = ['Valid', 'Expiring soon', 'Expired', 'Pending review'];
  const ROLES = ['Super Admin', 'HR Admin', 'Manager', 'Employee'];

  /* ---------- permissions ---------- */
  const PERMISSIONS = {
    'Super Admin': ['employees.read.all', 'employees.write', 'employees.archive', 'payroll.read', 'payroll.write', 'documents.read', 'documents.write', 'notes.read', 'notes.write', 'settings.write'],
    'HR Admin':    ['employees.read.all', 'employees.write', 'employees.archive', 'payroll.read', 'documents.read', 'documents.write', 'notes.read', 'notes.write'],
    'Manager':     ['employees.read.team', 'employees.write', 'documents.read', 'notes.read', 'notes.write'],
    'Employee':    ['employees.read.self']
  };

  let session = { userId: 'usr-1', name: 'Amara Osei', role: 'HR Admin', employeeId: 'NHR-000101' };
  function can(permission, role) { return (PERMISSIONS[role || session.role] || []).indexOf(permission) !== -1; }

  /* ---------- helpers ---------- */
  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function stamp() { return new Date().toISOString(); }
  function initials(e) { return ((e.firstName || '')[0] || '') + ((e.lastName || '')[0] || ''); }
  function fullName(e) { return [e.firstName, e.lastName].filter(Boolean).join(' '); }

  function nextEmployeeId(all) {
    const nums = (all || read()).map(e => parseInt(String(e.employeeId || '').replace(/\D/g, ''), 10) || 0);
    const next = (nums.length ? Math.max.apply(null, nums) : 100) + 1;
    return 'NHR-' + String(next).padStart(6, '0');
  }

  /* Full record shape — every field the module can hold. */
  function blank() {
    return {
      id: uid('emp'), employeeId: '',
      firstName: '', middleName: '', lastName: '', preferredName: '',
      profilePhoto: null, dateOfBirth: '', gender: '', pronouns: '', nationality: '',
      nationalInsurance: '', rightToWorkStatus: 'Pending', rightToWorkExpiry: '',
      personalEmail: '', workEmail: '', mobile: '', homePhone: '',
      address: { line1: '', line2: '', city: '', county: '', postcode: '', country: 'United Kingdom' },
      emergencyContacts: [],
      jobTitle: '', department: '', location: '', managerId: null,
      employmentType: 'Full-time', employmentStatus: 'Probation',
      startDate: '', probationEndDate: '', contractEndDate: '',
      workingPattern: 'Fixed', hoursPerWeek: 37.5, annualLeaveEntitlement: 28,
      employeeCategory: '', costCentre: '', branch: '',
      payroll: { payrollId: '', payFrequency: 'Monthly', salary: '', hourlyRate: '', paymentMethod: 'Bank transfer', taxCode: '', accountName: '', accountNumberLast4: '', sortCodeMasked: '' },
      documents: [], notes: [], activity: [],
      onboarding: { contract: false, rightToWork: false, emergencyContact: false, manager: false, payroll: false },
      archived: false,
      createdAt: stamp(), updatedAt: stamp(), createdBy: session.name, updatedBy: session.name
    };
  }

  /* ---------- seed data (illustrative placeholders) ---------- */
  function seed() {
    const base = [
      ['Amara', 'Osei', 'Operations Director', 'Operations', 'Active', 'Full-time', '2021-03-08', 68000, null, 'Manchester'],
      ['Daniel', 'Whitfield', 'Financial Controller', 'Finance', 'Active', 'Full-time', '2022-01-17', 54000, 0, 'Manchester'],
      ['Priya', 'Raman', 'Head of People', 'People', 'Active', 'Full-time', '2022-06-06', 51000, 0, 'Leeds'],
      ['Marcus', 'Bell', 'Operations Coordinator', 'Operations', 'On Leave', 'Full-time', '2023-02-20', 34500, 0, 'Manchester'],
      ['Leah', 'Mensah', 'Support Team Lead', 'Support', 'Active', 'Full-time', '2023-09-11', 37200, 2, 'Remote'],
      ['Tomas', 'Nowak', 'Finance Analyst', 'Finance', 'Active', 'Full-time', '2024-04-02', 31600, 1, 'Leeds'],
      ['Grace', 'Okafor', 'Payroll Officer', 'Finance', 'Probation', 'Full-time', '2026-07-27', 29800, 1, 'Leeds'],
      ['Ryan', 'Doherty', 'Warehouse Supervisor', 'Warehouse', 'Active', 'Full-time', '2023-05-15', 32400, 0, 'Salford'],
      ['Sofia', 'Marchetti', 'Recruitment Partner', 'People', 'Active', 'Part-time', '2024-10-01', 26400, 2, 'Remote'],
      ['Callum', 'Reid', 'Support Advisor', 'Support', 'Pending', 'Temporary', '2026-09-14', 24800, 4, 'Remote'],
      ['Hannah', 'Vaughan', 'Sales Executive', 'Sales', 'Active', 'Full-time', '2025-01-13', 33000, null, 'Manchester'],
      ['Idris', 'Khan', 'Apprentice Technician', 'Warehouse', 'Probation', 'Apprentice', '2026-08-10', 18900, 7, 'Salford']
    ];
    const list = base.map((r, i) => {
      const e = blank();
      e.id = 'emp-' + (i + 1);
      e.employeeId = 'NHR-' + String(101 + i).padStart(6, '0');
      e.firstName = r[0]; e.lastName = r[1];
      e.jobTitle = r[2]; e.department = r[3];
      e.employmentStatus = r[4]; e.employmentType = r[5]; e.startDate = r[6];
      e.location = r[9];
      e.payroll.payrollId = 'PR-' + String(2200 + i);
      e.payroll.salary = r[7];
      e.payroll.taxCode = '1257L';
      e.payroll.accountName = r[0] + ' ' + r[1];
      e.payroll.accountNumberLast4 = String(1000 + i * 7).slice(-4);
      e.payroll.sortCodeMasked = '••-••-••';
      e.personalEmail = (r[0] + '.' + r[1]).toLowerCase() + '@example.com';
      e.workEmail = (r[0][0] + r[1]).toLowerCase() + '@nhrsolution.example';
      e.mobile = '+44 7' + String(700000000 + i * 1234567).slice(0, 9);
      e.nationalInsurance = 'QQ 12 34 ' + String(56 + i) + ' C';
      e.rightToWorkStatus = r[4] === 'Pending' ? 'Pending' : 'Verified';
      e.address = { line1: (12 + i) + ' Bridgewater Street', line2: '', city: r[9] === 'Remote' ? 'Sheffield' : r[9], county: 'Greater Manchester', postcode: 'M' + (1 + i) + ' 4' + String.fromCharCode(65 + i) + 'B', country: 'United Kingdom' };
      e.emergencyContacts = [{ id: uid('ec'), name: 'Placeholder Contact', relationship: 'Partner', phone: '+44 7900 000000', altPhone: '', email: '' }];
      e.hoursPerWeek = r[5] === 'Part-time' ? 22.5 : 37.5;
      e.annualLeaveEntitlement = 28;
      e.managerId = r[8] === null ? null : 'emp-' + (r[8] + 1);
      e.documents = [
        { id: uid('doc'), name: 'Employment contract.pdf', category: 'Employment contract', uploadedBy: 'Priya Raman', uploadedAt: r[6], expiryDate: '', status: 'Valid' },
        { id: uid('doc'), name: 'Right to work.pdf', category: 'Right-to-work document', uploadedBy: 'Priya Raman', uploadedAt: r[6], expiryDate: i % 4 === 1 ? '2026-10-14' : '', status: i % 4 === 1 ? 'Expiring soon' : 'Valid' }
      ];
      e.notes = i === 3 ? [{ id: uid('note'), title: 'Phased return agreed', content: 'Returning three days a week from October, reviewed monthly.', createdBy: 'Priya Raman', createdAt: '2026-08-20', visibility: 'HR only' }] : [];
      e.activity = [
        { id: uid('act'), action: 'Employee record created', user: 'Priya Raman', at: r[6] + 'T09:12:00Z' },
        { id: uid('act'), action: 'Employment contract uploaded', user: 'Priya Raman', at: r[6] + 'T09:26:00Z' },
        { id: uid('act'), action: 'Right to work verified', user: 'Priya Raman', at: r[6] + 'T14:02:00Z' }
      ];
      e.onboarding = { contract: true, rightToWork: e.rightToWorkStatus === 'Verified', emergencyContact: true, manager: e.managerId !== null, payroll: true };
      e.createdAt = r[6] + 'T09:12:00Z';
      e.updatedAt = '2026-09-01T11:04:00Z';
      e.createdBy = 'Priya Raman'; e.updatedBy = 'Amara Osei';
      return e;
    });
    return list;
  }

  /* ---------- persistence ---------- */
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (err) { /* listener error */ } }); }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) { /* fall through to seed */ }
    const s = seed();
    write(s);
    return s;
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* storage full */ }
  }
  function save(list) { write(list); notify(); return list; }

  function logActivity(e, action) {
    e.activity = [{ id: uid('act'), action, user: session.name, at: stamp() }].concat(e.activity || []);
    e.updatedAt = stamp(); e.updatedBy = session.name;
  }

  /* ---------- public API ---------- */
  const api = {
    DEPARTMENTS, EMPLOYMENT_TYPES, STATUSES, WORKING_PATTERNS, PAY_FREQUENCIES,
    RTW_STATUSES, DOC_CATEGORIES, DOC_STATUSES, ROLES, PERMISSIONS,
    blank, initials, fullName, today,
    get session() { return session; },
    setRole(role) { session = Object.assign({}, session, { role }); notify(); },
    can,
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },

    list(opts) {
      const o = opts || {};
      let all = read().filter(e => o.includeArchived ? true : !e.archived);
      if (session.role === 'Employee') all = all.filter(e => e.employeeId === session.employeeId);
      if (session.role === 'Manager') all = all.filter(e => e.managerId === 'emp-1' || e.id === 'emp-1');
      if (o.query) {
        const q = o.query.toLowerCase();
        all = all.filter(e => [fullName(e), e.employeeId, e.personalEmail, e.workEmail, e.mobile, e.jobTitle, e.department]
          .some(v => String(v || '').toLowerCase().includes(q)));
      }
      if (o.department && o.department !== 'All') all = all.filter(e => e.department === o.department);
      if (o.status && o.status !== 'All') all = all.filter(e => e.employmentStatus === o.status);
      if (o.type && o.type !== 'All') all = all.filter(e => e.employmentType === o.type);
      const dir = o.sortDir === 'desc' ? -1 : 1;
      const key = o.sortBy || 'name';
      all.sort((a, b) => {
        const av = key === 'name' ? fullName(a) : key === 'startDate' ? a.startDate : a[key] || '';
        const bv = key === 'name' ? fullName(b) : key === 'startDate' ? b.startDate : b[key] || '';
        return av > bv ? dir : av < bv ? -dir : 0;
      });
      return all;
    },

    counts() {
      const all = read().filter(e => !e.archived);
      const monthAgo = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
      return {
        total: all.length,
        active: all.filter(e => e.employmentStatus === 'Active').length,
        onLeave: all.filter(e => e.employmentStatus === 'On Leave').length,
        probation: all.filter(e => e.employmentStatus === 'Probation').length,
        newStarters: all.filter(e => e.startDate >= monthAgo).length,
        pendingInfo: all.filter(e => e.employmentStatus === 'Pending' || e.rightToWorkStatus === 'Pending' || !e.emergencyContacts.length).length
      };
    },

    get(id) { return read().find(e => e.id === id || e.employeeId === id) || null; },
    managers() { return read().filter(e => !e.archived).map(e => ({ id: e.id, label: fullName(e) + ' — ' + e.jobTitle })); },

    create(draft) {
      const all = read();
      const e = Object.assign(blank(), draft);
      if (!e.employeeId) e.employeeId = nextEmployeeId(all);
      e.id = uid('emp'); e.createdAt = stamp(); e.updatedAt = stamp();
      e.createdBy = session.name; e.updatedBy = session.name;
      e.onboarding = {
        contract: (e.documents || []).some(d => d.category === 'Employment contract'),
        rightToWork: e.rightToWorkStatus === 'Verified',
        emergencyContact: (e.emergencyContacts || []).length > 0,
        manager: !!e.managerId,
        payroll: !!(e.payroll && (e.payroll.salary || e.payroll.hourlyRate))
      };
      e.activity = [{ id: uid('act'), action: 'Employee record created', user: session.name, at: stamp() }];
      save(all.concat([e]));
      return e;
    },

    update(id, patch) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      Object.assign(e, patch);
      logActivity(e, 'Employee details updated');
      save(all);
      return e;
    },

    setStatus(id, status) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      e.employmentStatus = status;
      logActivity(e, 'Status changed to ' + status);
      save(all);
      return e;
    },

    assignManager(id, managerId) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      e.managerId = managerId;
      e.onboarding.manager = !!managerId;
      logActivity(e, 'Manager changed');
      save(all);
      return e;
    },

    /* Public activity logger — the detail tabs record their own events here so
       the Activity tab stays the single audit trail for the record. */
    logActivity(id, action) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      logActivity(e, action);
      save(all);
      return e;
    },

    addDocument(id, doc) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      const d = Object.assign({ id: uid('doc'), uploadedBy: session.name, uploadedAt: today(), expiryDate: '', status: 'Pending review' }, doc);
      e.documents = [d].concat(e.documents || []);
      if (d.category === 'Employment contract') e.onboarding.contract = true;
      logActivity(e, d.category + ' uploaded');
      save(all);
      return d;
    },

    removeDocument(id, docId) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      e.documents = (e.documents || []).filter(d => d.id !== docId);
      logActivity(e, 'Document deleted');
      save(all);
      return e;
    },

    addNote(id, note) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      const n = Object.assign({ id: uid('note'), createdBy: session.name, createdAt: today(), visibility: 'HR only' }, note);
      e.notes = [n].concat(e.notes || []);
      logActivity(e, 'Note added: ' + n.title);
      save(all);
      return n;
    },

    removeNote(id, noteId) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      e.notes = (e.notes || []).filter(n => n.id !== noteId);
      logActivity(e, 'Note deleted');
      save(all);
      return e;
    },

    archive(id) {
      const all = read();
      const e = all.find(x => x.id === id);
      if (!e) return null;
      e.archived = true;
      logActivity(e, 'Employee archived');
      save(all);
      return e;
    },

    /* Validates a parsed CSV-style array of rows. Returns per-row verdicts. */
    validateImport(rows) {
      const existing = read();
      const seenIds = {};
      return rows.map((r, i) => {
        const issues = [];
        if (!r.firstName || !r.lastName) issues.push({ level: 'error', text: 'Name missing' });
        if (!r.personalEmail || !/.+@.+\..+/.test(r.personalEmail)) issues.push({ level: 'error', text: 'Invalid email' });
        if (!r.jobTitle) issues.push({ level: 'warn', text: 'Job title missing' });
        if (!r.department) issues.push({ level: 'warn', text: 'Department missing' });
        if (!r.startDate) issues.push({ level: 'warn', text: 'Start date missing' });
        if (r.employeeId) {
          if (existing.some(e => e.employeeId === r.employeeId) || seenIds[r.employeeId]) issues.push({ level: 'error', text: 'Duplicate employee ID' });
          seenIds[r.employeeId] = true;
        }
        const level = issues.some(x => x.level === 'error') ? 'error' : issues.length ? 'warn' : 'ok';
        return { row: i + 1, data: r, issues, level };
      });
    },

    importMany(rows) {
      const created = [];
      rows.forEach(r => { created.push(api.create(r)); });
      return created;
    },

    reset() { localStorage.removeItem(KEY); save(seed()); },
    clearAll() { save([]); }
  };

  window.EmployeeStore = api;
})();
