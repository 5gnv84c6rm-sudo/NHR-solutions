/* Recruitment — candidate drawer, interviews, reports and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Candidate detail ---------------- */
function CandidateDrawer({ data, candidateId, onClose }) {
  const { candidates, S, REC, refresh } = data;
  const c = candidates.find(x => x.id === candidateId);
  const [note, setNote] = React.useState('');
  const [panel, setPanel] = React.useState(null);   /* 'interview' | 'offer' | 'hire' | 'reject' */
  const [iForm, setIForm] = React.useState({ date: '', type: 'Competency interview', interviewer: '', notes: '' });
  const [oForm, setOForm] = React.useState({ salary: '', startDate: '' });
  const [reason, setReason] = React.useState('');
  const canWrite = S.can('employees.write');
  if (!c) return null;

  const stageIndex = REC.STAGES.indexOf(c.stage);
  const terminal = REC.TERMINAL.indexOf(c.stage) > -1;

  function setStage(stage) { REC.moveCandidate(c.id, stage); refresh(); }

  function saveInterview() {
    if (!iForm.date) return;
    REC.scheduleInterview(c.id, {
      date: iForm.date, type: iForm.type,
      interviewer: iForm.interviewer || S.session.name, notes: iForm.notes
    });
    if (c.stage === 'Applied' || c.stage === 'Screening') REC.moveCandidate(c.id, 'Interview');
    setPanel(null); setIForm({ date: '', type: 'Competency interview', interviewer: '', notes: '' }); refresh();
  }

  function makeOffer() {
    const salary = Number(oForm.salary) || (c.vacancy ? c.vacancy.salary : 0);
    if (!oForm.startDate) return;
    REC.updateCandidate(c.id, {
      stage: 'Offer', movedAt: new Date().toISOString().slice(0, 10),
      offer: { salary, startDate: oForm.startDate, sentAt: new Date().toISOString().slice(0, 10), accepted: false }
    });
    setPanel(null); refresh();
  }

  function doHire() {
    const employee = REC.hire(c.id, {});
    setPanel(null); refresh();
    if (employee) onClose();
  }

  const rtwWarning = !/confirmed|share code/i.test(c.rightToWork);

  return (
    <Drawer open onClose={onClose} title={c.name}
      subtitle={c.vacancyTitle + ' · applied ' + window.shortDate(c.appliedAt)} width={660}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <window.CandidateAvatar candidate={c} size={46} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 170 }}>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>{c.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{c.email} · {c.phone}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
            <window.Rating value={c.rating} onRate={canWrite ? (n => { REC.updateCandidate(c.id, { rating: n }); refresh(); }) : null} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{canWrite ? 'Tap to rate' : 'Rating'}</span>
          </span>
          <Badge tone={window.STAGE_TONE[c.stage] || 'dark'}>{c.stage}</Badge>
        </Card>

        {!terminal && (
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {REC.STAGES.map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 110px', minWidth: 0 }}>
                <button type="button" disabled={!canWrite} onClick={() => setStage(s)} aria-label={'Move to ' + s}
                  style={{
                    width: 22, height: 22, flex: '0 0 auto', borderRadius: '50%', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', cursor: canWrite ? 'pointer' : 'default',
                    fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-core)',
                    background: i <= stageIndex ? 'rgba(0,229,212,.16)' : 'rgba(255,255,255,.05)',
                    border: '1px solid ' + (i <= stageIndex ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                    color: i <= stageIndex ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)'
                  }}>{i < stageIndex ? <Icon name="Check" size={11} /> : i + 1}</button>
                <span style={{ fontSize: 11.5, fontWeight: i === stageIndex ? 700 : 600, color: i <= stageIndex ? '#fff' : 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{s}</span>
                {i < REC.STAGES.length - 1 && <span style={{ flex: 1, height: 1, background: i < stageIndex ? 'rgba(0,229,212,.3)' : 'var(--border-dark)', minWidth: 8 }} />}
              </span>
            ))}
          </div>
        )}

        <DashboardCard title="Application" padding={16}>
          <DataTable compact columns={[{ key: 'k', label: 'Detail' }, { key: 'v', label: '' }]} rows={[
            { id: 'v', k: 'Vacancy', v: c.vacancyTitle + (c.vacancy ? ' · ' + c.vacancy.reference : '') },
            { id: 's', k: 'Source', v: c.source },
            { id: 'a', k: 'Applied', v: window.shortDate(c.appliedAt) + ' (' + c.age + ' days ago)' },
            { id: 'st', k: 'In current stage', v: c.inStage + (c.inStage === 1 ? ' day' : ' days') },
            { id: 'rtw', k: 'Right to work', v: <Badge tone={rtwWarning ? 'warning' : 'success'}>{c.rightToWork}</Badge> }
          ]} />
        </DashboardCard>

        {rtwWarning && (
          <Notice icon="TriangleAlert" tone="warn">
            Right to work is not confirmed. A documented check must be completed before the first day of work — it is a
            statutory duty and the only defence against a civil penalty.
          </Notice>
        )}

        {c.offer && (
          <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,229,212,.05)', borderColor: 'rgba(0,229,212,.24)' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Offer sent {window.shortDate(c.offer.sentAt)}</span>
            <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>
              {window.money0(c.offer.salary)} per year, starting {window.shortDate(c.offer.startDate)}.
            </span>
          </Card>
        )}

        {c.stage === 'Hired' && c.hiredEmployeeId && (
          <Notice icon="UserCheck">
            Hired. An employee record was created on Probation — find them under Employees.
          </Notice>
        )}
        {c.stage === 'Rejected' && (
          <Notice icon="CircleX" tone="warn">Rejected{c.rejectedReason ? ': ' + c.rejectedReason : '.'}</Notice>
        )}

        {c.interviews && c.interviews.length > 0 && (
          <DashboardCard title={'Interviews (' + c.interviews.length + ')'} padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {c.interviews.map(iv => (
                <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <Icon name="CalendarClock" size={16} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{iv.type}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{window.shortDate(iv.date)} · {iv.interviewer}</span>
                  </span>
                  <Badge tone={new Date(iv.date) < Date.now() ? 'dark' : 'warning'}>
                    {new Date(iv.date) < Date.now() ? 'Held' : 'Upcoming'}
                  </Badge>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        <DashboardCard title={'Notes (' + ((c.notes || []).length) + ')'} padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {(c.notes || []).length ? (c.notes || []).map(n => (
              <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 11, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>{n.text}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{n.by} · {window.shortDate(n.at)}</span>
              </div>
            )) : <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>No notes recorded.</span>}
            {canWrite && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 200 }}>
                  <TextField label="Add a note" value={note} onChange={setNote} placeholder="Interview feedback, availability, anything relevant" />
                </span>
                <Button size="sm" disabled={!note.trim()} onClick={() => { REC.addNote(c.id, note, S.session.name); setNote(''); refresh(); }}>Add Note</Button>
              </div>
            )}
          </div>
        </DashboardCard>

        {canWrite && !terminal && (
          <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Actions</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" tone="dark" onClick={() => setPanel(panel === 'interview' ? null : 'interview')} iconLeft={<Icon name="CalendarClock" size={15} />}>Book Interview</Button>
              {c.stage !== 'Offer' && <Button size="sm" variant="secondary" tone="dark" onClick={() => { setPanel(panel === 'offer' ? null : 'offer'); setOForm({ salary: String(c.vacancy ? c.vacancy.salary : ''), startDate: '' }); }} iconLeft={<Icon name="FileSignature" size={15} />}>Make Offer</Button>}
              {c.stage === 'Offer' && <Button size="sm" onClick={() => setPanel(panel === 'hire' ? null : 'hire')} iconLeft={<Icon name="UserCheck" size={15} />}>Hire</Button>}
              <Button size="sm" variant="ghost" tone="dark" onClick={() => setPanel(panel === 'reject' ? null : 'reject')}>Reject</Button>
            </div>

            {panel === 'interview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                <FormGrid cols={2}>
                  <TextField label="Date" required type="date" value={iForm.date} onChange={v => setIForm(f => Object.assign({}, f, { date: v }))} />
                  <SelectField label="Type" value={iForm.type} onChange={v => setIForm(f => Object.assign({}, f, { type: v }))}
                    options={['Telephone screen', 'Competency interview', 'Technical interview', 'Second interview', 'Trial shift']} />
                  <TextField label="Interviewer" span={2} value={iForm.interviewer} onChange={v => setIForm(f => Object.assign({}, f, { interviewer: v }))} placeholder={S.session.name} />
                </FormGrid>
                <Notice icon="Info">Ask every candidate the same core questions and keep your notes — it is what defends a hiring decision later.</Notice>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button size="sm" variant="ghost" tone="dark" onClick={() => setPanel(null)}>Cancel</Button>
                  <Button size="sm" disabled={!iForm.date} onClick={saveInterview}>Book Interview</Button>
                </div>
              </div>
            )}

            {panel === 'offer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                <FormGrid cols={2}>
                  <TextField label="Salary (£ per year)" value={oForm.salary} onChange={v => setOForm(f => Object.assign({}, f, { salary: v }))} mono
                    hint={c.vacancy ? 'Advertised at ' + window.money0(c.vacancy.salary) : ''} />
                  <TextField label="Proposed start date" required type="date" value={oForm.startDate} onChange={v => setOForm(f => Object.assign({}, f, { startDate: v }))} />
                </FormGrid>
                {Number(oForm.salary) > 0 && c.vacancy && Number(oForm.salary) !== Number(c.vacancy.salary) && (
                  <Notice icon="TriangleAlert" tone="warn">
                    This differs from the advertised salary. Be able to justify the difference on grounds other than who negotiated hardest.
                  </Notice>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button size="sm" variant="ghost" tone="dark" onClick={() => setPanel(null)}>Cancel</Button>
                  <Button size="sm" disabled={!oForm.startDate} onClick={makeOffer}>Send Offer</Button>
                </div>
              </div>
            )}

            {panel === 'hire' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                  This creates an employee record for {c.name} as {c.vacancyTitle} in {c.department || 'the department'},
                  starting {c.offer ? window.shortDate(c.offer.startDate) : 'today'} on {window.money0(c.offer ? c.offer.salary : (c.vacancy ? c.vacancy.salary : 0))},
                  with status Probation. The vacancy loses one opening.
                </span>
                {rtwWarning && (
                  <Notice icon="TriangleAlert" tone="warn">
                    Right to work is still unconfirmed. The record will be created with a Pending check — complete it before their first day.
                  </Notice>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button size="sm" variant="ghost" tone="dark" onClick={() => setPanel(null)}>Cancel</Button>
                  <Button size="sm" onClick={doHire} iconLeft={<Icon name="UserCheck" size={15} />}>Create Employee Record</Button>
                </div>
              </div>
            )}

            {panel === 'reject' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                <TextareaField label="Reason" rows={2} value={reason} onChange={setReason}
                  placeholder="Did not meet the essential criteria for the role." />
                <Notice icon="Info">
                  Record a job-related reason. Candidates can request feedback, and a documented reason is what makes a
                  decision defensible.
                </Notice>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button size="sm" variant="ghost" tone="dark" onClick={() => setPanel(null)}>Cancel</Button>
                  <Button size="sm" variant="secondary" tone="dark" onClick={() => { REC.reject(c.id, reason); setPanel(null); refresh(); }}>Reject Candidate</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Interviews ---------------- */
function InterviewSchedule({ data, onOpen }) {
  const { candidates, S } = data;
  const [show, setShow] = React.useState('Upcoming');

  const all = [];
  candidates.forEach(c => (c.interviews || []).forEach(iv => all.push(Object.assign({}, iv, {
    candidateId: c.id, candidateName: c.name, candidate: c,
    vacancyTitle: c.vacancyTitle, stage: c.stage
  }))));
  all.sort((a, b) => a.date < b.date ? -1 : 1);

  const upcoming = all.filter(iv => new Date(iv.date) >= new Date(new Date().toDateString()));
  const past = all.filter(iv => new Date(iv.date) < new Date(new Date().toDateString())).reverse();
  const list = show === 'Upcoming' ? upcoming : past;

  const thisWeek = upcoming.filter(iv => (new Date(iv.date) - Date.now()) <= 7 * window.REC_DAY);

  /* Grouped by date so it reads like a diary. */
  const buckets = {};
  list.forEach(iv => { (buckets[iv.date] = buckets[iv.date] || []).push(iv); });
  const dates = Object.keys(buckets);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Upcoming" value={String(upcoming.length)} caption="Booked interviews" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="This week" value={String(thisWeek.length)} caption="Next 7 days" icon={<Icon name="CalendarDays" size={18} />} />
        <StatTile label="Held" value={String(past.length)} caption="Already taken place" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Candidates" value={String(new Set(all.map(iv => iv.candidateId)).size)} caption="With an interview on record" icon={<Icon name="Users" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Upcoming', upcoming.length], ['Held', past.length]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k}<Badge tone="dark">{n}</Badge></button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Book interviews from a candidate's record.</span>
      </Card>

      {dates.length ? dates.map(d => (
        <DashboardCard key={d}
          title={new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          padding={16} action={<Badge tone="dark">{buckets[d].length}</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {buckets[d].map(iv => (
              <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', padding: 13, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                <window.CandidateAvatar candidate={iv.candidate} size={34} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 165 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{iv.candidateName}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{iv.vacancyTitle} · {iv.type}</span>
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{iv.interviewer}</span>
                <Badge tone={window.STAGE_TONE[iv.stage] || 'dark'}>{iv.stage}</Badge>
                <Button size="xs" variant="secondary" tone="dark" onClick={() => onOpen(iv.candidateId)}>Open</Button>
              </div>
            ))}
          </div>
        </DashboardCard>
      )) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CalendarClock" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Upcoming' ? 'No interviews booked' : 'No interviews held yet'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            Open a candidate from the pipeline and use Book Interview.
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Reports ---------------- */
function RecruitmentReports({ data }) {
  const { candidates, vacancies, REC, S } = data;

  /* Funnel: how many candidates reached each stage or beyond. Someone at Offer
     has passed through every earlier stage, so counts are cumulative. */
  const order = REC.STAGES.concat(['Hired']);
  const reached = order.map((stage, i) => {
    const n = candidates.filter(c => {
      if (c.stage === 'Hired') return true;
      if (c.stage === 'Rejected' || c.stage === 'Withdrawn') {
        /* Rejected candidates still reached the stage they were rejected from,
           but we only know their final stage — count them at Applied only. */
        return i === 0;
      }
      return REC.STAGES.indexOf(c.stage) >= i;
    }).length;
    return { stage, n };
  });
  const applied = reached[0].n || 1;

  const sourceMap = {};
  candidates.forEach(c => { sourceMap[c.source] = (sourceMap[c.source] || 0) + 1; });
  const sourceBars = Object.keys(sourceMap).map(k => ({ label: k.split(' ')[0].slice(0, 7), value: sourceMap[k] })).sort((a, b) => b.value - a.value);

  const hired = candidates.filter(c => c.stage === 'Hired');
  const rejected = candidates.filter(c => c.stage === 'Rejected');
  const ttH = REC.timeToHire();

  const vacRows = vacancies.map(v => {
    const apps = candidates.filter(c => c.vacancyId === v.id);
    const h = apps.filter(c => c.stage === 'Hired').length;
    return {
      id: v.id, title: v.title, reference: v.reference, status: v.status,
      apps: apps.length, active: apps.filter(c => REC.STAGES.indexOf(c.stage) > -1).length,
      hired: h,
      rate: apps.length ? Math.round(h / apps.length * 100) : 0
    };
  }).sort((a, b) => b.apps - a.apps);

  /* Source quality: which sources produce candidates rated 4 or more. */
  const quality = Object.keys(sourceMap).map(k => {
    const from = candidates.filter(c => c.source === k);
    const strong = from.filter(c => c.rating >= 4).length;
    const hiredFrom = from.filter(c => c.stage === 'Hired').length;
    return {
      id: k, source: k, total: from.length, strong, hired: hiredFrom,
      pct: from.length ? Math.round(strong / from.length * 100) : 0
    };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Applications" value={String(candidates.length)} caption="All time" icon={<Icon name="Files" size={18} />} />
        <StatTile label="Hired" value={String(hired.length)} caption={candidates.length ? Math.round(hired.length / candidates.length * 100) + '% of applicants' : '—'} icon={<Icon name="UserCheck" size={18} />} />
        <StatTile label="Time to hire" value={ttH == null ? '—' : ttH + ' days'} caption="Application to offer accepted" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Rejected" value={String(rejected.length)} caption="Decision recorded" icon={<Icon name="CircleX" size={18} />} />
      </div>

      <DashboardCard title="Hiring funnel" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-recruitment-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Candidate', key: 'name' }, { label: 'Vacancy', key: 'vac' }, { label: 'Stage', key: 'stage' },
            { label: 'Source', key: 'source' }, { label: 'Rating', key: 'rating' }, { label: 'Right to work', key: 'rtw' },
            { label: 'Applied', key: 'applied' }, { label: 'Days in stage', key: 'inStage' }],
            candidates.map(c => ({
              name: c.name, vac: c.vacancyTitle, stage: c.stage, source: c.source,
              rating: c.rating || '', rtw: c.rightToWork, applied: c.appliedAt, inStage: c.inStage
            })))}>Export</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {reached.map(r => {
            const pct = Math.round(r.n / applied * 100);
            return (
              <div key={r.stage} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: r.n ? '#fff' : 'var(--text-muted-dark)' }}>{r.stage}</span>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{r.n} · {pct}%</span>
                </div>
                <span style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', display: 'block' }}>
                  <span style={{ display: 'block', height: '100%', width: pct + '%', borderRadius: 999, background: 'var(--nhr-turquoise)' }} />
                </span>
              </div>
            );
          })}
        </div>
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Counts are cumulative — a candidate at Offer has passed every earlier stage. Rejected candidates are counted at
          Applied only, because their record keeps the final stage rather than the full path.
        </span>
      </DashboardCard>

      <div className="rec-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DashboardCard title="Applications by source" action={<Badge tone="dark">{candidates.length}</Badge>}>
          {sourceBars.length ? <BarChart height={175} data={sourceBars} />
            : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No applications recorded.</span>}
        </DashboardCard>
        <DashboardCard title="Source quality" padding={16} action={<Badge tone="dark">Rated 4+</Badge>}>
          <DataTable compact columns={[
            { key: 'source', label: 'Source' },
            { key: 'total', label: 'Applied', mono: true, align: 'right' },
            { key: 'strong', label: 'Strong', mono: true, align: 'right' },
            { key: 'pctLabel', label: 'Quality', mono: true, align: 'right' }
          ]} rows={quality.map(q => Object.assign({}, q, { pctLabel: q.pct + '%' }))} />
        </DashboardCard>
      </div>

      <DashboardCard title="By vacancy" padding={16} action={<Badge tone="dark">Most applications first</Badge>}>
        <DataTable compact columns={[
          { key: 'title', label: 'Vacancy' }, { key: 'reference', label: 'Reference', mono: true },
          { key: 'statusBadge', label: 'Status' },
          { key: 'apps', label: 'Applied', mono: true, align: 'right' },
          { key: 'active', label: 'Active', mono: true, align: 'right' },
          { key: 'hired', label: 'Hired', mono: true, align: 'right' }
        ]} rows={vacRows.map(v => Object.assign({}, v, {
          statusBadge: <Badge tone={window.VAC_TONE[v.status] || 'dark'}>{v.status}</Badge>
        }))} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Candidate data is personal data with a short legitimate retention period — usually six to twelve months after a
          decision, and only where you can justify keeping it. This prototype stores nothing server-side and holds no CVs.
          Before going live you need a privacy notice for applicants, a retention schedule, and a documented right-to-work
          check for every hire.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function RecruitmentScreen() {
  const data = window.useRecruitmentData();
  const [view, setView] = React.useState('Pipeline');
  const [openId, setOpenId] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const canWrite = data.S.can('employees.write');

  const active = data.candidates.filter(c => data.REC.STAGES.indexOf(c.stage) > -1).length;
  const interviews = data.candidates.reduce((n, c) => n + (c.interviews || []).filter(iv => new Date(iv.date) >= new Date(new Date().toDateString())).length, 0);

  const body = {
    'Pipeline': <window.RecruitmentPipeline data={data} onOpen={setOpenId} />,
    'Vacancies': <window.Vacancies data={data} onOpen={setOpenId} />,
    'Interviews': <InterviewSchedule data={data} onOpen={setOpenId} />,
    'Reports': <RecruitmentReports data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Recruitment</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Vacancies, the candidate pipeline and interviews. Hiring a candidate creates their employee record with the role, department and start date already filled in.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Interviews')} iconLeft={<Icon name="CalendarClock" size={15} />}>
              Interviews{interviews > 0 ? ' (' + interviews + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>New Vacancy</Button>
          </div>
        )}
      </div>

      <window.RecruitmentSubnav view={view} onSelect={setView} counts={{ active, interviews }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {openId && <CandidateDrawer data={data} candidateId={openId} onClose={() => setOpenId(null)} />}
      {adding && <window.NewVacancyDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

Object.assign(window, { RecruitmentScreen, CandidateDrawer, InterviewSchedule, RecruitmentReports });
