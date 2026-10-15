/* Documents module — shared data hook, library and expiry tracking. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const DOC_TONE = { Valid: 'success', 'Expiring soon': 'warning', Expired: 'danger', 'Pending review': 'dark' };
const DAY_DOC = 864e5;

/* Documents the policy expects every employee to hold. Missing ones are the
   gap that matters at an inspection, so they are tracked separately from
   expiry. */
const REQUIRED_DOCS = ['Employment contract', 'Right-to-work document', 'ID document'];

/* Live status from the expiry date, so a document filed as Valid last year
   does not still claim to be valid today. */
function docStatus(doc) {
  if (!doc.expiryDate) return doc.status === 'Expired' ? 'Expired' : 'Pending review';
  const days = Math.floor((new Date(doc.expiryDate) - Date.now()) / DAY_DOC);
  if (days < 0) return 'Expired';
  if (days <= 60) return 'Expiring soon';
  return 'Valid';
}
function daysToExpiry(doc) {
  if (!doc.expiryDate) return null;
  return Math.floor((new Date(doc.expiryDate) - Date.now()) / DAY_DOC);
}

function DocumentsSubnav({ view, onSelect, counts }) {
  const items = [['Overview', 'LayoutDashboard'], ['Library', 'FolderOpen'], ['Expiring', 'CalendarClock'], ['Policies', 'ScrollText']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'Expiring' ? counts.expiring : 0;
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
            {n > 0 && <Badge tone="warning">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useDocumentData() {
  const S = window.EmployeeStore, POL = window.PolicyStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => POL.subscribe(force), []);

  const employees = S.list({});
  const docs = [];
  employees.forEach(e => {
    (e.documents || []).forEach(d => docs.push(Object.assign({}, d, {
      employeeKey: e.id, employeeName: S.fullName(e), employeeRef: e.employeeId,
      department: e.department, employee: e, liveStatus: docStatus(d), days: daysToExpiry(d)
    })));
  });
  docs.sort((a, b) => {
    if (a.days == null) return 1;
    if (b.days == null) return -1;
    return a.days - b.days;
  });
  return { employees, docs, policies: POL.list(), refresh: force, S, POL };
}

/* ---------------- Overview ---------------- */
function DocumentsOverview({ data, onView }) {
  const { employees, docs, policies, S } = data;
  const expired = docs.filter(d => d.liveStatus === 'Expired');
  const soon = docs.filter(d => d.liveStatus === 'Expiring soon');
  const pending = docs.filter(d => d.liveStatus === 'Pending review');

  /* Who is missing a document the policy requires. */
  const gaps = employees.map(e => {
    const held = (e.documents || []).map(d => d.category);
    const missing = REQUIRED_DOCS.filter(c => held.indexOf(c) === -1);
    return { employee: e, missing };
  }).filter(g => g.missing.length);

  const compliant = employees.length - gaps.length;
  /* Completeness across required documents, not all-or-nothing per person —
     one missing category company-wide would otherwise read as 0%. */
  const expected = employees.length * REQUIRED_DOCS.length;
  const held = expected - gaps.reduce((n, g) => n + g.missing.length, 0);
  const rate = expected ? Math.round(held / expected * 100) : 100;

  const byCat = {};
  docs.forEach(d => { byCat[d.category] = (byCat[d.category] || 0) + 1; });
  const catBars = Object.keys(byCat).map(k => ({ label: k.split(' ')[0].slice(0, 7), value: byCat[k] })).sort((a, b) => b.value - a.value);

  const ackGap = policies.filter(p => p.requiresAck && p.acknowledgedBy.length < employees.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Documents held" value={String(docs.length)} caption={'across ' + employees.length + ' employees'} icon={<Icon name="Files" size={18} />} />
        <StatTile label="Expired" value={String(expired.length)} caption="Need replacing now" icon={<Icon name="CircleX" size={18} />} />
        <StatTile label="Expiring in 60 days" value={String(soon.length)} caption="Chase before the date" icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Required docs held" value={rate + '%'} caption={held + ' of ' + expected + ' · ' + compliant + (compliant === 1 ? ' complete record' : ' complete records')} icon={<Icon name="ShieldCheck" size={18} />} />
      </div>

      {(expired.length > 0 || soon.length > 0) && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-warning)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {expired.length} expired and {soon.length} expiring within 60 days.
          </span>
          <Button size="sm" onClick={() => onView('Expiring')}>Review</Button>
        </Card>
      )}

      <div className="doc-split" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <DashboardCard title={'Missing required documents (' + gaps.length + ')'} padding={16}
          action={<Badge tone={gaps.length ? 'warning' : 'success'}>{gaps.length ? 'Action needed' : 'Complete'}</Badge>}>
          {gaps.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gaps.slice(0, 6).map(g => (
                <div key={g.employee.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <Avatar employee={g.employee} size={34} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{S.fullName(g.employee)}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{g.employee.department}</span>
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {g.missing.map(m => <Badge key={m} tone="warning">{m.split(' ')[0]}</Badge>)}
                  </span>
                </div>
              ))}
              {gaps.length > 6 && <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>+{gaps.length - 6} more with gaps.</span>}
            </div>
          ) : (
            <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
              Every employee holds a contract, right-to-work document and ID.
            </span>
          )}
        </DashboardCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {catBars.length > 0 && (
            <DashboardCard title="Documents by category">
              <BarChart height={150} data={catBars.slice(0, 6)} />
            </DashboardCard>
          )}
          <DashboardCard title="Policy acknowledgements">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ProgressMeter label={policies.filter(p => p.requiresAck).length + ' policies need signing off'}
                value={policies.filter(p => p.requiresAck).length
                  ? Math.round(policies.filter(p => p.requiresAck).reduce((n, p) => n + p.acknowledgedBy.length, 0)
                    / (policies.filter(p => p.requiresAck).length * Math.max(1, employees.length)) * 100)
                  : 100}
                valueLabel={ackGap.length + ' outstanding'} />
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                {ackGap.length
                  ? ackGap.length + ' ' + (ackGap.length === 1 ? 'policy has' : 'policies have') + ' staff who have not acknowledged them yet.'
                  : 'Everyone has acknowledged every policy that requires it.'}
              </span>
            </div>
          </DashboardCard>
        </div>
      </div>

      {pending.length > 0 && (
        <DashboardCard title={'Awaiting review (' + pending.length + ')'} padding={16}>
          <DataTable compact columns={[
            { key: 'name', label: 'Document' }, { key: 'employeeName', label: 'Employee' },
            { key: 'category', label: 'Category' }, { key: 'uploadedAt', label: 'Uploaded', mono: true }
          ]} rows={pending.slice(0, 8).map(d => ({
            id: d.id, name: d.name, employeeName: d.employeeName, category: d.category,
            uploadedAt: d.uploadedAt ? window.shortDate(d.uploadedAt) : '—'
          }))} />
        </DashboardCard>
      )}
    </div>
  );
}

/* ---------------- Library ---------------- */
function DocumentLibrary({ data }) {
  const { docs, employees, S, refresh } = data;
  const canWrite = S.can('documents.write');
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const [dept, setDept] = React.useState('All');
  const [uploading, setUploading] = React.useState(false);

  const filtered = docs
    .filter(d => cat === 'All' || d.category === cat)
    .filter(d => status === 'All' || d.liveStatus === status)
    .filter(d => dept === 'All' || d.department === dept)
    .filter(d => !q || (d.name + ' ' + d.employeeName).toLowerCase().includes(q.toLowerCase()));

  function exportDocs() {
    window.downloadCsv('nhr-documents-' + new Date().toISOString().slice(0, 10) + '.csv',
      [{ label: 'Document', key: 'name' }, { label: 'Employee', key: 'emp' }, { label: 'Reference', key: 'ref' },
      { label: 'Department', key: 'dept' }, { label: 'Category', key: 'cat' },
      { label: 'Uploaded', key: 'up' }, { label: 'Expires', key: 'exp' }, { label: 'Status', key: 'status' }],
      filtered.map(d => ({
        name: d.name, emp: d.employeeName, ref: d.employeeRef, dept: d.department,
        cat: d.category, up: d.uploadedAt || '', exp: d.expiryDate || '', status: d.liveStatus
      })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents or people…" aria-label="Search documents"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        {[['category', cat, setCat, ['All'].concat(S.DOC_CATEGORIES), 'All categories'],
          ['status', status, setStatus, ['All', 'Valid', 'Expiring soon', 'Expired', 'Pending review'], 'All statuses'],
          ['department', dept, setDept, ['All'].concat(S.DEPARTMENTS), 'All departments']].map(([id, val, set, opts, allLabel]) => (
          <select key={id} value={val} onChange={e => set(e.target.value)} aria-label={id} style={{
            background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
          }}>
            {opts.map(o => <option key={o} value={o}>{o === 'All' ? allLabel : o}</option>)}
          </select>
        ))}
        <Button size="sm" variant="secondary" tone="dark" onClick={exportDocs} iconLeft={<Icon name="Download" size={15} />}>Export</Button>
        {canWrite && <Button size="sm" onClick={() => setUploading(true)} iconLeft={<Icon name="Upload" size={16} />}>Upload</Button>}
      </Card>

      <DashboardCard title={'Documents (' + filtered.length + ')'} padding={16}>
        {filtered.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(d => {
              const bad = d.liveStatus === 'Expired';
              const warn = d.liveStatus === 'Expiring soon';
              return (
                <div key={d.employeeKey + d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14,
                  border: '1px solid ' + (bad ? 'rgba(242,84,91,.28)' : warn ? 'rgba(242,180,65,.26)' : 'var(--border-dark)'),
                  borderRadius: 'var(--radius-md)',
                  background: bad ? 'rgba(242,84,91,.04)' : warn ? 'rgba(242,180,65,.035)' : 'rgba(255,255,255,.02)'
                }}>
                  <span style={{
                    width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                  }}><Icon name="FileText" size={17} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{d.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{d.category} · {d.employeeName} · {d.department}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 108 }}>
                    <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                      {d.expiryDate ? window.shortDate(d.expiryDate) : 'No expiry'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>
                      {d.days == null ? 'Not dated' : d.days < 0 ? Math.abs(d.days) + ' days ago' : 'in ' + d.days + ' days'}
                    </span>
                  </span>
                  <Badge tone={DOC_TONE[d.liveStatus] || 'dark'}>{d.liveStatus}</Badge>
                  {canWrite && (
                    <IconButton tone="dark" size={30} label="Delete document"
                      onClick={() => {
                        const e = S.get(d.employeeKey);
                        S.update(d.employeeKey, { documents: (e.documents || []).filter(x => x.id !== d.id) });
                        S.logActivity(d.employeeKey, 'Document removed: ' + d.name);
                        refresh();
                      }}><Icon name="Trash2" size={14} /></IconButton>
                  )}
                </div>
              );
            })}
          </div>
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Nothing matches those filters.</span>}
      </DashboardCard>

      {uploading && <UploadDocumentDialog data={data} onClose={() => setUploading(false)} />}
    </div>
  );
}

/* ---------------- Upload ---------------- */
function UploadDocumentDialog({ data, onClose }) {
  const { employees, S, refresh } = data;
  const [form, setForm] = React.useState({ employeeId: '', category: 'Employment contract', name: '', expiryDate: '' });
  const [error, setError] = React.useState('');
  const days = form.expiryDate ? Math.floor((new Date(form.expiryDate) - Date.now()) / DAY_DOC) : null;

  function submit() {
    if (!form.employeeId) return setError('Choose whose record this belongs to.');
    if (!form.name.trim()) return setError('Attach a file or enter a document name.');
    S.addDocument(form.employeeId, {
      name: form.name, category: form.category, expiryDate: form.expiryDate,
      status: form.expiryDate ? 'Valid' : 'Pending review'
    });
    S.logActivity(form.employeeId, 'Document filed: ' + form.name + ' (' + form.category + ')');
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Upload Document"
      subtitle="Files against the employee record, so it appears on their profile too." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={S.DOC_CATEGORIES} />
          <TextField label="Expiry date" type="date" value={form.expiryDate} onChange={v => setForm(p => Object.assign({}, p, { expiryDate: v }))}
            hint="Leave blank for documents that do not expire." />
          <Field label="File" span={2}>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 16px', cursor: 'pointer',
              border: '1px dashed rgba(0,229,212,.42)', borderRadius: 'var(--radius-md)',
              background: 'rgba(0,229,212,.04)', fontSize: 13.5, fontWeight: 600, color: 'var(--nhr-turquoise)'
            }}>
              <Icon name="Upload" size={17} />{form.name || 'Choose a file to attach'}
              <input type="file" style={{ display: 'none' }}
                onChange={ev => {
                  const f = ev.target.files && ev.target.files[0];
                  if (f) setForm(p => Object.assign({}, p, { name: f.name }));
                  ev.target.value = '';
                }} />
            </label>
          </Field>
          <TextField label="Document name" span={2} value={form.name} onChange={v => setForm(p => Object.assign({}, p, { name: v }))}
            placeholder="Contract of employment.pdf" />
        </FormGrid>
        {days != null && (
          <Notice icon={days < 0 ? 'TriangleAlert' : 'CalendarClock'} tone={days < 0 ? 'warn' : undefined}>
            {days < 0 ? 'That date has already passed — the document will file as expired.'
              : days <= 60 ? 'Expires in ' + days + ' days, so it will show as expiring soon straight away.'
                : 'Expires in ' + days + ' days. A reminder appears 60 days before.'}
          </Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <Notice icon="ShieldCheck">
          This prototype records the file name only — nothing is uploaded or stored. A live deployment needs encrypted
          file storage and a retention policy before real ID or medical documents go anywhere near it.
        </Notice>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Upload" size={16} />}>File Document</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { DOC_TONE, REQUIRED_DOCS, docStatus, daysToExpiry, DocumentsSubnav, useDocumentData, DocumentsOverview, DocumentLibrary, UploadDocumentDialog });
