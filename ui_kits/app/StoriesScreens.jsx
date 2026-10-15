/* Customer Stories — reference programme: pipeline, story editor with real
   platform metrics, consent gate, published view. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const STORY_DAY = 864e5;
const STAGE_TONE = {
  'Idea': 'dark', 'Contacted': 'dark', 'Consent pending': 'warning',
  'Drafting': 'warning', 'Approved': 'success', 'Published': 'success'
};

function StoriesSubnav({ view, onSelect, counts }) {
  const items = [['Pipeline', 'GitBranch'], ['Published', 'Newspaper'], ['Consent', 'FileSignature']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Consent' ? counts.consentGaps : label === 'Published' ? counts.published : 0;
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
            {n > 0 && <Badge tone={label === 'Consent' ? 'warning' : 'success'}>{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useStories() {
  const ST = window.StoryStore, S = window.EmployeeStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => ST.subscribe(force), []);
  const stories = ST.list();
  return {
    ST, S, refresh: force, stories,
    real: stories.filter(s => !s.placeholder),
    placeholders: stories.filter(s => s.placeholder),
    published: stories.filter(s => s.stage === 'Published'),
    canWrite: S.can('employees.write')
  };
}

/* Metrics you can pull straight from the workspace rather than typing. Each
   returns a label and a value read live, so a story can cite a figure that is
   traceable back to the platform. */
function platformMetrics() {
  const S = window.EmployeeStore, R = window.EmployeeRecords;
  if (!S || !R) return [];
  const employees = S.list({});
  const out = [];

  out.push({ key: 'headcount', label: 'Employees managed', value: String(employees.length), source: 'Employees' });

  const MAND = window.MANDATORY || {};
  let met = 0, req = 0;
  employees.forEach(e => {
    const training = R.get(e).training || [];
    Object.keys(MAND).forEach(course => {
      if (!window.isMandatoryFor || !window.isMandatoryFor(course, e.department)) return;
      req++;
      const rec = training.find(t => t.course === course);
      if (!rec) return;
      const live = window.courseStatus ? window.courseStatus(rec) : rec.status;
      if (live === 'Complete' || live === 'Expiring soon') met++;
    });
  });
  if (req) out.push({ key: 'training', label: 'Mandatory training compliance', value: Math.round(met / req * 100) + '%', source: 'Training' });

  const HS = window.SafetyStore;
  if (HS) {
    const inc = HS.incidents();
    const near = inc.filter(i => i.type === 'Near miss').length;
    out.push({ key: 'nearmiss', label: 'Near misses reported', value: String(near), source: 'Health & Safety' });
    const actions = inc.reduce((n, i) => n + (i.actions || []).filter(a => a.status === 'Complete').length, 0);
    out.push({ key: 'actions', label: 'Corrective actions closed', value: String(actions), source: 'Health & Safety' });
  }

  let leave = 0;
  employees.forEach(e => { const b = R.leaveBalance ? R.leaveBalance(e) : null; if (b) leave += b.taken || 0; });
  out.push({ key: 'leave', label: 'Leave days booked in the platform', value: String(leave), source: 'Leave' });

  const REC = window.RecruitmentStore;
  if (REC) {
    const tth = REC.timeToHire();
    if (tth != null) out.push({ key: 'tth', label: 'Average time to hire', value: tth + ' days', source: 'Recruitment' });
  }

  let docs = 0;
  employees.forEach(e => { docs += (e.documents || []).length; });
  out.push({ key: 'docs', label: 'Documents held with expiry tracking', value: String(docs), source: 'Documents' });

  return out;
}

/* ---------------- Pipeline ---------------- */
function StoryPipeline({ d }) {
  const { ST, stories, real, placeholders, canWrite, refresh } = d;
  const [open, setOpen] = React.useState(null);
  const [adding, setAdding] = React.useState(false);

  const byStage = {};
  ST.STAGES.forEach(s => { byStage[s] = stories.filter(x => x.stage === s).length; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Real stories" value={String(real.length)} caption="Actual customers" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Placeholder outlines" value={String(placeholders.length)} caption="Shape only, no customer" icon={<Icon name="FileQuestion" size={18} />} />
        <StatTile label="Awaiting consent" value={String(stories.filter(s => s.stage === 'Consent pending').length)} caption="Cannot publish until recorded" icon={<Icon name="FileSignature" size={18} />} />
        <StatTile label="Published" value={String(byStage['Published'] || 0)} caption="Live externally" icon={<Icon name="Newspaper" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="ShieldCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          NHR Solution has no published customer references yet, so nothing here invents one. The four outlines below
          show the <strong style={{ color: '#fff' }}>shape</strong> of a story worth collecting — challenge, what
          changed, measured result — and carry no company name that could be mistaken for a real customer.
        </span>
        {canWrite && <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Icon name="Plus" size={16} />}>New Story</Button>}
      </Card>

      <DashboardCard title="Stage" padding={16} action={<Badge tone="dark">{stories.length} total</Badge>}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ST.STAGES.map(s => (
            <span key={s} style={{
              display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', minWidth: 96,
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,.02)'
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: byStage[s] ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }}>
                {byStage[s] || 0}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{s}</span>
            </span>
          ))}
        </div>
      </DashboardCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stories.map(s => {
          const r = ST.readiness(s);
          return (
            <Card key={s.id} tone="dark" padding={16} style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              borderColor: s.stage === 'Published' ? 'rgba(0,229,212,.26)' : undefined,
              opacity: s.placeholder ? 0.92 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <span style={{
                  width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: s.placeholder ? 'rgba(255,255,255,.04)' : 'rgba(0,229,212,.08)',
                  border: '1px solid ' + (s.placeholder ? 'var(--border-dark)' : 'rgba(0,229,212,.22)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.placeholder ? 'var(--text-muted-dark)' : 'var(--nhr-turquoise)'
                }}><Icon name={s.placeholder ? 'FileQuestion' : 'Building2'} size={18} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 210 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                    {s.company || (s.sector + ' · outline')}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{s.sector} · {s.size}</span>
                </span>
                {s.placeholder && <Badge tone="dark">Placeholder</Badge>}
                <Badge tone={STAGE_TONE[s.stage] || 'dark'}>{s.stage}</Badge>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(s.id)}>
                    {s.placeholder ? 'View outline' : 'Open'}
                  </Button>
                  {canWrite && !s.placeholder && (
                    <IconButton tone="dark" size={30} label="Delete story" onClick={() => { ST.remove(s.id); refresh(); }}>
                      <Icon name="Trash2" size={14} />
                    </IconButton>
                  )}
                </span>
              </div>

              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{s.challenge}</span>

              {!s.placeholder && !r.ready && (
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, lineHeight: 1.6, color: 'var(--nhr-warning)' }}>
                  <Icon name="TriangleAlert" size={13} style={{ flex: '0 0 auto', marginTop: 2 }} />
                  <span>
                    Not ready to publish — {r.missing.length ? 'missing ' + r.missing.join(', ').toLowerCase() : ''}
                    {r.missing.length && r.consentMissing.length ? '; ' : ''}
                    {r.consentMissing.length ? 'no consent for ' + r.consentMissing.join(', ') : ''}.
                  </span>
                </span>
              )}
            </Card>
          );
        })}
      </div>

      {open && <StoryEditor d={d} id={open} onClose={() => setOpen(null)} />}
      {adding && <NewStoryDialog d={d} onClose={() => setAdding(false)} onCreated={id => { setAdding(false); setOpen(id); }} />}
    </div>
  );
}

/* ---------------- New story ---------------- */
function NewStoryDialog({ d, onClose, onCreated }) {
  const { ST, refresh } = d;
  const [form, setForm] = React.useState({ company: '', sector: ST.SECTORS[0], size: ST.SIZES[1], challenge: '' });
  const [error, setError] = React.useState('');

  function create() {
    if (!form.company.trim()) return setError('Enter the customer name. A story without one cannot be checked.');
    const row = ST.add(Object.assign({}, form, { stage: 'Contacted' }));
    refresh();
    onCreated(row.id);
  }

  return (
    <Drawer open onClose={onClose} title="New Customer Story" subtitle="Starts a real reference, separate from the placeholder outlines." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <TextField label="Customer name" required span={2} value={form.company} onChange={v => setForm(p => Object.assign({}, p, { company: v }))}
            placeholder="The organisation as they want to be named" />
          <SelectField label="Sector" value={form.sector} onChange={v => setForm(p => Object.assign({}, p, { sector: v }))} options={ST.SECTORS} />
          <SelectField label="Size" value={form.size} onChange={v => setForm(p => Object.assign({}, p, { size: v }))} options={ST.SIZES} />
          <TextareaField label="What problem did they have?" span={2} rows={3} value={form.challenge}
            onChange={v => setForm(p => Object.assign({}, p, { challenge: v }))}
            placeholder="In their words where possible. The specific problem, not a category." />
        </FormGrid>
        <Notice icon="Info">
          Creating a story records an intention to ask, not permission. Consent for the name, the quote and any named
          individual is captured separately, and publishing is blocked until all three are recorded.
        </Notice>
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={create} iconLeft={<Icon name="Plus" size={16} />}>Create Story</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Story editor ---------------- */
function StoryEditor({ d, id, onClose }) {
  const { ST, S, canWrite, refresh } = d;
  const s = ST.get(id);
  const [tab, setTab] = React.useState('Story');
  const [draft, setDraft] = React.useState(null);
  const [error, setError] = React.useState('');
  if (!s) return null;

  const form = draft || s;
  const r = ST.readiness(form);
  const metrics = platformMetrics();

  function set(patch) { setDraft(Object.assign({}, form, patch)); }
  function save() { ST.update(id, draft || {}); setDraft(null); refresh(); }

  function addPlatformMetric(m) {
    ST.addMetric(id, { label: m.label, value: m.value, source: m.source, traced: true });
    setDraft(null); refresh();
  }

  if (s.placeholder) {
    return (
      <Drawer open onClose={onClose} title={s.sector + ' outline'} subtitle="A placeholder showing the shape of a story worth collecting." width={700}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Notice icon="TriangleAlert" tone="warn">
            This is not a customer. It carries no company name, no quote and no figures, and cannot be published.
            Use it as a brief for what to ask a real customer.
          </Notice>
          {[['The problem', s.challenge], ['What changed', s.approach],
          ['Figures to collect', s.metricPrompt], ['Features it demonstrates', s.featurePrompt]].map(([k, v]) => (
            <Card key={k} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, color: 'var(--nhr-turquoise)' }}>{k}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body-dark)' }}>{v}</span>
            </Card>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title={s.company || 'Untitled story'}
      subtitle={s.sector + ' · ' + s.size + ' · ' + s.stage} width={780}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Story', 'Results', 'Consent'].map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              padding: '9px 14px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (tab === t ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: tab === t ? 'rgba(0,229,212,.10)' : 'transparent',
              color: tab === t ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: tab === t ? 700 : 600
            }}>{t}</button>
          ))}
        </div>

        {tab === 'Story' && (
          <React.Fragment>
            <FormGrid cols={2}>
              <TextField label="Customer name" span={2} value={form.company} onChange={v => set({ company: v })} />
              <SelectField label="Sector" value={form.sector} onChange={v => set({ sector: v })} options={ST.SECTORS} />
              <SelectField label="Size" value={form.size} onChange={v => set({ size: v })} options={ST.SIZES} />
              <TextareaField label="The problem" span={2} rows={3} value={form.challenge} onChange={v => set({ challenge: v })}
                placeholder="What was going wrong, specifically." />
              <TextareaField label="What they changed" span={2} rows={3} value={form.approach} onChange={v => set({ approach: v })}
                placeholder="What they did differently. Name the modules, but describe the change in their terms." />
              <TextField label="Contact name" value={form.contactName} onChange={v => set({ contactName: v })} />
              <TextField label="Contact role" value={form.contactRole} onChange={v => set({ contactRole: v })} />
              <TextareaField label="Quote" span={2} rows={3} value={form.quote} onChange={v => set({ quote: v })}
                placeholder="Their words, unedited. A quote you wrote for them reads like one." />
              <SelectField label="Stage" span={2} value={form.stage} onChange={v => set({ stage: v })} options={ST.STAGES} />
            </FormGrid>
            {draft && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="ghost" tone="dark" onClick={() => setDraft(null)}>Discard changes</Button>
                <Button onClick={save} iconLeft={<Icon name="Check" size={15} />}>Save</Button>
              </div>
            )}
          </React.Fragment>
        )}

        {tab === 'Results' && (
          <React.Fragment>
            <Notice icon="ChartColumn">
              Pull a figure from this workspace rather than typing one. A number traceable to the platform survives
              scrutiny; one somebody remembered does not. In a live deployment these would come from the customer's own
              tenant, not yours.
            </Notice>

            <DashboardCard title="Available from the platform" padding={16} action={<Badge tone="dark">{metrics.length}</Badge>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {metrics.map(m => {
                  const already = (s.metrics || []).some(x => x.label === m.label);
                  return (
                    <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>from {m.source}</span>
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{m.value}</span>
                      {canWrite && (
                        <Button size="xs" variant={already ? 'ghost' : 'secondary'} tone="dark" disabled={already}
                          onClick={() => addPlatformMetric(m)}>{already ? 'Added' : 'Add'}</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </DashboardCard>

            <DashboardCard title={'Results in this story (' + (s.metrics || []).length + ')'} padding={16}>
              {(s.metrics || []).length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {s.metrics.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid rgba(0,229,212,.2)', borderRadius: 'var(--radius-md)' }}>
                      <Icon name="TrendingUp" size={15} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>
                          {m.traced ? 'Traced to ' + m.source : 'Entered manually'}
                        </span>
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{m.value}</span>
                      {canWrite && (
                        <IconButton tone="dark" size={28} label="Remove" onClick={() => { ST.removeMetric(id, m.id); refresh(); }}>
                          <Icon name="X" size={13} />
                        </IconButton>
                      )}
                    </div>
                  ))}
                </div>
              ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No results yet. A story without a measured result is a testimonial, which is a weaker thing.</span>}
            </DashboardCard>
          </React.Fragment>
        )}

        {tab === 'Consent' && <ConsentPanel d={d} story={s} />}

        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <Icon name={r.ready ? 'CircleCheck' : 'TriangleAlert'} size={17}
            style={{ flex: '0 0 auto', color: r.ready ? 'var(--nhr-turquoise)' : 'var(--nhr-warning)' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
            {r.ready
              ? 'Complete and fully consented. Ready to publish.'
              : 'Cannot publish yet. ' + (r.missing.length ? 'Missing: ' + r.missing.join(', ') + '. ' : '')
              + (r.consentMissing.length ? 'No consent for ' + r.consentMissing.join(', ') + '.' : '')}
          </span>
          {canWrite && s.stage !== 'Published' && (
            <Button size="sm" disabled={!r.ready}
              onClick={() => { const res = ST.publish(id); if (res && res.error) setError('Still incomplete.'); else refresh(); }}
              iconLeft={<Icon name="Newspaper" size={15} />}>Publish</Button>
          )}
          {canWrite && s.stage === 'Published' && (
            <Button size="sm" variant="secondary" tone="dark" onClick={() => { ST.unpublish(id); refresh(); }}>Unpublish</Button>
          )}
        </Card>
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
      </div>
    </Drawer>
  );
}

/* ---------------- Consent ---------------- */
function ConsentPanel({ d, story }) {
  const { ST, S, canWrite, refresh } = d;
  const [c, setC] = React.useState(story.consent);

  const items = [
    ['company', 'Use of the company name and logo', 'Naming an organisation in marketing needs their permission, and a logo is separately licensed — verbal agreement from one enthusiastic contact is not enough.'],
    ['quote', 'Use of the quote as written', 'Send the exact wording back for approval. A quote tidied up after the call is no longer theirs.'],
    ['individual', 'Naming the individual quoted', 'A named person is identifiable personal data. They may consent to the quote but not to their name, and they can withdraw later.']
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Notice icon="ShieldCheck">
        Three separate permissions, because people routinely grant one and are assumed to have granted all three.
        Record them only when you hold something in writing.
      </Notice>

      {items.map(([key, label, why]) => (
        <button key={key} type="button" disabled={!canWrite}
          onClick={() => setC(p => Object.assign({}, p, { [key]: !p[key] }))}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: 15, textAlign: 'left',
            borderRadius: 'var(--radius-md)', cursor: canWrite ? 'pointer' : 'default',
            border: '1px solid ' + (c[key] ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
            background: c[key] ? 'rgba(0,229,212,.06)' : 'rgba(255,255,255,.02)'
          }}>
          <span style={{
            width: 19, height: 19, flex: '0 0 auto', marginTop: 2, borderRadius: 5,
            border: '1px solid ' + (c[key] ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
            background: c[key] ? 'var(--nhr-turquoise)' : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>{c[key] && <Icon name="Check" size={12} style={{ color: '#000' }} />}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{label}</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>{why}</span>
          </span>
        </button>
      ))}

      {story.consent.recordedAt && (
        <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
          Last recorded {window.shortDate(story.consent.recordedAt)} by {story.consent.recordedBy}.
        </span>
      )}

      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button size="sm" onClick={() => { ST.recordConsent(story.id, c, S.session.name); refresh(); }}
            iconLeft={<Icon name="FileSignature" size={15} />}>Record Consent</Button>
        </div>
      )}

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <Icon name="Info" size={16} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Consent can be withdrawn. Keep the written permission on file, note who gave it and in what capacity, and
          take the story down promptly if asked — including from decks and cached pages, not just the website.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Published ---------------- */
function PublishedStories({ d }) {
  const { published, ST } = d;

  if (!published.length) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start' }}>
        <Icon name="Newspaper" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No published stories</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)', maxWidth: 560 }}>
          This is the honest state: NHR Solution has no customer references yet. A story appears here once it has a real
          customer, a measured result and all three consents recorded — not before. An empty page is better than an
          invented one, because a fabricated reference is the kind of thing that ends a sale when it is found out.
        </span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {published.map(s => (
        <Card key={s.id} tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16, borderColor: 'rgba(0,229,212,.24)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 220 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>{s.company}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{s.sector} · {s.size} · published {window.shortDate(s.publishedAt)}</span>
            </span>
            <Badge tone="success">Published</Badge>
          </div>

          {s.metrics && s.metrics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
              {s.metrics.map(m => (
                <span key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, borderRadius: 'var(--radius-md)', background: 'rgba(0,229,212,.05)', border: '1px solid rgba(0,229,212,.2)' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{m.value}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-body-dark)' }}>{m.label}</span>
                </span>
              ))}
            </div>
          )}

          {[['The problem', s.challenge], ['What changed', s.approach]].map(([k, v]) => v ? (
            <span key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, color: 'var(--nhr-turquoise)' }}>{k}</span>
              <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-body-dark)' }}>{v}</span>
            </span>
          ) : null)}

          {s.quote && (
            <blockquote style={{
              margin: 0, padding: '16px 18px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,.03)', borderLeft: '2px solid var(--nhr-turquoise)'
            }}>
              <span style={{ display: 'block', fontSize: 15, lineHeight: 1.7, fontStyle: 'italic', color: '#fff' }}>“{s.quote}”</span>
              {s.contactName && (
                <span style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
                  {s.contactName}{s.contactRole ? ', ' + s.contactRole : ''}
                </span>
              )}
            </blockquote>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Consent register ---------------- */
function ConsentRegister({ d }) {
  const { ST, real } = d;

  const rows = real.map(s => {
    const r = ST.readiness(s);
    return {
      id: s.id, company: s.company || '—', stage: s.stage,
      company_ok: s.consent.company, quote_ok: s.consent.quote, individual_ok: s.consent.individual,
      recorded: s.consent.recordedAt ? window.shortDate(s.consent.recordedAt) : '—',
      by: s.consent.recordedBy || '—',
      complete: r.consentMissing.length === 0
    };
  });

  const tick = on => on
    ? <Icon name="Check" size={14} style={{ color: 'var(--nhr-turquoise)' }} />
    : <Icon name="X" size={14} style={{ color: 'var(--nhr-danger)' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Real stories" value={String(real.length)} caption="Excluding placeholders" icon={<Icon name="Building2" size={18} />} />
        <StatTile label="Fully consented" value={String(rows.filter(r => r.complete).length)} caption="All three permissions" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Consent gaps" value={String(rows.filter(r => !r.complete).length)} caption="Cannot be published" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Published" value={String(d.published.length)} caption="Live externally" icon={<Icon name="Newspaper" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="FileSignature" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          The register exists so that when someone asks whether you have permission to use a name, the answer is on
          screen rather than in somebody's inbox. Keep the written permission itself on file — this records that it
          exists, not what it says.
        </span>
      </Card>

      <DashboardCard title="Consent register" padding={16}
        action={rows.length > 0 ? <Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-story-consent-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Company', key: 'company' }, { label: 'Stage', key: 'stage' },
            { label: 'Name consent', key: 'company_ok' }, { label: 'Quote consent', key: 'quote_ok' },
            { label: 'Individual consent', key: 'individual_ok' }, { label: 'Recorded', key: 'recorded' },
            { label: 'Recorded by', key: 'by' }],
            rows.map(r => Object.assign({}, r, {
              company_ok: r.company_ok ? 'Yes' : 'No', quote_ok: r.quote_ok ? 'Yes' : 'No',
              individual_ok: r.individual_ok ? 'Yes' : 'No'
            })))}>Export</Button> : null}>
        {rows.length ? (
          <DataTable compact columns={[
            { key: 'company', label: 'Company' },
            { key: 'stageBadge', label: 'Stage' },
            { key: 'c1', label: 'Name', align: 'center' },
            { key: 'c2', label: 'Quote', align: 'center' },
            { key: 'c3', label: 'Individual', align: 'center' },
            { key: 'recorded', label: 'Recorded', mono: true },
            { key: 'by', label: 'By' }
          ]} rows={rows.map(r => Object.assign({}, r, {
            stageBadge: <Badge tone={STAGE_TONE[r.stage] || 'dark'}>{r.stage}</Badge>,
            c1: tick(r.company_ok), c2: tick(r.quote_ok), c3: tick(r.individual_ok)
          }))} />
        ) : (
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-muted-dark)' }}>
            No real stories yet, so nothing to consent to. The placeholder outlines carry no customer details and are
            excluded from this register.
          </span>
        )}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function StoriesScreen() {
  const d = useStories();
  const [view, setView] = React.useState('Pipeline');

  const consentGaps = d.real.filter(s => d.ST.readiness(s).consentMissing.length > 0).length;

  const body = {
    'Pipeline': <StoryPipeline d={d} />,
    'Published': <PublishedStories d={d} />,
    'Consent': <ConsentRegister d={d} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Customer Stories</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            The reference programme: outlines of what to collect, drafts built from figures the platform can actually evidence, and a consent gate that has to be satisfied before anything is published.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Consent')} iconLeft={<Icon name="FileSignature" size={15} />}>
            Consent{consentGaps > 0 ? ' (' + consentGaps + ')' : ''}
          </Button>
          <Button size="sm" onClick={() => setView('Published')} iconLeft={<Icon name="Newspaper" size={15} />}>Published</Button>
        </div>
      </div>

      <StoriesSubnav view={view} onSelect={setView} counts={{ consentGaps, published: d.published.length }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
    </div>
  );
}

Object.assign(window, {
  StoriesScreen, StoriesSubnav, useStories, StoryPipeline, StoryEditor,
  NewStoryDialog, ConsentPanel, PublishedStories, ConsentRegister, platformMetrics
});
