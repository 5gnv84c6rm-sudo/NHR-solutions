/* Documents — expiry tracking, company policies and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Expiring ---------------- */
function ExpiringDocuments({ data }) {
  const { docs, S, refresh } = data;
  const canWrite = S.can('documents.write');
  const [horizon, setHorizon] = React.useState('60');
  const [renewing, setRenewing] = React.useState(null);
  const [newDate, setNewDate] = React.useState('');

  const dated = docs.filter(d => d.days != null);
  const expired = dated.filter(d => d.days < 0);
  const within = dated.filter(d => d.days >= 0 && d.days <= Number(horizon));
  const list = expired.concat(within);

  function renew(d) {
    if (!newDate) return;
    const e = S.get(d.employeeKey);
    S.update(d.employeeKey, {
      documents: (e.documents || []).map(x => x.id === d.id
        ? Object.assign({}, x, { expiryDate: newDate, status: 'Valid' }) : x)
    });
    S.logActivity(d.employeeKey, 'Document renewed: ' + d.name + ' — now expires ' + window.shortDate(newDate));
    setRenewing(null); setNewDate(''); refresh();
  }

  /* Grouped by month so the chase list reads like a calendar. */
  const buckets = {};
  list.forEach(d => {
    const k = d.days < 0 ? 'Already expired'
      : new Date(d.expiryDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    (buckets[k] = buckets[k] || []).push(d);
  });
  const order = Object.keys(buckets).sort((a, b) => a === 'Already expired' ? -1 : b === 'Already expired' ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Expired" value={String(expired.length)} caption="Not valid today" icon={<Icon name="CircleX" size={18} />} />
        <StatTile label={'Within ' + horizon + ' days'} value={String(within.length)} caption="Chase these next" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="People affected" value={String(new Set(list.map(d => d.employeeKey)).size)} caption="Need contacting" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Dated documents" value={String(dated.length)} caption={'of ' + docs.length + ' on file'} icon={<Icon name="Files" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Look ahead</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['30', '30 days'], ['60', '60 days'], ['90', '90 days'], ['180', '6 months']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setHorizon(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (horizon === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: horizon === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: horizon === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: horizon === k ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-expiring-documents.csv',
            [{ label: 'Employee', key: 'emp' }, { label: 'Document', key: 'name' }, { label: 'Category', key: 'cat' },
            { label: 'Expires', key: 'exp' }, { label: 'Days', key: 'days' }, { label: 'Status', key: 'st' }],
            list.map(d => ({ emp: d.employeeName, name: d.name, cat: d.category, exp: d.expiryDate, days: d.days, st: d.liveStatus })))}>
          Export Chase List
        </Button>
      </Card>

      {list.length ? order.map(month => (
        <DashboardCard key={month} title={month + ' (' + buckets[month].length + ')'} padding={16}
          action={month === 'Already expired' ? <Badge tone="danger">Overdue</Badge> : null}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {buckets[month].map(d => (
              <div key={d.employeeKey + d.id} style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar employee={d.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 170 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{d.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{d.employeeName} · {d.category}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 96 }}>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.days < 0 ? 'var(--nhr-warning)' : '#fff' }}>
                      {window.shortDate(d.expiryDate)}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                      {d.days < 0 ? Math.abs(d.days) + ' days overdue' : d.days + ' days left'}
                    </span>
                  </span>
                  <Badge tone={window.DOC_TONE[d.liveStatus] || 'dark'}>{d.liveStatus}</Badge>
                  {canWrite && (
                    <Button size="xs" onClick={() => { setRenewing(renewing === d.id ? null : d.id); setNewDate(''); }}>
                      {renewing === d.id ? 'Close' : 'Renew'}
                    </Button>
                  )}
                </div>
                {renewing === d.id && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid var(--border-dark)' }}>
                    <span style={{ minWidth: 170 }}>
                      <TextField label="New expiry date" type="date" value={newDate} onChange={setNewDate} />
                    </span>
                    <Button size="sm" disabled={!newDate} onClick={() => renew(d)}>Save Renewal</Button>
                    <Button size="sm" variant="ghost" tone="dark" onClick={() => setRenewing(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DashboardCard>
      )) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing expiring</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>No dated document expires within {horizon} days.</span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Policies ---------------- */
function CompanyPolicies({ data }) {
  const { employees, policies, S, POL, refresh } = data;
  const canWrite = S.can('documents.write');
  const [open, setOpen] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', category: 'HR policy', audience: 'All staff', version: '1.0', reviewDue: '', requiresAck: true });

  const total = employees.length || 1;
  const overdue = policies.filter(p => p.reviewDue && new Date(p.reviewDue) < Date.now());

  function addPolicy() {
    if (!form.name.trim()) return;
    POL.add(form);
    setForm({ name: '', category: 'HR policy', audience: 'All staff', version: '1.0', reviewDue: '', requiresAck: true });
    setAdding(false); refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Policies" value={String(policies.length)} caption="Company-wide documents" icon={<Icon name="ScrollText" size={18} />} />
        <StatTile label="Need acknowledging" value={String(policies.filter(p => p.requiresAck).length)} caption="Staff must sign off" icon={<Icon name="PenLine" size={18} />} />
        <StatTile label="Review overdue" value={String(overdue.length)} caption="Past the review date" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Fully acknowledged" value={String(policies.filter(p => p.requiresAck && p.acknowledgedBy.length >= total).length)} caption="Everyone signed" icon={<Icon name="CircleCheck" size={18} />} />
      </div>

      {canWrite && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)', flex: 1, minWidth: 200 }}>
            Policies belong to the business rather than a person, so they sit here rather than on an employee record.
          </span>
          <Button size="sm" onClick={() => setAdding(!adding)} iconLeft={<Icon name={adding ? 'X' : 'Plus'} size={16} />}>
            {adding ? 'Cancel' : 'Add Policy'}
          </Button>
        </Card>
      )}

      {adding && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>New policy</span>
          <FormGrid cols={3}>
            <TextField label="Policy name" required span={2} value={form.name} onChange={v => setForm(f => Object.assign({}, f, { name: v }))} placeholder="Flexible Working Policy" />
            <TextField label="Version" value={form.version} onChange={v => setForm(f => Object.assign({}, f, { version: v }))} mono />
            <SelectField label="Category" value={form.category} onChange={v => setForm(f => Object.assign({}, f, { category: v }))} options={POL.CATEGORIES} />
            <SelectField label="Audience" value={form.audience} onChange={v => setForm(f => Object.assign({}, f, { audience: v }))} options={POL.AUDIENCES} />
            <TextField label="Review due" type="date" value={form.reviewDue} onChange={v => setForm(f => Object.assign({}, f, { reviewDue: v }))} />
            <SelectField label="Acknowledgement" span={3} value={form.requiresAck ? 'Staff must acknowledge' : 'Reference only'}
              onChange={v => setForm(f => Object.assign({}, f, { requiresAck: /must/.test(v) }))}
              options={['Staff must acknowledge', 'Reference only']} />
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button size="sm" variant="ghost" tone="dark" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.name.trim()} onClick={addPolicy}>Add Policy</Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {policies.map(p => {
          const acked = p.acknowledgedBy.length;
          const pct = p.requiresAck ? Math.round(acked / total * 100) : 100;
          const late = p.reviewDue && new Date(p.reviewDue) < Date.now();
          const outstanding = employees.filter(e => p.acknowledgedBy.indexOf(e.id) === -1);
          return (
            <Card key={p.id} tone="dark" padding={16} style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              borderColor: late ? 'rgba(242,180,65,.28)' : undefined
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{
                  width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name="ScrollText" size={17} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{p.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    v{p.version} · {p.category} · {p.audience} · issued {window.shortDate(p.issuedAt)}
                  </span>
                </span>
                {p.reviewDue && (
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 96 }}>
                    <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: late ? 'var(--nhr-warning)' : '#fff' }}>
                      {window.shortDate(p.reviewDue)}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{late ? 'Review overdue' : 'Review due'}</span>
                  </span>
                )}
                {p.requiresAck
                  ? <Badge tone={pct === 100 ? 'success' : pct >= 60 ? 'warning' : 'danger'}>{acked}/{total} signed</Badge>
                  : <Badge tone="dark">Reference only</Badge>}
                <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(open === p.id ? null : p.id)}>
                  {open === p.id ? 'Close' : 'Manage'}
                </Button>
                {canWrite && (
                  <IconButton tone="dark" size={30} label="Delete policy" onClick={() => { POL.remove(p.id); refresh(); }}>
                    <Icon name="Trash2" size={14} />
                  </IconButton>
                )}
              </div>

              {p.requiresAck && <ProgressMeter label={acked + ' of ' + total + ' acknowledged'} value={pct} valueLabel={pct + '%'} />}

              {open === p.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                  {p.requiresAck ? (
                    <React.Fragment>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {outstanding.length ? outstanding.length + ' still to acknowledge' : 'Everyone has acknowledged this'}
                      </span>
                      {outstanding.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {outstanding.map(e => (
                            <button key={e.id} type="button" disabled={!canWrite}
                              onClick={() => { POL.acknowledge(p.id, e.id); S.logActivity(e.id, 'Acknowledged policy: ' + p.name + ' v' + p.version); refresh(); }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 11px',
                                borderRadius: 999, cursor: canWrite ? 'pointer' : 'default',
                                border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,.03)',
                                color: 'var(--text-body-dark)', fontFamily: 'var(--font-core)', fontSize: 12.5
                              }}>
                              <Icon name="PenLine" size={12} />{S.fullName(e)}
                            </button>
                          ))}
                        </div>
                      )}
                      {canWrite && outstanding.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button size="sm" onClick={() => {
                            outstanding.forEach(e => { POL.acknowledge(p.id, e.id); S.logActivity(e.id, 'Acknowledged policy: ' + p.name + ' v' + p.version); });
                            refresh();
                          }} iconLeft={<Icon name="CheckCheck" size={15} />}>Record All Acknowledgements</Button>
                        </div>
                      )}
                      {acked > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
                          Signed by {p.acknowledgedBy.map(k => { const e = S.get(k); return e ? S.fullName(e) : null; }).filter(Boolean).join(', ')}.
                        </span>
                      )}
                    </React.Fragment>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-body-dark)' }}>
                      This policy is published for reference and does not require a signature.
                    </span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Policy names and review cycles here are placeholders. Real policies should be written or reviewed by someone
          qualified, and an acknowledgement recorded in software is not the same as informed consent — keep the signed
          version where your contracts are held.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function DocumentsScreen() {
  const data = window.useDocumentData();
  const [view, setView] = React.useState('Overview');
  const [uploading, setUploading] = React.useState(false);
  const canRead = data.S.can('documents.read');
  const canWrite = data.S.can('documents.write');
  const expiring = data.docs.filter(d => d.liveStatus === 'Expired' || d.liveStatus === 'Expiring soon').length;

  if (!canRead) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Documents</h2>
        {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="Lock" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Documents are restricted</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 470 }}>
            Your role cannot see the company document library. Employees see their own documents on their profile instead.
          </span>
        </Card>
      </div>
    );
  }

  const body = {
    'Overview': <window.DocumentsOverview data={data} onView={setView} />,
    'Library': <window.DocumentLibrary data={data} />,
    'Expiring': <ExpiringDocuments data={data} />,
    'Policies': <CompanyPolicies data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Documents</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Every file held against an employee, what is expiring, and the company policies staff need to acknowledge. Anything filed here appears on the person's record.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Expiring')} iconLeft={<Icon name="CalendarClock" size={15} />}>
              Expiring{expiring > 0 ? ' (' + expiring + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setUploading(true)} iconLeft={<Icon name="Upload" size={16} />}>Upload Document</Button>
          </div>
        )}
      </div>

      <window.DocumentsSubnav view={view} onSelect={setView} counts={{ expiring }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {uploading && <window.UploadDocumentDialog data={data} onClose={() => setUploading(false)} />}
    </div>
  );
}

Object.assign(window, { DocumentsScreen, ExpiringDocuments, CompanyPolicies });
