/* NHR Solution — support store.

   The help centre inside the platform. Two halves that meet:

   - ARTICLES: a searchable knowledge base, each article tied to the module it
     explains, with helpful/not-helpful voting so the gaps become visible.
   - TICKETS: real support conversations with a thread, priority and status.

   The integration worth having is context capture. A ticket raised from inside
   the product carries the module it came from, the reporter's role and plan,
   and the workspace shape (headcount, employees on record). Support staff
   spend most of their first reply asking for exactly that, so the ticket
   collects it automatically and shows the requester what is being attached —
   no silent diagnostics.

   Deliberately NOT captured: employee names, salaries, absence reasons, notes,
   or anything from a record. A support ticket is not a route around
   permissions.

   window.SupportStore
*/
(function () {
  const KEY = 'nhr-support-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString(); }

  const CATEGORIES = ['Getting started', 'Employees', 'Leave & absence', 'Attendance & rotas', 'Payroll', 'Documents', 'Training', 'Health & Safety', 'Reports', 'Account & billing'];
  const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
  const STATUSES = ['Open', 'Waiting on you', 'In progress', 'Resolved'];

  /* Response targets by priority. Stated so expectations are set before the
     ticket is raised rather than guessed afterwards. Hours are working hours. */
  const SLA = { Urgent: 2, High: 4, Normal: 8, Low: 24 };

  const ARTICLES = [
    {
      title: 'Adding your first employees',
      category: 'Getting started', module: 'Employees', minutes: 4,
      body: 'Three routes, depending on how many people you have.\n\nOne at a time: Employees → Add Employee. The wizard asks for personal details, employment terms and payroll in three steps, and only name, start date and employment type are mandatory. Everything else can be filled later, which matters when you are setting up in a hurry.\n\nIn bulk: Employees → Import. Download the template, fill it, upload it. The importer validates every row before writing anything and shows you which rows would fail and why — nothing is saved until you accept the preview. Duplicate employee references are rejected rather than merged, because a silent merge is much harder to unpick than a rejected row.\n\nFrom recruitment: when a candidate reaches Hired, Recruitment offers to create their employee record with the details already captured, so you are not retyping a name you already have.\n\nA tip worth following: set the department and manager as you go. Manager relationships drive what a Manager role can see, and filling them in later means going back through every record.'
    },
    {
      title: 'Why a manager cannot see an employee',
      category: 'Employees', module: 'Employees', minutes: 3,
      body: 'The Manager role sees their own direct reports, not the whole business. If a manager reports someone missing from their list, check three things in order.\n\nFirst, the employee\'s Manager field. Access follows that field, so if it is blank or points at someone else, the record will not appear. Second, whether the employee is archived — leavers drop out of the default list for everyone. Third, the manager\'s own role: an Employee-role account sees only their own record however many people report to them.\n\nThis is deliberate rather than a limitation. Widening a manager\'s view to the whole company would expose salary, absence and performance data for people they have no business reading, and once it is widened nobody notices it was.'
    },
    {
      title: 'Holiday balances look wrong',
      category: 'Leave & absence', module: 'Leave', minutes: 5,
      body: 'Balances are calculated, never stored, so a wrong balance is almost always a wrong input.\n\nStart with the entitlement on the employment tab. That is the annual figure in days, and a part-time employee needs a pro-rated number rather than the full-time default. Then check the leave year start date in Settings — a balance that looks a year out is usually a leave year running January to December when the platform is set to April.\n\nNext, look at what has been deducted. Only approved requests reduce the balance; pending ones are shown separately so a manager can see the committed position without them counting twice. Half days count as 0.5, and requests spanning a weekend count working days only.\n\nIf the entitlement is right and the deductions are right but the total still looks wrong, check whether the employee is on irregular hours. Those accrue at 12.07% of hours worked rather than a fixed annual figure, and applying a fixed entitlement to them will not reconcile.'
    },
    {
      title: 'Clock-in and out records that do not match a rota',
      category: 'Attendance & rotas', module: 'Attendance', minutes: 4,
      body: 'Attendance records what happened. The rota records what was planned. They are stored separately on purpose, because overwriting the plan with the actual destroys the evidence that they differed.\n\nA variance appears when someone clocks in outside their scheduled window. Small variances are normal and need no action. Persistent ones are worth a conversation, and the attendance screen flags them rather than silently adjusting the record.\n\nIf a clock-in is genuinely wrong — a phone with the wrong time, someone clocking in for a colleague — a manager can correct it, and the correction is logged with who made it and when. Corrections are never silent, because an attendance record that can be quietly edited is worthless in a dispute about pay.'
    },
    {
      title: 'Payroll figures differ from our payroll provider',
      category: 'Payroll', module: 'Payroll', minutes: 6,
      body: 'The platform calculates gross to net using current-year thresholds, but it is not your payroll bureau and several things it cannot know will move the number.\n\nThe usual causes, in rough order of frequency: a tax code the platform has not been told about, student loan repayments, salary sacrifice arrangements, benefits in kind, a different pension scheme basis (relief at source versus net pay changes the taxable figure), and mid-year starters carrying a previous employer\'s pay and tax.\n\nCheck the tax code first — it accounts for most differences on its own, and an employee on a month-1 basis will not reconcile against a cumulative calculation at all.\n\nWhere a difference persists, the payroll provider\'s figure is the one to trust for payment. Use the platform\'s calculation for estimating and modelling, and treat any gap as a prompt to check what the record is missing rather than as an error in the maths.'
    },
    {
      title: 'A document shows as expired but has been renewed',
      category: 'Documents', module: 'Documents', minutes: 3,
      body: 'Expiry status is derived from the expiry date, not from a flag someone sets. An uploaded renewal does not change the status on its own — the new document needs its own expiry date recorded.\n\nThe common mistake is uploading the new certificate as a second file against the same entry and leaving the old date in place. Add the renewal as a new document with the new expiry, then archive the superseded one. That keeps the history, which matters when you need to show what was valid at a particular time.\n\nRight-to-work documents behave the same way but carry more weight: a lapsed record is a compliance exposure, not just untidy data, so those are listed separately.'
    },
    {
      title: 'Assigning mandatory training to a whole department',
      category: 'Training', module: 'Training', minutes: 4,
      body: 'Training → Compliance shows a matrix of who needs what, based on the mandatory course definitions rather than on what has already been assigned. That distinction is the point: a gap appears because the requirement exists, not because somebody remembered to create it.\n\nTo assign in bulk, open Courses, choose the course, and select a department or the whole workspace. Anyone who already holds a valid certificate is skipped rather than reassigned, so you are not asking people to redo training they completed last month.\n\nRenewal is handled by the course\'s renewal period. A certificate approaching its expiry moves to Expiring soon and appears on the renewal list; one past it reads Expired regardless of what the stored status says.\n\nIf staff complete courses in eLearning, passing the assessment writes the certificate back automatically, so the matrix reflects real learning rather than a tick box.'
    },
    {
      title: 'What must be reported to the HSE',
      category: 'Health & Safety', module: 'Health & Safety', minutes: 5,
      body: 'The platform works out reportability from what you enter — severity, incident type and days unable to work — rather than asking you to decide.\n\nReportable without delay, and by report within 10 days: deaths, specified injuries, dangerous occurrences, and diagnosed occupational diseases. Reportable within 15 days: injuries keeping someone off normal duties for more than 7 consecutive days, not counting the day of the accident. Recorded but not reportable: more than 3 days of incapacity.\n\nEntering the days-off figure is what drives this, so enter it as soon as it is known. A first-aid-only incident that later turns into two weeks off becomes reportable, and the deadline runs from the date of the incident rather than the date you found out.\n\nMarking a report as sent in the platform records that you did it. It does not submit anything to the HSE — that happens on their website.'
    },
    {
      title: 'Exporting data for a board report',
      category: 'Reports', module: 'Reports', minutes: 3,
      body: 'Every report in Reports → Reports runs on screen and exports as CSV. The export carries the same restrictions as the screen: without payroll permission the salary columns are not in the file because they were never calculated, and wellbeing figures below the reporting threshold are exported as suppressed rather than as a number.\n\nFor something the library does not cover, Builder lets you pick columns, filter by department and status, group for a count, and export the result.\n\nOne caution on definitions. Turnover here is leavers over average headcount for the period, not over today\'s headcount, and absence rate is over available working days at five days a week. If you are comparing against an external benchmark, check it uses the same basis — the difference is often larger than the change you are reporting.'
    },
    {
      title: 'Changing plan and what happens to locked modules',
      category: 'Account & billing', module: 'Plan & Billing', minutes: 3,
      body: 'Plan & Billing prices your subscription from the employee records actually in the workspace, so the estimate is the bill rather than a guess. Archived leavers are excluded from the count.\n\nDowngrading locks the premium modules the lower plan does not include. Your data is not deleted or altered — the module simply cannot be opened, and everything returns exactly as it was if you upgrade again. The change dialog names which modules you would lose before you confirm.\n\nDuring a free trial everything is unlocked. When the trial ends, access falls back to the plan you choose, which is why the trial banner names the date rather than just counting days.'
    }
  ];

  function seed() {
    const now = Date.now();
    const articles = ARTICLES.map((a, i) => Object.assign({
      id: uid('kb'), slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      helpful: 0, notHelpful: 0,
      updated: new Date(now - (8 + i * 11) * DAY).toISOString().slice(0, 10)
    }, a));

    const tickets = [
      {
        id: uid('tk'), reference: 'SUP-4412',
        subject: 'Import rejected six rows with duplicate reference',
        category: 'Employees', priority: 'Normal', status: 'Resolved',
        createdAt: iso(new Date(now - 9 * DAY)), updatedAt: iso(new Date(now - 7 * DAY)),
        raisedBy: 'Amara Osei', module: 'Employees',
        context: { role: 'HR Admin', plan: 'Professional', headcount: 12 },
        thread: [
          { id: uid('ms'), from: 'Amara Osei', staff: false, at: iso(new Date(now - 9 * DAY)), text: 'Our import file was rejected on six rows for duplicate employee reference, but they look unique to me.' },
          { id: uid('ms'), from: 'NHR Support', staff: true, at: iso(new Date(now - 8 * DAY)), text: 'Thanks — the validator compares references case-insensitively and trims whitespace, so NHR-000101 and nhr-000101 collide. Your file has a mix of both. Normalise the column and the rows will pass.' },
          { id: uid('ms'), from: 'Amara Osei', staff: false, at: iso(new Date(now - 7 * DAY)), text: 'That was it. Reimported cleanly, thank you.' }
        ]
      },
      {
        id: uid('tk'), reference: 'SUP-4418',
        subject: 'Part-time holiday entitlement not pro-rating',
        category: 'Leave & absence', priority: 'High', status: 'Waiting on you',
        createdAt: iso(new Date(now - 2 * DAY)), updatedAt: iso(new Date(now - 1 * DAY)),
        raisedBy: 'Amara Osei', module: 'Leave',
        context: { role: 'HR Admin', plan: 'Professional', headcount: 12 },
        thread: [
          { id: uid('ms'), from: 'Amara Osei', staff: false, at: iso(new Date(now - 2 * DAY)), text: 'A three-day-a-week employee is showing 28 days entitlement rather than a pro-rated figure.' },
          { id: uid('ms'), from: 'NHR Support', staff: true, at: iso(new Date(now - 1 * DAY)), text: 'Entitlement is stored per employee rather than derived from hours, so it needs setting to the pro-rated figure on the employment tab — 16.8 days for three days a week. Can you confirm whether their contract treats bank holidays as included or additional, as that changes the number we should be recommending?' }
        ]
      }
    ];

    const data = { articles, tickets, votes: {} };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.articles && raw.articles.length) { raw.votes = raw.votes || {}; return raw; }
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); notify(); return d; }

  const SupportStore = {
    CATEGORIES, PRIORITIES, STATUSES, SLA,

    articles() { return read().articles.slice(); },
    article(id) { return read().articles.find(a => a.id === id) || null; },
    /* Simple relevance: title matches beat body matches, and category matches
       sit between. Good enough to be useful and honest about being simple. */
    search(q) {
      const list = read().articles;
      if (!q || !q.trim()) return list;
      const t = q.toLowerCase().trim();
      return list.map(a => {
        let score = 0;
        if (a.title.toLowerCase().includes(t)) score += 10;
        if (a.category.toLowerCase().includes(t)) score += 5;
        if ((a.module || '').toLowerCase().includes(t)) score += 4;
        if (a.body.toLowerCase().includes(t)) score += 2;
        return { a, score };
      }).filter(x => x.score > 0).sort((x, y) => y.score - x.score).map(x => x.a);
    },
    vote(id, helpful) {
      const d = read();
      if (d.votes[id]) return null;           /* one vote per article per browser */
      d.articles = d.articles.map(a => a.id === id
        ? Object.assign({}, a, helpful ? { helpful: a.helpful + 1 } : { notHelpful: a.notHelpful + 1 })
        : a);
      d.votes[id] = helpful ? 'up' : 'down';
      write(d);
      return d.votes[id];
    },
    myVote(id) { return read().votes[id] || null; },

    tickets() { return read().tickets.slice().sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1); },
    ticket(id) { return read().tickets.find(t => t.id === id) || null; },

    addTicket(draft) {
      const d = read();
      const refs = d.tickets.map(t => Number(String(t.reference).replace(/\D/g, '')) || 0);
      const row = Object.assign({
        id: uid('tk'),
        reference: 'SUP-' + String(Math.max.apply(null, refs.concat([4400])) + 1),
        status: 'Open', createdAt: iso(new Date()), updatedAt: iso(new Date()),
        thread: []
      }, draft);
      if (draft.message) {
        row.thread = [{ id: uid('ms'), from: draft.raisedBy || 'You', staff: false, at: iso(new Date()), text: draft.message }];
        delete row.message;
      }
      d.tickets.unshift(row);
      write(d);
      return row;
    },
    reply(id, text, from) {
      const d = read();
      d.tickets = d.tickets.map(t => t.id === id
        ? Object.assign({}, t, {
          thread: (t.thread || []).concat([{ id: uid('ms'), from: from || 'You', staff: false, at: iso(new Date()), text }]),
          status: t.status === 'Waiting on you' ? 'In progress' : t.status,
          updatedAt: iso(new Date())
        })
        : t);
      write(d);
      return d.tickets.find(t => t.id === id);
    },
    setStatus(id, status) {
      const d = read();
      d.tickets = d.tickets.map(t => t.id === id ? Object.assign({}, t, { status, updatedAt: iso(new Date()) }) : t);
      write(d);
      return d.tickets.find(t => t.id === id);
    },

    /* The context a ticket carries. Shape of the workspace, never its contents. */
    captureContext() {
      const S = window.EmployeeStore, A = window.AuthStore;
      return {
        role: S ? S.session.role : 'Unknown',
        plan: A ? (A.session() ? A.session().plan : 'Trial') : 'Unknown',
        headcount: S ? S.list({}).length : 0,
        trial: A ? A.isTrial() : false,
        browser: (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/) || ['Unknown'])[0],
        viewport: window.innerWidth + '×' + window.innerHeight
      };
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.SupportStore = SupportStore;
})();
