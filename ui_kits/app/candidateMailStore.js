/* NHR Solution — automated candidate emails.

   Watches the Recruitment pipeline and emails a candidate when they are
   chosen to move forward: invited to interview, made an offer, hired. Also
   acknowledges new applications and, if switched on, sends rejections.

   Each template has a mode:
     'auto'   send as soon as the candidate reaches the stage
     'review' put the email in the outbox for a person to check and send
     'off'    never send
   Offers default to 'review' — an offer email is a contractual step and a
   person should read it first.

   Delivery: when the platform is connected to Supabase and the user is signed
   in, emails go through the send-candidate-email Edge Function (Resend). In
   the demo, or with no connection, they are kept in the outbox as
   "Not sent — email service not connected" so nothing silently disappears,
   and can be sent later from the outbox.

   Retrospective records (applications backdated by HR) never trigger
   automatic emails; they can still be emailed by hand from the outbox.

   window.CandidateMailStore = { TEMPLATES, templates, setTemplate, resetTemplate,
     outbox, forCandidate, preview, compose, send, sendNow, discard, retry,
     subscribe, reset }
*/
(function () {
  const KEY = 'nhr-candidate-mail-v1';
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function stamp() { return new Date().toISOString(); }
  function who() { const S = window.EmployeeStore; return S && S.session ? S.session.name : 'System'; }
  const COMPANY = 'Northgate Services';

  /* stage → template key */
  const TRIGGERS = { Applied: 'received', Interview: 'interview', 'Second interview': 'interview2', Offer: 'offer', Hired: 'hired', Rejected: 'rejected' };

  const TEMPLATES = {
    received: {
      label: 'Application received', stage: 'Applied', mode: 'auto', icon: 'Inbox',
      subject: 'We have received your application — {{jobTitle}}',
      body: 'Hi {{firstName}},\n\nThank you for applying for the {{jobTitle}} role at {{company}}. We have received your application and the hiring team will review it{{closingLine}}.\n\nYou don\'t need to do anything else for now — we\'ll be in touch either way.\n\nKind regards,\nThe {{company}} hiring team'
    },
    interview: {
      label: 'Interview invitation', stage: 'Interview', mode: 'auto', icon: 'CalendarClock',
      subject: 'Interview invitation — {{jobTitle}} at {{company}}',
      body: 'Hi {{firstName}},\n\nGood news — we would like to invite you to interview for the {{jobTitle}} role.\n\n{{interviewLine}}\n\nPlease reply to confirm, or let us know if you need a different time or any adjustments for the interview.\n\nPlease bring original documents showing your right to work in the UK, or a share code if you have one.\n\nKind regards,\n{{hiringManager}}\n{{company}}'
    },
    interview2: {
      label: 'Second interview invitation', stage: 'Second interview', mode: 'auto', icon: 'CalendarClock',
      subject: 'Next stage — {{jobTitle}} at {{company}}',
      body: 'Hi {{firstName}},\n\nThank you for your time at interview. We were impressed and would like to invite you to the next stage for the {{jobTitle}} role.\n\n{{interviewLine}}\n\nPlease reply to confirm a time that suits you.\n\nKind regards,\n{{hiringManager}}\n{{company}}'
    },
    offer: {
      label: 'Job offer', stage: 'Offer', mode: 'review', icon: 'FileSignature',
      subject: 'Offer of employment — {{jobTitle}}',
      body: 'Hi {{firstName}},\n\nWe are delighted to offer you the position of {{jobTitle}} at {{company}}.\n\n{{offerLine}}\n\nThis offer is subject to a satisfactory right-to-work check and references. Your written contract will follow separately.\n\nPlease reply to accept, or let us know if you have any questions.\n\nKind regards,\n{{hiringManager}}\n{{company}}'
    },
    hired: {
      label: 'Welcome aboard', stage: 'Hired', mode: 'auto', icon: 'PartyPopper',
      subject: 'Welcome to {{company}}, {{firstName}}!',
      body: 'Hi {{firstName}},\n\nWelcome to the team! We are looking forward to you starting as {{jobTitle}}{{startLine}}.\n\nYou will receive your login for the NHR Solution employee app shortly — please use it to complete your personal details, emergency contacts and bank details before your first day.\n\nSee you soon,\n{{hiringManager}}\n{{company}}'
    },
    rejected: {
      label: 'Unsuccessful application', stage: 'Rejected', mode: 'off', icon: 'MailX',
      subject: 'Your application — {{jobTitle}}',
      body: 'Hi {{firstName}},\n\nThank you for your interest in the {{jobTitle}} role and for the time you put into your application.\n\nOn this occasion we have decided not to take your application further. We will keep your details for 6 months in case a suitable role comes up, after which they will be deleted.\n\nKind regards,\nThe {{company}} hiring team'
    }
  };

  function blank() { return { templates: {}, outbox: [], lastStage: {}, primed: false }; }
  function read() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.outbox) return d; } catch (e) { /* fall through */ }
    return blank();
  }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); notify(); return d; }

  function template(key) {
    const over = read().templates[key] || {};
    return Object.assign({}, TEMPLATES[key], over, { key });
  }

  function fmt(d) { return d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
  function money(n) { return '£' + Math.round(Number(n || 0)).toLocaleString('en-GB'); }

  /* Everything a template can mention, resolved from the live records. */
  function fields(c) {
    const REC = window.RecruitmentStore, JA = window.JobAdvertStore;
    const vac = REC && c.vacancyId ? REC.vacancy(c.vacancyId) : null;
    const adv = JA && c.advertId ? JA.raw(c.advertId) : (JA && vac ? JA.list({ includeArchived: true }).find(a => a.vacancyId === vac.id) : null);
    const iv = (c.interviews || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const manager = (adv && JA.managerName(adv)) || (vac && vac.hiringManager) || 'The hiring team';
    return {
      firstName: c.firstName, lastName: c.lastName, fullName: c.firstName + ' ' + c.lastName,
      jobTitle: (vac && vac.title) || (adv && adv.title) || 'the role', company: COMPANY,
      location: (vac && vac.location) || (adv && adv.location) || '',
      hiringManager: manager,
      closingLine: adv && adv.closingAt && adv.status === 'Published' ? ' after the closing date on ' + fmt(adv.closingAt) : '',
      interviewLine: iv ? 'Date: ' + fmt(iv.date) + '\nFormat: ' + (iv.type || 'Interview') + '\nWith: ' + (iv.interviewer || manager) + ((vac && vac.location) ? '\nLocation: ' + vac.location : '')
        : 'We will be in touch shortly to agree a date and time that suits you.',
      offerLine: c.offer ? 'Salary: ' + money(c.offer.salary) + ' per year\nStart date: ' + fmt(c.offer.startDate) : 'The salary and start date are set out in the attached offer.',
      startLine: c.offer && c.offer.startDate ? ' on ' + fmt(c.offer.startDate) : '',
      replyTo: (adv && adv.contactEmail) || 'careers@example.com'
    };
  }
  function merge(text, f) { return String(text || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (f[k] != null ? f[k] : '')); }

  function compose(candidate, key) {
    const t = template(key);
    const f = fields(candidate);
    return { subject: merge(t.subject, f), body: merge(t.body, f), replyTo: f.replyTo };
  }

  function esc(v) { return String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function toHtml(body) {
    return '<div style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#101515;max-width:600px">' +
      esc(body).split(/\n{2,}/).map(p => '<p style="margin:0 0 14px">' + p.replace(/\n/g, '<br>') + '</p>').join('') +
      '<p style="margin:22px 0 0;font-size:12px;color:#8A9998">Sent by ' + esc(COMPANY) + ' using NHR Solution.</p></div>';
  }

  /* ---------- delivery ---------- */
  function transport(msg) {
    const SB = window.NHRSupabase;
    if (!SB || !SB.enabled || !SB.enabled()) return Promise.resolve({ sent: false, reason: 'Email service not connected (demo)' });
    const A = window.AuthStore, sess = A && A.session ? A.session() : null;
    if (sess && sess.mode === 'demo') return Promise.resolve({ sent: false, reason: 'Demo workspace — emails are not delivered' });
    return SB.client().then(db => db.auth.getSession().then(res => {
      if (!res || !res.data || !res.data.session) return { sent: false, reason: 'Not signed in to the live service' };
      return db.functions.invoke('send-candidate-email', {
        body: { to: msg.to, subject: msg.subject, html: toHtml(msg.body), text: msg.body, reply_to: msg.replyTo, template: msg.template, candidate_ref: msg.candidateId }
      }).then(r => r.error ? { sent: false, reason: r.error.message || 'Send failed' } : { sent: true, id: r.data && r.data.id });
    })).catch(e => ({ sent: false, reason: e.message || 'Send failed' }));
  }

  function update(id, patch) {
    const d = read();
    d.outbox = d.outbox.map(m => m.id === id ? Object.assign({}, m, patch) : m);
    write(d);
  }

  function deliver(id) {
    const m = read().outbox.find(x => x.id === id);
    if (!m) return Promise.resolve(null);
    update(id, { status: 'Sending' });
    return transport(m).then(r => {
      update(id, r.sent
        ? { status: 'Sent', sentAt: stamp(), sentBy: m.sentBy || who(), error: '' }
        : { status: 'Not sent', error: r.reason });
      const REC = window.RecruitmentStore;
      if (REC && REC.candidate(m.candidateId)) {
        const c = REC.candidate(m.candidateId);
        REC.updateCandidate(m.candidateId, { notes: (c.notes || []).concat([{ id: uid('nt'), at: stamp(), by: 'Email', text: (r.sent ? 'Email sent: ' : 'Email not sent (' + r.reason + '): ') + m.subject }]) });
      }
      return r;
    });
  }

  function queue(c, key, opts) {
    const o = opts || {};
    const msg = Object.assign({
      id: uid('mail'), candidateId: c.id, candidateName: c.firstName + ' ' + c.lastName,
      to: c.email, template: key, templateLabel: TEMPLATES[key] ? TEMPLATES[key].label : 'Custom email',
      createdAt: stamp(), createdBy: o.manual ? who() : 'Automatic', trigger: o.manual ? 'Sent by hand' : 'Moved to ' + (TEMPLATES[key] || {}).stage,
      status: o.review ? 'Awaiting review' : 'Queued', sentAt: '', error: ''
    }, compose(c, key), o.override || {});
    const d = read();
    /* Never send the same stage email to the same candidate twice automatically. */
    if (!o.manual && d.outbox.some(m => m.candidateId === c.id && m.template === key && m.status !== 'Discarded')) return null;
    d.outbox.unshift(msg);
    write(d);
    if (!o.review) deliver(msg.id);
    return msg;
  }

  /* ---------- the watcher ---------- */
  function scan() {
    const REC = window.RecruitmentStore;
    if (!REC) return;
    const d = read();
    const cands = REC.candidates();
    /* First run: record where everyone is now, so seeded or existing
       candidates do not get a burst of emails on page load. */
    if (!d.primed) {
      cands.forEach(c => { d.lastStage[c.id] = c.stage; });
      d.primed = true;
      localStorage.setItem(KEY, JSON.stringify(d));
      return;
    }
    const changes = [];
    cands.forEach(c => {
      const before = d.lastStage[c.id];
      if (before === c.stage) return;
      d.lastStage[c.id] = c.stage;
      /* A candidate seen for the first time is only "new" if they were just
         created through an application form. Anything else (a demo reset,
         records synced from another device) is recorded silently. */
      if (before === undefined && !(c.recordedAt && Date.now() - new Date(c.recordedAt) < 10 * 60e3)) return;
      changes.push(c);
    });
    if (!changes.length) return;
    localStorage.setItem(KEY, JSON.stringify(d));
    changes.forEach(c => {
      const key = TRIGGERS[c.stage];
      if (!key || !c.email) return;
      if (c.autoEmail === false || c.backdated) return;
      const t = template(key);
      if (t.mode === 'off') return;
      const m = queue(c, key, { review: t.mode === 'review' });
      if (m) window.dispatchEvent(new CustomEvent('nhr-candidate-mail', { detail: m }));
    });
  }

  const CandidateMailStore = {
    TEMPLATES, TRIGGERS, COMPANY,
    templates() { return Object.keys(TEMPLATES).map(template); },
    template,
    setTemplate(key, patch) {
      const d = read();
      d.templates[key] = Object.assign({}, d.templates[key] || {}, patch);
      write(d);
    },
    resetTemplate(key) { const d = read(); delete d.templates[key]; write(d); },
    outbox() { return read().outbox.slice(); },
    forCandidate(id) { return read().outbox.filter(m => m.candidateId === id); },
    compose,
    preview(key) {
      const REC = window.RecruitmentStore;
      const c = (REC && REC.candidates().find(x => x.stage === (TEMPLATES[key] || {}).stage)) || (REC && REC.candidates()[0]) ||
        { firstName: 'Alex', lastName: 'Taylor', email: 'alex@example.com', interviews: [] };
      return Object.assign({ candidate: c.firstName + ' ' + c.lastName }, compose(c, key));
    },
    /* Manual send — from the outbox or a candidate. Override lets a person
       edit the subject and body before it goes. */
    send(candidateId, key, override) {
      const REC = window.RecruitmentStore;
      const c = REC.candidate(candidateId);
      if (!c) return Promise.resolve({ error: 'Candidate not found.' });
      if (!c.email) return Promise.resolve({ error: 'This candidate has no email address.' });
      const m = queue(c, key, { manual: true, review: true, override });
      return deliver(m.id).then(r => Object.assign({ id: m.id }, r));
    },
    sendNow(id, override) {
      if (override) update(id, override);
      update(id, { sentBy: who() });
      return deliver(id);
    },
    retry(id) { return deliver(id); },
    discard(id) { update(id, { status: 'Discarded', discardedBy: who(), discardedAt: stamp() }); },
    scan,
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(KEY); notify(); }
  };

  if (window.RecruitmentStore) window.RecruitmentStore.subscribe(scan);
  window.addEventListener('storage', e => { if (e.key === 'nhr-recruitment-v1') scan(); if (e.key === KEY) notify(); });
  /* Prime after the other stores have seeded. */
  setTimeout(scan, 0);

  window.CandidateMailStore = CandidateMailStore;
})();
