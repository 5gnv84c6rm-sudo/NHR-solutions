/* Resources — guides, templates, legislative updates, screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

function ResourcesSubnav({ view, onSelect, counts }) {
  const items = [['Guides', 'BookOpen'], ['Templates', 'FileText'], ['Legal Updates', 'Scale'], ['Saved', 'Bookmark']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Saved' ? counts.saved : label === 'Templates' ? counts.stale : 0;
        const tone = label === 'Saved' ? 'dark' : 'warning';
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
            {n > 0 && <Badge tone={tone}>{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useResources() {
  const RS = window.ResourceStore, S = window.EmployeeStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => RS.subscribe(force), []);
  return {
    RS, S, refresh: force,
    guides: RS.guides(), templates: RS.templates(), updates: RS.updates(),
    saved: RS.saved(), issued: RS.issued(),
    canIssue: S.can('employees.write')
  };
}

/* A small review-status line used on both guides and templates. Guidance that
   has not been reviewed is the failure mode this module has to guard against. */
function ReviewLine({ item }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: item.stale ? 'var(--nhr-warning)' : 'var(--text-muted-dark)' }}>
      <Icon name={item.stale ? 'TriangleAlert' : 'CalendarCheck'} size={12} />
      {item.stale
        ? 'Review overdue by ' + Math.abs(item.daysToReview) + ' days'
        : 'Reviewed ' + window.shortDate(item.reviewed) + ' · next ' + window.shortDate(item.nextReview)}
    </span>
  );
}

/* ---------------- Guides ---------------- */
function GuideLibrary({ d }) {
  const { RS, guides, saved, refresh } = d;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const cats = Array.from(new Set(guides.map(g => g.category)));
  const list = guides
    .filter(g => cat === 'All' || g.category === cat)
    .filter(g => !q || (g.title + ' ' + g.summary + ' ' + g.body).toLowerCase().includes(q.toLowerCase()));

  const reading = list.reduce((n, g) => n + g.minutes, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Guides" value={String(guides.length)} caption={cats.length + ' categories'} icon={<Icon name="BookOpen" size={18} />} />
        <StatTile label="Reading time" value={reading + ' min'} caption="Across the current filter" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Saved" value={String(saved.length)} caption="Bookmarked by you" icon={<Icon name="Bookmark" size={18} />} />
        <StatTile label="Review overdue" value={String(guides.filter(g => g.stale).length)} caption="Guidance goes stale quietly" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search guides…" aria-label="Search guides"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{list.length} of {guides.length}</span>
      </Card>

      <div className="res-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 16 }}>
        {list.map(g => {
          const isSaved = saved.indexOf(g.id) > -1;
          return (
            <Card key={g.id} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name="BookOpen" size={18} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{g.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{g.category} · {g.minutes} min read</span>
                </span>
                <IconButton tone="dark" size={32} label={isSaved ? 'Remove bookmark' : 'Save'}
                  onClick={() => { RS.toggleSave(g.id); refresh(); }}>
                  <Icon name="Bookmark" size={14} style={{ color: isSaved ? 'var(--nhr-turquoise)' : undefined }} />
                </IconButton>
              </div>

              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>{g.summary}</span>
              <ReviewLine item={g} />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" onClick={() => setOpen(g.id)} iconLeft={<Icon name="BookOpen" size={14} />}>Read</Button>
                <Badge tone="dark">Relates to {g.module}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {open && <GuideReader d={d} id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function GuideReader({ d, id, onClose }) {
  const { RS, saved, refresh } = d;
  const g = RS.guide(id);
  if (!g) return null;
  const isSaved = saved.indexOf(g.id) > -1;

  return (
    <Drawer open onClose={onClose} title={g.title} subtitle={g.category + ' · ' + g.minutes + ' minute read'} width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="dark">Relates to {g.module}</Badge>
          <ReviewLine item={g} />
          <span style={{ flex: 1 }} />
          <Button size="xs" variant="secondary" tone="dark" onClick={() => { RS.toggleSave(g.id); refresh(); }}
            iconLeft={<Icon name="Bookmark" size={13} />}>{isSaved ? 'Saved' : 'Save'}</Button>
        </div>

        {g.stale && (
          <Notice icon="TriangleAlert" tone="warn">
            This guide is past its review date. Check it against current guidance before relying on it — HR rules change
            and an out-of-date guide reads exactly like a current one.
          </Notice>
        )}

        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {g.body.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.78, color: 'var(--text-body-dark)', textWrap: 'pretty' }}>{p}</p>
          ))}
        </Card>

        <Card tone="dark" padding={16} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
          <Icon name="Scale" size={17} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
          <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
            This is general information to help you run a process well. It is not legal advice, and it does not account
            for your contracts, your sector or the facts of an individual case. Take advice before a decision that
            affects someone's employment.
          </span>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Templates ---------------- */
function TemplateLibrary({ d }) {
  const { RS, templates, issued, canIssue, refresh, S } = d;
  const [kind, setKind] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const kinds = Array.from(new Set(templates.map(t => t.kind)));
  const list = templates.filter(t => kind === 'All' || t.kind === kind);
  const issuedIds = issued.map(i => i.templateId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Templates" value={String(templates.length)} caption={kinds.join(', ')} icon={<Icon name="FileText" size={18} />} />
        <StatTile label="Issued" value={String(issued.length)} caption="Live as company policies" icon={<Icon name="Send" size={18} />} />
        <StatTile label="Need sign-off" value={String(templates.filter(t => t.signOff).length)} caption="When issued" icon={<Icon name="PenLine" size={18} />} />
        <StatTile label="Review overdue" value={String(templates.filter(t => t.stale).length)} caption="Do not issue as-is" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Issuing a template creates a real company policy in <strong style={{ color: '#fff' }}>Documents → Policies</strong>,
          with an acknowledgement requirement where the template calls for one. Complete the {'{{placeholders}}'} for your
          organisation first — a template issued unedited is worse than none, because it looks like a considered decision.
        </span>
      </Card>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['All'].concat(kinds).map(k => (
          <button key={k} type="button" onClick={() => setKind(k)} style={{
            padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
            border: '1px solid ' + (kind === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
            background: kind === k ? 'rgba(0,229,212,.10)' : 'transparent',
            color: kind === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
            fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: kind === k ? 700 : 600
          }}>{k}</button>
        ))}
      </Card>

      <div className="res-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 16 }}>
        {list.map(t => {
          const wasIssued = issuedIds.indexOf(t.id) > -1;
          return (
            <Card key={t.id} tone="dark" padding={18} style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              borderColor: t.stale ? 'rgba(242,180,65,.26)' : wasIssued ? 'rgba(0,229,212,.24)' : undefined
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,.05)', border: '1px solid var(--border-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name={t.kind === 'Letter' ? 'Mail' : t.kind === 'Form' ? 'ClipboardList' : 'ScrollText'} size={18} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{t.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{t.kind} · v{t.version} · {t.category}</span>
                </span>
                {wasIssued && <Badge tone="success">Issued</Badge>}
              </div>

              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>{t.summary}</span>
              <ReviewLine item={t} />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" onClick={() => setOpen(t.id)} iconLeft={<Icon name="Eye" size={14} />}>Open</Button>
                {t.signOff && <Badge tone="warning">Needs sign-off</Badge>}
              </div>
            </Card>
          );
        })}
      </div>

      {issued.length > 0 && (
        <DashboardCard title={'Issued from templates (' + issued.length + ')'} padding={16}>
          <DataTable compact columns={[
            { key: 'title', label: 'Policy' }, { key: 'whenLabel', label: 'Issued', mono: true },
            { key: 'by', label: 'By' }, { key: 'ackBadge', label: 'Acknowledgement' }
          ]} rows={issued.map(i => ({
            id: i.id, title: i.title, whenLabel: window.shortDate(i.at), by: i.by,
            ackBadge: <Badge tone={i.signOff ? 'warning' : 'dark'}>{i.signOff ? 'Required' : 'Not required'}</Badge>
          }))} />
        </DashboardCard>
      )}

      {open && <TemplateViewer d={d} id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TemplateViewer({ d, id, onClose }) {
  const { RS, canIssue, refresh, S } = d;
  const t = RS.template(id);
  const [audience, setAudience] = React.useState('All staff');
  const [confirmed, setConfirmed] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState('');
  if (!t) return null;

  const placeholders = Array.from(new Set((t.body.match(/\{\{[a-zA-Z]+\}\}/g) || [])));

  function issue() {
    if (!confirmed) return setError('Confirm you have completed the placeholders for your organisation.');
    const policy = RS.issue(t.id, S.session.name, audience);
    setDone(policy); setError(''); refresh();
  }

  return (
    <Drawer open onClose={onClose} title={t.title} subtitle={t.kind + ' · version ' + t.version + ' · ' + t.category} width={760}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ReviewLine item={t} />
          <span style={{ flex: 1 }} />
          <Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name={copied ? 'Check' : 'Copy'} size={13} />}
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(t.body);
              setCopied(true); setTimeout(() => setCopied(false), 1800);
            }}>{copied ? 'Copied' : 'Copy text'}</Button>
          <Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
            onClick={() => {
              const blob = new Blob([t.body], { type: 'text/plain' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
              a.click(); URL.revokeObjectURL(a.href);
            }}>Download</Button>
        </div>

        {t.stale && (
          <Notice icon="TriangleAlert" tone="warn">
            Past its review date. Check it against current law before issuing — an out-of-date policy carries the
            authority of a current one without the accuracy.
          </Notice>
        )}

        {placeholders.length > 0 && (
          <Notice icon="Info">
            {placeholders.length} placeholders to complete: <span style={{ fontFamily: 'var(--font-mono)' }}>{placeholders.join(' ')}</span>
          </Notice>
        )}

        <Card tone="dark" padding="var(--card-padding-lg)">
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-core)',
            fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-body-dark)'
          }}>{t.body}</pre>
        </Card>

        {done ? (
          <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', borderColor: 'rgba(0,229,212,.3)', background: 'rgba(0,229,212,.05)' }}>
            <Icon name="CircleCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
            <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
              Issued as a company policy for <strong style={{ color: '#fff' }}>{audience}</strong>
              {t.signOff ? ', with acknowledgement required' : ''}. It is now in Documents → Policies.
            </span>
            <Button size="sm" onClick={onClose}>Done</Button>
          </Card>
        ) : canIssue ? (
          <DashboardCard title="Issue as a company policy" padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <SelectField label="Audience" value={audience} onChange={setAudience}
                options={window.PolicyStore ? window.PolicyStore.AUDIENCES : ['All staff']} />
              <button type="button" onClick={() => setConfirmed(!confirmed)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', minHeight: 46,
                borderRadius: 'var(--radius-btn)', cursor: 'pointer', textAlign: 'left',
                border: '1px solid ' + (confirmed ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                background: confirmed ? 'rgba(0,229,212,.08)' : 'rgba(255,255,255,.02)',
                color: confirmed ? '#fff' : 'var(--text-body-dark)', fontFamily: 'var(--font-core)', fontSize: 13, lineHeight: 1.55
              }}>
                <span style={{
                  width: 18, height: 18, flex: '0 0 auto', marginTop: 1, borderRadius: 5,
                  border: '1px solid ' + (confirmed ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
                  background: confirmed ? 'var(--nhr-turquoise)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}>{confirmed && <Icon name="Check" size={11} style={{ color: '#000' }} />}</span>
                I have completed the placeholders and checked this against our contracts and current law
              </button>
              {t.signOff && (
                <Notice icon="PenLine">
                  This template requires acknowledgement. Every employee in the audience will be asked to sign it off,
                  and the outstanding list appears in Documents → Policies.
                </Notice>
              )}
              {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
                <Button onClick={issue} iconLeft={<Icon name="Send" size={15} />}>Issue Policy</Button>
              </div>
            </div>
          </DashboardCard>
        ) : (
          <Notice icon="Lock">Your role can read templates but not issue them as company policies.</Notice>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Legal updates ---------------- */
function LegalUpdates({ d }) {
  const { updates } = d;
  const inForce = updates.filter(u => u.inForce);
  const upcoming = updates.filter(u => !u.inForce);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Updates" value={String(updates.length)} caption="Tracked changes" icon={<Icon name="Scale" size={18} />} />
        <StatTile label="In force" value={String(inForce.length)} caption="Already applies" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Upcoming" value={String(upcoming.length)} caption="Not yet effective" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Most recent" value={inForce.length ? window.shortDate(inForce[0].effective) : '—'} caption="Effective date" icon={<Icon name="Clock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Each update carries its effective date, because applying a rule before it is in force causes as many problems
          as missing it afterwards. Several of these apply from the first leave year or pay period beginning on or after
          the date, which is not the same as the date itself.
        </span>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {updates.map(u => (
          <Card key={u.id} tone="dark" padding={18} style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            borderColor: u.inForce ? undefined : 'rgba(242,180,65,.24)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <span style={{
                width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
              }}><Icon name="Scale" size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 210 }}>
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{u.title}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {u.category} · effective {window.shortDate(u.effective)}
                </span>
              </span>
              <Badge tone={u.inForce ? 'success' : 'warning'}>
                {u.inForce ? 'In force' : 'From ' + window.shortDate(u.effective)}
              </Badge>
            </div>

            <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body-dark)' }}>{u.body}</span>

            <span style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 'var(--radius-md)',
              background: 'rgba(0,229,212,.04)', border: '1px solid rgba(0,229,212,.18)'
            }}>
              <Icon name="ArrowRight" size={14} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--nhr-turquoise)' }} />
              <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
                <strong style={{ color: '#fff' }}>What to do: </strong>{u.action}
              </span>
            </span>
          </Card>
        ))}
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Scale" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          These notes summarise changes in general terms and are not legal advice. Employment law also differs in parts
          of the UK, and sector rules can impose more. Check the position that applies to you before changing a policy.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Saved ---------------- */
function SavedItems({ d, onOpenGuide }) {
  const { RS, guides, templates, saved, refresh } = d;
  const items = guides.filter(g => saved.indexOf(g.id) > -1)
    .map(g => Object.assign({}, g, { type: 'Guide' }))
    .concat(templates.filter(t => saved.indexOf(t.id) > -1).map(t => Object.assign({}, t, { type: 'Template' })));

  if (!items.length) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="Bookmark" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing saved yet</span>
        <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
          Bookmark a guide or template and it appears here for quick access.
        </span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(i => (
        <Card key={i.id} tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <Icon name={i.type === 'Guide' ? 'BookOpen' : 'FileText'} size={17} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 190 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{i.title}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{i.type} · {i.category}</span>
          </span>
          <ReviewLine item={i} />
          {i.type === 'Guide' && <Button size="xs" onClick={() => onOpenGuide(i.id)}>Read</Button>}
          <IconButton tone="dark" size={30} label="Remove bookmark" onClick={() => { RS.toggleSave(i.id); refresh(); }}>
            <Icon name="X" size={13} />
          </IconButton>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function ResourcesScreen() {
  const d = useResources();
  const [view, setView] = React.useState('Guides');
  const [guideId, setGuideId] = React.useState(null);

  const body = {
    'Guides': <GuideLibrary d={d} />,
    'Templates': <TemplateLibrary d={d} />,
    'Legal Updates': <LegalUpdates d={d} />,
    'Saved': <SavedItems d={d} onOpenGuide={setGuideId} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Resources</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 610 }}>
            Guides on the situations this platform handles, policy and letter templates you can issue straight into Documents, and dated notes on what has changed in law.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Legal Updates')} iconLeft={<Icon name="Scale" size={15} />}>Legal Updates</Button>
          <Button size="sm" onClick={() => setView('Templates')} iconLeft={<Icon name="FileText" size={15} />}>Templates</Button>
        </div>
      </div>

      <ResourcesSubnav view={view} onSelect={setView} counts={{ saved: d.saved.length, stale: d.templates.filter(t => t.stale).length }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {guideId && <GuideReader d={d} id={guideId} onClose={() => setGuideId(null)} />}
    </div>
  );
}

Object.assign(window, { ResourcesScreen, ResourcesSubnav, useResources, GuideLibrary, GuideReader, TemplateLibrary, TemplateViewer, LegalUpdates, SavedItems });
