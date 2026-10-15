/* Job Adverts module — shared hook, advert list and the advert editor.
   Data lives in jobAdvertStore.js; vacancies and candidates stay in
   RecruitmentStore, employees in EmployeeStore. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, BarChart, Switch, Checkbox } = window.NHRSolutionDesignSystem_0db691;

const ADV_TONE = { Draft: 'dark', 'Pending approval': 'warning', Published: 'success', Paused: 'warning', Closed: 'dark', Archived: 'dark' };
const advMoney = n => '£' + Math.round(Number(n || 0)).toLocaleString('en-GB');
const advDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* Live data for every Job Adverts view — re-renders on advert, vacancy,
   candidate and employee changes, so a hire or a role switch shows at once. */
function useJobAdvertData() {
  const JA = window.JobAdvertStore, REC = window.RecruitmentStore, S = window.EmployeeStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => JA.subscribe(force), []);
  React.useEffect(() => REC.subscribe(force), []);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => (window.CandidateMailStore ? window.CandidateMailStore.subscribe(force) : undefined), []);
  const adverts = JA.list({ includeArchived: true });
  return {
    JA, REC, S, refresh: force, adverts,
    canEdit: S.can('employees.write'),          /* HR, Super Admin, Manager */
    canPublish: S.can('employees.archive'),     /* HR and Super Admin approve and publish */
    isEmployee: S.session.role === 'Employee'
  };
}

/* Transient confirmation — every action says what it did. */
function useAdvertToast() {
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3200); return () => clearTimeout(t); }, [msg]);
  const node = msg ? (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', left: '50%', top: 18, transform: 'translateX(-50%)', zIndex: 90,
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', maxWidth: 'calc(100vw - 32px)',
      background: 'rgba(13,17,17,.97)', border: '1px solid ' + (msg.tone === 'warn' ? 'rgba(242,180,65,.45)' : 'rgba(0,229,212,.4)'),
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-float)', color: '#fff', fontSize: 13.5, fontWeight: 600
    }}>
      <Icon name={msg.tone === 'warn' ? 'TriangleAlert' : 'CircleCheck'} size={17} style={{ color: msg.tone === 'warn' ? 'var(--nhr-warning)' : 'var(--nhr-turquoise)' }} />
      <span>{msg.text}</span>
    </div>
  ) : null;
  return [node, (text, tone) => setMsg({ text, tone, k: Date.now() })];
}

function copyText(text) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallback()); } catch (e) { /* fall back */ }
  return Promise.resolve(fallback());
  function fallback() {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove(); return ok;
  }
}

function ChannelChips({ advert, size = 13, max = 7 }) {
  const live = window.JobAdvertStore.CHANNELS.filter(c => advert.channels && advert.channels[c.key]);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {live.slice(0, max).map(c => (
        <span key={c.key} title={c.label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 999,
          border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,.03)',
          fontSize: 11, fontWeight: 600, color: 'rgba(245,255,255,.72)', whiteSpace: 'nowrap'
        }}><Icon name={c.icon} size={size - 2} />{c.label}</span>
      ))}
      {!live.length && <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>No channels</span>}
    </span>
  );
}

function AdvertSubnav({ view, onSelect, items }) {
  return (
    <div className="nhr-scrollrow" role="tablist" aria-label="Job adverts" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon, n]) => {
        const active = view === label;
        return (
          <button key={label} type="button" role="tab" aria-selected={active} onClick={() => onSelect(label)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
              background: active ? 'rgba(0,229,212,.10)' : 'transparent',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
            {n > 0 && <Badge tone={label === 'Approvals' || label === 'Candidate emails' || label === 'Outbox' ? 'warning' : 'dark'}>{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

const advSelectStyle = {
  background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
  borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)', minWidth: 0
};

/* ---------------- Advert list ---------------- */
function AdvertList({ data, onOpen, onEdit, onNew, toast, statusPreset }) {
  const { adverts, JA, S, canEdit, canPublish, refresh } = data;
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState(statusPreset || 'Active');
  const [dept, setDept] = React.useState('All');
  React.useEffect(() => { if (statusPreset) setStatus(statusPreset); }, [statusPreset]);

  const visible = adverts.filter(a => {
    if (status === 'Active') { if (a.archived || a.status === 'Closed') return false; }
    else if (status !== 'All' && a.status !== status) return false;
    if (status !== 'Archived' && status !== 'All' && a.archived) return false;
    if (dept !== 'All' && a.department !== dept) return false;
    if (q) {
      const hay = [a.title, a.reference, a.department, a.location, JA.managerName(a)].join(' ').toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const live = adverts.filter(a => a.status === 'Published');
  const allStats = adverts.filter(a => !a.archived).map(a => JA.stats(a));
  const views = allStats.reduce((n, s) => n + s.views, 0);
  const apps = allStats.reduce((n, s) => n + s.applications, 0);
  const pending = adverts.filter(a => a.status === 'Pending approval').length;
  const closingSoon = live.filter(a => { const s = JA.stats(a); return s.closesIn != null && s.closesIn <= 7; }).length;
  const depts = Array.from(new Set(adverts.map(a => a.department).filter(Boolean))).sort();

  function exportCsv() {
    window.downloadCsv('nhr-job-adverts-' + new Date().toISOString().slice(0, 10) + '.csv',
      [{ label: 'Reference', key: 'reference' }, { label: 'Title', key: 'title' }, { label: 'Department', key: 'department' },
      { label: 'Location', key: 'location' }, { label: 'Workplace', key: 'workplace' }, { label: 'Type', key: 'employmentType' },
      { label: 'Salary', get: a => JA.salaryLabel(a) }, { label: 'Status', key: 'status' },
      { label: 'Hiring manager', get: a => JA.managerName(a) }, { label: 'Channels', get: a => JA.CHANNELS.filter(c => a.channels[c.key]).map(c => c.label).join('; ') },
      { label: 'Views', get: a => JA.stats(a).views }, { label: 'Applications', get: a => JA.stats(a).applications },
      { label: 'Published', key: 'publishedAt' }, { label: 'Closing', key: 'closingAt' }],
      visible);
    toast('Exported ' + visible.length + ' ' + (visible.length === 1 ? 'advert' : 'adverts') + ' to CSV');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="summary-grid adv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        <StatTile label="Live adverts" value={String(live.length)} caption={closingSoon ? closingSoon + ' closing within 7 days' : 'Taking applications'} icon={<Icon name="Megaphone" size={18} />} />
        <StatTile label="Advert views" value={views.toLocaleString('en-GB')} caption="Across all channels" icon={<Icon name="Eye" size={18} />} />
        <StatTile label="Applications" value={String(apps)} caption={views ? (Math.round(apps / views * 1000) / 10) + '% view-to-apply' : 'No views yet'} icon={<Icon name="Inbox" size={18} />} />
        <StatTile label="Awaiting approval" value={String(pending)} caption={canPublish ? 'Ready for your review' : 'With HR'} icon={<Icon name="ClipboardCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: '1 1 220px', minWidth: 0, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, reference, location…" aria-label="Search adverts"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status" style={Object.assign({}, advSelectStyle, { flex: '0 1 180px' })}>
          <option value="Active">Active (not closed)</option>
          <option value="All">All statuses</option>
          {JA.STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={Object.assign({}, advSelectStyle, { flex: '0 1 170px' })}>
          <option value="All">All departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <Button size="sm" variant="secondary" tone="dark" onClick={exportCsv} iconLeft={<Icon name="Download" size={15} />}>Export</Button>
      </Card>

      {visible.length ? (
        <div className="adv-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
          {visible.map(a => <AdvertCard key={a.id} advert={a} data={data} onOpen={onOpen} onEdit={onEdit} toast={toast} />)}
        </div>
      ) : (
        <Card tone="dark" padding={36} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.25)', color: 'var(--nhr-turquoise)' }}><Icon name="Megaphone" size={22} /></span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{adverts.length ? 'No adverts match these filters' : 'Write your first job advert'}</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)', maxWidth: 420, lineHeight: 1.6 }}>
            {adverts.length ? 'Clear the search or change the status filter.' : 'Adverts publish to your careers page and job boards, and every application lands in the Recruitment pipeline.'}
          </span>
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {adverts.length > 0 && <Button size="sm" variant="secondary" tone="dark" onClick={() => { setQ(''); setStatus('All'); setDept('All'); }}>Clear filters</Button>}
            {canEdit && <Button size="sm" onClick={onNew} iconLeft={<Icon name="Plus" size={15} />}>New Advert</Button>}
          </span>
        </Card>
      )}
    </div>
  );
}

function AdvertCard({ advert: a, data, onOpen, onEdit, toast }) {
  const { JA, canEdit, canPublish, refresh } = data;
  const st = JA.stats(a);
  const score = JA.score(a);
  const closing = st.closesIn;
  const menu = advertActions(a, data, { onOpen, onEdit, toast });
  return (
    <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
          background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
        }}><Icon name="Megaphone" size={18} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <button type="button" onClick={() => onOpen(a.id)} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-core)', fontSize: 15.5, fontWeight: 700, color: '#fff', lineHeight: 1.3
          }}>{a.title || 'Untitled advert'}</button>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{a.reference}</span> · {[a.department, a.location, a.workplace].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' · ')}
          </span>
        </span>
        {menu.length > 0 && <window.Menu label={'Actions for ' + a.title} items={menu} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone={ADV_TONE[a.status] || 'dark'}>{a.status}</Badge>
        {a.closedReason && a.status === 'Closed' && <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{a.closedReason}</span>}
        {a.status === 'Published' && closing != null && (
          <Badge tone={closing <= 3 ? 'danger' : closing <= 7 ? 'warning' : 'dark'}>{closing <= 0 ? 'Closes today' : 'Closes in ' + closing + 'd'}</Badge>
        )}
        {a.visibility === 'Internal only' && <Badge tone="dark" icon={<Icon name="Building2" size={11} />}>Internal</Badge>}
        {a.sponsorship && a.sponsorship.available && <Badge tone="dark" icon={<Icon name="Stamp" size={11} />}>Sponsorship</Badge>}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{JA.salaryLabel(a)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, padding: '12px 0', borderTop: '1px solid var(--border-dark)', borderBottom: '1px solid var(--border-dark)' }}>
        {[['Views', st.views.toLocaleString('en-GB')], ['Applied', st.applications], ['Active', st.active], ['Conv.', st.conversion + '%']].map(([l, v]) => (
          <span key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{l}</span>
          </span>
        ))}
      </div>

      <ChannelChips advert={a} />

      {(a.status === 'Draft' || a.status === 'Pending approval') && (
        <ProgressMeter label="Advert quality" value={score} valueLabel={score + '%'} />
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <Button size="sm" variant="secondary" tone="dark" onClick={() => onOpen(a.id)} iconLeft={<Icon name="PanelRightOpen" size={15} />}>Open</Button>
        {canEdit && !a.archived && a.status !== 'Pending approval' && <Button size="sm" variant="secondary" tone="dark" onClick={() => onEdit(a.id)} iconLeft={<Icon name="PencilLine" size={15} />}>Edit</Button>}
        {a.status === 'Draft' && canPublish && <Button size="sm" onClick={() => { const r = JA.publish(a.id); r && r.error ? toast(r.error, 'warn') : toast(a.title + ' is live'); }} iconLeft={<Icon name="Send" size={15} />}>Publish</Button>}
        {a.status === 'Draft' && !canPublish && canEdit && <Button size="sm" onClick={() => { JA.submit(a.id); toast('Sent to HR for approval'); }} iconLeft={<Icon name="SendHorizontal" size={15} />}>Submit</Button>}
        {a.status === 'Pending approval' && canPublish && <Button size="sm" onClick={() => onOpen(a.id)} iconLeft={<Icon name="ClipboardCheck" size={15} />}>Review</Button>}
      </div>
    </Card>
  );
}

/* Status-aware actions, shared by the card menu and the detail drawer. */
function advertActions(a, data, { onOpen, onEdit, toast, onClose }) {
  const { JA, canEdit, canPublish } = data;
  if (!canEdit) return [];
  const items = [];
  if (a.status === 'Published') {
    items.push({ label: 'Copy advert link', icon: 'Link', onClick: () => copyText(JA.publicUrl(a)).then(() => toast('Link copied — ' + a.reference)) });
    items.push({ label: 'View on careers page', icon: 'ExternalLink', onClick: () => window.open(JA.publicUrl(a), '_blank', 'noopener') });
    items.push({ label: 'Pause advert', icon: 'Pause', onClick: () => { JA.pause(a.id); toast(a.title + ' paused — vacancy put on hold'); } });
    items.push({ label: 'Close advert', icon: 'CircleStop', onClick: () => { JA.close(a.id, 'Closed early'); toast(a.title + ' closed'); } });
  }
  if (a.status === 'Paused' && canPublish) items.push({ label: 'Resume advert', icon: 'Play', onClick: () => { const r = JA.publish(a.id); r && r.error ? toast(r.error, 'warn') : toast(a.title + ' is live again'); } });
  if (a.status === 'Closed' && canPublish) items.push({ label: 'Extend and republish', icon: 'CalendarPlus', onClick: () => onOpen(a.id, 'extend') });
  items.push({ label: 'Duplicate', icon: 'Copy', onClick: () => { const c = JA.duplicate(a.id); toast('Draft copy created — ' + c.reference); onEdit && onEdit(c.id); } });
  if (!a.archived && (a.status === 'Closed' || a.status === 'Draft')) items.push({ label: 'Archive', icon: 'Archive', onClick: () => { JA.archive(a.id); toast(a.title + ' archived'); onClose && onClose(); } });
  if (a.archived) items.push({ label: 'Restore to draft', icon: 'ArchiveRestore', onClick: () => { JA.restore(a.id); toast(a.title + ' restored as a draft'); } });
  if (canPublish && (a.status === 'Draft' || a.archived)) {
    items.push({ divider: true, key: 'd' });
    items.push({ label: 'Delete advert', icon: 'Trash2', danger: true, onClick: () => { if (window.confirm('Delete ' + a.title + '? Candidates already in Recruitment are kept.')) { JA.remove(a.id); toast('Advert deleted'); onClose && onClose(); } } });
  }
  return items;
}

/* ---------------- Editor ---------------- */
const ADV_STEPS = ['Role', 'Description', 'Screening', 'Publishing', 'Review'];

function AdvertEditor({ data, advertId, preset, onClose, onSaved, toast }) {
  const { JA, REC, S, canPublish } = data;
  const existing = advertId ? JA.raw(advertId) : null;
  const [form, setForm] = React.useState(() => existing ? JSON.parse(JSON.stringify(existing)) : Object.assign(JA.blank(), {
    department: S.DEPARTMENTS[0], hiringManagerId: '', closingAt: new Date(Date.now() + 28 * 864e5).toISOString().slice(0, 10)
  }));
  const [step, setStep] = React.useState(0);
  const [furthest, setFurthest] = React.useState(existing ? ADV_STEPS.length - 1 : 0);
  const [errors, setErrors] = React.useState({});
  const [basedOn, setBasedOn] = React.useState('');
  const set = (k, v) => setForm(p => Object.assign({}, p, { [k]: v }));
  const setDeep = (k, sub, v) => setForm(p => Object.assign({}, p, { [k]: Object.assign({}, p[k], { [sub]: v }) }));
  const bodyRef = React.useRef(null);

  const employees = S.managers();
  const vacancies = REC.vacancies().filter(v => v.status !== 'Filled');

  function validate(i) {
    const e = {};
    if (i === 0) {
      if (!form.title.trim()) e.title = 'Enter the job title candidates will search for.';
      if (!form.location.trim()) e.location = 'Enter a town, city or "Remote".';
      if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) e.salaryMax = 'Maximum must be at least the minimum.';
      if (form.salaryMin && isNaN(Number(form.salaryMin))) e.salaryMin = 'Numbers only.';
      if (form.salaryMax && isNaN(Number(form.salaryMax))) e.salaryMax = 'Numbers only.';
    }
    if (i === 1) {
      if (form.summary.trim().length < 60) e.summary = 'Write at least a couple of sentences (60+ characters).';
      if (!JA.lines(form.essential).length) e.essential = 'List at least one essential criterion.';
    }
    if (i === 2) {
      form.questions.forEach(q => { if (!q.text.trim()) e['q-' + q.id] = 'Enter the question or remove it.'; });
    }
    if (i === 3) {
      if (!JA.CHANNELS.some(c => form.channels[c.key])) e.channels = 'Choose at least one channel.';
      const today = new Date().toISOString().slice(0, 10);
      if (form.publishedAt && form.publishedAt > today && !(existing && existing.status === 'Published')) e.publishedAt = 'The posted date cannot be in the future.';
      if (form.historical) {
        if (!form.publishedAt) e.publishedAt = 'Enter when the past advert was posted.';
        if (!form.closingAt) e.closingAt = 'Enter when the past advert closed.';
        else if (form.closingAt > today) e.closingAt = 'A past advert must have closed on or before today.';
      } else if (form.closingAt && new Date(form.closingAt + 'T23:59:59') < new Date()) e.closingAt = 'Closing date is in the past — switch on "Record a past advert" below to log one that has already run.';
      if (form.publishedAt && form.closingAt && form.publishedAt > form.closingAt) e.closingAt = 'Closing date is before the posted date.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  function go(i) {
    if (i > step && !validate(step)) return;
    setStep(i); setFurthest(f => Math.max(f, i));
    if (bodyRef.current) { const sc = bodyRef.current.closest('[role=dialog]'); const b = sc && sc.querySelector('div[style*="overflow-y: auto"]'); if (b) b.scrollTop = 0; }
  }

  function startFrom(empId) {
    setBasedOn(empId);
    if (!empId) return;
    const pre = JA.fromEmployee(empId);
    setForm(p => Object.assign({}, p, pre, { summary: p.summary }));
    toast('Role details copied from ' + pre.basedOn);
  }
  function linkVacancy(vacId) {
    const v = REC.vacancy(vacId);
    if (!v) return set('vacancyId', '');
    setForm(p => Object.assign({}, p, {
      vacancyId: v.id, title: p.title || v.title, department: v.department, location: p.location || v.location,
      employmentType: v.employmentType, salaryMin: p.salaryMin || String(v.salary || ''), salaryMax: p.salaryMax || String(v.salary || ''),
      openings: String(v.openings || 1), closingAt: v.closingAt || p.closingAt, summary: p.summary || (/^Placeholder/.test(v.description) ? '' : v.description)
    }));
  }

  /* Opened from Recruitment (a vacancy) or Employees (a role) — pre-fill once. */
  React.useEffect(() => {
    if (existing || !preset) return;
    if (preset.vacancyId) linkVacancy(preset.vacancyId);
    if (preset.employeeId) startFrom(preset.employeeId);
  }, []);

  function persist() {
    const clean = Object.assign({}, form, {
      salaryMin: form.salaryMin === '' ? '' : String(form.salaryMin).replace(/[£,\s]/g, ''),
      salaryMax: form.salaryMax === '' ? '' : String(form.salaryMax).replace(/[£,\s]/g, '')
    });
    if (existing) { JA.update(existing.id, clean); return JA.raw(existing.id); }
    return JA.create(clean);
  }
  function saveDraft() {
    if (!form.title.trim()) { setStep(0); setErrors({ title: 'A draft needs at least a job title.' }); return; }
    const a = persist();
    toast(existing ? 'Changes saved' : 'Draft saved — ' + a.reference);
    onSaved && onSaved(a.id); onClose();
  }
  function finish() {
    for (let i = 0; i < 4; i++) if (!validate(i)) { setStep(i); return; }
    const a = persist();
    if (canPublish) {
      const r = JA.publish(a.id);
      if (r && r.error) { toast(r.error, 'warn'); return; }
      toast(form.historical ? 'Past advert recorded — ' + a.title + '. Log its applications from the advert.' : (existing && existing.status === 'Published' ? 'Live advert updated — ' : 'Published — ') + a.title);
    } else {
      JA.submit(a.id);
      toast('Submitted to HR for approval — ' + a.reference);
    }
    onSaved && onSaved(a.id); onClose();
  }

  const checks = JA.checks(form);
  const blocking = checks.filter(c => c.level === 'block');
  const lang = JA.languageIssues(form);
  const finishLabel = canPublish ? (form.historical ? 'Save Past Advert' : existing && existing.status === 'Published' ? 'Update Live Advert' : 'Publish Advert') : 'Submit for Approval';

  const footer = (
    <React.Fragment>
      <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
      {(!existing || existing.status === 'Draft') && <Button variant="secondary" tone="dark" onClick={saveDraft} iconLeft={<Icon name="Save" size={15} />}>Save Draft</Button>}
      {existing && existing.status !== 'Draft' && existing.status !== 'Published' && <Button variant="secondary" tone="dark" onClick={saveDraft} iconLeft={<Icon name="Save" size={15} />}>Save</Button>}
      {step > 0 && <Button variant="secondary" tone="dark" onClick={() => go(step - 1)} iconLeft={<Icon name="ArrowLeft" size={15} />}>Back</Button>}
      {step < ADV_STEPS.length - 1
        ? <Button onClick={() => go(step + 1)} iconRight={<Icon name="ArrowRight" size={15} />}>Next: {ADV_STEPS[step + 1]}</Button>
        : <Button onClick={finish} disabled={blocking.length > 0} iconLeft={<Icon name="Send" size={15} />}>{finishLabel}</Button>}
    </React.Fragment>
  );

  return (
    <Drawer open onClose={onClose} width={780}
      title={existing ? 'Edit ' + (existing.title || 'advert') : 'New Job Advert'}
      subtitle={existing ? existing.reference + ' · ' + existing.status : 'Write the advert, choose where it goes, then publish or send for approval.'}
      footer={footer}>
      <div ref={bodyRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <StepRail steps={ADV_STEPS} current={step} furthest={furthest} onJump={i => (i <= step || validate(step)) && go(i)} />

        {step === 0 && (
          <React.Fragment>
            {!existing && (
              <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(0,229,212,.22)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
                  <Icon name="Wand2" size={16} style={{ color: 'var(--nhr-turquoise)' }} /> Start faster
                </span>
                <FormGrid cols={2}>
                  <SelectField label="Copy from an existing employee's role" value={basedOn} onChange={startFrom}
                    placeholder="Choose an employee…" options={employees.map(e => ({ value: e.id, label: e.label }))}
                    hint="Replacement hire? Pulls job title, department, location, hours and manager from Employees." />
                  <SelectField label="Advertise an existing vacancy" value={form.vacancyId} onChange={linkVacancy}
                    placeholder="New vacancy on publish" options={vacancies.map(v => ({ value: v.id, label: v.reference + ' — ' + v.title }))}
                    hint="Applications join that vacancy's pipeline in Recruitment." />
                </FormGrid>
              </Card>
            )}
            <SectionLabel hint="What candidates will see first in search results.">The role</SectionLabel>
            <FormGrid cols={2}>
              <TextField label="Job title" required span={2} value={form.title} onChange={v => set('title', v)} error={errors.title} placeholder="e.g. Warehouse Operative" />
              <SelectField label="Department" value={form.department} onChange={v => set('department', v)} options={S.DEPARTMENTS} />
              <SelectField label="Hiring manager" value={form.hiringManagerId} onChange={v => set('hiringManagerId', v)} placeholder="Choose from Employees…"
                options={employees.map(e => ({ value: e.id, label: e.label }))} hint="Linked to their employee record." />
              <TextField label="Location" required value={form.location} onChange={v => set('location', v)} error={errors.location} placeholder="Manchester" />
              <SelectField label="Workplace" value={form.workplace} onChange={v => set('workplace', v)} options={JA.WORKPLACES} />
              <SelectField label="Employment type" value={form.employmentType} onChange={v => set('employmentType', v)} options={S.EMPLOYMENT_TYPES} />
              <TextField label="Hours per week" value={form.hoursPerWeek} onChange={v => set('hoursPerWeek', v)} mono />
              {(form.employmentType === 'Temporary' || form.employmentType === 'Contractor') && (
                <TextField label="Contract length" value={form.contractLength} onChange={v => set('contractLength', v)} placeholder="e.g. 6 months" />
              )}
              <TextField label="Openings" value={form.openings} onChange={v => set('openings', v.replace(/\D/g, ''))} mono hint="The vacancy fills itself when they are all hired." />
            </FormGrid>
            <SectionLabel hint="Adverts that show pay receive more applications.">Pay</SectionLabel>
            <FormGrid cols={3}>
              <TextField label="Minimum (£)" value={form.salaryMin} onChange={v => set('salaryMin', v)} error={errors.salaryMin} mono placeholder="26000" />
              <TextField label="Maximum (£)" value={form.salaryMax} onChange={v => set('salaryMax', v)} error={errors.salaryMax} mono placeholder="28000" />
              <SelectField label="Period" value={form.salaryPeriod} onChange={v => set('salaryPeriod', v)} options={JA.SALARY_PERIODS} />
            </FormGrid>
            <Switch tone="dark" label="Show salary on the advert" checked={!!form.showSalary} onChange={e => set('showSalary', e.target.checked)} />
          </React.Fragment>
        )}

        {step === 1 && (
          <React.Fragment>
            <SectionLabel hint="One item per line — each line becomes a bullet point.">Advert copy</SectionLabel>
            <FormGrid cols={1}>
              <TextareaField label="Role summary" required rows={4} value={form.summary} onChange={v => set('summary', v)}
                placeholder="Two or three sentences on what the job is and why it matters." hint={errors.summary || (form.summary.length + ' characters')} />
              <TextareaField label="What you'll do" rows={5} value={form.responsibilities} onChange={v => set('responsibilities', v)} placeholder={'Pick and pack orders accurately\nLoad and unload deliveries safely'} />
              <TextareaField label="Essential criteria" required rows={4} value={form.essential} onChange={v => set('essential', v)}
                placeholder="Only what is genuinely needed on day one." hint={errors.essential || 'Shortlisting is measured against these, so keep them job-related and measurable.'} />
              <TextareaField label="Desirable criteria" rows={3} value={form.desirable} onChange={v => set('desirable', v)} />
              <TextareaField label="Benefits" rows={4} value={form.benefits} onChange={v => set('benefits', v)} placeholder={'28 days holiday\nPension with employer contribution'} />
            </FormGrid>
            {lang.length > 0 ? (
              <Notice icon="TriangleAlert" tone="warn">
                <strong style={{ color: '#fff' }}>Inclusive language check.</strong>{' '}
                {lang.map(l => <span key={l.term} style={{ display: 'block', marginTop: 4 }}>“{l.term}” — {l.hint}</span>)}
              </Notice>
            ) : (
              <Notice icon="ShieldCheck">Inclusive language check: no age, gender or nationality-coded wording found.</Notice>
            )}
          </React.Fragment>
        )}

        {step === 2 && (
          <React.Fragment>
            <SectionLabel hint="Asked on the application form. Knock-out answers are flagged on the candidate for a person to review — never auto-rejected.">Screening questions</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.questions.map((q, i) => (
                <Card key={q.id} tone="dark" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--nhr-turquoise)', paddingTop: 34 }}>Q{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextField label="Question" value={q.text} error={errors['q-' + q.id]}
                        onChange={v => set('questions', form.questions.map(x => x.id === q.id ? Object.assign({}, x, { text: v }) : x))} />
                    </div>
                    <span style={{ paddingTop: 28 }}>
                      <IconButton tone="dark" size={36} label={'Remove question ' + (i + 1)}
                        onClick={() => set('questions', form.questions.filter(x => x.id !== q.id))}><Icon name="Trash2" size={15} /></IconButton>
                    </span>
                  </div>
                  <FormGrid cols={3}>
                    <SelectField label="Answer type" value={q.type} onChange={v => set('questions', form.questions.map(x => x.id === q.id ? Object.assign({}, x, { type: v, knockout: v === 'yesno' ? x.knockout : '' }) : x))}
                      options={[{ value: 'yesno', label: 'Yes / No' }, { value: 'text', label: 'Short answer' }]} />
                    {q.type === 'yesno' ? (
                      <SelectField label="Flag if the answer is" value={q.knockout} onChange={v => set('questions', form.questions.map(x => x.id === q.id ? Object.assign({}, x, { knockout: v }) : x))}
                        placeholder="Don't flag" options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
                    ) : <span />}
                    <span style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                      <Checkbox tone="dark" label="Required" checked={!!q.required} onChange={e => set('questions', form.questions.map(x => x.id === q.id ? Object.assign({}, x, { required: e.target.checked }) : x))} />
                    </span>
                  </FormGrid>
                </Card>
              ))}
              <span>
                <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Plus" size={15} />}
                  onClick={() => set('questions', form.questions.concat([{ id: 'q-' + Math.random().toString(36).slice(2, 8), text: '', type: 'yesno', required: true, knockout: '' }]))}>Add Question</Button>
              </span>
            </div>
            <SectionLabel hint="Right to work and sponsorship — the parts that most often go wrong.">Right to work</SectionLabel>
            <Switch tone="dark" label="Include the right-to-work statement on the advert" checked={!!form.includeRtwStatement} onChange={e => set('includeRtwStatement', e.target.checked)} />
            <Switch tone="dark" label="This role can offer Skilled Worker visa sponsorship" checked={!!form.sponsorship.available} onChange={e => setDeep('sponsorship', 'available', e.target.checked)} />
            {form.sponsorship.available && (
              <FormGrid cols={2}>
                <TextField label="SOC 2020 code" value={form.sponsorship.socCode} onChange={v => setDeep('sponsorship', 'socCode', v.replace(/\D/g, '').slice(0, 4))} mono placeholder="e.g. 2423"
                  hint="Recorded for the CoS — must match the duties advertised." />
                <TextField label="Note shown to candidates" value={form.sponsorship.note} onChange={v => setDeep('sponsorship', 'note', v)} placeholder="We can consider sponsorship for eligible candidates." />
              </FormGrid>
            )}
            {form.sponsorship.available && form.salaryPeriod === 'per year' && Number(form.salaryMax || form.salaryMin) > 0 && Number(form.salaryMax || form.salaryMin) < JA.SPONSOR_GENERAL_THRESHOLD && (
              <Notice icon="TriangleAlert" tone="warn">The top of this salary range is below the Skilled Worker general threshold of {advMoney(JA.SPONSOR_GENERAL_THRESHOLD)}. Check whether a reduced threshold applies and the going rate for the SOC code before offering sponsorship.</Notice>
            )}
          </React.Fragment>
        )}

        {step === 3 && (
          <React.Fragment>
            <SectionLabel hint="Hosted channels publish instantly. Job boards receive the advert through their feed once connected in Integrations.">Where it goes</SectionLabel>
            <SelectField label="Visibility" value={form.visibility} onChange={v => set('visibility', v)} options={JA.VISIBILITY}
              hint={form.visibility === 'Internal only' ? 'Only employees see it, on the internal job board — good for promotions and redeployment.' : 'Employees can also apply or refer from the internal job board.'} />
            <div className="adv-channels" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {JA.CHANNELS.map(c => {
                const on = !!form.channels[c.key];
                const disabled = form.visibility === 'Internal only' ? c.key !== 'internal' : (form.visibility === 'Public only' && c.key === 'internal');
                return (
                  <label key={c.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
                    border: '1px solid ' + (on && !disabled ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                    background: on && !disabled ? 'rgba(0,229,212,.06)' : 'rgba(255,255,255,.02)', opacity: disabled ? .45 : 1
                  }}>
                    <input type="checkbox" checked={on && !disabled} disabled={disabled} onChange={e => setDeep('channels', c.key, e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
                    <Icon name={c.icon} size={17} style={{ color: on && !disabled ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{c.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{c.hosted ? 'Hosted by NHR Solution' : 'Job board feed'}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.channels && <Notice icon="TriangleAlert" tone="warn">{errors.channels}</Notice>}
            {canPublish && (
              <Card tone="dark" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Switch tone="dark" label="Record a past advert (already ran and closed)" checked={!!form.historical} onChange={e => set('historical', e.target.checked)} />
                <span style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-muted-dark)' }}>
                  For adverts that ran before you used NHR Solution, or were posted elsewhere. It is saved as closed with its real dates, nothing is posted, and you can then record the applications it received.
                </span>
              </Card>
            )}
            <FormGrid cols={2}>
              {canPublish && (
                <TextField label="Posted date" type="date" value={form.publishedAt} onChange={v => set('publishedAt', v)} error={errors.publishedAt}
                  hint={form.publishedAt && form.publishedAt < new Date().toISOString().slice(0, 10) ? 'Backdated — logged in the advert history.' : 'Leave blank to use the day you publish.'} />
              )}
              <TextField label="Closing date" type="date" value={form.closingAt} onChange={v => set('closingAt', v)} error={errors.closingAt}
                hint={form.historical ? 'The day the past advert closed.' : 'The advert closes itself at the end of this day.'} />
              <TextField label="Expected start date" type="date" value={form.startDate} onChange={v => set('startDate', v)} />
              <TextField label="Applications contact email" value={form.contactEmail} onChange={v => set('contactEmail', v)} />
              <TextField label="Referral bonus (£)" value={form.referralBonus} onChange={v => set('referralBonus', v.replace(/[^\d]/g, ''))} mono hint="Shown to employees on the internal job board." />
            </FormGrid>
          </React.Fragment>
        )}

        {step === 4 && (
          <React.Fragment>
            <div className="adv-review" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 18, alignItems: 'start' }}>
              <div style={{ border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="Eye" size={13} /> Candidate preview
                </div>
                <window.AdvertPreview advert={form} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ProgressMeter label="Advert quality" value={JA.score(form)} valueLabel={JA.score(form) + '%'} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {checks.map((c, i) => (
                    <span key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: c.level === 'ok' ? 'var(--text-body-dark)' : '#fff' }}>
                      <Icon name={c.level === 'ok' ? 'CircleCheck' : c.level === 'warn' ? 'TriangleAlert' : 'CircleX'} size={14}
                        style={{ marginTop: 2, color: c.level === 'ok' ? 'var(--nhr-turquoise)' : c.level === 'warn' ? 'var(--nhr-warning)' : 'var(--nhr-danger)' }} />
                      <span>{c.text}</span>
                    </span>
                  ))}
                </div>
                {blocking.length > 0 && <Notice icon="CircleX" tone="danger">Fix the items marked with a cross before publishing. You can still save a draft.</Notice>}
                {!canPublish && <Notice icon="Info">As a {S.session.role}, your advert goes to HR for approval before it is published.</Notice>}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </Drawer>
  );
}

/* Any module can send someone to Job Adverts with a request:
   { vacancyId } new advert for a vacancy · { employeeId } new advert from a role · { advertId } open one. */
function openJobAdvert(detail) {
  window.__nhrPendingAdvert = detail || {};
  window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Job Adverts' }));
  setTimeout(() => { if (window.__nhrPendingAdvert) { const d = window.__nhrPendingAdvert; window.__nhrPendingAdvert = null; window.dispatchEvent(new CustomEvent('nhr-advert', { detail: d })); } }, 120);
}

Object.assign(window, {
  openJobAdvert, ADV_TONE, advMoney, advDate, useJobAdvertData, useAdvertToast, copyText, ChannelChips, AdvertSubnav,
  AdvertList, AdvertCard, advertActions, AdvertEditor, ADV_STEPS, advSelectStyle
});
