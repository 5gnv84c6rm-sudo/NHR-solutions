/* Integrations — API keys, webhooks, activity log, screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const KEY_SCOPES = ['Read employees', 'Write employees', 'Read payroll', 'Read absence', 'Read reports', 'Manage webhooks'];

/* ---------------- API keys ---------------- */
function ApiKeys({ d }) {
  const { I, S, canWrite, refresh } = d;
  const keys = I.keys();
  const [creating, setCreating] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [scopes, setScopes] = React.useState(['Read employees']);
  const [revealed, setRevealed] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState('');

  const live = keys.filter(k => !k.revoked);

  function create() {
    if (!label.trim()) return setError('Give the key a name — an unlabelled key is impossible to revoke safely later.');
    if (!scopes.length) return setError('Choose at least one scope.');
    const { secret } = I.createKey(label, scopes);
    setRevealed(secret);
    setLabel(''); setScopes(['Read employees']); setCreating(false); setError('');
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Active keys" value={String(live.length)} caption="Can authenticate now" icon={<Icon name="KeyRound" size={18} />} />
        <StatTile label="Revoked" value={String(keys.filter(k => k.revoked).length)} caption="No longer valid" icon={<Icon name="Ban" size={18} />} />
        <StatTile label="Unused in 30 days" value={String(live.filter(k => !k.lastUsed || (Date.now() - new Date(k.lastUsed)) > 30 * 864e5).length)} caption="Candidates for removal" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="With write access" value={String(live.filter(k => k.scopes.some(s => /Write|Manage/.test(s))).length)} caption="Can change data" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      {revealed && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 13, borderColor: 'rgba(0,229,212,.32)', background: 'rgba(0,229,212,.05)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="KeyRound" size={18} style={{ color: 'var(--nhr-turquoise)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Copy this key now</span>
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
            This is the only time the full key is shown. Only the prefix is stored, so it cannot be retrieved again —
            if you lose it, revoke it and create another.
          </span>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{
              flex: 1, minWidth: 220, padding: '12px 14px', borderRadius: 'var(--radius-btn)',
              background: 'rgba(0,0,0,.4)', border: '1px solid var(--border-dark)',
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--nhr-turquoise)', wordBreak: 'break-all'
            }}>{revealed}</code>
            <Button size="sm" iconLeft={<Icon name={copied ? 'Check' : 'Copy'} size={14} />}
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(revealed);
                setCopied(true); setTimeout(() => setCopied(false), 1800);
              }}>{copied ? 'Copied' : 'Copy'}</Button>
            <Button size="sm" variant="ghost" tone="dark" onClick={() => setRevealed(null)}>Done</Button>
          </span>
        </Card>
      )}

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          Keys authenticate server-to-server calls. Never put one in a browser, a mobile app or a repository.
        </span>
        {canWrite && <Button size="sm" onClick={() => setCreating(!creating)} iconLeft={<Icon name="Plus" size={16} />}>
          {creating ? 'Cancel' : 'Create Key'}
        </Button>}
      </Card>

      {creating && (
        <DashboardCard title="New API key" padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField label="Name" required value={label} onChange={setLabel}
              placeholder="Finance nightly export" hint="Name it after what uses it, not who made it." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Scopes</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {KEY_SCOPES.map(s => {
                  const on = scopes.indexOf(s) > -1;
                  const risky = /Write|Manage|payroll/i.test(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => setScopes(l => on ? l.filter(x => x !== s) : l.concat([s]))}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', minHeight: 42,
                        borderRadius: 999, cursor: 'pointer',
                        border: '1px solid ' + (on ? (risky ? 'rgba(242,180,65,.45)' : 'rgba(0,229,212,.4)') : 'var(--border-dark)'),
                        background: on ? (risky ? 'rgba(242,180,65,.10)' : 'rgba(0,229,212,.10)') : 'rgba(255,255,255,.02)',
                        color: on ? '#fff' : 'var(--text-body-dark)',
                        fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: on ? 700 : 500
                      }}>
                      <Icon name={on ? 'Check' : 'Plus'} size={13} />{s}
                    </button>
                  );
                })}
              </div>
            </div>
            {scopes.some(s => /Write|Manage/.test(s)) && (
              <Notice icon="TriangleAlert" tone="warn">
                This key will be able to change data. Write scopes are worth a second look — most integrations only need to read.
              </Notice>
            )}
            {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={create} iconLeft={<Icon name="KeyRound" size={15} />}>Create Key</Button>
            </div>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title={'Keys (' + keys.length + ')'} padding={16}>
        {keys.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {keys.map(k => (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', padding: 13,
                border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
                opacity: k.revoked ? 0.55 : 1
              }}>
                <Icon name="KeyRound" size={16} style={{ flex: '0 0 auto', color: k.revoked ? 'var(--text-muted-dark)' : 'var(--nhr-turquoise)' }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 170 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{k.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    {k.prefix}••••••••  ·  created {window.fmtWhen(k.created)}  ·  last used {window.fmtWhen(k.lastUsed)}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {k.scopes.map(s => <Badge key={s} tone={/Write|Manage/.test(s) ? 'warning' : 'dark'}>{s}</Badge>)}
                </span>
                {k.revoked ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}
                {canWrite && !k.revoked && (
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => { I.revokeKey(k.id); refresh(); }}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No keys yet.</span>}
      </DashboardCard>
    </div>
  );
}

/* ---------------- Webhooks ---------------- */
function Webhooks({ d }) {
  const { I, canWrite, refresh } = d;
  const hooks = I.hooks();
  const deliveries = I.deliveries();
  const [url, setUrl] = React.useState('');
  const [picked, setPicked] = React.useState(['employee.created']);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sample, setSample] = React.useState('employee.created');

  const failed = deliveries.filter(x => x.status >= 400);

  function add() {
    if (!/^https:\/\/.+/.test(url.trim())) return setError('Enter an https endpoint — plain http would send personal data in the clear.');
    if (!picked.length) return setError('Choose at least one event.');
    I.addHook(url.trim(), picked);
    setUrl(''); setPicked(['employee.created']); setAdding(false); setError('');
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Endpoints" value={String(hooks.length)} caption={hooks.filter(h => h.active).length + ' active'} icon={<Icon name="Webhook" size={18} />} />
        <StatTile label="Events available" value={String(I.EVENTS.length)} caption="Across the platform" icon={<Icon name="Zap" size={18} />} />
        <StatTile label="Deliveries" value={String(deliveries.length)} caption="Recorded attempts" icon={<Icon name="Send" size={18} />} />
        <StatTile label="Failures" value={String(failed.length)} caption={failed.length ? 'Needs investigation' : 'All succeeded'} icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 230, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          Each payload is signed with an HMAC header so your endpoint can verify it came from us. Verify the signature
          before trusting the body — an unauthenticated webhook endpoint is an open door.
        </span>
        {canWrite && <Button size="sm" onClick={() => setAdding(!adding)} iconLeft={<Icon name="Plus" size={16} />}>
          {adding ? 'Cancel' : 'Add Endpoint'}
        </Button>}
      </Card>

      {adding && (
        <DashboardCard title="New endpoint" padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField label="Endpoint URL" required value={url} onChange={setUrl} placeholder="https://your-service.example/nhr/events" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Events ({picked.length} selected)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {I.EVENTS.map(([ev, desc]) => {
                  const on = picked.indexOf(ev) > -1;
                  return (
                    <button key={ev} type="button"
                      onClick={() => setPicked(l => on ? l.filter(x => x !== ev) : l.concat([ev]))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', minHeight: 46,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                        border: '1px solid ' + (on ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                        background: on ? 'rgba(0,229,212,.07)' : 'rgba(255,255,255,.02)'
                      }}>
                      <span style={{
                        width: 17, height: 17, flex: '0 0 auto', borderRadius: 5,
                        border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
                        background: on ? 'var(--nhr-turquoise)' : 'transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                      }}>{on && <Icon name="Check" size={10} style={{ color: '#000' }} />}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: on ? '#fff' : 'var(--text-body-dark)' }}>{ev}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={add} iconLeft={<Icon name="Webhook" size={15} />}>Add Endpoint</Button>
            </div>
          </div>
        </DashboardCard>
      )}

      {hooks.map(h => (
        <Card key={h.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
            <Icon name="Webhook" size={17} style={{ flex: '0 0 auto', color: h.active ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>{h.url}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>Added {window.fmtWhen(h.created)} · {h.events.length} events</span>
            </span>
            <Badge tone={h.active ? 'success' : 'dark'}>{h.active ? 'Active' : 'Paused'}</Badge>
            {canWrite && (
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="xs" variant="secondary" tone="dark" onClick={() => { I.testFire(h.id); refresh(); }}>Send Test</Button>
                <Button size="xs" variant="ghost" tone="dark" onClick={() => { I.updateHook(h.id, { active: !h.active }); refresh(); }}>
                  {h.active ? 'Pause' : 'Resume'}
                </Button>
                <IconButton tone="dark" size={30} label="Remove endpoint" onClick={() => { I.removeHook(h.id); refresh(); }}>
                  <Icon name="Trash2" size={14} />
                </IconButton>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {h.events.map(e => <Badge key={e} tone="dark">{e}</Badge>)}
          </div>
        </Card>
      ))}

      <DashboardCard title="Example payload" padding={16}
        action={
          <select value={sample} onChange={e => setSample(e.target.value)} aria-label="Event" style={{
            background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-mono)'
          }}>
            {I.EVENTS.map(([ev]) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        }>
        <pre style={{
          margin: 0, padding: 14, borderRadius: 'var(--radius-md)', overflowX: 'auto',
          background: 'rgba(0,0,0,.35)', border: '1px solid var(--border-dark)',
          fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65, color: 'var(--text-body-dark)'
        }}>{JSON.stringify(I.samplePayload(sample), null, 2)}</pre>
      </DashboardCard>

      <DashboardCard title={'Delivery log (' + deliveries.length + ')'} padding={16}>
        <DataTable compact columns={[
          { key: 'when', label: 'When', mono: true },
          { key: 'event', label: 'Event', mono: true },
          { key: 'url', label: 'Endpoint' },
          { key: 'statusBadge', label: 'Status' },
          { key: 'msLabel', label: 'Duration', mono: true, align: 'right' }
        ]} rows={deliveries.slice(0, 15).map(x => ({
          id: x.id, when: window.fmtWhen(x.at), event: x.event, url: x.hookUrl.replace(/^https:\/\//, ''),
          statusBadge: <Badge tone={x.status >= 400 ? 'danger' : x.test ? 'warning' : 'success'}>
            {x.status}{x.test ? ' · test' : ''}
          </Badge>,
          msLabel: x.ms + 'ms'
        }))} />
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Test rows are recorded locally and marked as such. They do not prove your endpoint is reachable — only a real
          delivery from the production service does that.
        </span>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Activity ---------------- */
function IntegrationActivity({ d }) {
  const { I } = d;
  const syncs = I.syncs();
  const deliveries = I.deliveries();

  const rows = syncs.map(s => ({
    id: s.id, at: s.at, kind: s.kind, what: (I.find(s.integration) || { name: s.integration }).name,
    records: s.records, result: s.result, note: s.note
  }));

  const totalRecords = syncs.reduce((n, s) => n + (s.records || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Runs" value={String(syncs.length)} caption="Imports and exports" icon={<Icon name="RefreshCw" size={18} />} />
        <StatTile label="Records moved" value={String(totalRecords)} caption="Across all runs" icon={<Icon name="Database" size={18} />} />
        <StatTile label="Webhook deliveries" value={String(deliveries.length)} caption={deliveries.filter(x => x.test).length + ' were tests'} icon={<Icon name="Send" size={18} />} />
        <StatTile label="Failures" value={String(deliveries.filter(x => x.status >= 400).length)} caption="HTTP 400 or above" icon={<Icon name="TriangleAlert" size={18} />} />
      </div>

      <DashboardCard title="Sync history" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-integration-activity-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'When', key: 'at' }, { label: 'Integration', key: 'what' }, { label: 'Type', key: 'kind' },
            { label: 'Records', key: 'records' }, { label: 'Result', key: 'result' }, { label: 'Note', key: 'note' }],
            rows)}>Export</Button>}>
        {rows.length ? (
          <DataTable compact columns={[
            { key: 'whenLabel', label: 'When', mono: true },
            { key: 'what', label: 'Integration' },
            { key: 'kind', label: 'Type' },
            { key: 'records', label: 'Records', mono: true, align: 'right' },
            { key: 'resultBadge', label: 'Result' },
            { key: 'note', label: 'Note' }
          ]} rows={rows.map(r => Object.assign({}, r, {
            whenLabel: window.fmtWhen(r.at),
            resultBadge: <Badge tone="success">{r.result}</Badge>
          }))} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No runs recorded.</span>}
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Sending employee data to a third party makes them a processor under UK GDPR. You need a written processor
          agreement with each one, an entry in your record of processing, and a check on where the data is held before
          the first sync runs — not after.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function IntegrationsScreen() {
  const d = window.useIntegrations();
  const [view, setView] = React.useState('Catalogue');
  const connected = d.catalogue.filter(c => c.conn).length;

  const body = {
    'Catalogue': <window.IntegrationCatalogue d={d} />,
    'API Keys': <ApiKeys d={d} />,
    'Webhooks': <Webhooks d={d} />,
    'Activity': <IntegrationActivity d={d} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Integrations</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 610 }}>
            Connections to the tools you already use, with build status stated honestly, plus API keys and webhooks for anything not in the catalogue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('API Keys')} iconLeft={<Icon name="KeyRound" size={15} />}>API Keys</Button>
          <Button size="sm" onClick={() => setView('Webhooks')} iconLeft={<Icon name="Webhook" size={15} />}>Webhooks</Button>
        </div>
      </div>

      <window.IntegrationsSubnav view={view} onSelect={setView} counts={{ connected }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
    </div>
  );
}

Object.assign(window, { IntegrationsScreen, ApiKeys, Webhooks, IntegrationActivity, KEY_SCOPES });
