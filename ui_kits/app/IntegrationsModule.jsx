/* Integrations — catalogue, connection drawer, API keys, webhooks, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const BUILD_TONE = { 'Available': 'success', 'In development': 'warning', 'Planned': 'dark' };

function fmtWhen(s) {
  if (!s) return 'Never';
  const d = new Date(s);
  const days = Math.floor((Date.now() - d) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return days + ' days ago';
  return window.shortDate(s.slice(0, 10));
}

function IntegrationsSubnav({ view, onSelect, counts }) {
  const items = [['Catalogue', 'Blocks'], ['API Keys', 'KeyRound'], ['Webhooks', 'Webhook'], ['Activity', 'History']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Catalogue' ? counts.connected : 0;
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
            {n > 0 && <Badge tone="success">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useIntegrations() {
  const I = window.IntegrationStore, S = window.EmployeeStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => I.subscribe(force), []);
  const conns = I.connections();
  const catalogue = I.all().map(c => Object.assign({}, c, { conn: conns[c.key] || null }));
  return { I, S, catalogue, refresh: force, canWrite: S.can('settings.write') || S.can('employees.write') };
}

/* ---------------- Catalogue ---------------- */
function IntegrationCatalogue({ d }) {
  const { I, catalogue, canWrite, refresh } = d;
  const [cat, setCat] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const list = catalogue.filter(c => cat === 'All' || c.category === cat);
  const connected = catalogue.filter(c => c.conn);
  const available = catalogue.filter(c => c.build === 'Available');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Connected" value={String(connected.length)} caption="In this workspace" icon={<Icon name="Plug" size={18} />} />
        <StatTile label="Available now" value={String(available.length)} caption="Built and usable" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="In development" value={String(catalogue.filter(c => c.build === 'In development').length)} caption="Not yet connectable" icon={<Icon name="Wrench" size={18} />} />
        <StatTile label="Planned" value={String(catalogue.filter(c => c.build === 'Planned').length)} caption="On the roadmap" icon={<Icon name="CalendarClock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Build status is the honest state of each integration, separate from whether you have connected it.
          Only <strong style={{ color: '#fff' }}>Available</strong> entries can be connected. Nothing here claims a
          partnership or certification that does not exist, and connecting in this prototype records configuration
          locally — it does not move data to a third party.
        </span>
      </Card>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['All'].concat(I.CATEGORIES).map(k => (
          <button key={k} type="button" onClick={() => setCat(k)} style={{
            padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
            border: '1px solid ' + (cat === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
            background: cat === k ? 'rgba(0,229,212,.10)' : 'transparent',
            color: cat === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
            fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: cat === k ? 700 : 600
          }}>{k}</button>
        ))}
      </Card>

      <div className="int-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {list.map(c => {
          const on = !!c.conn;
          const connectable = c.build === 'Available';
          return (
            <Card key={c.key} tone="dark" padding={18} style={{
              display: 'flex', flexDirection: 'column', gap: 13,
              borderColor: on ? 'rgba(0,229,212,.26)' : undefined,
              background: on ? 'rgba(0,229,212,.03)' : undefined
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 42, height: 42, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,.05)', border: '1px solid var(--border-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-core)', fontSize: 15, fontWeight: 800,
                  color: on ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.6)'
                }}>{c.name.slice(0, 2).toUpperCase()}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{c.category} · {c.direction}</span>
                </span>
                {on && <Badge tone="success">Connected</Badge>}
              </div>

              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>{c.blurb}</span>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <Badge tone={BUILD_TONE[c.build]}>{c.build}</Badge>
                <Badge tone="dark">{c.auth}</Badge>
              </div>

              {on && (
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  Connected {fmtWhen(c.conn.connectedAt)} · last run {fmtWhen(c.conn.lastSync)}
                  {c.conn.scopes.length ? ' · ' + c.conn.scopes.length + ' scopes' : ''}
                </span>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant={on ? 'secondary' : 'primary'} tone={on ? 'dark' : undefined}
                  disabled={!connectable || !canWrite}
                  onClick={() => setOpen(c.key)}>
                  {on ? 'Configure' : connectable ? 'Connect' : c.build === 'In development' ? 'Not ready' : 'Planned'}
                </Button>
                {on && canWrite && (
                  <Button size="sm" variant="ghost" tone="dark"
                    onClick={() => { I.disconnect(c.key); refresh(); }}>Disconnect</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {open && <ConnectionDrawer d={d} intKey={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ---------------- Connection drawer ---------------- */
function ConnectionDrawer({ d, intKey, onClose }) {
  const { I, refresh } = d;
  const c = I.find(intKey);
  const existing = I.connection(intKey);
  const [scopes, setScopes] = React.useState(existing ? existing.scopes : c.scopes.slice(0, 1));
  const [mapped, setMapped] = React.useState(existing ? !!existing.mapped : false);
  const [error, setError] = React.useState('');

  function toggle(s) {
    setScopes(list => list.indexOf(s) > -1 ? list.filter(x => x !== s) : list.concat([s]));
  }

  function save() {
    if (!scopes.length) return setError('Choose at least one scope — a connection with no scope moves nothing.');
    if (existing) I.updateConnection(intKey, { scopes, mapped });
    else I.connect(intKey, scopes);
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title={(existing ? 'Configure ' : 'Connect ') + c.name}
      subtitle={c.direction + ' · ' + c.auth} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Notice icon="TriangleAlert" tone="warn">
          This prototype records the configuration locally. No credentials are requested, no data leaves this browser,
          and nothing is sent to {c.name}. Treat it as a specification of the connection, not a live one.
        </Notice>

        <DashboardCard title="Scopes" padding={16} action={<Badge tone="dark">{scopes.length} selected</Badge>}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {c.scopes.map(s => {
              const on = scopes.indexOf(s) > -1;
              return (
                <button key={s} type="button" onClick={() => toggle(s)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', minHeight: 42,
                  borderRadius: 999, cursor: 'pointer',
                  border: '1px solid ' + (on ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                  background: on ? 'rgba(0,229,212,.10)' : 'rgba(255,255,255,.02)',
                  color: on ? '#fff' : 'var(--text-body-dark)',
                  fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: on ? 700 : 500
                }}>
                  <Icon name={on ? 'Check' : 'Plus'} size={13} />{s}
                </button>
              );
            })}
          </div>
          <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            Grant the narrowest set that does the job. A scope you do not need is a copy of personal data you have to
            account for under your retention policy.
          </span>
        </DashboardCard>

        <DashboardCard title="Field mapping" padding={16}
          action={<Badge tone={mapped ? 'success' : 'warning'}>{mapped ? 'Confirmed' : 'Not confirmed'}</Badge>}>
          <DataTable compact columns={[{ key: 'a', label: 'NHR Solution' }, { key: 'b', label: c.name, mono: true }]}
            rows={c.fields.map((f, i) => ({ id: intKey + '-' + i, a: f[0], b: f[1] }))} />
          <button type="button" onClick={() => setMapped(!mapped)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 13, padding: '10px 14px', minHeight: 44,
            borderRadius: 'var(--radius-btn)', cursor: 'pointer',
            border: '1px solid ' + (mapped ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
            background: mapped ? 'rgba(0,229,212,.08)' : 'rgba(255,255,255,.02)',
            color: mapped ? '#fff' : 'var(--text-body-dark)', fontFamily: 'var(--font-core)', fontSize: 13
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5, flex: '0 0 auto',
              border: '1px solid ' + (mapped ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
              background: mapped ? 'var(--nhr-turquoise)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>{mapped && <Icon name="Check" size={11} style={{ color: '#000' }} />}</span>
            I have checked this mapping against our {c.name} configuration
          </button>
        </DashboardCard>

        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          {existing && (
            <Button variant="secondary" tone="dark" iconLeft={<Icon name="RefreshCw" size={15} />}
              onClick={() => { I.runSync(intKey, 'Export', d.S.list({}).length, 'Manual run from configuration'); refresh(); }}>
              Run Now
            </Button>
          )}
          <Button onClick={save} iconLeft={<Icon name={existing ? 'Check' : 'Plug'} size={15} />}>
            {existing ? 'Save Configuration' : 'Connect'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { BUILD_TONE, fmtWhen, IntegrationsSubnav, useIntegrations, IntegrationCatalogue, ConnectionDrawer });
