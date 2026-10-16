/* Job Adverts — candidate-facing preview, advert detail, internal job board,
   application and referral forms, performance, and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, BarChart, DataTable } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Candidate-facing advert ----------------
   Light surface on purpose: this is what candidates see on the careers page,
   and the careers page uses the same component. */
function AdvertPreview({ advert: a, compact = false, company = (window.nhrCompanyName ? window.nhrCompanyName() : 'Northgate Services') }) {
  const JA = window.JobAdvertStore;
  const list = (title, text, icon) => {
    const items = JA.lines(text);
    if (!items.length) return null;
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--nhr-text-dark)', letterSpacing: '-.01em' }}>{title}</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((t, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.6, color: '#3B4747' }}>
              <Icon name={icon} size={15} style={{ color: 'var(--nhr-turquoise-ink)', marginTop: 3 }} /><span>{t}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  };
  const facts = [
    ['MapPin', [a.location, a.workplace].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' · ') || 'Location to be confirmed'],
    ['Wallet', JA.salaryLabel(a)],
    ['Clock', [a.employmentType, a.hoursPerWeek ? a.hoursPerWeek + ' hrs/week' : '', a.contractLength].filter(Boolean).join(' · ')],
    ['CalendarClock', a.closingAt ? 'Closes ' + window.advDate(a.closingAt) : 'Open until filled']
  ];
  return (
    <article style={{ background: 'var(--nhr-white)', color: 'var(--nhr-text-dark)', padding: compact ? 18 : 26, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'var(--font-core)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nhr-turquoise-ink)' }}>
          {company}{a.department ? ' · ' + a.department : ''}
        </span>
        <h3 style={{ margin: 0, fontSize: compact ? 22 : 28, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, color: 'var(--nhr-text-dark)' }}>{a.title || 'Job title'}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
          {facts.map(([icon, t]) => (
            <span key={icon} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--nhr-text-muted-ink)' }}>
              <Icon name={icon} size={14} style={{ color: 'var(--nhr-turquoise-ink)' }} />{t}
            </span>
          ))}
        </div>
      </header>
      {a.summary && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#3B4747' }}>{a.summary}</p>}
      {list("What you'll do", a.responsibilities, 'ArrowRight')}
      {list("What you'll need", a.essential, 'Check')}
      {list("It's a bonus if you have", a.desirable, 'Plus')}
      {list("What you'll get", a.benefits, 'Sparkles')}
      {(a.includeRtwStatement || (a.sponsorship && a.sponsorship.available)) && (
        <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--nhr-light)', border: '1px solid var(--nhr-line-light)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {a.includeRtwStatement && <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--nhr-text-muted-ink)' }}>{JA.RTW_STATEMENT}</span>}
          {a.sponsorship && a.sponsorship.available && (
            <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--nhr-text-dark)', fontWeight: 600 }}>
              {a.sponsorship.note || 'Visa sponsorship may be available for eligible candidates.'}
            </span>
          )}
        </div>
      )}
      <span style={{ fontSize: 11.5, color: 'var(--nhr-text-muted-ink)', fontFamily: 'var(--font-mono)' }}>Ref {a.reference || 'ADV-—'}</span>
    </article>
  );
}

/* ---------------- Application form (internal board and manual log) ---------------- */
function ApplyDrawer({ data, advertId, mode, onClose, toast }) {
  /* mode: 'internal' (employee applies), 'refer' (employee refers someone), 'log' (HR logs an emailed or board application) */
  const { JA, S } = data;
  const a = JA.get(advertId);
  const self = S.session.role === 'Employee' ? S.list({}).find(e => e.employeeId === S.session.employeeId) : null;
  const staff = S.managers();
  const [f, setF] = React.useState({
    employeeId: self ? self.id : '', firstName: '', lastName: '', email: '', phone: '',
    channel: 'indeed', appliedAt: new Date().toISOString().slice(0, 10), coverNote: '', cvName: '', reason: '', answers: {}, needsSponsorship: false, consent: false
  });
  const [err, setErr] = React.useState('');
  const [done, setDone] = React.useState(null);
  const set = (k, v) => setF(p => Object.assign({}, p, { [k]: v }));
  if (!a) return null;

  /* Internal applicants are already employees — their details come from the record. */
  const emp = f.employeeId ? S.get(f.employeeId) : null;

  function submit() {
    setErr('');
    if (mode !== 'log' && !f.employeeId) return setErr(mode === 'refer' ? 'Choose who is making the referral.' : 'Choose the employee applying.');
    if (mode === 'internal') {
      const missing = (a.questions || []).find(q => q.required && !String(f.answers[q.id] || '').trim());
      if (missing) return setErr('Answer: ' + missing.text);
      const r = JA.apply(a.id, {
        firstName: emp.firstName, lastName: emp.lastName, email: emp.workEmail || emp.personalEmail || (emp.employeeId + '@example.com'),
        phone: emp.mobile, internal: true, channel: 'internal', employeeId: emp.id, coverNote: f.coverNote, answers: f.answers
      });
      if (r.error) return setErr(r.error);
      setDone('Application sent. ' + (a.hiringManagerId ? JA.managerName(a) + ' and HR' : 'HR') + ' can now see it in the Recruitment pipeline.');
      toast('Internal application submitted for ' + a.title);
      return;
    }
    if (!f.firstName.trim() || !f.lastName.trim()) return setErr('Enter the candidate’s first and last name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setErr('Enter a valid email address.');
    if (mode === 'refer') {
      if (!f.consent) return setErr('Confirm the candidate is happy for you to share their details.');
      const r = JA.refer(a.id, f.employeeId, f);
      if (r.error) return setErr(r.error);
      setDone(f.firstName + ' has been added to the pipeline as a referral, and the referral is logged on ' + S.fullName(emp) + '’s employee record.');
      toast('Referral sent for ' + a.title);
      return;
    }
    const missing = (a.questions || []).find(q => q.required && !String(f.answers[q.id] || '').trim());
    if (missing) return setErr('Answer: ' + missing.text);
    const r = JA.apply(a.id, Object.assign({}, f, { recorded: true }));
    if (r.error) return setErr(r.error);
    const back = f.appliedAt < new Date().toISOString().slice(0, 10);
    setDone(f.firstName + ' ' + f.lastName + ' added to the pipeline at Applied' + (back ? ', received ' + window.advDate(f.appliedAt) + ' (backdated — no automatic emails)' : '') + (r.flagged ? '. Flagged on a knock-out question for review.' : '.'));
    toast('Application logged for ' + a.title);
  }

  const titles = { internal: 'Apply internally', refer: 'Refer someone', log: 'Log an application' };
  const subs = {
    internal: a.title + ' · your employee record is attached, so there is nothing to retype.',
    refer: a.title + (a.referralBonus ? ' · ' + window.advMoney(a.referralBonus) + ' referral bonus if they are hired' : ''),
    log: a.title + ' · for applications received by email, phone or a job board.'
  };

  return (
    <Drawer open onClose={onClose} title={titles[mode]} subtitle={subs[mode]} width={600}
      footer={done ? <Button onClick={onClose}>Done</Button> : (
        <React.Fragment>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Send" size={15} />}>{mode === 'refer' ? 'Send Referral' : mode === 'log' ? 'Add to Pipeline' : 'Submit Application'}</Button>
        </React.Fragment>
      )}>
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '30px 10px' }}>
          <span style={{ width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.35)', color: 'var(--nhr-turquoise)' }}><Icon name="Check" size={26} /></span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{mode === 'refer' ? 'Referral sent' : 'Application received'}</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 420 }}>{done}</span>
          {mode !== 'internal' && data.canEdit && (
            <Button size="sm" variant="secondary" tone="dark" iconRight={<Icon name="ArrowRight" size={15} />}
              onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Recruitment' })); }}>Open Recruitment pipeline</Button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode !== 'log' && (
            self ? (
              <Card tone="dark" padding={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar employee={self} size={38} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{S.fullName(self)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{self.employeeId} · {self.jobTitle} · {self.department}</span>
                </span>
              </Card>
            ) : (
              <SelectField label={mode === 'refer' ? 'Referred by' : 'Employee applying'} required value={f.employeeId} onChange={v => set('employeeId', v)}
                placeholder="Choose from Employees…" options={staff.map(e => ({ value: e.id, label: e.label }))} />
            )
          )}
          {mode !== 'internal' && (
            <React.Fragment>
              <SectionLabel>{mode === 'refer' ? 'Who are you referring?' : 'Candidate'}</SectionLabel>
              <FormGrid cols={2}>
                <TextField label="First name" required value={f.firstName} onChange={v => set('firstName', v)} />
                <TextField label="Last name" required value={f.lastName} onChange={v => set('lastName', v)} />
                <TextField label="Email" required type="email" value={f.email} onChange={v => set('email', v)} />
                <TextField label="Phone" value={f.phone} onChange={v => set('phone', v)} />
                {mode === 'log' && (
                  <TextField label="Date received" type="date" value={f.appliedAt} onChange={v => set('appliedAt', v)}
                    hint={f.appliedAt < new Date().toISOString().slice(0, 10) ? 'Backdated — the original date is kept for reporting and no automatic emails are sent.' : 'Change this for applications received earlier.'} />
                )}
                {mode === 'log' && (
                  <SelectField label="Where they applied" value={f.channel} onChange={v => set('channel', v)}
                    options={JA.CHANNELS.map(c => ({ value: c.key, label: c.label }))} />
                )}
                {mode === 'log' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(245,255,255,.72)' }}>CV</span>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => set('cvName', e.target.files && e.target.files[0] ? e.target.files[0].name : '')}
                      style={{ fontSize: 12.5, color: 'var(--text-body-dark)', padding: '9px 0' }} />
                  </label>
                )}
              </FormGrid>
            </React.Fragment>
          )}
          {mode === 'refer' ? (
            <React.Fragment>
              <TextareaField label="Why they'd be a good fit" rows={3} value={f.reason} onChange={v => set('reason', v)} />
              <window.NHRSolutionDesignSystem_0db691.Checkbox tone="dark" checked={f.consent} onChange={e => set('consent', e.target.checked)}
                label="They know I'm referring them and are happy for their details to be shared with HR." />
            </React.Fragment>
          ) : (
            <React.Fragment>
              {(a.questions || []).length > 0 && <SectionLabel>Screening questions</SectionLabel>}
              {(a.questions || []).map(q => q.type === 'yesno' ? (
                <SelectField key={q.id} label={q.text} required={q.required} value={f.answers[q.id] || ''} placeholder="Choose…"
                  onChange={v => set('answers', Object.assign({}, f.answers, { [q.id]: v }))} options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
              ) : (
                <TextField key={q.id} label={q.text} required={q.required} value={f.answers[q.id] || ''}
                  onChange={v => set('answers', Object.assign({}, f.answers, { [q.id]: v }))} />
              ))}
              <TextareaField label={mode === 'internal' ? 'Why you want this role' : 'Notes'} rows={3} value={f.coverNote} onChange={v => set('coverNote', v)} />
              {mode === 'internal' && <Notice icon="Lock">Your manager is not notified automatically. HR will talk to you before contacting them.</Notice>}
            </React.Fragment>
          )}
          {err && <Notice icon="TriangleAlert" tone="warn">{err}</Notice>}
        </div>
      )}
    </Drawer>
  );
}

/* ---------------- Advert detail ---------------- */
function AdvertDetail({ data, advertId, intent, onClose, onEdit, toast }) {
  const { JA, REC, S, canEdit, canPublish } = data;
  const a = JA.get(advertId);
  const [tab, setTab] = React.useState(intent === 'extend' ? 'Overview' : 'Overview');
  const [extendTo, setExtendTo] = React.useState(intent === 'extend' ? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) : '');
  const [returnNote, setReturnNote] = React.useState('');
  const [applyMode, setApplyMode] = React.useState(null);
  const [dateFor, setDateFor] = React.useState(null);
  const [dateVal, setDateVal] = React.useState('');
  const [mailFor, setMailFor] = React.useState(null);
  if (!a) return null;
  const st = JA.stats(a);
  const checks = JA.checks(a);
  const vac = a.vacancyId ? REC.vacancy(a.vacancyId) : null;
  const managerName = JA.managerName(a);
  const actions = window.advertActions(a, data, { onOpen: (id, i) => i === 'extend' && setExtendTo(new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)), onEdit, toast, onClose });

  const tabs = ['Overview', 'Preview', 'Candidates (' + st.applications + ')', 'Performance', 'Activity'];
  const tabKey = tab.split(' (')[0];

  function publish() { const r = JA.publish(a.id); r && r.error ? toast(r.error, 'warn') : toast(a.title + ' is live'); }
  function approve() { const r = JA.approve(a.id); r && r.error ? toast(r.error, 'warn') : toast('Approved and published — ' + a.title); }

  const primary = [];
  if (canEdit && a.status !== 'Pending approval' && !a.archived) primary.push(<Button key="e" size="sm" variant="secondary" tone="dark" onClick={() => onEdit(a.id)} iconLeft={<Icon name="PencilLine" size={15} />}>Edit</Button>);
  if (a.status === 'Draft' && canPublish) primary.push(<Button key="p" size="sm" onClick={publish} iconLeft={<Icon name="Send" size={15} />}>Publish</Button>);
  if (a.status === 'Draft' && canEdit && !canPublish) primary.push(<Button key="s" size="sm" onClick={() => { JA.submit(a.id); toast('Sent to HR for approval'); }} iconLeft={<Icon name="SendHorizontal" size={15} />}>Submit for Approval</Button>);
  if (a.status === 'Published') {
    primary.push(<Button key="r" size="sm" variant="secondary" tone="dark" onClick={() => setApplyMode('refer')} iconLeft={<Icon name="UserPlus" size={15} />}>Refer</Button>);
    if (canEdit) primary.push(<Button key="l" size="sm" variant="secondary" tone="dark" onClick={() => setApplyMode('log')} iconLeft={<Icon name="Inbox" size={15} />}>Log Application</Button>);
    primary.push(<Button key="c" size="sm" onClick={() => window.copyText(JA.publicUrl(a)).then(() => toast('Link copied — ' + a.reference))} iconLeft={<Icon name="Link" size={15} />}>Copy Link</Button>);
  }
  if ((a.status === 'Closed' || a.status === 'Paused') && canEdit && a.vacancyId) primary.push(<Button key="lc" size="sm" variant="secondary" tone="dark" onClick={() => setApplyMode('log')} iconLeft={<Icon name="History" size={15} />}>Record Past Application</Button>);
  if (a.status === 'Paused' && canPublish) primary.push(<Button key="res" size="sm" onClick={publish} iconLeft={<Icon name="Play" size={15} />}>Resume</Button>);

  return (
    <Drawer open onClose={onClose} width={820} title={a.title} subtitle={a.reference + ' · ' + [a.department, a.location, a.workplace].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' · ')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone={window.ADV_TONE[a.status] || 'dark'}>{a.status}</Badge>
          {a.closedReason && a.status === 'Closed' && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{a.closedReason}</span>}
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{JA.salaryLabel(a)}</span>
          {a.publishedAt && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>Posted {window.advDate(a.publishedAt)}{a.closingAt ? ' · closes ' + window.advDate(a.closingAt) : ''}</span>}
          {a.historical && <Badge tone="dark" icon={<Icon name="History" size={11} />}>Past advert</Badge>}
          <span style={{ flex: 1 }} />
          <span className="adv-detail-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{primary}</span>
          {actions.length > 0 && <Menu label="More advert actions" items={actions} />}
        </div>

        {a.status === 'Pending approval' && (
          <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(242,180,65,.35)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 700, color: '#fff' }}>
              <Icon name="ClipboardCheck" size={17} style={{ color: 'var(--nhr-warning)' }} />
              Submitted by {(a.approval && a.approval.requestedBy) || 'a manager'}{a.approval && a.approval.requestedAt ? ' on ' + window.advDate(a.approval.requestedAt) : ''}
            </span>
            {canPublish ? (
              <React.Fragment>
                <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>Check the Preview tab, then approve to publish it to the chosen channels, or return it with a note.</span>
                <TextField label="Note if returning to draft" value={returnNote} onChange={setReturnNote} placeholder="e.g. Please add the salary range" />
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" onClick={approve} iconLeft={<Icon name="Check" size={15} />}>Approve &amp; Publish</Button>
                  <Button size="sm" variant="secondary" tone="dark" onClick={() => { JA.returnToDraft(a.id, returnNote); toast('Returned to draft'); }} iconLeft={<Icon name="Undo2" size={15} />}>Return to Draft</Button>
                </span>
              </React.Fragment>
            ) : <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>HR will review and publish it. You'll see it go live here.</span>}
          </Card>
        )}

        {extendTo && (
          <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}><TextField label="New closing date" type="date" value={extendTo} onChange={setExtendTo} /></div>
            <Button size="sm" onClick={() => { const r = JA.extend(a.id, extendTo); if (r && r.error) toast(r.error, 'warn'); else { toast('Extended to ' + window.advDate(extendTo) + ' and republished'); setExtendTo(''); } }} iconLeft={<Icon name="CalendarPlus" size={15} />}>Extend &amp; Republish</Button>
            <Button size="sm" variant="ghost" tone="dark" onClick={() => setExtendTo('')}>Cancel</Button>
          </Card>
        )}

        <AdvertSubnav view={tabKey} onSelect={t => setTab(tabs.find(x => x.split(' (')[0] === t))} items={tabs.map(t => [t.split(' (')[0], { Overview: 'LayoutDashboard', Preview: 'Eye', Candidates: 'Users', Performance: 'ChartColumn', Activity: 'History' }[t.split(' (')[0]], t.indexOf('(') > -1 ? st.applications : 0])} />

        {tabKey === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="summary-grid adv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
              <StatTile label="Views" value={st.views.toLocaleString('en-GB')} caption={st.daysLive ? st.daysLive + (st.daysLive === 1 ? ' day' : ' days') + ' live' : 'Not published'} />
              <StatTile label="Applications" value={String(st.applications)} caption={st.perDay + ' per day'} />
              <StatTile label="Interviewing" value={String(st.interviewing)} caption={st.active + ' active'} />
              <StatTile label="Hired" value={String(st.hired)} caption={vac ? vac.openings + ' opening' + (vac.openings === 1 ? '' : 's') + ' left' : 'No vacancy yet'} />
            </div>
            <div className="adv-two" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              <DashboardCard title="Linked records" padding={16}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AdvertLinkRow icon="Briefcase" label="Vacancy (Recruitment)" value={vac ? vac.reference + ' · ' + vac.status : 'Created when first published'}
                    action={vac ? () => { onClose(); window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Recruitment' })); } : null} actionLabel="Open pipeline" />
                  <AdvertLinkRow icon="UserRound" label="Hiring manager (Employees)" value={managerName || 'Not assigned'}
                    action={a.hiringManagerId && S.can('employees.read.all') ? () => { onClose(); window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Employees' })); setTimeout(() => window.dispatchEvent(new CustomEvent('nhr-open-employee', { detail: a.hiringManagerId })), 80); } : null} actionLabel="View profile" />
                  <AdvertLinkRow icon="Users" label="Department" value={a.department + ' · ' + S.list({}).filter(e => e.department === a.department).length + ' current employees'} />
                  <AdvertLinkRow icon="HandHeart" label="Employee referrals" value={(a.referrals || []).length ? (a.referrals || []).map(r => r.referrer).join(', ') : 'None yet' + (a.referralBonus ? ' · ' + window.advMoney(a.referralBonus) + ' bonus' : '')} />
                </div>
              </DashboardCard>
              <DashboardCard title={'Advert quality · ' + JA.score(a) + '%'} padding={16}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {checks.filter(c => c.level !== 'ok').concat(checks.filter(c => c.level === 'ok')).slice(0, 7).map((c, i) => (
                    <span key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: c.level === 'ok' ? 'var(--text-body-dark)' : '#fff' }}>
                      <Icon name={c.level === 'ok' ? 'CircleCheck' : c.level === 'warn' ? 'TriangleAlert' : 'CircleX'} size={14}
                        style={{ marginTop: 2, color: c.level === 'ok' ? 'var(--nhr-turquoise)' : c.level === 'warn' ? 'var(--nhr-warning)' : 'var(--nhr-danger)' }} />
                      <span>{c.text}</span>
                    </span>
                  ))}
                </div>
              </DashboardCard>
            </div>
            <DashboardCard title="Channels" padding={16}>
              <window.ChannelChips advert={a} />
            </DashboardCard>
          </div>
        )}

        {tabKey === 'Preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <AdvertPreview advert={a} />
            </div>
            <details style={{ border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>Google for Jobs structured data</summary>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted-dark)', lineHeight: 1.6 }}>Added to the careers page automatically so the advert can appear in Google's job search.</p>
              <pre style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, fontFamily: 'var(--font-mono)', color: 'var(--text-body-dark)', maxHeight: 260, overflow: 'auto' }}>{JSON.stringify(JA.jobPostingSchema(a, window.nhrCompanyName ? window.nhrCompanyName() : 'Northgate Services'), null, 2)}</pre>
            </details>
          </div>
        )}

        {tabKey === 'Candidates' && (
          st.candidates.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {st.candidates.map(c => (
                <Card key={c.id} tone="dark" padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <window.CandidateAvatar candidate={c} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 180px', minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{c.firstName} {c.lastName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{c.source} · applied {window.advDate(c.appliedAt)}{c.backdated ? ' (backdated)' : ''}{c.hiredEmployeeId ? ' · now an employee' : ''}</span>
                    {dateFor === c.id && (
                      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ flex: '1 1 160px' }}><TextField label="Date received" type="date" value={dateVal} onChange={setDateVal} /></span>
                        <Button size="xs" onClick={() => { const r = JA.backdateApplication(c.id, dateVal); if (r.error) toast(r.error, 'warn'); else { toast('Date received updated for ' + c.firstName); setDateFor(null); } }}>Save</Button>
                        <Button size="xs" variant="ghost" tone="dark" onClick={() => setDateFor(null)}>Cancel</Button>
                      </span>
                    )}
                  </span>
                  <Badge tone={(window.STAGE_TONE || {})[c.stage] || 'dark'}>{c.stage}</Badge>
                  {canPublish && dateFor !== c.id && <IconButton tone="dark" size={30} label={'Change date received for ' + c.firstName} onClick={() => { setDateFor(c.id); setDateVal(c.appliedAt); }}><Icon name="CalendarCog" size={14} /></IconButton>}
                  {canEdit && window.ComposeMailDrawer && <IconButton tone="dark" size={30} label={'Email ' + c.firstName} onClick={() => setMailFor(c.id)}><Icon name="Mail" size={14} /></IconButton>}
                  {canEdit && <Button size="xs" variant="secondary" tone="dark" onClick={() => {
                    onClose(); window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Recruitment' }));
                    setTimeout(() => window.dispatchEvent(new CustomEvent('nhr-open-candidate', { detail: c.id })), 80);
                  }}>Open</Button>}
                </Card>
              ))}
            </div>
          ) : <Notice icon="Inbox">No applications yet. {a.status === 'Published' ? 'Share the link or log an application received by email.' : 'Publish the advert to start receiving applications.'}</Notice>
        )}

        {tabKey === 'Performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DashboardCard title="Applications by channel" padding={16}>
              {st.byChannel.some(c => c.applications) ? <BarChart height={170} data={st.byChannel.filter(c => c.live || c.applications).map(c => ({ label: c.short, value: c.applications }))} />
                : <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>No applications yet.</span>}
            </DashboardCard>
            <window.NHRSolutionDesignSystem_0db691.DataTable compact cardsAt={560}
              columns={[{ key: 'channel', label: 'Channel' }, { key: 'views', label: 'Views', align: 'right', mono: true }, { key: 'apps', label: 'Applications', align: 'right', mono: true }, { key: 'conv', label: 'Conversion', align: 'right', mono: true }]}
              rows={st.byChannel.filter(c => c.live || c.views || c.applications).map(c => ({ id: c.key, channel: c.label, views: c.views.toLocaleString('en-GB'), apps: String(c.applications), conv: c.conversion + '%' }))} />
          </div>
        )}

        {tabKey === 'Activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(JA.raw(a.id).activity || []).map(x => (
              <div key={x.id} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border-dark)' }}>
                <Icon name="Dot" size={18} style={{ color: 'var(--nhr-turquoise)' }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: '#fff' }}>{x.action}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{x.by} · {new Date(x.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {applyMode && <ApplyDrawer data={data} advertId={a.id} mode={applyMode} onClose={() => setApplyMode(null)} toast={toast} />}
      {mailFor && <window.ComposeMailDrawer candidateId={mailFor} onClose={() => setMailFor(null)} toast={toast} />}
    </Drawer>
  );
}

function AdvertLinkRow({ icon, label, value, action, actionLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', color: 'var(--nhr-turquoise)' }}><Icon name={icon} size={15} /></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{value}</span>
      </span>
      {action && <Button size="xs" variant="ghost" tone="dark" onClick={action} iconRight={<Icon name="ArrowRight" size={13} />}>{actionLabel}</Button>}
    </div>
  );
}

/* ---------------- Internal job board ---------------- */
function InternalJobBoard({ data, toast, onOpen }) {
  const { JA, S, isEmployee } = data;
  const [mode, setMode] = React.useState(null);
  const [q, setQ] = React.useState('');
  const jobs = JA.list({ internalOnly: true }).filter(a => !q || (a.title + ' ' + a.department + ' ' + a.location).toLowerCase().includes(q.toLowerCase()));
  React.useEffect(() => { jobs.forEach(a => JA.recordView(a.id, 'internal')); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={18} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(0,229,212,.22)' }}>
        <Icon name="Building2" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ flex: '1 1 260px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          {isEmployee ? 'Roles open to you right now. Apply with your employee record, or refer someone you know.' : 'What employees see on their internal job board. Internal-only roles never appear on the public careers page.'}
        </span>
        <span style={{ position: 'relative', flex: '1 1 200px', display: 'flex' }}>
          <Icon name="Search" size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search roles…" aria-label="Search internal roles"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '10px 12px 10px 34px', outline: 'none' }} />
        </span>
      </Card>
      {jobs.length ? (
        <div className="adv-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {jobs.map(a => (
            <Card key={a.id} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone="dark">{a.department}</Badge>
                {a.visibility === 'Internal only' && <Badge tone="success">Internal only</Badge>}
                {a.referralBonus && <Badge tone="dark" icon={<Icon name="Gift" size={11} />}>{window.advMoney(a.referralBonus)} referral</Badge>}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{a.title}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>{[a.location, a.workplace, a.employmentType].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' · ')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{JA.salaryLabel(a)}</span>
                {a.closingAt && <span>Closes {window.advDate(a.closingAt)}</span>}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                <Button size="sm" onClick={() => setMode({ id: a.id, m: 'internal' })} iconLeft={<Icon name="Send" size={15} />}>Apply</Button>
                <Button size="sm" variant="secondary" tone="dark" onClick={() => setMode({ id: a.id, m: 'refer' })} iconLeft={<Icon name="UserPlus" size={15} />}>Refer</Button>
                <Button size="sm" variant="ghost" tone="dark" onClick={() => setMode({ id: a.id, m: 'view' })}>Read advert</Button>
              </span>
            </Card>
          ))}
        </div>
      ) : <Notice icon="Inbox">No roles are open internally at the moment.</Notice>}
      {mode && mode.m === 'view' && (
        <Drawer open onClose={() => setMode(null)} title={JA.get(mode.id).title} subtitle="As shown on the job board" width={720}
          footer={<React.Fragment>
            <Button variant="secondary" tone="dark" onClick={() => setMode({ id: mode.id, m: 'refer' })} iconLeft={<Icon name="UserPlus" size={15} />}>Refer someone</Button>
            <Button onClick={() => setMode({ id: mode.id, m: 'internal' })} iconLeft={<Icon name="Send" size={15} />}>Apply</Button>
          </React.Fragment>}>
          <div style={{ border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}><AdvertPreview advert={JA.get(mode.id)} /></div>
        </Drawer>
      )}
      {mode && mode.m !== 'view' && <ApplyDrawer data={data} advertId={mode.id} mode={mode.m} onClose={() => setMode(null)} toast={toast} />}
    </div>
  );
}

/* ---------------- Performance across adverts ---------------- */
function AdvertPerformance({ data, onOpen }) {
  const { JA } = data;
  const rows = data.adverts.filter(a => !a.archived && a.publishedAt).map(a => Object.assign({ a }, JA.stats(a)));
  const channels = JA.CHANNELS.map(ch => {
    const views = rows.reduce((n, r) => n + ((r.byChannel.find(x => x.key === ch.key) || {}).views || 0), 0);
    const apps = rows.reduce((n, r) => n + ((r.byChannel.find(x => x.key === ch.key) || {}).applications || 0), 0);
    return { label: ch.label, short: ch.short, views, apps, conv: views ? Math.round(apps / views * 1000) / 10 : 0 };
  }).filter(c => c.views || c.apps);
  const best = channels.slice().sort((x, y) => y.conv - x.conv)[0];
  const totalViews = rows.reduce((n, r) => n + r.views, 0);
  const totalApps = rows.reduce((n, r) => n + r.applications, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="summary-grid adv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        <StatTile label="Adverts published" value={String(rows.length)} caption="Excluding archived" icon={<Icon name="Megaphone" size={18} />} />
        <StatTile label="View-to-apply" value={(totalViews ? Math.round(totalApps / totalViews * 1000) / 10 : 0) + '%'} caption={totalApps + ' of ' + totalViews.toLocaleString('en-GB') + ' views'} icon={<Icon name="MousePointerClick" size={18} />} />
        <StatTile label="Best channel" value={best ? best.short : '—'} caption={best ? best.conv + '% conversion' : 'No data yet'} icon={<Icon name="Trophy" size={18} />} />
        <StatTile label="Referrals" value={String(rows.reduce((n, r) => n + r.referrals, 0))} caption="From employees" icon={<Icon name="HandHeart" size={18} />} />
      </div>
      <div className="adv-two" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
        <DashboardCard title="Applications by channel" padding={16}>
          {channels.length ? <BarChart height={180} data={channels.map(c => ({ label: c.short, value: c.apps }))} /> : <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>No data yet.</span>}
        </DashboardCard>
        <DashboardCard title="Conversion by channel" padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {channels.map(c => <ProgressMeter key={c.label} label={c.label} value={Math.min(100, c.conv * 10)} valueLabel={c.conv + '% · ' + c.apps + ' apps'} />)}
          </div>
        </DashboardCard>
      </div>
      <DashboardCard title="By advert" padding={16}>
        <DataTable compact cardsAt={720}
          columns={[{ key: 'title', label: 'Advert' }, { key: 'status', label: 'Status' }, { key: 'views', label: 'Views', align: 'right', mono: true }, { key: 'apps', label: 'Applied', align: 'right', mono: true }, { key: 'conv', label: 'Conv.', align: 'right', mono: true }, { key: 'int', label: 'Interview', align: 'right', mono: true }, { key: 'hired', label: 'Hired', align: 'right', mono: true }, { key: 'days', label: 'Days live', align: 'right', mono: true }]}
          rows={rows.map(r => ({
            id: r.a.id,
            title: <button type="button" onClick={() => onOpen(r.a.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: 700, textAlign: 'left' }}>{r.a.title}</button>,
            status: <Badge tone={window.ADV_TONE[r.a.status] || 'dark'}>{r.a.status}</Badge>,
            views: r.views.toLocaleString('en-GB'), apps: String(r.applications), conv: r.conversion + '%', int: String(r.interviewing), hired: String(r.hired), days: String(r.daysLive)
          }))} />
      </DashboardCard>
    </div>
  );
}

/* ---------------- Screen ---------------- */
function JobAdvertsScreen() {
  const data = window.useJobAdvertData();
  const { JA, canEdit, canPublish, isEmployee } = data;
  const [view, setView] = React.useState(isEmployee ? 'Internal job board' : 'Adverts');
  const [openId, setOpenId] = React.useState(null);
  const [intent, setIntent] = React.useState(null);
  const [editId, setEditId] = React.useState(undefined);   /* undefined closed · null new · id edit */
  const [toastNode, toast] = window.useAdvertToast();
  const [preset, setPreset] = React.useState(null);
  /* Live accounts: connection status from liveRecruitment.js. */
  const [live, setLive] = React.useState(() => window.NHRLive ? window.NHRLive.status() : null);
  React.useEffect(() => (window.NHRLive ? window.NHRLive.subscribe(() => setLive(window.NHRLive.status())) : undefined), []);
  const firstRole = React.useRef(true);
  React.useEffect(() => { if (firstRole.current) { firstRole.current = false; return; } setView(isEmployee ? 'Internal job board' : 'Adverts'); }, [isEmployee]);
  /* Other modules ask for an advert — Recruitment's "Advertise" button. */
  React.useEffect(() => {
    const onNew = e => { const d = e.detail || {}; if (d.advertId) setOpenId(d.advertId); else { setPreset(d.vacancyId || d.employeeId ? d : null); setEditId(null); } };
    window.addEventListener('nhr-advert', onNew);
    if (window.__nhrPendingAdvert) { const d = window.__nhrPendingAdvert; window.__nhrPendingAdvert = null; setTimeout(() => onNew({ detail: d }), 0); }
    return () => window.removeEventListener('nhr-advert', onNew);
  }, []);

  const pending = data.adverts.filter(a => a.status === 'Pending approval').length;
  const items = isEmployee
    ? [['Internal job board', 'Building2', 0]]
    : [['Adverts', 'Megaphone', data.adverts.filter(a => a.status === 'Published').length], ['Approvals', 'ClipboardCheck', pending], ['Candidate emails', 'Mail', window.CandidateMailStore ? window.CandidateMailStore.outbox().filter(m => m.status === 'Awaiting review').length : 0], ['Internal job board', 'Building2', 0], ['Performance', 'ChartColumn', 0]];

  const open = (id, i) => { setIntent(i || null); setOpenId(id); };
  const careersUrl = JA.careersPath();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>{isEmployee ? 'Internal Jobs' : 'Job Adverts'}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            {isEmployee ? 'Open roles across the business. Apply with your employee record or refer someone you know.'
              : 'Write, approve and publish adverts to your careers page, internal job board and job boards. Every application lands in the Recruitment pipeline, and a hire becomes an employee record.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isEmployee && <Button variant="secondary" tone="dark" size="sm" href={careersUrl} iconLeft={<Icon name="Globe" size={15} />}>Careers Page</Button>}
          {canEdit && !isEmployee && <Button size="sm" onClick={() => setEditId(null)} iconLeft={<Icon name="Plus" size={16} />}>New Advert</Button>}
        </div>
      </div>

      <window.AdvertSubnav view={view} onSelect={setView} items={items} />
      {live && live.status === 'loading' && <Notice icon="LoaderCircle">Loading your adverts and candidates…</Notice>}
      {live && live.status === 'error' && (
        <Notice icon="CloudOff" tone="warn">
          <strong style={{ color: '#fff' }}>Not connected to your live data.</strong> {live.error}{' '}
          <button type="button" onClick={() => window.NHRLive.refresh()} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--nhr-turquoise)', cursor: 'pointer', fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: 700 }}>Try again</button>
        </Notice>
      )}
      {!(live && ['loading', 'live', 'error'].indexOf(live.status) > -1) && window.RoleSwitcher ? <window.RoleSwitcher /> : null}

      {view === 'Adverts' && <window.AdvertList data={data} onOpen={open} onEdit={setEditId} onNew={() => setEditId(null)} toast={toast} />}
      {view === 'Approvals' && (
        pending ? <window.AdvertList data={data} onOpen={open} onEdit={setEditId} onNew={() => setEditId(null)} toast={toast} statusPreset="Pending approval" />
          : <Notice icon="ClipboardCheck">{canPublish ? 'Nothing waiting for approval. Adverts written by managers appear here before they go live.' : 'Nothing waiting for approval. Adverts you submit go to HR before publishing.'}</Notice>
      )}
      {view === 'Internal job board' && <InternalJobBoard data={data} toast={toast} onOpen={open} />}
      {view === 'Performance' && <AdvertPerformance data={data} onOpen={open} />}
      {view === 'Candidate emails' && window.CandidateEmailsView && <window.CandidateEmailsView data={data} toast={toast} />}

      {openId && <AdvertDetail key={openId + (intent || '')} data={data} advertId={openId} intent={intent} onClose={() => { setOpenId(null); setIntent(null); }} onEdit={id => { setOpenId(null); setEditId(id); }} toast={toast} />}
      {editId !== undefined && <window.AdvertEditor data={data} advertId={editId} preset={editId === null ? preset : null} onClose={() => { setEditId(undefined); setPreset(null); }} onSaved={id => setOpenId(id)} toast={toast} />}
      {toastNode}
    </div>
  );
}

Object.assign(window, { AdvertPreview, ApplyDrawer, AdvertDetail, InternalJobBoard, AdvertPerformance, JobAdvertsScreen, AdvertLinkRow });
