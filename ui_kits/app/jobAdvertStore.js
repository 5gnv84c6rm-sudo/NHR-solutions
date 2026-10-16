/* NHR Solution — job advert store.

   A job advert is the public (or internal) face of a vacancy. The vacancy in
   RecruitmentStore is the hiring record — openings, pipeline, offers. The
   advert is what candidates read: the copy, salary display, screening
   questions and where it is posted. Keeping them separate means a vacancy can
   be re-advertised without losing its pipeline, and an advert can be drafted
   and approved before a vacancy exists.

   Joins to the rest of the platform:
   - Publishing creates (or reopens) the linked vacancy in RecruitmentStore.
   - Every application becomes a RecruitmentStore candidate on that vacancy,
     with the channel as its source and screening answers as a note.
   - Hiring managers are real employee records (EmployeeStore).
   - An employee referral is logged on the referring employee's record.
   - "Start from an existing role" copies job details from an employee record.
   - A vacancy that is filled or closed closes its advert.

   window.JobAdvertStore = { list, get, create, update, duplicate, archive,
     remove, submit, approve, returnToDraft, publish, pause, close, apply,
     refer, recordView, stats, checks, languageIssues, fromEmployee,
     jobPostingSchema, publicUrl, subscribe, reset }
*/
(function () {
  const KEY = 'nhr-job-adverts-v1';
  function K() { return window.NHRLive && NHRLive.active() ? KEY + ':live:' + NHRLive.scope() : KEY; }
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  function stamp() { return new Date().toISOString(); }
  function who() { const S = window.EmployeeStore; return S && S.session ? S.session.name : 'System'; }

  const STATUSES = ['Draft', 'Pending approval', 'Published', 'Paused', 'Closed', 'Archived'];
  const WORKPLACES = ['On-site', 'Hybrid', 'Remote'];
  const VISIBILITY = ['Public and internal', 'Public only', 'Internal only'];
  const SALARY_PERIODS = ['per year', 'per hour', 'per day'];

  /* Channels the advert can be posted to. The careers page and internal job
     board are hosted by the platform; the rest are posting destinations whose
     feeds a real deployment would connect through Integrations. */
  const CHANNELS = [
    { key: 'careers', label: 'Careers page', short: 'Site', icon: 'Globe', hosted: true, source: 'Company website' },
    { key: 'internal', label: 'Internal job board', short: 'Internal', icon: 'Building2', hosted: true, source: 'Internal' },
    { key: 'indeed', label: 'Indeed', short: 'Indeed', icon: 'Search', source: 'Job board' },
    { key: 'linkedin', label: 'LinkedIn', short: 'LinkedIn', icon: 'Linkedin', source: 'LinkedIn' },
    { key: 'totaljobs', label: 'Totaljobs', short: 'Totaljobs', icon: 'Briefcase', source: 'Job board' },
    { key: 'reed', label: 'Reed', short: 'Reed', icon: 'Briefcase', source: 'Job board' },
    { key: 'findajob', label: 'DWP Find a job', short: 'DWP', icon: 'Landmark', source: 'Job board' }
  ];

  /* Skilled Worker general salary threshold applying to new certificates of
     sponsorship from 22 July 2025. The going rate for the SOC code can be
     higher, so this is a floor for the warning, not a pass mark. */
  const SPONSOR_GENERAL_THRESHOLD = 41700;

  /* Wording that can put protected groups off applying or read as a
     discriminatory requirement. Matched as whole words, case-insensitive. */
  const LANGUAGE = [
    ['young', 'Age-related — describe the work instead, e.g. "a growing team"'],
    ['youthful', 'Age-related — describe the culture instead'],
    ['energetic', 'Can read as age-related — try "motivated" or "proactive"'],
    ['digital native', 'Age-related — say "confident with digital tools"'],
    ['recent graduate', 'Excludes older candidates — list the skills you need'],
    ['mature', 'Age-related — describe the experience required'],
    ['native english', 'Can discriminate on nationality — say "fluent English" if genuinely required'],
    ['native speaker', 'Can discriminate on nationality — state the level of fluency needed'],
    ['manpower', 'Gendered — try "workforce" or "staff"'],
    ['chairman', 'Gendered — try "chair"'],
    ['salesman', 'Gendered — try "salesperson"'],
    ['foreman', 'Gendered — try "supervisor" or "team leader"'],
    ['he', 'Gendered pronoun — use "they" or "you"'],
    ['she', 'Gendered pronoun — use "they" or "you"'],
    ['his', 'Gendered pronoun — use "their" or "your"'],
    ['her', 'Gendered pronoun — use "their" or "your"'],
    ['rockstar', 'Jargon that deters many applicants — describe the skill'],
    ['ninja', 'Jargon that deters many applicants — describe the skill'],
    ['guru', 'Jargon — say "expert" or describe the skill'],
    ['aggressive', 'Coded language that deters some applicants — try "ambitious"'],
    ['dominant', 'Coded language — try "confident" or "leading"'],
    ['able-bodied', 'Can discriminate on disability — describe the physical task and any adjustments'],
    ['clean driving licence', 'Only include if driving is essential to the role'],
    ['uk born', 'Discriminates on national origin — remove'],
    ['british only', 'Discriminates on nationality — use the right-to-work statement instead']
  ];

  const RTW_STATEMENT = 'All applicants must have the right to work in the UK. We carry out right-to-work checks on every candidate before employment starts, in line with Home Office guidance.';

  function blank() {
    return {
      id: uid('adv'), reference: '', vacancyId: '',
      title: '', department: '', location: '', workplace: 'On-site',
      employmentType: 'Full-time', hoursPerWeek: '37.5', contractLength: '',
      salaryMin: '', salaryMax: '', salaryPeriod: 'per year', showSalary: true,
      openings: '1', startDate: '', closingAt: '',
      summary: '', responsibilities: '', essential: '', desirable: '', benefits: '',
      hiringManagerId: '', contactEmail: 'careers@example.com',
      visibility: 'Public and internal',
      channels: { careers: true, internal: true, indeed: false, linkedin: false, totaljobs: false, reed: false, findajob: false },
      sponsorship: { available: false, socCode: '', note: '' },
      includeRtwStatement: true,
      /* Backdating: publishedAt may be set to a past date by HR. historical
         records an advert that has already run and closed. */
      historical: false,
      questions: [
        { id: uid('q'), text: 'Do you have the right to work in the UK?', type: 'yesno', required: true, knockout: 'no' }
      ],
      referralBonus: '',
      status: 'Draft', approval: null, publishedAt: '', closedAt: '', closedReason: '',
      views: {}, referrals: [], activity: [], archived: false,
      createdAt: stamp(), updatedAt: stamp(), createdBy: who(), updatedBy: who()
    };
  }

  /* ---------- seed ---------- */
  const SEED = [
    {
      title: 'Warehouse Operative', status: 'Published', workplace: 'On-site', salaryMin: 26000, salaryMax: 27500,
      summary: 'Join our Manchester distribution centre picking, packing and dispatching orders for customers across the North West. Full training is provided and there are clear routes into team leader roles.',
      responsibilities: 'Pick and pack orders accurately using handheld scanners\nLoad and unload deliveries safely\nKeep the warehouse clean, tidy and hazard-free\nWork with the team to hit daily dispatch targets',
      essential: 'Reliable and able to work a rotating shift pattern\nComfortable with manual handling after training\nGood attention to detail',
      desirable: 'Counterbalance or reach truck licence\nPrevious warehouse experience',
      benefits: '28 days holiday including bank holidays\nOvertime paid at time and a half\nPension with 5% employer contribution\nFree on-site parking',
      channels: { careers: true, internal: true, indeed: true, linkedin: false, totaljobs: true, reed: false, findajob: true },
      views: { careers: 64, internal: 18, indeed: 142, totaljobs: 58, findajob: 31 }, referralBonus: '250'
    },
    {
      title: 'Payroll Administrator', status: 'Published', workplace: 'Hybrid', salaryMin: 30000, salaryMax: 32000,
      summary: 'Run accurate monthly and weekly payrolls for around 300 colleagues, working closely with HR and Finance. Two days a week in our Leeds office.',
      responsibilities: 'Process starters, leavers and changes each pay period\nCalculate SSP, SMP and other statutory payments\nReconcile payroll and submit RTI to HMRC\nAnswer pay queries from employees',
      essential: 'Experience running end-to-end UK payroll\nConfident with Excel and a payroll system\nHigh level of accuracy and confidentiality',
      desirable: 'CIPP qualification or working towards it',
      benefits: '30 days holiday plus bank holidays\nHybrid working\nStudy support for CIPP\nEmployee assistance programme',
      channels: { careers: true, internal: true, indeed: true, linkedin: true, totaljobs: false, reed: true, findajob: false },
      views: { careers: 41, internal: 12, indeed: 88, linkedin: 53, reed: 22 }
    },
    {
      title: 'Support Team Leader', status: 'Published', workplace: 'Remote', salaryMin: 37000, salaryMax: 40000,
      summary: 'Lead a team of eight support advisers helping customers by phone, chat and email. You will coach the team, own service levels and improve how we work.',
      responsibilities: 'Coach and develop a team of eight advisers\nOwn response times and customer satisfaction scores\nHandle escalated customer issues\nPlan rotas with the workforce team',
      essential: 'Experience leading a customer service team\nComfortable using data to manage performance',
      desirable: 'Experience with Zendesk or a similar help desk',
      benefits: 'Fully remote within the UK\nHome working allowance\n28 days holiday plus bank holidays\nPrivate medical cover',
      channels: { careers: true, internal: true, indeed: false, linkedin: true, totaljobs: false, reed: false, findajob: false },
      views: { careers: 47, internal: 26, linkedin: 96 }, sponsorship: { available: true, socCode: '7220', note: 'We can consider sponsorship for candidates who meet the Skilled Worker requirements.' }
    },
    {
      title: 'HR Coordinator', status: 'Draft', workplace: 'Hybrid', salaryMin: 27000, salaryMax: 28000,
      summary: 'Support the People team with onboarding, HR administration and employee queries. Part-time, three days a week.',
      responsibilities: 'Prepare contracts and onboarding packs\nKeep employee records accurate\nBook and coordinate interviews',
      essential: 'Strong organisation skills\nExperience in an administrative role',
      desirable: 'CIPD Level 3',
      benefits: 'Pro-rata holiday\nFlexible hours',
      views: {}
    },
    {
      title: 'Multi-drop Delivery Driver', status: 'Pending approval', workplace: 'On-site', salaryMin: 13.2, salaryMax: 14.5, salaryPeriod: 'per hour',
      department: 'Operations', location: 'Manchester', noVacancy: true,
      summary: 'Deliver parcels to homes and businesses across south Manchester in a company van. You will plan your route each morning and be the friendly face of the business on the doorstep.',
      responsibilities: 'Load your van and plan the day\'s route\nDeliver 80–120 parcels a day safely and on time\nCarry out daily vehicle checks',
      essential: 'Full UK manual driving licence\nComfortable lifting parcels up to 25kg after training',
      desirable: 'Previous multi-drop experience',
      benefits: 'Company van and fuel card\nPaid breaks\n28 days holiday including bank holidays',
      channels: { careers: true, internal: true, indeed: true, linkedin: false, totaljobs: false, reed: false, findajob: true },
      views: {}
    }
  ];

  function seed() {
    const REC = window.RecruitmentStore;
    const vacs = REC ? REC.vacancies() : [];
    const now = Date.now();
    const managers = window.EmployeeStore ? window.EmployeeStore.managers() : [];
    const adverts = SEED.map((s, i) => {
      const vac = vacs.find(v => v.title === s.title);
      const a = Object.assign(blank(), s, {
        reference: 'ADV-' + String(2001 + i),
        vacancyId: vac ? vac.id : '',
        department: vac ? vac.department : (s.department || ''),
        location: vac ? vac.location : (s.location || ''),
        employmentType: vac ? vac.employmentType : 'Full-time',
        openings: String(vac ? vac.openings : 1),
        closingAt: vac ? vac.closingAt : iso(now + 21 * 864e5),
        hiringManagerId: managers[i % Math.max(1, managers.length)] ? managers[i % managers.length].id : '',
        publishedAt: s.status === 'Published' ? iso(now - (8 + i * 6) * 864e5) : '',
        approval: s.status === 'Published' ? { requestedBy: 'Priya Raman', approvedBy: 'Amara Osei', at: iso(now - (9 + i * 6) * 864e5) }
          : s.status === 'Pending approval' ? { requestedBy: 'Priya Raman', requestedAt: iso(now - 864e5), approvedBy: '', at: '' } : null,
        createdBy: 'Priya Raman', updatedBy: 'Priya Raman'
      });
      a.channels = Object.assign({}, blank().channels, s.channels || {});
      a.sponsorship = Object.assign({ available: false, socCode: '', note: '' }, s.sponsorship || {});
      a.activity = [{ id: uid('act'), at: stamp(), by: 'Priya Raman', action: 'Advert created' }]
        .concat(s.status === 'Published' ? [{ id: uid('act'), at: stamp(), by: 'Amara Osei', action: 'Approved and published' }] : [])
        .concat(s.status === 'Pending approval' ? [{ id: uid('act'), at: stamp(), by: 'Priya Raman', action: 'Submitted for approval' }] : []);
      delete a.noVacancy;
      if (i === 0) a.questions.push({ id: uid('q'), text: 'Are you able to work early, late and weekend shifts?', type: 'yesno', required: true, knockout: '' });
      if (i === 1) a.questions.push({ id: uid('q'), text: 'How many years of UK payroll experience do you have?', type: 'text', required: true, knockout: '' });
      return a;
    });
    const data = { adverts };
    localStorage.setItem(K(), JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(K()));
      if (raw && Array.isArray(raw.adverts)) return raw;
    } catch (e) { /* fall through */ }
    /* A live account starts empty — sample adverts are for the demo only. */
    if (window.NHRLive && NHRLive.active()) return { adverts: [] };
    return seed();
  }
  function write(data) {
    const k = K();
    let before = null;
    try { before = JSON.parse(localStorage.getItem(k)); } catch (e) { /* none */ }
    localStorage.setItem(k, JSON.stringify(data));
    if (window.NHRLive && NHRLive.active()) NHRLive.persist('adverts', before, data);
    notify();
    return data;
  }

  function nextRef(list) {
    const nums = list.map(a => Number(String(a.reference).replace(/\D/g, '')) || 0);
    return 'ADV-' + String(Math.max.apply(null, nums.concat([2000])) + 1);
  }

  function log(a, action) {
    a.activity = [{ id: uid('act'), at: stamp(), by: who(), action }].concat(a.activity || []);
    a.updatedAt = stamp(); a.updatedBy = who();
  }

  function mutate(id, fn) {
    const data = read();
    const a = data.adverts.find(x => x.id === id);
    if (!a) return null;
    fn(a);
    write(data);
    return a;
  }

  /* Status shown to users. A published advert whose closing date has passed,
     or whose vacancy is filled or closed, is no longer taking applications —
     shown as Closed with the reason, without waiting for someone to close it. */
  function effective(a) {
    const out = Object.assign({}, a);
    if (a.status === 'Published') {
      const REC = window.RecruitmentStore;
      const vac = REC && a.vacancyId ? REC.vacancy(a.vacancyId) : null;
      if (vac && (vac.status === 'Filled' || vac.status === 'Closed')) {
        out.status = 'Closed'; out.closedReason = 'Vacancy ' + vac.status.toLowerCase();
      } else if (a.closingAt && new Date(a.closingAt + 'T23:59:59') < new Date()) {
        out.status = 'Closed'; out.closedReason = 'Closing date passed';
      }
    }
    return out;
  }

  function salaryLabel(a) {
    const yearly = a.salaryPeriod === 'per year';
    const f = n => '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: yearly ? 0 : 2, maximumFractionDigits: yearly ? 0 : 2 });
    if (!a.salaryMin && !a.salaryMax) return 'Salary not stated';
    if (!a.showSalary) return 'Competitive';
    if (a.salaryMin && a.salaryMax && Number(a.salaryMax) !== Number(a.salaryMin)) return f(a.salaryMin) + ' – ' + f(a.salaryMax) + ' ' + a.salaryPeriod;
    return f(a.salaryMin || a.salaryMax) + ' ' + a.salaryPeriod;
  }

  function lines(t) { return String(t || '').split('\n').map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean); }

  const JobAdvertStore = {
    STATUSES, WORKPLACES, VISIBILITY, SALARY_PERIODS, CHANNELS, LANGUAGE, RTW_STATEMENT, SPONSOR_GENERAL_THRESHOLD,
    blank, salaryLabel, lines,

    list(opts) {
      const o = opts || {};
      let all = read().adverts.map(effective);
      if (!o.includeArchived) all = all.filter(a => !a.archived);
      if (o.publicOnly) all = all.filter(a => a.status === 'Published' && a.channels.careers && a.visibility !== 'Internal only');
      if (o.internalOnly) all = all.filter(a => a.status === 'Published' && a.channels.internal && a.visibility !== 'Public only');
      return all;
    },
    get(id) { const a = read().adverts.find(x => x.id === id || x.reference === id); return a ? effective(a) : null; },
    raw(id) { return read().adverts.find(x => x.id === id) || null; },

    create(draft) {
      const data = read();
      const a = Object.assign(blank(), draft || {});
      a.reference = nextRef(data.adverts);
      a.status = 'Draft';
      log(a, 'Advert created');
      data.adverts.unshift(a);
      write(data);
      return a;
    },
    update(id, patch) {
      return mutate(id, a => { Object.assign(a, patch); log(a, 'Advert edited'); });
    },
    duplicate(id) {
      const src = JobAdvertStore.raw(id);
      if (!src) return null;
      const copy = JSON.parse(JSON.stringify(src));
      return JobAdvertStore.create(Object.assign(copy, {
        id: uid('adv'), title: src.title + ' (copy)', vacancyId: '', views: {}, referrals: [], activity: [],
        approval: null, publishedAt: '', closedAt: '', closedReason: '',
        questions: copy.questions.map(q => Object.assign({}, q, { id: uid('q') }))
      }));
    },
    archive(id) { return mutate(id, a => { a.archived = true; a.status = 'Archived'; log(a, 'Advert archived'); }); },
    restore(id) { return mutate(id, a => { a.archived = false; a.status = 'Draft'; log(a, 'Advert restored to draft'); }); },
    remove(id) {
      const data = read();
      data.adverts = data.adverts.filter(a => a.id !== id);
      write(data);
      return true;
    },

    /* ---------- approval and publishing ---------- */
    submit(id) {
      return mutate(id, a => {
        a.status = 'Pending approval';
        a.approval = { requestedBy: who(), requestedAt: iso(new Date()), approvedBy: '', at: '' };
        log(a, 'Submitted for approval');
      });
    },
    approve(id) {
      /* Approval publishes — the approver has already read the final copy. */
      const a = JobAdvertStore.raw(id);
      if (!a) return null;
      if (a.approval && a.approval.requestedBy === who() && who() !== 'System') {
        /* Same rule as every other decision on the platform: nobody approves
           their own request. Publishing directly is still open to admins. */
        return { error: 'You submitted this advert, so someone else needs to approve it.' };
      }
      mutate(id, x => { x.approval = Object.assign({}, x.approval, { approvedBy: who(), at: iso(new Date()) }); log(x, 'Approved'); });
      return JobAdvertStore.publish(id);
    },
    returnToDraft(id, reason) {
      return mutate(id, a => { a.status = 'Draft'; log(a, 'Returned to draft' + (reason ? ' — ' + reason : '')); });
    },
    publish(id) {
      const REC = window.RecruitmentStore;
      const a = JobAdvertStore.raw(id);
      if (!a) return null;
      const blocking = JobAdvertStore.checks(a).filter(c => c.level === 'block');
      if (blocking.length) return { error: blocking.map(c => c.text).join(' ') };
      /* The vacancy is the hiring record. Create it on first publish so the
         pipeline exists before the first application arrives. */
      let vacancyId = a.vacancyId;
      const vacPatch = {
        title: a.title, department: a.department, location: a.location,
        employmentType: a.employmentType, salary: Number(a.salaryMax || a.salaryMin) || 0,
        openings: Math.max(1, Number(a.openings) || 1), closingAt: a.closingAt,
        hiringManager: JobAdvertStore.managerName(a), description: a.summary, status: 'Open'
      };
      if (REC) {
        const existing = vacancyId ? REC.vacancy(vacancyId) : null;
        if (existing) {
          REC.updateVacancy(vacancyId, existing.status === 'Filled' ? Object.assign({}, vacPatch, { status: 'Filled' }) : vacPatch);
        } else {
          vacancyId = REC.addVacancy(Object.assign({ postedAt: a.publishedAt || iso(new Date()) }, vacPatch)).id;
        }
        if (a.historical) REC.updateVacancy(vacancyId, { status: 'Closed', postedAt: a.publishedAt });
        else if (a.publishedAt) REC.updateVacancy(vacancyId, { postedAt: a.publishedAt });
      }
      const today = iso(new Date());
      return mutate(id, x => {
        const backdated = x.publishedAt && x.publishedAt < today && x.status !== 'Published' && x.status !== 'Paused' && x.status !== 'Closed';
        x.vacancyId = vacancyId; x.publishedAt = x.publishedAt || today;
        if (x.historical) {
          x.status = 'Closed'; x.closedAt = x.closingAt; x.closedReason = 'Recorded retrospectively';
          log(x, 'Past advert recorded — posted ' + x.publishedAt + ', closed ' + x.closingAt);
          return;
        }
        x.status = 'Published'; x.closedAt = ''; x.closedReason = '';
        if (backdated) log(x, 'Posted date backdated to ' + x.publishedAt);
        log(x, 'Published to ' + CHANNELS.filter(c => x.channels[c.key]).map(c => c.label).join(', '));
      });
    },
    pause(id) {
      const a = mutate(id, x => { x.status = 'Paused'; log(x, 'Paused — not taking applications'); });
      const REC = window.RecruitmentStore;
      if (a && a.vacancyId && REC && REC.vacancy(a.vacancyId)) REC.updateVacancy(a.vacancyId, { status: 'On hold' });
      return a;
    },
    close(id, reason) {
      const a = mutate(id, x => { x.status = 'Closed'; x.closedAt = iso(new Date()); x.closedReason = reason || 'Closed early'; log(x, 'Closed' + (reason ? ' — ' + reason : '')); });
      return a;
    },
    /* Extend a closed-by-date advert and put it back live. */
    extend(id, closingAt) {
      mutate(id, x => { x.closingAt = closingAt; log(x, 'Closing date extended to ' + closingAt); });
      return JobAdvertStore.publish(id);
    },

    /* ---------- candidates ---------- */
    /* An application from the careers page, internal board or a job board.
       Creates the RecruitmentStore candidate; knock-out answers are flagged
       in the note rather than auto-rejected, so a person makes the decision. */
    apply(id, applicant) {
      const REC = window.RecruitmentStore;
      const a = JobAdvertStore.get(id);
      if (!a) return { error: 'This advert no longer exists.' };
      const p = applicant || {};
      /* HR can record an application that arrived by email, post or a job
         board — including one received in the past, against a closed advert. */
      const recorded = !!p.recorded;
      if (a.status !== 'Published' && !(recorded && (a.status === 'Closed' || a.status === 'Paused'))) return { error: 'This advert is not taking applications.' };
      if (!REC || !a.vacancyId || !REC.vacancy(a.vacancyId)) return { error: 'The vacancy for this advert is missing.' };
      const today = iso(new Date());
      const appliedAt = recorded && p.appliedAt ? p.appliedAt : today;
      if (appliedAt > today) return { error: 'The date received cannot be in the future.' };
      if (a.publishedAt && appliedAt < a.publishedAt) return { error: 'The date received is before the advert was posted (' + a.publishedAt + '). Backdate the advert first if it ran earlier.' };
      const backdated = appliedAt < today;
      if (!p.firstName || !p.lastName || !p.email) return { error: 'First name, last name and email are required.' };
      const dupe = REC.candidates().find(c => c.vacancyId === a.vacancyId && String(c.email).toLowerCase() === String(p.email).toLowerCase());
      if (dupe) return { error: 'An application from this email address has already been received for this role.' };
      const channel = CHANNELS.find(c => c.key === p.channel) || CHANNELS[0];
      const answers = (a.questions || []).map(q => {
        const ans = (p.answers || {})[q.id];
        const flagged = q.type === 'yesno' && q.knockout && String(ans || '').toLowerCase() === q.knockout;
        return { q: q.text, a: ans || '—', flagged };
      });
      const flags = answers.filter(x => x.flagged).length;
      const rtw = /yes/i.test(answers.length ? answers[0].a : '') ? (a.sponsorship.available ? 'Share code provided' : 'Not yet checked') : (p.needsSponsorship ? 'Visa sponsorship needed' : 'Not yet checked');
      const c = REC.addCandidate({
        vacancyId: a.vacancyId, firstName: p.firstName.trim(), lastName: p.lastName.trim(),
        email: p.email.trim(), phone: (p.phone || '').trim(), source: p.internal ? 'Internal' : channel.source,
        rightToWork: p.needsSponsorship ? 'Visa sponsorship needed' : rtw,
        advertId: a.id, advertRef: a.reference, channel: channel.key,
        cvName: p.cvName || '', coverNote: p.coverNote || '', internalEmployeeId: p.employeeId || '',
        appliedAt, movedAt: appliedAt, backdated, recordedAt: stamp(), recordedBy: recorded ? who() : '',
        /* Emails are not sent automatically to retrospective records — the
           candidate may have heard already, and a stale email confuses. */
        autoEmail: !backdated,
        notes: [{
          id: uid('nt'), at: stamp(), by: 'Job advert ' + a.reference,
          text: 'Applied via ' + (p.internal ? 'the internal job board' : channel.label) + '.' +
            (answers.length ? ' Screening — ' + answers.map(x => x.q + ' ' + x.a + (x.flagged ? ' [does not meet]' : '')).join(' · ') : '') +
            (p.coverNote ? ' Cover note: ' + p.coverNote : '') + (p.cvName ? ' CV: ' + p.cvName : '') +
            (flags ? ' ⚠ ' + flags + ' knock-out answer' + (flags === 1 ? '' : 's') + ' — review before progressing.' : '') +
            (recorded ? ' Received ' + appliedAt + ', recorded by ' + who() + ' on ' + today + '.' : '')
        }]
      });
      if (p.employeeId && window.EmployeeStore) {
        window.EmployeeStore.logActivity(p.employeeId, 'Applied internally for ' + a.title + ' (' + a.reference + ')');
      }
      mutate(a.id, x => log(x, (recorded ? 'Application recorded' : 'Application received') + ' — ' + p.firstName + ' ' + p.lastName + ' via ' + (p.internal ? 'internal job board' : channel.label) + (backdated ? ' (received ' + appliedAt + ')' : '')));
      return { candidate: c, flagged: flags };
    },

    /* Correct the date an existing application was received. Audit-logged on
       the candidate; the original value is kept in the note. */
    backdateApplication(candidateId, date) {
      const REC = window.RecruitmentStore;
      const c = REC.candidate(candidateId);
      if (!c) return { error: 'Candidate not found.' };
      const today = iso(new Date());
      if (!date || date > today) return { error: 'Choose a date on or before today.' };
      const adv = c.advertId ? JobAdvertStore.raw(c.advertId) : null;
      if (adv && adv.publishedAt && date < adv.publishedAt) return { error: 'That is before the advert was posted (' + adv.publishedAt + ').' };
      const notes = (c.notes || []).concat([{ id: uid('nt'), at: stamp(), by: who(), text: 'Date received changed from ' + c.appliedAt + ' to ' + date + '.' }]);
      REC.updateCandidate(candidateId, {
        appliedAt: date, backdated: date < today,
        movedAt: c.movedAt && c.movedAt < date ? date : c.movedAt, notes
      });
      if (adv) mutate(adv.id, x => log(x, 'Application date for ' + c.firstName + ' ' + c.lastName + ' changed to ' + date));
      return { ok: true };
    },

    /* Employee referral — the referrer is a real employee record. */
    refer(id, referrerEmployeeId, candidate) {
      const S = window.EmployeeStore, REC = window.RecruitmentStore;
      const a = JobAdvertStore.get(id);
      if (!a || a.status !== 'Published') return { error: 'This advert is not taking referrals.' };
      const ref = S ? S.get(referrerEmployeeId) : null;
      if (!ref) return { error: 'Choose who is making the referral.' };
      if (!candidate || !candidate.firstName || !candidate.lastName || !candidate.email) return { error: 'Add the candidate’s name and email.' };
      const dupe = REC.candidates().find(c => c.vacancyId === a.vacancyId && String(c.email).toLowerCase() === String(candidate.email).toLowerCase());
      if (dupe) return { error: 'This person has already applied for this role.' };
      const refName = S.fullName(ref);
      const c = REC.addCandidate({
        vacancyId: a.vacancyId, firstName: candidate.firstName.trim(), lastName: candidate.lastName.trim(),
        email: candidate.email.trim(), phone: (candidate.phone || '').trim(), source: 'Referral',
        advertId: a.id, advertRef: a.reference, channel: 'internal', referredBy: ref.id,
        notes: [{ id: uid('nt'), at: stamp(), by: refName, text: 'Referred by ' + refName + ' (' + ref.employeeId + ').' + (candidate.reason ? ' ' + candidate.reason : '') }]
      });
      S.logActivity(ref.id, 'Referred ' + candidate.firstName + ' ' + candidate.lastName + ' for ' + a.title + ' (' + a.reference + ')');
      mutate(a.id, x => {
        x.referrals = (x.referrals || []).concat([{ id: uid('rf'), candidateId: c.id, referrerId: ref.id, referrer: refName, at: iso(new Date()) }]);
        log(x, 'Referral from ' + refName);
      });
      return { candidate: c };
    },

    recordView(id, channel) {
      const data = read();
      const a = data.adverts.find(x => x.id === id);
      if (!a) return;
      a.views = a.views || {};
      a.views[channel || 'careers'] = (a.views[channel || 'careers'] || 0) + 1;
      localStorage.setItem(K(), JSON.stringify(data)); /* silent — a view is not an edit */
    },

    /* Performance, derived from the pipeline so the numbers cannot drift. */
    stats(a) {
      const REC = window.RecruitmentStore;
      const cands = REC && a.vacancyId ? REC.candidates().filter(c => c.vacancyId === a.vacancyId) : [];
      const views = Object.keys(a.views || {}).reduce((n, k) => n + (a.views[k] || 0), 0);
      const byChannel = CHANNELS.map(ch => {
        const apps = cands.filter(c => c.channel ? c.channel === ch.key : (ch.key === 'careers' ? c.source === 'Company website' : ch.key === 'linkedin' ? c.source === 'LinkedIn' : ch.key === 'internal' ? (c.source === 'Referral' || c.source === 'Internal') : ch.key === 'indeed' ? (c.source === 'Job board' || c.source === 'Agency' || c.source === 'Speculative') : false)).length;
        const v = (a.views || {})[ch.key] || 0;
        return { key: ch.key, label: ch.label, short: ch.short, views: v, applications: apps, conversion: v ? Math.round(apps / v * 1000) / 10 : 0, live: !!a.channels[ch.key] };
      });
      const days = a.publishedAt ? Math.max(1, Math.ceil((Date.now() - new Date(a.publishedAt)) / 864e5)) : 0;
      const closesIn = a.closingAt ? Math.ceil((new Date(a.closingAt + 'T23:59:59') - Date.now()) / 864e5) : null;
      return {
        views, applications: cands.length,
        active: cands.filter(c => REC.STAGES.indexOf(c.stage) > -1).length,
        interviewing: cands.filter(c => /interview/i.test(c.stage)).length,
        hired: cands.filter(c => c.stage === 'Hired').length,
        referrals: cands.filter(c => c.source === 'Referral').length,
        conversion: views ? Math.round(cands.length / views * 1000) / 10 : 0,
        perDay: days ? Math.round(cands.length / days * 10) / 10 : 0,
        daysLive: days, closesIn, byChannel, candidates: cands
      };
    },

    /* ---------- quality checks ---------- */
    languageIssues(a) {
      const text = [a.title, a.summary, a.responsibilities, a.essential, a.desirable, a.benefits].join('\n').toLowerCase();
      const out = [];
      LANGUAGE.forEach(([term, hint]) => {
        const re = new RegExp('(^|[^a-z])' + term.replace(/[-]/g, '\\-') + '(?=$|[^a-z])', 'g');
        const m = text.match(re);
        if (m) out.push({ term, hint, count: m.length });
      });
      return out;
    },
    /* Each check: level block (cannot publish) | warn | ok. */
    checks(a) {
      const out = [];
      const add = (level, text) => out.push({ level, text });
      a.title && a.title.trim() ? add('ok', 'Job title set') : add('block', 'Add a job title.');
      a.location && a.location.trim() ? add('ok', 'Location set') : add('block', 'Add a location.');
      a.summary && a.summary.trim().length >= 60 ? add('ok', 'Role summary written') : add('block', 'Write a role summary of at least a couple of sentences.');
      lines(a.responsibilities).length ? add('ok', lines(a.responsibilities).length + ' responsibilities listed') : add('warn', 'List the main responsibilities — adverts without them get fewer applications.');
      lines(a.essential).length ? add('ok', 'Essential criteria listed') : add('block', 'List the essential criteria so candidates can judge their fit and shortlisting is consistent.');
      if (!a.salaryMin && !a.salaryMax) add('warn', 'No salary given — adverts with a salary attract noticeably more applicants.');
      else if (a.salaryMin && a.salaryMax && Number(a.salaryMin) > Number(a.salaryMax)) add('block', 'Minimum salary is higher than the maximum.');
      else if (!a.showSalary) add('warn', 'Salary is hidden on the advert — consider showing the range.');
      else add('ok', 'Salary shown');
      const todayIso = iso(new Date());
      if (a.publishedAt && a.publishedAt > todayIso && a.status !== 'Published') add('block', 'The posted date cannot be in the future.');
      if (a.publishedAt && a.closingAt && a.publishedAt > a.closingAt) add('block', 'The posted date is after the closing date.');
      if (a.historical) {
        if (!a.publishedAt) add('block', 'Add the date the past advert was posted.');
        if (!a.closingAt) add('block', 'Add the date the past advert closed.');
        else if (a.closingAt > todayIso) add('block', 'A past advert must have a closing date on or before today.');
        else add('ok', 'Recorded retrospectively — will be saved as closed');
      } else if (!a.closingAt) add('warn', 'No closing date — the advert will stay live until you close it.');
      else if (new Date(a.closingAt + 'T23:59:59') < new Date()) add('block', 'The closing date is in the past. Tick "Record a past advert" to log one that has already run.');
      else add('ok', 'Closes ' + new Date(a.closingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      if (!CHANNELS.some(c => a.channels[c.key])) add('block', 'Choose at least one place to post the advert.');
      if (a.visibility === 'Internal only' && (a.channels.indeed || a.channels.linkedin || a.channels.totaljobs || a.channels.reed || a.channels.findajob || a.channels.careers)) add('warn', 'Visibility is internal only, so external channels will not show it.');
      if (!a.hiringManagerId) add('warn', 'No hiring manager assigned.');
      const lang = JobAdvertStore.languageIssues(a);
      lang.length ? add('warn', lang.length + ' wording ' + (lang.length === 1 ? 'issue' : 'issues') + ' found: ' + lang.map(l => '"' + l.term + '"').join(', ') + '.') : add('ok', 'No biased or exclusionary wording found');
      if (a.sponsorship && a.sponsorship.available) {
        if (!a.sponsorship.socCode) add('warn', 'Sponsorship offered but no SOC code recorded.');
        const top = Number(a.salaryMax || a.salaryMin) || 0;
        if (a.salaryPeriod === 'per year' && top && top < SPONSOR_GENERAL_THRESHOLD) add('warn', 'Sponsorship offered, but the top of the range is below the Skilled Worker general threshold of £' + SPONSOR_GENERAL_THRESHOLD.toLocaleString('en-GB') + ' — check eligibility and the going rate for the SOC code.');
      }
      if (!a.includeRtwStatement) add('warn', 'Right-to-work statement removed — it should apply to all candidates equally.');
      return out;
    },
    score(a) {
      const c = JobAdvertStore.checks(a);
      return Math.round(c.filter(x => x.level === 'ok').length / Math.max(1, c.length) * 100);
    },

    /* ---------- Employee Management links ---------- */
    managerName(a) {
      const S = window.EmployeeStore;
      const e = S && a.hiringManagerId ? S.get(a.hiringManagerId) : null;
      return e ? S.fullName(e) : '';
    },
    /* Pre-fill from an existing employee's role — the usual way a replacement
       hire starts. Salary only copies when the viewer may read payroll. */
    fromEmployee(employeeId) {
      const S = window.EmployeeStore;
      const e = S ? S.get(employeeId) : null;
      if (!e) return {};
      const salary = S.can('payroll.read') && e.payroll && e.payroll.salary ? String(e.payroll.salary) : '';
      return {
        title: e.jobTitle || '', department: e.department || '', location: e.location || '',
        employmentType: e.employmentType || 'Full-time', hoursPerWeek: String(e.hoursPerWeek || '37.5'),
        salaryMin: salary, salaryMax: salary, hiringManagerId: e.managerId || '',
        summary: '', basedOn: S.fullName(e) + ' (' + e.employeeId + ')'
      };
    },

    publicUrl(a) {
      const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
      return base + JobAdvertStore.careersPath() + '#' + (a.reference || a.id);
    },
    /* Live accounts get their own careers page, addressed by workspace slug. */
    careersPath() {
      const slug = window.NHRLive && NHRLive.active() ? NHRLive.employerSlug() : '';
      return 'careers.html' + (slug ? '?employer=' + encodeURIComponent(slug) : '');
    },

    /* schema.org JobPosting — what Google for Jobs reads from a careers page. */
    jobPostingSchema(a, company) {
      const typeMap = { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', Temporary: 'TEMPORARY', Contractor: 'CONTRACTOR', Apprentice: 'INTERN', Casual: 'PER_DIEM' };
      const unit = { 'per year': 'YEAR', 'per hour': 'HOUR', 'per day': 'DAY' }[a.salaryPeriod] || 'YEAR';
      const o = {
        '@context': 'https://schema.org/', '@type': 'JobPosting',
        title: a.title,
        description: [a.summary, 'Responsibilities: ' + lines(a.responsibilities).join('; '), 'Essential: ' + lines(a.essential).join('; ')].join('\n'),
        identifier: { '@type': 'PropertyValue', name: company || 'Employer', value: a.reference },
        datePosted: a.publishedAt || iso(new Date()),
        validThrough: a.closingAt ? a.closingAt + 'T23:59' : undefined,
        employmentType: typeMap[a.employmentType] || 'OTHER',
        hiringOrganization: { '@type': 'Organization', name: company || 'Employer' },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: a.location, addressCountry: 'GB' } }
      };
      if (a.workplace === 'Remote') { o.jobLocationType = 'TELECOMMUTE'; o.applicantLocationRequirements = { '@type': 'Country', name: 'United Kingdom' }; }
      if (a.showSalary && (a.salaryMin || a.salaryMax)) {
        o.baseSalary = { '@type': 'MonetaryAmount', currency: 'GBP', value: { '@type': 'QuantitativeValue', minValue: Number(a.salaryMin || a.salaryMax), maxValue: Number(a.salaryMax || a.salaryMin), unitText: unit } };
      }
      return JSON.parse(JSON.stringify(o));
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(K()); notify(); },
    _load(data) { localStorage.setItem(K(), JSON.stringify(data)); notify(); }
  };

  /* A vacancy changing in Recruitment changes what the advert shows. */
  if (window.RecruitmentStore) window.RecruitmentStore.subscribe(notify);
  /* Another tab (the careers page) applying must refresh this one. */
  window.addEventListener('storage', e => { if (e.key && (e.key.indexOf(KEY) === 0 || e.key.indexOf('nhr-recruitment-v1') === 0)) notify(); });

  window.JobAdvertStore = JobAdvertStore;
})();
