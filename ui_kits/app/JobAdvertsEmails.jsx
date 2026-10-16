/* Candidate emails — template settings, outbox, compose, the per-candidate
   panel used in Recruitment, and the app-wide "email sent" toast.
   Data and delivery live in candidateMailStore.js. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile } = window.NHRSolutionDesignSystem_0db691;

const MAIL_TONE = { Sent: 'success', 'Awaiting review': 'warning', Queued: 'dark', Sending: 'dark', 'Not sent': 'danger', Discarded: 'dark' };
const MAIL_MODES = [{ value: 'auto', label: 'Send automatically' }, { value: 'review', label: 'Check before sending' }, { value: 'off', label: 'Off' }];

function useMailData() {
  const M = window.CandidateMailStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => M.subscribe(force), []);
  React.useEffect(() => window.RecruitmentStore.subscribe(force), []);
  return M;
}

function mailServiceLive() {
  const SB = window.NHRSupabase;
  return !!(SB && SB.enabled && SB.enabled() && window.AuthStore && window.AuthStore.session() && window.AuthStore.session().mode !== 'demo');
}

function MailConnection() {
  const live = mailServiceLive();
  return live ? (
    <Notice icon="MailCheck">Emails are delivered through your connected email service and replies go to the advert's contact address.</Notice>
  ) : (
    <Notice icon="PlugZap" tone="warn">
      <strong style={{ color: '#fff' }}>Demo mode — emails are not delivered.</strong> They are written, logged and kept in the outbox exactly as they would be sent.
      On the live platform they go out through the <span style={{ fontFamily: 'var(--font-mono)' }}>send-candidate-email</span> service (Resend), and anything held here can be sent from the outbox.
    </Notice>
  );
}

/* ---------------- Templates ---------------- */
function MailTemplateCard({ t, canEdit, toast }) {
  const M = window.CandidateMailStore;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ subject: t.subject, body: t.body });
  const [showPreview, setShowPreview] = React.useState(false);
  const preview = showPreview ? M.preview(t.key) : null;
  const customised = !!(JSON.stringify({ s: t.subject, b: t.body }) !== JSON.stringify({ s: M.TEMPLATES[t.key].subject, b: M.TEMPLATES[t.key].body }));
  return (
    <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)', color: 'var(--nhr-turquoise)' }}><Icon name={t.icon} size={17} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{t.label}{customised && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted-dark)' }}> · edited</span>}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>When a candidate moves to <strong style={{ color: 'rgba(245,255,255,.8)' }}>{t.stage}</strong></span>
        </span>
        <select value={t.mode} disabled={!canEdit} aria-label={t.label + ' sending mode'}
          onChange={e => { M.setTemplate(t.key, { mode: e.target.value }); toast(t.label + ': ' + MAIL_MODES.find(m => m.value === e.target.value).label.toLowerCase()); }}
          style={Object.assign({}, window.advSelectStyle, { flex: '0 1 210px', borderColor: t.mode === 'off' ? 'var(--border-dark)' : 'rgba(0,229,212,.4)' })}>
          {MAIL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {!editing && <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}><span style={{ color: 'var(--text-muted-dark)' }}>Subject:</span> {t.subject}</span>}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextField label="Subject" value={draft.subject} onChange={v => setDraft(p => Object.assign({}, p, { subject: v }))} />
          <TextareaField label="Message" rows={9} value={draft.body} onChange={v => setDraft(p => Object.assign({}, p, { body: v }))}
            hint="Merge fields: {{firstName}} {{jobTitle}} {{company}} {{hiringManager}} {{interviewLine}} {{offerLine}} {{startLine}} {{closingLine}} {{location}}" />
        </div>
      )}
      {preview && !editing && (
        <div style={{ background: 'var(--nhr-white)', color: 'var(--nhr-text-dark)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--nhr-text-muted-ink)' }}>Preview with {preview.candidate}</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{preview.subject}</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: '#3B4747' }}>{preview.body}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!editing && <Button size="xs" variant="secondary" tone="dark" onClick={() => setShowPreview(v => !v)} iconLeft={<Icon name="Eye" size={13} />}>{showPreview ? 'Hide preview' : 'Preview'}</Button>}
        {canEdit && !editing && <Button size="xs" variant="secondary" tone="dark" onClick={() => { setDraft({ subject: t.subject, body: t.body }); setEditing(true); setShowPreview(false); }} iconLeft={<Icon name="PencilLine" size={13} />}>Edit wording</Button>}
        {editing && <Button size="xs" onClick={() => { M.setTemplate(t.key, draft); setEditing(false); toast(t.label + ' template saved'); }} iconLeft={<Icon name="Save" size={13} />}>Save template</Button>}
        {editing && <Button size="xs" variant="ghost" tone="dark" onClick={() => setEditing(false)}>Cancel</Button>}
        {canEdit && customised && !editing && <Button size="xs" variant="ghost" tone="dark" onClick={() => { M.resetTemplate(t.key); toast(t.label + ' reset to the standard wording'); }}>Reset wording</Button>}
      </div>
    </Card>
  );
}

/* ---------------- Outbox ---------------- */
function MailOutbox({ toast, canEdit }) {
  const M = useMailData();
  const [filter, setFilter] = React.useState('All');
  const [open, setOpen] = React.useState(null);
  const all = M.outbox();
  const list = all.filter(m => filter === 'All' || m.status === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Email status" style={Object.assign({}, window.advSelectStyle, { flex: '0 1 220px' })}>
          {['All', 'Awaiting review', 'Sent', 'Not sent', 'Discarded'].map(s => <option key={s} value={s}>{s === 'All' ? 'All emails' : s}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{list.length} {list.length === 1 ? 'email' : 'emails'}</span>
      </div>
      {list.length ? list.map(m => (
        <Card key={m.id} tone="dark" padding={14} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Icon name={m.status === 'Sent' ? 'MailCheck' : m.status === 'Awaiting review' ? 'MailWarning' : m.status === 'Not sent' ? 'MailX' : 'Mail'} size={18}
            style={{ color: m.status === 'Sent' ? 'var(--nhr-turquoise)' : m.status === 'Not sent' ? 'var(--nhr-danger)' : m.status === 'Awaiting review' ? 'var(--nhr-warning)' : 'var(--text-muted-dark)' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 240px', minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{m.subject}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
              To {m.candidateName} &lt;{m.to}&gt; · {m.trigger} · {new Date(m.sentAt || m.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {m.error ? ' · ' + m.error : ''}
            </span>
          </span>
          <Badge tone={MAIL_TONE[m.status] || 'dark'}>{m.status}</Badge>
          <Button size="xs" variant={m.status === 'Awaiting review' ? 'primary' : 'secondary'} tone="dark" onClick={() => setOpen(m.id)}>{m.status === 'Awaiting review' ? 'Review' : 'View'}</Button>
        </Card>
      )) : <Notice icon="Inbox">No emails yet. Move a candidate to Interview, Offer or Hired in Recruitment and the email appears here.</Notice>}
      {open && <MailReviewDrawer id={open} canEdit={canEdit} onClose={() => setOpen(null)} toast={toast} />}
    </div>
  );
}

function MailReviewDrawer({ id, onClose, toast, canEdit }) {
  const M = useMailData();
  const m = M.outbox().find(x => x.id === id);
  const [draft, setDraft] = React.useState(m ? { subject: m.subject, body: m.body } : null);
  const [busy, setBusy] = React.useState(false);
  if (!m) return null;
  const editable = canEdit && (m.status === 'Awaiting review' || m.status === 'Not sent');
  function send() {
    if (!draft.subject.trim() || !draft.body.trim()) return toast('Add a subject and a message', 'warn');
    setBusy(true);
    M.sendNow(m.id, draft).then(r => { setBusy(false); toast(r && r.sent ? 'Email sent to ' + m.candidateName : 'Saved to outbox — ' + ((r && r.reason) || 'not sent'), r && r.sent ? undefined : 'warn'); onClose(); });
  }
  return (
    <Drawer open onClose={onClose} title={m.templateLabel} subtitle={'To ' + m.candidateName + ' · ' + m.to} width={640}
      footer={editable ? (
        <React.Fragment>
          <Button variant="ghost" tone="dark" onClick={() => { M.discard(m.id); toast('Email discarded'); onClose(); }}>Discard</Button>
          <Button onClick={send} disabled={busy} iconLeft={<Icon name="Send" size={15} />}>{busy ? 'Sending…' : m.status === 'Not sent' ? 'Try Again' : 'Send Email'}</Button>
        </React.Fragment>
      ) : <Button onClick={onClose}>Close</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={MAIL_TONE[m.status] || 'dark'}>{m.status}</Badge>
          <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{m.trigger} · created {new Date(m.createdAt).toLocaleString('en-GB')}{m.sentAt ? ' · sent ' + new Date(m.sentAt).toLocaleString('en-GB') + ' by ' + (m.sentBy || 'Automatic') : ''}</span>
        </span>
        {m.error && <Notice icon="TriangleAlert" tone="warn">{m.error}</Notice>}
        {editable ? (
          <React.Fragment>
            <TextField label="Subject" value={draft.subject} onChange={v => setDraft(p => Object.assign({}, p, { subject: v }))} />
            <TextareaField label="Message" rows={12} value={draft.body} onChange={v => setDraft(p => Object.assign({}, p, { body: v }))} />
            <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>Replies go to {m.replyTo}.</span>
          </React.Fragment>
        ) : (
          <div style={{ background: 'var(--nhr-white)', color: 'var(--nhr-text-dark)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{m.subject}</span>
            <span style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: '#3B4747' }}>{m.body}</span>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Compose (by hand) ---------------- */
function ComposeMailDrawer({ candidateId, onClose, toast }) {
  const M = window.CandidateMailStore, REC = window.RecruitmentStore;
  const c = REC.candidate(candidateId);
  const first = M.TRIGGERS[c && c.stage] || 'interview';
  const [key, setKey] = React.useState(first);
  const [draft, setDraft] = React.useState(() => c ? M.compose(c, first) : { subject: '', body: '' });
  const [busy, setBusy] = React.useState(false);
  if (!c) return null;
  function pick(k) { setKey(k); setDraft(M.compose(c, k)); }
  function send() {
    if (!c.email) return toast('This candidate has no email address', 'warn');
    if (!draft.subject.trim() || !draft.body.trim()) return toast('Add a subject and a message', 'warn');
    setBusy(true);
    M.send(c.id, key, { subject: draft.subject, body: draft.body }).then(r => {
      setBusy(false);
      if (r.error) return toast(r.error, 'warn');
      toast(r.sent ? 'Email sent to ' + c.firstName : 'Saved to outbox — ' + (r.reason || 'not sent'), r.sent ? undefined : 'warn');
      onClose();
    });
  }
  return (
    <Drawer open onClose={onClose} title={'Email ' + c.firstName + ' ' + c.lastName} subtitle={c.email || 'No email address on file'} width={640}
      footer={<React.Fragment>
        <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
        <Button onClick={send} disabled={busy || !c.email} iconLeft={<Icon name="Send" size={15} />}>{busy ? 'Sending…' : 'Send Email'}</Button>
      </React.Fragment>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField label="Start from template" value={key} onChange={pick} placeholder="Choose…"
          options={M.templates().map(t => ({ value: t.key, label: t.label }))} />
        <TextField label="Subject" value={draft.subject} onChange={v => setDraft(p => Object.assign({}, p, { subject: v }))} />
        <TextareaField label="Message" rows={12} value={draft.body} onChange={v => setDraft(p => Object.assign({}, p, { body: v }))} />
        {c.backdated && <Notice icon="History">This application was recorded retrospectively, so no automatic emails go to this candidate. Emails you send here are sent as normal.</Notice>}
      </div>
    </Drawer>
  );
}

/* ---------------- Per-candidate panel (used in Recruitment) ---------------- */
function CandidateEmailsPanel({ candidate }) {
  const M = useMailData();
  const [compose, setCompose] = React.useState(false);
  const [open, setOpen] = React.useState(null);
  const [toastNode, toast] = window.useAdvertToast();
  const S = window.EmployeeStore;
  const list = M.forCandidate(candidate.id).filter(m => m.status !== 'Discarded');
  const canEdit = S.can('employees.write');
  return (
    <DashboardCard title={'Emails (' + list.length + ')'} padding={16}
      action={canEdit ? <Button size="xs" variant="secondary" tone="dark" onClick={() => setCompose(true)} iconLeft={<Icon name="Mail" size={13} />}>Email candidate</Button> : null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length ? list.map(m => (
          <button key={m.id} type="button" onClick={() => setOpen(m.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', textAlign: 'left', cursor: 'pointer',
            background: 'rgba(255,255,255,.025)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-core)'
          }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{m.subject}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{m.trigger} · {new Date(m.sentAt || m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </span>
            <Badge tone={MAIL_TONE[m.status] || 'dark'}>{m.status}</Badge>
          </button>
        )) : <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{candidate.backdated ? 'Recorded retrospectively — no automatic emails.' : 'No emails yet. Moving them to Interview, Offer or Hired sends one automatically.'}</span>}
      </div>
      {compose && <ComposeMailDrawer candidateId={candidate.id} onClose={() => setCompose(false)} toast={toast} />}
      {open && <MailReviewDrawer id={open} canEdit={canEdit} onClose={() => setOpen(null)} toast={toast} />}
      {toastNode}
    </DashboardCard>
  );
}

/* ---------------- Screen section ---------------- */
function CandidateEmailsView({ data, toast }) {
  const M = useMailData();
  const [tab, setTab] = React.useState('Outbox');
  const all = M.outbox();
  const review = all.filter(m => m.status === 'Awaiting review').length;
  const sent = all.filter(m => m.status === 'Sent').length;
  const failed = all.filter(m => m.status === 'Not sent').length;
  const canEdit = data.canPublish;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="summary-grid adv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        <StatTile label="Awaiting review" value={String(review)} caption="Check, then send" icon={<Icon name="MailWarning" size={18} />} />
        <StatTile label="Sent" value={String(sent)} caption="Delivered to candidates" icon={<Icon name="MailCheck" size={18} />} />
        <StatTile label="Not sent" value={String(failed)} caption={failed ? 'Held in the outbox' : 'Nothing held'} icon={<Icon name="MailX" size={18} />} />
        <StatTile label="Automatic" value={String(M.templates().filter(t => t.mode === 'auto').length) + ' of ' + M.templates().length} caption="Templates sending themselves" icon={<Icon name="Zap" size={18} />} />
      </div>
      <MailConnection />
      <window.AdvertSubnav view={tab} onSelect={setTab} items={[['Outbox', 'Inbox', review], ['Templates', 'FileText', 0]]} />
      {tab === 'Outbox' && <MailOutbox toast={toast} canEdit={data.canEdit} />}
      {tab === 'Templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!canEdit && <Notice icon="Lock">Only HR Admin and Super Admin can change when emails are sent or edit the wording.</Notice>}
          {M.templates().map(t => <MailTemplateCard key={t.key + t.mode + t.subject} t={t} canEdit={canEdit} toast={toast} />)}
          <Notice icon="ShieldCheck">Automatic emails never go to applications recorded retrospectively, and each stage email is sent once per candidate. Offers default to "Check before sending" so a person reads them first.</Notice>
        </div>
      )}
    </div>
  );
}

/* App-wide toast when an automatic email goes out or needs review. Mounted by
   the shell so it shows on whichever screen moved the candidate. */
function CandidateMailToaster() {
  const [toastNode, toast] = window.useAdvertToast();
  React.useEffect(() => {
    const on = e => {
      const m = e.detail || {};
      if (m.status === 'Awaiting review') toast(m.templateLabel + ' for ' + m.candidateName + ' is ready to review in Job Adverts › Candidate emails', 'warn');
      else toast(m.templateLabel + ' email ' + (mailServiceLive() ? 'sent' : 'logged (demo)') + ' to ' + m.candidateName);
    };
    const err = e => toast(String(e.detail || 'Could not reach the database'), 'warn');
    window.addEventListener('nhr-candidate-mail', on);
    window.addEventListener('nhr-live-error', err);
    return () => { window.removeEventListener('nhr-candidate-mail', on); window.removeEventListener('nhr-live-error', err); };
  }, []);
  return toastNode;
}

Object.assign(window, { MAIL_TONE, CandidateEmailsView, CandidateEmailsPanel, ComposeMailDrawer, MailReviewDrawer, CandidateMailToaster, mailServiceLive });
