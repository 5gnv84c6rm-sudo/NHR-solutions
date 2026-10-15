/* NHR Solution — customer stories store.

   The brief is explicit: never invent customer claims. So this module does not
   pretend NHR Solution has references it does not have. Every seeded story is
   flagged as a placeholder and cannot be marked published.

   What it actually does is manage the reference programme:

   - PLACEHOLDERS show the shape a story takes, so marketing knows what to
     collect. They carry no company name that could be mistaken for real.
   - DRAFTS are built from your own workspace: the metrics come from the live
     platform data rather than being typed in, which is the point. A claim you
     can trace to a figure survives scrutiny; one somebody remembered does not.
   - CONSENT is a gate, not a checkbox. A story cannot be published without a
     recorded written permission covering the company name, the quote and the
     named individual — three separate things people forget are separate.

   window.StoryStore
*/
(function () {
  const KEY = 'nhr-stories-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  const SECTORS = ['Healthcare', 'Construction', 'Hospitality', 'Retail', 'Logistics', 'Professional services', 'Care services', 'Education', 'Charity'];
  const SIZES = ['1–10 employees', '11–50 employees', '51–200 employees', '201+ employees'];
  const STAGES = ['Idea', 'Contacted', 'Consent pending', 'Drafting', 'Approved', 'Published'];

  /* Placeholder outlines. Deliberately unnamed — a plausible fake company name
     is exactly the thing that ends up in a deck by accident. */
  const PLACEHOLDERS = [
    {
      sector: 'Healthcare', size: '51–200 employees',
      challenge: 'Mandatory training expiry tracked in a spreadsheet that only one person maintained, with no warning before a certificate lapsed.',
      approach: 'Moved the training matrix into the platform so expiry dates drive reminders rather than memory.',
      metricPrompt: 'Training compliance before and after, and the number of lapsed certificates found at the point of migration.',
      featurePrompt: 'Training, Documents, Reports'
    },
    {
      sector: 'Construction', size: '11–50 employees',
      challenge: 'Near misses were reported verbally and rarely written down, so patterns were invisible until something serious happened.',
      approach: 'Opened incident reporting to every role, not just managers, and put corrective actions on a tracked list.',
      metricPrompt: 'Near-miss reports per month before and after; near-miss to injury ratio; corrective actions closed on time.',
      featurePrompt: 'Health & Safety, Reports'
    },
    {
      sector: 'Hospitality', size: '51–200 employees',
      challenge: 'Rotas built in a spreadsheet each week, with no view of who was already on leave or under 18.',
      approach: 'Built rotas against the leave calendar so clashes surface while the shift is being assigned.',
      metricPrompt: 'Hours spent building the rota each week; shift clashes caught before publication.',
      featurePrompt: 'Rotas, Leave, Attendance'
    },
    {
      sector: 'Retail', size: '201+ employees',
      challenge: 'Payroll and HR held separate versions of the same employee list, so starters and pay changes had to be entered twice.',
      approach: 'Made the employee record the single source, with payroll reading from it.',
      metricPrompt: 'Duplicate data entry hours per month; payroll error rate before and after.',
      featurePrompt: 'Employees, Payroll, Integrations'
    }
  ];

  function seed() {
    const now = Date.now();
    const stories = PLACEHOLDERS.map((p, i) => Object.assign({
      id: uid('st'), placeholder: true, stage: 'Idea',
      company: '', contactName: '', contactRole: '', quote: '',
      metrics: [], features: [],
      consent: { company: false, quote: false, individual: false, recordedAt: '', recordedBy: '' },
      createdAt: iso(new Date(now - (10 + i * 12) * DAY)), publishedAt: ''
    }, p));
    const data = { stories };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.stories) return raw;
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); notify(); return d; }

  /* A story is publishable only when it has substance AND full consent. The
     two are checked separately so the UI can say which is missing. */
  function readiness(s) {
    const missing = [];
    if (s.placeholder) missing.push('This is a placeholder outline, not a real customer');
    if (!s.company) missing.push('Company name');
    if (!s.challenge) missing.push('The problem they had');
    if (!s.approach) missing.push('What they changed');
    if (!s.metrics || !s.metrics.length) missing.push('At least one measured result');
    if (!s.quote) missing.push('A quote');
    const consentMissing = [];
    if (!s.consent.company) consentMissing.push('use of the company name');
    if (!s.consent.quote) consentMissing.push('use of the quote');
    if (!s.consent.individual) consentMissing.push('naming the individual');
    return {
      missing, consentMissing,
      ready: missing.length === 0 && consentMissing.length === 0
    };
  }

  const StoryStore = {
    SECTORS, SIZES, STAGES, readiness,

    list() { return read().stories.slice(); },
    get(id) { return read().stories.find(s => s.id === id) || null; },

    add(draft) {
      const d = read();
      const row = Object.assign({
        id: uid('st'), placeholder: false, stage: 'Idea',
        company: '', sector: SECTORS[0], size: SIZES[1],
        challenge: '', approach: '', quote: '', contactName: '', contactRole: '',
        metrics: [], features: [],
        consent: { company: false, quote: false, individual: false, recordedAt: '', recordedBy: '' },
        createdAt: iso(new Date()), publishedAt: ''
      }, draft);
      d.stories.unshift(row);
      write(d);
      return row;
    },
    update(id, patch) {
      const d = read();
      d.stories = d.stories.map(s => s.id === id ? Object.assign({}, s, patch) : s);
      write(d);
      return d.stories.find(s => s.id === id);
    },
    remove(id) {
      const d = read();
      d.stories = d.stories.filter(s => s.id !== id);
      write(d);
      return true;
    },

    addMetric(id, metric) {
      const s = StoryStore.get(id);
      if (!s) return null;
      return StoryStore.update(id, { metrics: (s.metrics || []).concat([Object.assign({ id: uid('mt') }, metric)]) });
    },
    removeMetric(id, metricId) {
      const s = StoryStore.get(id);
      if (!s) return null;
      return StoryStore.update(id, { metrics: (s.metrics || []).filter(m => m.id !== metricId) });
    },

    recordConsent(id, consent, by) {
      return StoryStore.update(id, {
        consent: Object.assign({}, consent, { recordedAt: iso(new Date()), recordedBy: by || 'You' }),
        stage: consent.company && consent.quote && consent.individual ? 'Drafting' : 'Consent pending'
      });
    },

    publish(id) {
      const s = StoryStore.get(id);
      if (!s) return null;
      const r = readiness(s);
      if (!r.ready) return { error: r };
      return StoryStore.update(id, { stage: 'Published', publishedAt: iso(new Date()) });
    },
    unpublish(id) {
      return StoryStore.update(id, { stage: 'Approved', publishedAt: '' });
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.StoryStore = StoryStore;
})();
