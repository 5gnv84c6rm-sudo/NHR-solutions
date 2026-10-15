/* Recruitment module — shared hook, vacancies and the pipeline board. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const REC_DAY = 864e5;
const VAC_TONE = { Open: 'success', Draft: 'dark', Closed: 'dark', Filled: 'success', 'On hold': 'warning' };
const STAGE_TONE = {
  Applied: 'dark', Screening: 'dark', Interview: 'warning',
  'Second interview': 'warning', Offer: 'success', Hired: 'success', Rejected: 'danger', Withdrawn: 'dark'
};

function RecruitmentSubnav({ view, onSelect, counts }) {
  const items = [['Pipeline', 'Workflow'], ['Vacancies', 'Briefcase'], ['Interviews', 'CalendarClock'], ['Reports', 'ChartColumn']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Interviews' ? counts.interviews : label === 'Pipeline' ? counts.active : 0;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)} aria-current={active ? 'page' : undefined}
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
            {n > 0 && <Badge tone="dark">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useRecruitmentData() {
  const S = window.EmployeeStore, REC = window.RecruitmentStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => REC.subscribe(force), []);
  React.useEffect(() => S.subscribe(force), []);

  const vacancies = REC.vacancies();
  const byId = {};
  vacancies.forEach(v => { byId[v.id] = v; });
  const candidates = REC.candidates().map(c => {
    const v = byId[c.vacancyId];
    const age = Math.floor((Date.now() - new Date(c.appliedAt)) / REC_DAY);
    const inStage = Math.floor((Date.now() - new Date(c.movedAt || c.appliedAt)) / REC_DAY);
    return Object.assign({}, c, {
      name: c.firstName + ' ' + c.lastName,
      vacancy: v || null,
      vacancyTitle: v ? v.title : 'Unassigned',
      department: v ? v.department : '',
      age, inStage,
      /* A candidate sitting in one stage for over a fortnight is the most
         common failure in a hiring process, so it is surfaced. */
      stalled: REC.STAGES.indexOf(c.stage) > -1 && inStage > 14
    });
  });
  return { vacancies, candidates, refresh: force, S, REC };
}

/* Initials badge for a candidate — they have no employee record yet, so the
   shared Avatar cannot be used. */
function CandidateAvatar({ candidate, size = 36 }) {
  const initials = ((candidate.firstName || '')[0] || '') + ((candidate.lastName || '')[0] || '');
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, flex: '0 0 auto', borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.26)',
      color: 'var(--nhr-turquoise)', fontFamily: 'var(--font-core)',
      fontSize: size * 0.36, fontWeight: 800, letterSpacing: '.02em'
    }}>{initials.toUpperCase()}</span>
  );
}

/* Five-dot rating — read-only display, clickable when onRate is given. */
function Rating({ value, onRate }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }} role={onRate ? 'group' : undefined} aria-label={'Rating ' + (value || 0) + ' of 5'}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!onRate} onClick={onRate ? () => onRate(n) : undefined}
          aria-label={'Rate ' + n}
          style={{
            width: 11, height: 11, padding: 0, borderRadius: '50%', cursor: onRate ? 'pointer' : 'default',
            border: '1px solid ' + (n <= (value || 0) ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
            background: n <= (value || 0) ? 'var(--nhr-turquoise)' : 'transparent'
          }} />
      ))}
    </span>
  );
}

/* ---------------- Pipeline board ---------------- */
function RecruitmentPipeline({ data, onOpen }) {
  const { candidates, vacancies, REC, S, refresh } = data;
  const canWrite = S.can('employees.write');
  const [vacFilter, setVacFilter] = React.useState('All');
  const [q, setQ] = React.useState('');

  const active = candidates.filter(c => REC.STAGES.indexOf(c.stage) > -1);
  const scoped = active
    .filter(c => vacFilter === 'All' || c.vacancyId === vacFilter)
    .filter(c => !c.stalled || true)
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));

  const stalled = scoped.filter(c => c.stalled);
  const offers = candidates.filter(c => c.stage === 'Offer');
  const hired = candidates.filter(c => c.stage === 'Hired');

  function move(c, dir) {
    const i = REC.STAGES.indexOf(c.stage);
    const next = REC.STAGES[i + dir];
    if (!next) return;
    REC.moveCandidate(c.id, next);
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Active candidates" value={String(active.length)} caption="In the pipeline" icon={<Icon name="Users" size={18} />} />
        <StatTile label="At offer" value={String(offers.length)} caption="Awaiting acceptance" icon={<Icon name="FileSignature" size={18} />} />
        <StatTile label="Stalled" value={String(stalled.length)} caption="Over 14 days in stage" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Hired" value={String(hired.length)} caption={REC.timeToHire() != null ? REC.timeToHire() + ' days average' : 'None yet'} icon={<Icon name="UserCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search candidates…" aria-label="Search candidates"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={vacFilter} onChange={e => setVacFilter(e.target.value)} aria-label="Vacancy" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)', maxWidth: 230
        }}>
          <option value="All">All vacancies</option>
          {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Hiring a candidate creates their employee record.</span>
      </Card>

      {stalled.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,180,65,.28)' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-warning)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {stalled.length} {stalled.length === 1 ? 'candidate has' : 'candidates have'} been in the same stage for over a fortnight. Candidates go elsewhere while they wait.
          </span>
        </Card>
      )}

      <Card tone="dark" padding={0} style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 900 }}>
          {REC.STAGES.map((stage, si) => {
            const inStage = scoped.filter(c => c.stage === stage);
            return (
              <div key={stage} style={{
                flex: '1 1 0', minWidth: 176, display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                borderLeft: si === 0 ? 'none' : '1px solid var(--border-dark)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color: 'var(--text-muted-dark)' }}>{stage}</span>
                  <Badge tone={inStage.length ? 'dark' : 'dark'}>{inStage.length}</Badge>
                </div>
                {inStage.length ? inStage.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', flexDirection: 'column', gap: 9, padding: 11,
                    border: '1px solid ' + (c.stalled ? 'rgba(242,180,65,.3)' : 'var(--border-dark)'),
                    borderRadius: 'var(--radius-md)',
                    background: c.stalled ? 'rgba(242,180,65,.04)' : 'rgba(255,255,255,.025)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <CandidateAvatar candidate={c} size={30} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                        <button type="button" onClick={() => onOpen(c.id)} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: 700, color: '#fff',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{c.name}</button>
                        <span style={{ fontSize: 10, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.vacancyTitle}
                        </span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Rating value={c.rating} />
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: c.stalled ? 'var(--nhr-warning)' : 'var(--text-muted-dark)' }}>
                        {c.inStage}d
                      </span>
                    </div>
                    {canWrite && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        {si > 0 && (
                          <button type="button" title="Move back" onClick={() => move(c, -1)} style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 0', borderRadius: 5, cursor: 'pointer',
                            border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-muted-dark)'
                          }}><Icon name="ChevronLeft" size={11} /></button>
                        )}
                        {si < REC.STAGES.length - 1 && (
                          <button type="button" title="Move forward" onClick={() => move(c, 1)} style={{
                            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 0', borderRadius: 5, cursor: 'pointer',
                            border: '1px solid rgba(0,229,212,.3)', background: 'rgba(0,229,212,.08)', color: 'var(--nhr-turquoise)'
                          }}><Icon name="ChevronRight" size={11} /></button>
                        )}
                        <button type="button" title="Open candidate" onClick={() => onOpen(c.id)} style={{
                          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 0', borderRadius: 5, cursor: 'pointer',
                          border: '1px solid var(--border-dark)', background: 'transparent', color: 'rgba(245,255,255,.7)'
                        }}><Icon name="Maximize2" size={10} /></button>
                      </div>
                    )}
                  </div>
                )) : (
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)', padding: '8px 0' }}>Empty</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
        Use the arrows to move a candidate between stages, or open them to rate, add notes, book an interview, make an offer or hire.
      </span>
    </div>
  );
}

/* ---------------- Vacancies ---------------- */
function Vacancies({ data, onOpen }) {
  const { vacancies, candidates, S, REC, refresh } = data;
  const canWrite = S.can('employees.write');
  const [adding, setAdding] = React.useState(false);
  const [status, setStatus] = React.useState('All');

  const list = vacancies.filter(v => status === 'All' || v.status === status);
  const open = vacancies.filter(v => v.status === 'Open');
  const openings = open.reduce((n, v) => n + (Number(v.openings) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open vacancies" value={String(open.length)} caption={openings + ' ' + (openings === 1 ? 'opening' : 'openings')} icon={<Icon name="Briefcase" size={18} />} />
        <StatTile label="Applications" value={String(candidates.length)} caption="All candidates" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Drafts" value={String(vacancies.filter(v => v.status === 'Draft').length)} caption="Not yet posted" icon={<Icon name="FileEdit" size={18} />} />
        <StatTile label="Filled" value={String(vacancies.filter(v => v.status === 'Filled').length)} caption="All openings taken" icon={<Icon name="CircleCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {['All', 'Open', 'Draft', 'On hold', 'Filled', 'Closed'].map(o => <option key={o} value={o}>{o === 'All' ? 'All statuses' : o}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-vacancies-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Reference', key: 'ref' }, { label: 'Title', key: 'title' }, { label: 'Department', key: 'dept' },
            { label: 'Location', key: 'loc' }, { label: 'Type', key: 'type' }, { label: 'Salary', key: 'salary' },
            { label: 'Openings', key: 'openings' }, { label: 'Status', key: 'status' },
            { label: 'Applications', key: 'apps' }, { label: 'Closing', key: 'closing' }],
            vacancies.map(v => ({
              ref: v.reference, title: v.title, dept: v.department, loc: v.location,
              type: v.employmentType, salary: v.salary, openings: v.openings, status: v.status,
              apps: candidates.filter(c => c.vacancyId === v.id).length, closing: v.closingAt || ''
            })))}>Export</Button>
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>New Vacancy</Button>}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(v => {
          const apps = candidates.filter(c => c.vacancyId === v.id);
          const activeApps = apps.filter(c => REC.STAGES.indexOf(c.stage) > -1);
          const closing = v.closingAt ? Math.floor((new Date(v.closingAt) - Date.now()) / REC_DAY) : null;
          return (
            <Card key={v.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{
                  width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name="Briefcase" size={18} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 185 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{v.title}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    {v.reference} · {v.department} · {v.location} · {v.employmentType}
                  </span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 86 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{window.money0(v.salary)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>per year</span>
                </span>
                {[['Openings', v.openings], ['Applied', apps.length], ['Active', activeApps.length]].map(([label, n]) => (
                  <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{n}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                  </span>
                ))}
                {closing != null && v.status === 'Open' && (
                  <Badge tone={closing < 0 ? 'danger' : closing <= 7 ? 'warning' : 'dark'}>
                    {closing < 0 ? 'Closed ' + Math.abs(closing) + 'd ago' : closing + 'd left'}
                  </Badge>
                )}
                <Badge tone={VAC_TONE[v.status] || 'dark'}>{v.status}</Badge>
                {canWrite && (
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {v.status === 'Draft' && <Button size="xs" onClick={() => { REC.updateVacancy(v.id, { status: 'Open', postedAt: new Date().toISOString().slice(0, 10) }); refresh(); }}>Post</Button>}
                    {v.status === 'Open' && <Button size="xs" variant="secondary" tone="dark" onClick={() => { REC.updateVacancy(v.id, { status: 'On hold' }); refresh(); }}>Hold</Button>}
                    {(v.status === 'On hold' || v.status === 'Closed') && <Button size="xs" variant="secondary" tone="dark" onClick={() => { REC.updateVacancy(v.id, { status: 'Open' }); refresh(); }}>Reopen</Button>}
                    <IconButton tone="dark" size={30} label="Delete vacancy"
                      onClick={() => { REC.removeVacancy(v.id); refresh(); }}><Icon name="Trash2" size={14} /></IconButton>
                  </span>
                )}
              </div>
              {apps.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                  {apps.slice(0, 8).map(c => (
                    <button key={c.id} type="button" onClick={() => onOpen(c.id)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px',
                      borderRadius: 999, cursor: 'pointer', border: '1px solid var(--border-dark)',
                      background: 'rgba(255,255,255,.03)', color: 'var(--text-body-dark)',
                      fontFamily: 'var(--font-core)', fontSize: 12
                    }}>
                      <CandidateAvatar candidate={c} size={18} />
                      {c.name}
                      <Badge tone={STAGE_TONE[c.stage] || 'dark'}>{c.stage}</Badge>
                    </button>
                  ))}
                  {apps.length > 8 && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)', alignSelf: 'center' }}>+{apps.length - 8} more</span>}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {adding && <NewVacancyDialog data={data} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------------- New vacancy ---------------- */
function NewVacancyDialog({ data, onClose }) {
  const { S, REC, refresh } = data;
  const [form, setForm] = React.useState({
    title: '', department: S.DEPARTMENTS[0], location: '', employmentType: 'Full-time',
    salary: '', openings: '1', hiringManager: S.session.name,
    closingAt: '', status: 'Draft', description: ''
  });
  const [error, setError] = React.useState('');

  function submit(post) {
    if (!form.title.trim()) return setError('Give the vacancy a job title.');
    if (!form.salary) return setError('Enter a salary — advertising a role without one puts candidates off.');
    REC.addVacancy(Object.assign({}, form, {
      salary: Number(form.salary) || 0,
      openings: Math.max(1, Number(form.openings) || 1),
      status: post ? 'Open' : 'Draft'
    }));
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="New Vacancy"
      subtitle="Save as a draft, or post it straight away to start taking applications." width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <TextField label="Job title" required span={2} value={form.title} onChange={v => setForm(p => Object.assign({}, p, { title: v }))}
            placeholder="Warehouse Operative" />
          <SelectField label="Department" value={form.department} onChange={v => setForm(p => Object.assign({}, p, { department: v }))} options={S.DEPARTMENTS} />
          <TextField label="Location" value={form.location} onChange={v => setForm(p => Object.assign({}, p, { location: v }))} placeholder="Manchester" />
          <SelectField label="Employment type" value={form.employmentType} onChange={v => setForm(p => Object.assign({}, p, { employmentType: v }))} options={S.EMPLOYMENT_TYPES} />
          <TextField label="Salary (£ per year)" required value={form.salary} onChange={v => setForm(p => Object.assign({}, p, { salary: v }))} mono />
          <TextField label="Openings" value={form.openings} onChange={v => setForm(p => Object.assign({}, p, { openings: v }))} mono
            hint="The vacancy closes itself when they are all filled." />
          <TextField label="Closing date" type="date" value={form.closingAt} onChange={v => setForm(p => Object.assign({}, p, { closingAt: v }))} />
          <TextField label="Hiring manager" span={2} value={form.hiringManager} onChange={v => setForm(p => Object.assign({}, p, { hiringManager: v }))} />
          <TextareaField label="Role description" span={2} rows={3} value={form.description} onChange={v => setForm(p => Object.assign({}, p, { description: v }))}
            placeholder="What the job involves and the essential criteria." />
        </FormGrid>
        <Notice icon="ShieldCheck">
          Keep the essential criteria job-related and measurable. Requirements that are not genuinely needed for the role can
          indirectly exclude protected groups, and salary transparency is increasingly expected.
        </Notice>
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" tone="dark" onClick={() => submit(false)}>Save as Draft</Button>
          <Button onClick={() => submit(true)} iconLeft={<Icon name="Send" size={15} />}>Post Vacancy</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, {
  REC_DAY, VAC_TONE, STAGE_TONE, RecruitmentSubnav, useRecruitmentData,
  CandidateAvatar, Rating, RecruitmentPipeline, Vacancies, NewVacancyDialog
});
