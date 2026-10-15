/* NHR Solution — wellbeing store.

   Wellbeing data is the most sensitive data in an HR platform. Anything about a
   person's health is special category data under UK GDPR, and needs a lawful
   basis plus a separate Article 9 condition before you hold it at all.

   That shapes the design here, not just the copy:

   1. Check-ins are ANONYMOUS. A check-in records the team and the date, never
      the employee id. Nothing in this store can be traced back to a person, so
      there is no individual mood history for a manager to read.
   2. Results are SUPPRESSED below a minimum group size. With three responses in
      a team of four, aggregate figures identify people. Reports return no
      numbers until the threshold is met.
   3. Adjustments are recorded WITHOUT diagnosis. The register holds what was
      agreed and when it is reviewed — not the underlying condition. Managers
      need to know someone works from home on Tuesdays; they do not need to know
      why, and recording why creates a special category record.

   The risk view is built from operational data the platform already holds
   legitimately — absence frequency, overtime, untaken leave — rather than from
   anything health related. That is a workload signal, not a health assessment.

   window.WellbeingStore
*/
(function () {
  const KEY = 'nhr-wellbeing-v2';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  /* Minimum responses before aggregate figures are shown. Five is the common
     floor for staff survey reporting; smaller groups identify individuals. */
  const MIN_GROUP = 5;

  /* Check-in questions. Deliberately about work, not health — workload,
     support and clarity are things an employer can act on. */
  const QUESTIONS = [
    { id: 'workload', label: 'My workload has been manageable', invert: false },
    { id: 'support', label: 'I have felt supported by my manager', invert: false },
    { id: 'clarity', label: 'I have been clear on what is expected of me', invert: false },
    { id: 'balance', label: 'I have been able to switch off outside work', invert: false },
    { id: 'pressure', label: 'I have felt under unreasonable pressure', invert: true }
  ];

  const SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

  /* Support resources. Placeholders until real provision is in place — the
     module must not imply services exist that do not. */
  const RESOURCES = [
    {
      id: 'eap', category: 'Confidential support',
      title: 'Employee Assistance Programme',
      body: 'A confidential counselling and advice line, independent of your employer. Typically available 24 hours a day and free to use. Your employer is told how many people used the service, never who.',
      action: 'Provider details not yet configured',
      placeholder: true
    },
    {
      id: 'mh', category: 'Mental health',
      title: 'Mental health first aiders',
      body: 'Trained colleagues who can listen and help you find the right support. A first aider is not a therapist and does not diagnose — they are a first point of contact.',
      action: 'No first aiders registered yet',
      placeholder: true
    },
    {
      id: 'oh', category: 'Occupational health',
      title: 'Occupational health referral',
      body: 'An independent assessment of how your health affects your work and what adjustments would help. The report goes to you first, and you can ask for corrections before it is shared.',
      action: 'Referral route not yet configured',
      placeholder: true
    },
    {
      id: 'financial', category: 'Practical help',
      title: 'Financial wellbeing',
      body: 'Free, independent money guidance is available nationally. Financial pressure is one of the most common causes of stress at work and one of the least discussed.',
      action: 'Links not yet configured',
      placeholder: true
    },
    {
      id: 'adjust', category: 'At work',
      title: 'Request an adjustment',
      body: 'You can ask for a change to how, when or where you work. You do not have to disclose a diagnosis to make a request, and a request does not have to be in writing.',
      action: 'Available',
      placeholder: false
    },
    {
      id: 'urgent', category: 'Urgent',
      title: 'If you need help now',
      body: 'If you or someone else is at immediate risk, contact emergency services. For urgent but non-emergency mental health support, NHS 111 can direct you to the right service. This platform is not a crisis service and no one monitors it out of hours.',
      action: 'Always available',
      placeholder: false
    }
  ];

  const ADJUSTMENT_TYPES = [
    'Changed working hours', 'Hybrid or home working', 'Phased return',
    'Reduced hours (temporary)', 'Equipment or workstation', 'Additional breaks',
    'Duties adjusted', 'Written instructions', 'Quiet workspace', 'Other'
  ];

  function seed(employees) {
    const now = Date.now();
    const checkIns = [];
    /* One response per person per week at most — the same rule the form
       enforces — so the totals stay possible for the actual headcount. With
       small teams this naturally leaves several under the reporting threshold,
       which is the behaviour the module exists to demonstrate. */
    const roster = (employees || []).filter(e => e.department);
    roster.forEach(e => {
      const strain = e.department === 'Warehouse' ? -0.9 : e.department === 'Support' ? -0.3 : 0.2;
      /* Participation varies by person: some reply most weeks, some rarely. */
      const participation = 0.35 + Math.random() * 0.5;
      for (let w = 0; w < 12; w++) {
        if (Math.random() > participation) continue;
        const answers = {};
        QUESTIONS.forEach(q => {
          const base = 3.4 + strain + (Math.random() * 1.6 - 0.8);
          const v = Math.max(1, Math.min(5, Math.round(base)));
          answers[q.id] = q.invert ? 6 - v : v;
        });
        checkIns.push({
          id: uid('ci'),
          department: e.department,
          date: iso(new Date(now - (w * 7 + Math.floor(Math.random() * 6)) * DAY)),
          answers,
          comment: ''
        });
      }
    });
    /* A handful of unattributed comments, spread across the busier teams. */
    const lines = [
      'Cover on late shifts is thin and it shows by Friday.',
      'Handover between shifts could be much clearer.',
      'Good support from my manager this month.',
      'Too many competing priorities with no one deciding which comes first.'
    ];
    lines.forEach((text, i) => {
      const target = checkIns[Math.floor(i * checkIns.length / lines.length)];
      if (target) target.comment = text;
    });

    const adjustments = [
      { id: uid('adj'), employeeId: '', type: 'Hybrid or home working', detail: 'Works from home Tuesdays and Thursdays', agreedAt: iso(new Date(now - 120 * DAY)), reviewAt: iso(new Date(now + 60 * DAY)), status: 'Active', agreedBy: 'Priya Raman' },
      { id: uid('adj'), employeeId: '', type: 'Equipment or workstation', detail: 'Sit-stand desk and ergonomic chair provided', agreedAt: iso(new Date(now - 200 * DAY)), reviewAt: '', status: 'Active', agreedBy: 'Priya Raman' },
      { id: uid('adj'), employeeId: '', type: 'Phased return', detail: 'Four days per week for six weeks, then review', agreedAt: iso(new Date(now - 20 * DAY)), reviewAt: iso(new Date(now + 22 * DAY)), status: 'Active', agreedBy: 'Priya Raman' }
    ];

    const data = { checkIns, adjustments, lastCheckIn: {} };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.checkIns && raw.checkIns.length) {
        raw.adjustments = raw.adjustments || [];
        raw.lastCheckIn = raw.lastCheckIn || {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    const depts = window.EmployeeStore ? window.EmployeeStore.list({}) : [];
    return seed(depts);
  }
  function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); notify(); return data; }

  const WellbeingStore = {
    MIN_GROUP, QUESTIONS, SCALE, RESOURCES, ADJUSTMENT_TYPES,

    checkIns() { return read().checkIns.slice(); },
    adjustments() { return read().adjustments.slice(); },

    /* Records a check-in against the department only. The employee id is used
       solely to remember locally that they have responded this week, so we do
       not nag them — it is never stored on the response itself. */
    submitCheckIn(employeeId, department, answers, comment) {
      const data = read();
      data.checkIns.unshift({
        id: uid('ci'), department, date: iso(new Date()),
        answers: Object.assign({}, answers),
        comment: (comment || '').trim()
      });
      if (employeeId) data.lastCheckIn[employeeId] = iso(new Date());
      write(data);
      return true;
    },
    lastCheckIn(employeeId) { return read().lastCheckIn[employeeId] || ''; },
    checkedInThisWeek(employeeId) {
      const last = WellbeingStore.lastCheckIn(employeeId);
      if (!last) return false;
      return (Date.now() - new Date(last)) < 7 * DAY;
    },

    /* Average score for a set of check-ins, 1-5, or null when the group is too
       small to report without identifying people. */
    score(list, questionId) {
      if (!list || list.length < MIN_GROUP) return null;
      const vals = list.map(c => Number(c.answers[questionId]) || 0).filter(v => v > 0);
      if (!vals.length) return null;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
    },
    overall(list) {
      if (!list || list.length < MIN_GROUP) return null;
      const per = QUESTIONS.map(q => WellbeingStore.score(list, q.id)).filter(v => v != null);
      if (!per.length) return null;
      return Math.round(per.reduce((a, b) => a + b, 0) / per.length * 10) / 10;
    },

    addAdjustment(draft) {
      const data = read();
      const row = Object.assign({ id: uid('adj'), status: 'Active', agreedAt: iso(new Date()) }, draft);
      data.adjustments.unshift(row);
      write(data);
      return row;
    },
    updateAdjustment(id, patch) {
      const data = read();
      data.adjustments = data.adjustments.map(a => a.id === id ? Object.assign({}, a, patch) : a);
      write(data);
      return data.adjustments.find(a => a.id === id);
    },
    removeAdjustment(id) {
      const data = read();
      data.adjustments = data.adjustments.filter(a => a.id !== id);
      write(data);
      return true;
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.WellbeingStore = WellbeingStore;
})();
