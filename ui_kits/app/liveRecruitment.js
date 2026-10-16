/* NHR Solution — live database connection for Recruitment and Job Adverts.

   For a real (non-demo) signed-in account, this:
     1. loads vacancies, candidates, notes, interviews, job adverts and email
        template settings from Supabase into the stores' live cache, and
     2. writes every change the stores make back to the database.

   The stores stay the single place the UI reads from, exactly as in the demo
   — this file only fills their cache and mirrors their writes. Demo sessions
   never touch it (NHRLive.active() is false), so demo data cannot reach the
   database and live data cannot reach the demo.

   Row-level security decides what each user can read and write; when the
   database refuses something (for example a manager trying to publish), the
   change is undone locally on the next refresh and an 'nhr-live-error' event
   explains why.

   window.NHRLive = { active, scope, employerSlug, status, refresh, persist,
                      saveTemplate, subscribe }
*/
(function () {
  const subs = [];
  const state = { status: 'idle', error: '', tenantId: '', slug: '', loadedAt: '', loading: null };
  function notify() { subs.forEach(fn => { try { fn(state); } catch (e) { /* detached */ } }); }
  function set(patch) { Object.assign(state, patch); notify(); }

  function session() { const A = window.AuthStore; return A && A.session ? A.session() : null; }
  function sb() { return window.NHRSupabase; }

  function active() {
    const s = session();
    const SB = sb();
    return !!(s && s.mode !== 'demo' && s.userId && SB && SB.enabled && SB.enabled());
  }

  /* ---------------------------------------------------------------- mapping */
  const EMP_TYPE = { 'Full-time': 'full_time', 'Part-time': 'part_time', Temporary: 'temporary', Contractor: 'contractor', Apprentice: 'apprentice', Casual: 'casual' };
  const EMP_TYPE_BACK = invert(EMP_TYPE);
  const VAC_STATUS = { Draft: 'draft', Open: 'open', 'On hold': 'on_hold', Closed: 'closed', Filled: 'filled' };
  const VAC_STATUS_BACK = invert(VAC_STATUS);
  const STAGE = { Applied: 'applied', Screening: 'screening', Interview: 'interview', 'Second interview': 'assessment', Offer: 'offer', Hired: 'hired', Rejected: 'rejected', Withdrawn: 'withdrawn' };
  const STAGE_BACK = invert(STAGE);
  const ADV_STATUS = { Draft: 'draft', 'Pending approval': 'pending_approval', Published: 'published', Paused: 'paused', Closed: 'closed', Archived: 'archived' };
  const ADV_STATUS_BACK = invert(ADV_STATUS);
  const WORKPLACE = { 'On-site': 'on_site', Hybrid: 'hybrid', Remote: 'remote' };
  const WORKPLACE_BACK = invert(WORKPLACE);
  const VISIBILITY = { 'Public and internal': 'public_and_internal', 'Public only': 'public_only', 'Internal only': 'internal_only' };
  const VISIBILITY_BACK = invert(VISIBILITY);
  const PERIOD = { 'per year': 'year', 'per hour': 'hour', 'per day': 'day' };
  const PERIOD_BACK = invert(PERIOD);
  function invert(o) { const r = {}; Object.keys(o).forEach(k => { r[o[k]] = k; }); return r; }
  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
  const day = v => (v ? String(v).slice(0, 10) : null);

  function vacancyToRow(v, tenant) {
    return {
      id: v.id, tenant_id: tenant, reference: v.reference, title: v.title || 'Untitled vacancy',
      department: v.department || null, location: v.location || null,
      employment_type: EMP_TYPE[v.employmentType] || 'full_time',
      salary_min: num(v.salary), salary_max: num(v.salary),
      description: v.description || null,
      status: VAC_STATUS[v.status] || 'draft',
      opened_on: day(v.postedAt), closes_on: day(v.closingAt),
      positions: Math.max(1, Number(v.openings) || 1),
      app_data: { hiringManager: v.hiringManager || '', openings: Number(v.openings) || 0 }
    };
  }
  function vacancyFromRow(r) {
    const a = r.app_data || {};
    return {
      id: r.id, reference: r.reference, title: r.title, department: r.department || '', location: r.location || '',
      employmentType: EMP_TYPE_BACK[r.employment_type] || 'Full-time',
      salary: Number(r.salary_max || r.salary_min) || 0,
      openings: a.openings != null ? a.openings : (r.status === 'filled' ? 0 : r.positions),
      status: VAC_STATUS_BACK[r.status] || 'Draft',
      hiringManager: a.hiringManager || '', postedAt: r.opened_on || day(r.created_at),
      closingAt: r.closes_on || '', description: r.description || ''
    };
  }

  function candidateToRow(c, tenant) {
    return {
      id: c.id, tenant_id: tenant, vacancy_id: isUuid(c.vacancyId) ? c.vacancyId : null,
      advert_id: isUuid(c.advertId) ? c.advertId : null, channel: c.channel || null,
      first_name: c.firstName, last_name: c.lastName, email: c.email || null, phone: c.phone || null,
      cover_note: c.coverNote || null, source: c.source || null,
      stage: STAGE[c.stage] || 'applied', stage_changed_at: c.movedAt ? new Date(c.movedAt).toISOString() : new Date().toISOString(),
      rating: c.rating ? Number(c.rating) : null,
      rtw_checked: /confirmed|share code/i.test(c.rightToWork || ''),
      applied_on: day(c.appliedAt) || day(new Date().toISOString()),
      rejected_reason: c.rejectedReason || null,
      auto_email: c.autoEmail !== false && !c.backdated,
      app_data: {
        rightToWork: c.rightToWork || '', offer: c.offer || null, hiredEmployeeId: c.hiredEmployeeId || '',
        cvName: c.cvName || '', advertRef: c.advertRef || '', internalEmployeeId: c.internalEmployeeId || '',
        referredBy: c.referredBy || '', backdated: !!c.backdated, recordedBy: c.recordedBy || ''
      }
    };
  }
  function candidateFromRow(r, notes, interviews) {
    const a = r.app_data || {};
    return {
      id: r.id, vacancyId: r.vacancy_id || '', advertId: r.advert_id || '', advertRef: a.advertRef || '', channel: r.channel || '',
      firstName: r.first_name, lastName: r.last_name, email: r.email || '', phone: r.phone || '',
      stage: STAGE_BACK[r.stage] || 'Applied', source: r.source || 'Company website', rating: r.rating || 0,
      rightToWork: a.rightToWork || (r.rtw_checked ? 'Right to work confirmed' : 'Not yet checked'),
      appliedAt: r.applied_on, movedAt: day(r.stage_changed_at) || r.applied_on,
      backdated: !!a.backdated || r.auto_email === false && r.applied_on < day(r.created_at),
      autoEmail: r.auto_email !== false, recordedBy: a.recordedBy || '',
      cvName: a.cvName || (r.cv_key ? String(r.cv_key).split('/').pop() : ''), cvKey: r.cv_key || '',
      coverNote: r.cover_note || '', internalEmployeeId: a.internalEmployeeId || '', referredBy: a.referredBy || '',
      offer: a.offer || null, rejectedReason: r.rejected_reason || '', hiredEmployeeId: a.hiredEmployeeId || '',
      notes: (notes || []).map(n => ({ id: n.id, at: n.created_at, by: n.author_label || 'Team', text: n.body })),
      interviews: (interviews || []).map(i => ({
        id: i.id, date: day(i.scheduled_at), type: i.kind || 'Interview',
        interviewer: Array.isArray(i.interviewer_ids) && i.interviewer_ids[0] ? String(i.interviewer_ids[0]) : '',
        notes: i.outcome || ''
      }))
    };
  }

  /* The advert table has a column for everything the database enforces or
     the careers page shows; the rest of the editor's state rides in app_data. */
  function advertToRow(a, tenant) {
    const appData = {
      activity: (a.activity || []).slice(0, 100), referrals: a.referrals || [], approval: a.approval || null,
      openings: a.openings, hiringManagerId: a.hiringManagerId || '', updatedBy: a.updatedBy || '', createdBy: a.createdBy || ''
    };
    return {
      id: a.id, tenant_id: tenant, vacancy_id: isUuid(a.vacancyId) ? a.vacancyId : null, reference: a.reference,
      title: a.title || 'Untitled advert', department: a.department || null, location: a.location || null,
      workplace: WORKPLACE[a.workplace] || 'on_site', employment_type: EMP_TYPE[a.employmentType] || 'full_time',
      hours_per_week: num(a.hoursPerWeek), contract_length: a.contractLength || null,
      salary_min: num(a.salaryMin), salary_max: num(a.salaryMax), salary_period: PERIOD[a.salaryPeriod] || 'year',
      show_salary: a.showSalary !== false,
      summary: a.summary || null, responsibilities: a.responsibilities || null, essential: a.essential || null,
      desirable: a.desirable || null, benefits: a.benefits || null,
      questions: (a.questions || []).map(q => ({ id: q.id, text: q.text, type: q.type, required: !!q.required, knockout: q.knockout || null })),
      contact_email: a.contactEmail || null, visibility: VISIBILITY[a.visibility] || 'public_and_internal',
      channels: a.channels || {}, referral_bonus: num(a.referralBonus),
      include_rtw_statement: a.includeRtwStatement !== false,
      sponsorship_available: !!(a.sponsorship && a.sponsorship.available),
      soc_code: a.sponsorship && /^\d{4}$/.test(a.sponsorship.socCode || '') ? a.sponsorship.socCode : null,
      sponsorship_note: (a.sponsorship && a.sponsorship.note) || null,
      status: a.archived ? 'archived' : (ADV_STATUS[a.status] || 'draft'), historical: !!a.historical,
      published_on: day(a.publishedAt), closes_on: day(a.closingAt), closed_on: day(a.closedAt),
      closed_reason: a.closedReason || null, start_on: day(a.startDate),
      views: a.views || {}, app_data: appData
    };
  }
  function advertFromRow(r) {
    const d = r.app_data || {};
    return {
      id: r.id, reference: r.reference, vacancyId: r.vacancy_id || '', title: r.title, department: r.department || '',
      location: r.location || '', workplace: WORKPLACE_BACK[r.workplace] || 'On-site',
      employmentType: EMP_TYPE_BACK[r.employment_type] || 'Full-time',
      hoursPerWeek: r.hours_per_week != null ? String(r.hours_per_week) : '', contractLength: r.contract_length || '',
      salaryMin: r.salary_min != null ? String(Number(r.salary_min)) : '', salaryMax: r.salary_max != null ? String(Number(r.salary_max)) : '',
      salaryPeriod: PERIOD_BACK[r.salary_period] || 'per year', showSalary: r.show_salary !== false,
      openings: d.openings != null ? String(d.openings) : '1', startDate: r.start_on || '', closingAt: r.closes_on || '',
      summary: r.summary || '', responsibilities: r.responsibilities || '', essential: r.essential || '',
      desirable: r.desirable || '', benefits: r.benefits || '', hiringManagerId: d.hiringManagerId || '',
      contactEmail: r.contact_email || '', visibility: VISIBILITY_BACK[r.visibility] || 'Public and internal',
      channels: Object.assign({ careers: false, internal: false, indeed: false, linkedin: false, totaljobs: false, reed: false, findajob: false }, r.channels || {}),
      sponsorship: { available: !!r.sponsorship_available, socCode: r.soc_code || '', note: r.sponsorship_note || '' },
      includeRtwStatement: r.include_rtw_statement !== false, historical: !!r.historical,
      questions: (r.questions || []).map(q => Object.assign({}, q, { knockout: q.knockout || '' })),
      referralBonus: r.referral_bonus != null ? String(Number(r.referral_bonus)) : '',
      status: r.status === 'archived' ? 'Archived' : (ADV_STATUS_BACK[r.status] || 'Draft'),
      approval: d.approval || null, publishedAt: r.published_on || '', closedAt: r.closed_on || '', closedReason: r.closed_reason || '',
      views: r.views || {}, referrals: d.referrals || [], activity: d.activity || [], archived: r.status === 'archived',
      createdAt: r.created_at, updatedAt: r.updated_at, createdBy: d.createdBy || '', updatedBy: d.updatedBy || ''
    };
  }

  /* ---------------------------------------------------------------- load */
  function claims(db) {
    return db.auth.getSession().then(res => {
      const s = res && res.data && res.data.session;
      if (!s) return null;
      try {
        const p = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return p.app_metadata || {};
      } catch (e) { return null; }
    });
  }

  function refresh() {
    if (!active()) { set({ status: 'off' }); return Promise.resolve(null); }
    if (state.loading) return state.loading;
    set({ status: 'loading', error: '' });
    state.loading = sb().client().then(db => claims(db).then(meta => {
      if (!meta || !meta.tenant_id) {
        throw new Error('Your account is not linked to a workspace yet — the access token hook may not be switched on in Supabase.');
      }
      state.tenantId = meta.tenant_id;
      /* Screens ask EmployeeStore what the user may do; give it the real role. */
      const ROLE = { super_admin: 'Super Admin', hr_admin: 'HR Admin', manager: 'Manager', employee: 'Employee' };
      const S = window.EmployeeStore;
      if (S && S.setRole && ROLE[meta.role] && S.session.role !== ROLE[meta.role]) S.setRole(ROLE[meta.role]);
      const q = (t, sel, order) => db.from(t).select(sel || '*').order(order || 'created_at', { ascending: false }).limit(2000)
        .then(r => { if (r.error) throw new Error(t + ': ' + r.error.message); return r.data || []; });
      return Promise.all([
        q('vacancies'), q('candidates'), q('candidate_notes', '*', 'created_at'), q('interviews', '*', 'scheduled_at'),
        q('job_adverts'), q('candidate_email_templates', '*', 'updated_at'),
        db.from('tenants').select('slug, name').eq('id', meta.tenant_id).maybeSingle().then(r => r.data || null)
      ]);
    })).then(([vacs, cands, notes, ivs, adverts, templates, tenant]) => {
      const byCand = (rows) => { const m = {}; rows.forEach(r => { (m[r.candidate_id] = m[r.candidate_id] || []).push(r); }); return m; };
      const n = byCand(notes), iv = byCand(ivs);
      state.slug = tenant && tenant.slug ? String(tenant.slug) : '';
      const REC = window.RecruitmentStore, JA = window.JobAdvertStore, M = window.CandidateMailStore;
      if (REC && REC._load) REC._load({ vacancies: vacs.map(vacancyFromRow), candidates: cands.map(c => candidateFromRow(c, n[c.id], iv[c.id])) });
      if (JA && JA._load) JA._load({ adverts: adverts.map(advertFromRow) });
      if (M && M._loadTemplates) {
        const map = {};
        templates.forEach(t => { map[t.template] = { mode: t.mode }; if (t.subject) map[t.template].subject = t.subject; if (t.body) map[t.template].body = t.body; });
        M._loadTemplates(map);
      }
      set({ status: 'live', loadedAt: new Date().toISOString() });
      return true;
    }).catch(e => {
      set({ status: 'error', error: e.message || String(e) });
      window.dispatchEvent(new CustomEvent('nhr-live-error', { detail: state.error }));
      return null;
    }).finally(() => { state.loading = null; });
    return state.loading;
  }

  /* ---------------------------------------------------------------- write-through */
  /* Writes are queued so they reach the database in the order they were made
     — a vacancy must exist before its first candidate. */
  let chain = Promise.resolve();
  function enqueue(fn) {
    chain = chain.then(fn).catch(e => {
      const msg = (e && e.message) || String(e);
      set({ error: msg });
      window.dispatchEvent(new CustomEvent('nhr-live-error', { detail: 'Not saved to the database: ' + msg }));
      /* Re-read so the screen shows what the database actually holds. */
      setTimeout(refresh, 300);
    });
    return chain;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function diff(before, after) {
    const prev = {}; (before || []).forEach(x => { prev[x.id] = x; });
    const next = {}; (after || []).forEach(x => { next[x.id] = x; });
    return {
      upserts: (after || []).filter(x => !prev[x.id] || !same(prev[x.id], x)),
      removed: (before || []).filter(x => !next[x.id]),
      prev
    };
  }
  function ok(r) { if (r && r.error) throw new Error(r.error.message); return r; }

  function persist(kind, before, after) {
    if (!active() || state.status !== 'live') return;
    const tenant = state.tenantId;
    enqueue(() => sb().client().then(db => {
      if (kind === 'recruitment') {
        const v = diff(before && before.vacancies, after && after.vacancies);
        const c = diff(before && before.candidates, after && after.candidates);
        let p = Promise.resolve();
        if (v.upserts.length) p = p.then(() => db.from('vacancies').upsert(v.upserts.map(x => vacancyToRow(x, tenant))).then(ok));
        if (c.upserts.length) p = p.then(() => db.from('candidates').upsert(c.upserts.map(x => candidateToRow(x, tenant))).then(ok));
        /* Notes and interviews are append-only in the app: insert the new ones. */
        const newNotes = [], newIvs = [];
        c.upserts.forEach(x => {
          const old = c.prev[x.id] || { notes: [], interviews: [] };
          const oldN = {}; (old.notes || []).forEach(n => { oldN[n.id] = 1; });
          const oldI = {}; (old.interviews || []).forEach(i => { oldI[i.id] = 1; });
          (x.notes || []).filter(n => !oldN[n.id] && isUuid(n.id)).forEach(n => newNotes.push({
            id: n.id, tenant_id: tenant, candidate_id: x.id, body: n.text, author_label: n.by || null,
            kind: /^Email/.test(n.by || '') ? 'note' : (/Screening/.test(n.text || '') ? 'screening' : 'note'),
            created_at: n.at || new Date().toISOString()
          }));
          (x.interviews || []).filter(i => !oldI[i.id] && isUuid(i.id) && i.date).forEach(i => newIvs.push({
            id: i.id, tenant_id: tenant, candidate_id: x.id, scheduled_at: new Date(i.date + 'T09:00:00').toISOString(),
            kind: i.type || null, interviewer_ids: i.interviewer ? [i.interviewer] : [], outcome: i.notes || null
          }));
        });
        if (newNotes.length) p = p.then(() => db.from('candidate_notes').upsert(newNotes).then(ok));
        if (newIvs.length) p = p.then(() => db.from('interviews').upsert(newIvs).then(ok));
        if (c.removed.length) p = p.then(() => db.from('candidates').delete().in('id', c.removed.map(x => x.id)).then(ok));
        if (v.removed.length) p = p.then(() => db.from('vacancies').delete().in('id', v.removed.map(x => x.id)).then(ok));
        return p;
      }
      if (kind === 'adverts') {
        const a = diff(before && before.adverts, after && after.adverts);
        let p = Promise.resolve();
        /* One row at a time: the database checks each status change, and one
           refused change must not block the others. */
        a.upserts.forEach(x => { p = p.then(() => db.from('job_adverts').upsert(advertToRow(x, tenant)).then(ok)); });
        if (a.removed.length) p = p.then(() => db.from('job_adverts').delete().in('id', a.removed.map(x => x.id)).then(ok));
        return p;
      }
    }));
  }

  function saveTemplate(key, t) {
    if (!active() || state.status !== 'live') return;
    const tenant = state.tenantId;
    enqueue(() => sb().client().then(db => db.from('candidate_email_templates').upsert({
      tenant_id: tenant, template: key, mode: t.mode || 'auto',
      subject: t.subject || null, body: t.body || null, updated_at: new Date().toISOString()
    }).then(ok)));
  }

  /* The employer's name for emails, previews and job-posting data: the real
     workspace name for live accounts, the sample business in the demo. */
  window.nhrCompanyName = function () {
    const s = session();
    return active() && s && s.business && s.business !== 'Your Business' ? s.business : 'Northgate Services';
  };

  window.NHRLive = {
    active, refresh, persist, saveTemplate,
    scope() { const s = session(); return (s && s.userId) || 'anon'; },
    employerSlug() { return state.slug; },
    status() { return Object.assign({}, state); },
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    _map: { vacancyToRow, vacancyFromRow, candidateToRow, candidateFromRow, advertToRow, advertFromRow }
  };

  /* Start once the stores exist, and again whenever the account changes. */
  function boot() { if (active()) refresh(); else set({ status: 'off' }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  else setTimeout(boot, 0);
  let lastScope = null;
  const watch = () => { const now = active() ? window.NHRLive.scope() : 'off'; if (now !== lastScope) { lastScope = now; boot(); } };
  setTimeout(() => { if (window.AuthStore && window.AuthStore.subscribe) window.AuthStore.subscribe(watch); watch(); }, 0);
  /* Pick up applications that arrived from the careers page while the app is open. */
  setInterval(() => { if (active() && state.status === 'live' && document.visibilityState === 'visible') refresh(); }, 60000);
})();
