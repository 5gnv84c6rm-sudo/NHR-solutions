/* NHR Solution — Documents module (company-wide).

   The per-employee Documents tab holds one person's file; this screen is the
   compliance view across everyone: what is expiring, what is missing against
   the policy, a searchable library, and company-wide policy documents that
   employees acknowledge.

   Employee documents live on the employee record (EmployeeStore.addDocument),
   so anything filed here appears on the person's profile and vice versa.
   Company policies are separate — they belong to the business, not a person —
   and are held in their own store below.

   window.PolicyStore = { list, add, update, remove, acknowledge, subscribe }
*/
(function () {
  const KEY = 'nhr-policies-v1';
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid() { return 'pol-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  const SEED = [
    ['Employee Handbook', 'Handbook', 12, 'All staff'],
    ['Disciplinary and Grievance Policy', 'HR policy', 24, 'All staff'],
    ['Health and Safety Policy', 'Health & Safety', 12, 'All staff'],
    ['Data Protection and GDPR Policy', 'Compliance', 12, 'All staff'],
    ['Equality, Diversity and Inclusion Policy', 'HR policy', 24, 'All staff'],
    ['Sickness Absence Policy', 'HR policy', 24, 'All staff'],
    ['Expenses Policy', 'Finance', 12, 'Managers'],
    ['Safeguarding Policy', 'Compliance', 12, 'Care staff']
  ];

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.length) return raw;
    } catch (e) { /* fall through to seed */ }
    const now = Date.now();
    const seeded = SEED.map((s, i) => ({
      id: uid(), name: s[0], category: s[1], audience: s[3],
      version: '1.' + (i % 4), owner: 'HR',
      issuedAt: iso(new Date(now - (60 + i * 40) * 864e5)),
      reviewDue: iso(new Date(now + (s[2] * 30 - i * 45) * 864e5)),
      requiresAck: i < 6,
      acknowledgedBy: []
    }));
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  function write(all) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); return all; }

  window.PolicyStore = {
    CATEGORIES: ['Handbook', 'HR policy', 'Health & Safety', 'Compliance', 'Finance', 'Operational'],
    AUDIENCES: ['All staff', 'Managers', 'Care staff', 'Warehouse', 'Office only'],
    list() { return read(); },
    get(id) { return read().find(p => p.id === id) || null; },
    add(policy) {
      const all = read();
      const row = Object.assign({
        id: uid(), version: '1.0', owner: 'HR', issuedAt: iso(new Date()),
        requiresAck: true, acknowledgedBy: []
      }, policy);
      all.unshift(row); write(all); return row;
    },
    update(id, patch) {
      const all = read();
      const next = all.map(p => p.id === id ? Object.assign({}, p, patch) : p);
      write(next);
      return next.find(p => p.id === id);
    },
    remove(id) { write(read().filter(p => p.id !== id)); return true; },
    acknowledge(id, employeeKey) {
      const all = read();
      const p = all.find(x => x.id === id);
      if (!p) return null;
      if (p.acknowledgedBy.indexOf(employeeKey) === -1) p.acknowledgedBy.push(employeeKey);
      write(all);
      return p;
    },
    unacknowledge(id, employeeKey) {
      const all = read();
      const p = all.find(x => x.id === id);
      if (!p) return null;
      p.acknowledgedBy = p.acknowledgedBy.filter(k => k !== employeeKey);
      write(all);
      return p;
    },
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(KEY); notify(); }
  };
})();
