/* NHR Solution — integrations store.

   Honest by construction. No integration here is live: each catalogue entry
   carries a build status (Available / In development / Planned), and
   "connecting" one in this prototype records intent and configuration locally
   — it does not move data anywhere. The UI says so at the point of action
   rather than in a footnote, because a connection card that looks live is the
   fastest way to have someone assume payroll is syncing when it is not.

   What IS functional: connection records, per-integration field mapping,
   scope selection, API keys with one-time reveal, webhook subscriptions with
   a test-fire that writes a real delivery log entry, and the sync history.

   window.IntegrationStore
*/
(function () {
  const KEY = 'nhr-integrations-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString(); }

  const CATEGORIES = ['Payroll', 'Accounting', 'Productivity', 'Communication', 'Identity', 'Automation'];

  /* The catalogue. `build` is the honest status of the integration itself,
     separate from whether this tenant has connected it. */
  const CATALOGUE = [
    {
      key: 'csv', name: 'CSV import and export', category: 'Payroll', build: 'Available',
      blurb: 'Move employee, payroll and absence data in and out as files. Works today with no third party involved.',
      scopes: ['Employees', 'Payroll', 'Absence', 'Training'],
      direction: 'Two-way', auth: 'None — file based',
      fields: [['Employee reference', 'employeeId'], ['Full name', 'name'], ['Department', 'department'], ['Salary', 'payroll.salary']]
    },
    {
      key: 'xero', name: 'Xero', category: 'Accounting', build: 'In development',
      blurb: 'Post payroll journals and approved expense claims to your nominal ledger.',
      scopes: ['Payroll journals', 'Expenses'],
      direction: 'Push to Xero', auth: 'OAuth 2.0',
      fields: [['Employee reference', 'Contact code'], ['Department', 'Tracking category'], ['Expense category', 'Account code'], ['Pay period', 'Journal date']]
    },
    {
      key: 'sage', name: 'Sage Payroll', category: 'Payroll', build: 'In development',
      blurb: 'Send starters, leavers and pay changes to payroll so the two records stop drifting apart.',
      scopes: ['Employees', 'Pay changes', 'Starters and leavers'],
      direction: 'Push to Sage', auth: 'API key',
      fields: [['Employee reference', 'Works number'], ['Start date', 'Date joined'], ['Salary', 'Annual salary'], ['NI number', 'NI number']]
    },
    {
      key: 'm365', name: 'Microsoft 365', category: 'Identity', build: 'In development',
      blurb: 'Create and disable accounts from starter and leaver events, and sign in with your work account.',
      scopes: ['Directory', 'Single sign-on', 'Calendar'],
      direction: 'Two-way', auth: 'OAuth 2.0 / SAML',
      fields: [['Work email', 'userPrincipalName'], ['Full name', 'displayName'], ['Department', 'department'], ['Manager', 'manager']]
    },
    {
      key: 'gworkspace', name: 'Google Workspace', category: 'Identity', build: 'Planned',
      blurb: 'Directory sync and single sign-on for organisations on Google.',
      scopes: ['Directory', 'Single sign-on', 'Calendar'],
      direction: 'Two-way', auth: 'OAuth 2.0 / SAML',
      fields: [['Work email', 'primaryEmail'], ['Full name', 'name.fullName'], ['Department', 'orgUnitPath']]
    },
    {
      key: 'slack', name: 'Slack', category: 'Communication', build: 'Planned',
      blurb: 'Leave requests and approvals in channel, plus absence notifications to the right team.',
      scopes: ['Notifications', 'Approvals'],
      direction: 'Push to Slack', auth: 'OAuth 2.0',
      fields: [['Work email', 'Slack user'], ['Department', 'Channel']]
    },
    {
      key: 'teams', name: 'Microsoft Teams', category: 'Communication', build: 'Planned',
      blurb: 'The same notifications and approvals for organisations standardised on Teams.',
      scopes: ['Notifications', 'Approvals'],
      direction: 'Push to Teams', auth: 'OAuth 2.0',
      fields: [['Work email', 'Teams user'], ['Department', 'Channel']]
    },
    {
      key: 'zapier', name: 'Zapier', category: 'Automation', build: 'Planned',
      blurb: 'Trigger anything else from platform events without writing code.',
      scopes: ['Webhook events'],
      direction: 'Push out', auth: 'API key',
      fields: [['Event type', 'Trigger'], ['Payload', 'Fields']]
    },
    {
      key: 'webhooks', name: 'Outbound webhooks', category: 'Automation', build: 'Available',
      blurb: 'Send a signed JSON payload to your own endpoint whenever a platform event fires.',
      scopes: ['Webhook events'],
      direction: 'Push out', auth: 'HMAC signature',
      fields: [['Event type', 'event'], ['Resource id', 'data.id'], ['Occurred at', 'occurred_at']]
    }
  ];

  const EVENTS = [
    ['employee.created', 'A new employee record is added'],
    ['employee.updated', 'Any employee field changes'],
    ['employee.archived', 'Someone is marked as a leaver'],
    ['leave.requested', 'A leave request is submitted'],
    ['leave.approved', 'A leave request is approved'],
    ['absence.recorded', 'An absence is logged'],
    ['expense.submitted', 'An expense claim is submitted'],
    ['expense.approved', 'An expense claim is approved'],
    ['training.completed', 'A course is passed and a certificate issued'],
    ['incident.reported', 'A safety incident is recorded']
  ];

  function seed() {
    const now = Date.now();
    const data = {
      connections: {
        csv: { status: 'Connected', connectedAt: iso(new Date(now - 64 * DAY)), scopes: ['Employees', 'Absence'], mapped: true, lastSync: iso(new Date(now - 2 * DAY)) }
      },
      keys: [
        { id: uid('key'), label: 'Reporting export', prefix: 'nhr_live_7Kq2', created: iso(new Date(now - 41 * DAY)), lastUsed: iso(new Date(now - 3 * DAY)), scopes: ['Read employees', 'Read reports'], revoked: false }
      ],
      hooks: [
        { id: uid('hk'), url: 'https://example.internal/nhr/events', events: ['employee.created', 'leave.approved'], active: true, created: iso(new Date(now - 22 * DAY)) }
      ],
      deliveries: [
        { id: uid('dl'), hookUrl: 'https://example.internal/nhr/events', event: 'leave.approved', at: iso(new Date(now - 2 * DAY)), status: 200, ms: 214, test: false },
        { id: uid('dl'), hookUrl: 'https://example.internal/nhr/events', event: 'employee.created', at: iso(new Date(now - 6 * DAY)), status: 200, ms: 189, test: false },
        { id: uid('dl'), hookUrl: 'https://example.internal/nhr/events', event: 'leave.approved', at: iso(new Date(now - 9 * DAY)), status: 500, ms: 3011, test: false }
      ],
      syncs: [
        { id: uid('sy'), integration: 'csv', kind: 'Export', records: 12, at: iso(new Date(now - 2 * DAY)), result: 'Complete', note: 'Employee directory exported' },
        { id: uid('sy'), integration: 'csv', kind: 'Import', records: 4, at: iso(new Date(now - 30 * DAY)), result: 'Complete', note: 'Bulk starter import' }
      ]
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.connections) return raw;
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); notify(); return d; }

  const IntegrationStore = {
    CATEGORIES, CATALOGUE, EVENTS,

    all() { return CATALOGUE.slice(); },
    find(key) { return CATALOGUE.find(c => c.key === key) || null; },
    connections() { return read().connections; },
    connection(key) { return read().connections[key] || null; },

    connect(key, scopes) {
      const d = read();
      d.connections[key] = {
        status: 'Connected', connectedAt: iso(new Date()),
        scopes: scopes || [], mapped: false, lastSync: ''
      };
      write(d);
      return d.connections[key];
    },
    updateConnection(key, patch) {
      const d = read();
      if (!d.connections[key]) return null;
      d.connections[key] = Object.assign({}, d.connections[key], patch);
      write(d);
      return d.connections[key];
    },
    disconnect(key) {
      const d = read();
      delete d.connections[key];
      write(d);
      return true;
    },

    /* A "sync" here writes a history row and nothing else. Naming it honestly
       in the log matters more than making it look busy. */
    runSync(key, kind, records, note) {
      const d = read();
      d.syncs.unshift({
        id: uid('sy'), integration: key, kind: kind || 'Export',
        records: records || 0, at: iso(new Date()), result: 'Complete',
        note: note || 'Manual run'
      });
      if (d.connections[key]) d.connections[key].lastSync = iso(new Date());
      write(d);
      return d.syncs[0];
    },
    syncs() { return read().syncs.slice(); },

    keys() { return read().keys.slice(); },
    createKey(label, scopes) {
      const d = read();
      /* The full secret is returned once and never stored — only the prefix is
         kept, which is how a real key store behaves. */
      const secret = 'nhr_live_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 14);
      const row = {
        id: uid('key'), label: label || 'Untitled key', prefix: secret.slice(0, 13),
        created: iso(new Date()), lastUsed: '', scopes: scopes || [], revoked: false
      };
      d.keys.unshift(row);
      write(d);
      return { record: row, secret };
    },
    revokeKey(id) {
      const d = read();
      d.keys = d.keys.map(k => k.id === id ? Object.assign({}, k, { revoked: true }) : k);
      write(d);
      return true;
    },

    hooks() { return read().hooks.slice(); },
    addHook(url, events) {
      const d = read();
      const row = { id: uid('hk'), url, events: events || [], active: true, created: iso(new Date()) };
      d.hooks.unshift(row);
      write(d);
      return row;
    },
    updateHook(id, patch) {
      const d = read();
      d.hooks = d.hooks.map(h => h.id === id ? Object.assign({}, h, patch) : h);
      write(d);
      return d.hooks.find(h => h.id === id);
    },
    removeHook(id) {
      const d = read();
      d.hooks = d.hooks.filter(h => h.id !== id);
      write(d);
      return true;
    },
    deliveries() { return read().deliveries.slice(); },
    /* Test fire records a delivery attempt locally. It does not make a network
       request — the log row says "Test" so nobody mistakes it for proof the
       endpoint works. */
    testFire(hookId, event) {
      const d = read();
      const hook = d.hooks.find(h => h.id === hookId);
      if (!hook) return null;
      const row = {
        id: uid('dl'), hookUrl: hook.url, event: event || hook.events[0] || 'employee.updated',
        at: iso(new Date()), status: 200, ms: 120 + Math.floor(Math.random() * 180), test: true
      };
      d.deliveries.unshift(row);
      write(d);
      return row;
    },

    /* An example payload for an event, built from the real field shape the
       platform holds so the developer sees what they would actually receive. */
    samplePayload(event) {
      const base = { event, occurred_at: iso(new Date()), tenant: 'nhr-demo' };
      if (/employee/.test(event)) {
        base.data = { id: 'emp-1', employee_id: 'NHR-000101', name: 'Amara Osei', department: 'People', status: 'Active' };
      } else if (/leave/.test(event)) {
        base.data = { id: 'lv-8821', employee_id: 'NHR-000101', type: 'Annual leave', start_date: '2026-10-05', end_date: '2026-10-09', working_days: 5, status: 'Approved' };
      } else if (/absence/.test(event)) {
        base.data = { id: 'ab-4410', employee_id: 'NHR-000104', start_date: '2026-09-02', days: 3, self_certified: true };
      } else if (/expense/.test(event)) {
        base.data = { id: 'ex-2201', employee_id: 'NHR-000107', category: 'Travel', amount: 48.20, currency: 'GBP', status: 'Approved' };
      } else if (/training/.test(event)) {
        base.data = { id: 'tr-330', employee_id: 'NHR-000103', course: 'Fire Safety Awareness', score: 100, certificate_id: 'CERT-61910', expires_at: '2027-09-14' };
      } else {
        base.data = { id: 'inc-3308', reference: 'INC-3308', type: 'Accident', severity: 'Over-7-day injury', riddor_reportable: true };
      }
      return base;
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.IntegrationStore = IntegrationStore;
})();
