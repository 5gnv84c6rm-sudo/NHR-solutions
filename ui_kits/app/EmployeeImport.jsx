/* Bulk import: upload → map columns → validate → preview → import. */
const { Button, Badge, Card, IconButton, ProgressMeter } = window.NHRSolutionDesignSystem_0db691;

const IMPORT_STEPS = ['Upload File', 'Map Columns', 'Validate', 'Preview', 'Import'];
const TARGET_FIELDS = [
  { key: 'employeeId', label: 'Employee ID' }, { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' }, { key: 'personalEmail', label: 'Personal email' },
  { key: 'mobile', label: 'Mobile' }, { key: 'jobTitle', label: 'Job title' },
  { key: 'department', label: 'Department' }, { key: 'employmentType', label: 'Employment type' },
  { key: 'startDate', label: 'Start date' }
];

/* Sample file the demo "reads" when no real file is chosen — 53 rows with
   deliberate problems so validation has something to report. */
function sampleRows() {
  const first = ['Aisha', 'Ben', 'Chloe', 'Dev', 'Elena', 'Femi', 'Grace', 'Harry', 'Isla', 'Jonas'];
  const last = ['Ahmed', 'Carter', 'Dunn', 'Patel', 'Rossi', 'Adeyemi', 'Hughes', 'Lawson', 'Murray', 'Berg'];
  const depts = window.EmployeeStore.DEPARTMENTS;
  const rows = [];
  for (let i = 0; i < 53; i++) {
    const f = first[i % first.length], l = last[(i * 3) % last.length];
    rows.push({
      employeeId: i === 12 ? 'NHR-000101' : i === 30 ? 'NHR-000102' : '',
      firstName: i === 7 ? '' : f,
      lastName: l,
      personalEmail: i === 19 ? 'not-an-email' : (f + '.' + l + i).toLowerCase() + '@example.com',
      mobile: '+44 79' + String(10000000 + i * 137).slice(0, 8),
      jobTitle: i === 22 ? '' : ['Advisor', 'Coordinator', 'Analyst', 'Technician', 'Officer'][i % 5],
      department: i === 41 ? '' : depts[i % depts.length],
      employmentType: ['Full-time', 'Part-time', 'Temporary'][i % 3],
      startDate: i === 47 ? '' : '2026-0' + (1 + (i % 8)) + '-1' + (i % 9)
    });
  }
  return rows;
}

function EmployeeImport({ open, onClose, onImported }) {
  const S = window.EmployeeStore;
  const [step, setStep] = React.useState(0);
  const [fileName, setFileName] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [mapping, setMapping] = React.useState({});
  const [results, setResults] = React.useState([]);
  const [imported, setImported] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setStep(0); setFileName(''); setRows([]); setResults([]); setImported(0);
    const m = {}; TARGET_FIELDS.forEach(f => { m[f.key] = f.key; });
    setMapping(m);
  }, [open]);

  function loadFile(name) {
    setFileName(name);
    setRows(sampleRows());
    setStep(1);
  }

  function runValidation() {
    const mapped = rows.map(r => {
      const out = {};
      TARGET_FIELDS.forEach(f => { const src = mapping[f.key]; if (src) out[f.key] = r[src]; });
      return out;
    });
    setResults(S.validateImport(mapped));
    setStep(2);
  }

  const okRows = results.filter(r => r.level === 'ok');
  const warnRows = results.filter(r => r.level === 'warn');
  const errRows = results.filter(r => r.level === 'error');
  const importable = okRows.concat(warnRows);

  function doImport() {
    const created = S.importMany(importable.map(r => r.data));
    setImported(created.length);
    setStep(4);
    onImported && onImported(created);
  }

  const sourceColumns = rows.length ? Object.keys(rows[0]) : [];

  const bodies = [
    /* 0 — upload */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionLabel hint="CSV or Excel. Column order does not matter — you map them in the next step.">Upload your employee file</SectionLabel>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '44px 24px', cursor: 'pointer',
        border: '1px dashed rgba(0,229,212,.4)', borderRadius: 'var(--radius-card)',
        background: 'rgba(0,229,212,.04)', textAlign: 'center'
      }}>
        <Icon name="FileSpreadsheet" size={30} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Choose a CSV or Excel file</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Up to 5,000 rows per import</span>
        <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={ev => { const f = ev.target.files && ev.target.files[0]; if (f) loadFile(f.name); ev.target.value = ''; }} />
      </label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="secondary" tone="dark" size="sm" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-employee-import-template.csv', TARGET_FIELDS.map(f => ({ label: f.label, key: f.key })), [
            { employeeId: '', firstName: 'Aisha', lastName: 'Ahmed', personalEmail: 'aisha.ahmed@example.com', mobile: '+44 7900 000001', jobTitle: 'Coordinator', department: 'Operations', employmentType: 'Full-time', startDate: '2026-10-01' },
            { employeeId: '', firstName: 'Ben', lastName: 'Carter', personalEmail: 'ben.carter@example.com', mobile: '+44 7900 000002', jobTitle: 'Analyst', department: 'Finance', employmentType: 'Part-time', startDate: '2026-10-13' }
          ])}>Download CSV Template</Button>
        <Button variant="ghost" tone="dark" size="sm" onClick={() => loadFile('employees-sample.csv')}>Use the sample file</Button>
      </div>
      <Notice icon="Info">This demo reads a built-in 53-row sample so you can see mapping, validation and preview working end to end. Connecting a real parser is a drop-in change in this file.</Notice>
    </div>,

    /* 1 — map */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionLabel hint={fileName + ' · ' + rows.length + ' rows found'}>Map your columns</SectionLabel>
      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {TARGET_FIELDS.map(f => (
          <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{f.label}</span>
            <Icon name="ArrowRight" size={15} style={{ color: 'var(--text-muted-dark)' }} />
            <select value={mapping[f.key] || ''} onChange={e => setMapping(m => Object.assign({}, m, { [f.key]: e.target.value }))}
              style={Object.assign({}, window.inputStyle(false), { appearance: 'none', padding: '9px 12px', fontSize: 13 })}>
              <option value="">Not imported</option>
              {sourceColumns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </Card>
    </div>,

    /* 2 — validate */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionLabel hint="Rows with errors are skipped. Warnings import with fields left blank.">Validation results</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[['CircleCheck', okRows.length + ' employees ready to import', 'var(--nhr-turquoise)'],
          ['TriangleAlert', warnRows.length + ' employees require attention', 'var(--nhr-warning)'],
          ['CircleX', errRows.length + ' rows cannot be imported', 'var(--nhr-danger)']].map(([ic, text, color]) => (
          <Card key={text} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Icon name={ic} size={19} style={{ color }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', lineHeight: 1.45 }}>{text}</span>
          </Card>
        ))}
      </div>
      {(warnRows.length > 0 || errRows.length > 0) && (
        <Card tone="dark" padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {warnRows.concat(errRows).map(r => (
              <div key={r.row} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border-dark)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted-dark)', width: 46, flex: '0 0 auto' }}>Row {r.row}</span>
                <span style={{ fontSize: 13, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || 'Unnamed row'}
                </span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {r.issues.map(is => <Badge key={is.text} tone={is.level === 'error' ? 'danger' : 'warning'}>{is.text}</Badge>)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>,

    /* 3 — preview */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionLabel hint={importable.length + ' records will be created. Employee IDs are generated where blank.'}>Preview employees</SectionLabel>
      <Card tone="dark" padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Job title', 'Department', 'Start date'].map(h => (
                  <th key={h} scope="col" style={{
                    position: 'sticky', top: 0, background: 'var(--nhr-charcoal)', textAlign: 'left',
                    padding: '11px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                    color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {importable.slice(0, 40).map(r => (
                <tr key={r.row}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#fff', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{[r.data.firstName, r.data.lastName].filter(Boolean).join(' ')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{r.data.personalEmail}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{r.data.jobTitle || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{r.data.department || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{r.data.startDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {importable.length > 40 && <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>Showing the first 40 of {importable.length} records.</span>}
    </div>,

    /* 4 — done */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span style={{
          width: 52, height: 52, borderRadius: '50%', flex: '0 0 auto',
          background: 'rgba(0,229,212,.14)', color: 'var(--nhr-turquoise)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
        }}><Icon name="Check" size={26} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>{imported} employees imported</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>{errRows.length} rows were skipped because of errors.</span>
        </span>
      </Card>
      <Notice icon="Info">New records appear in your Employees list immediately. Rows imported with warnings have blank fields to complete.</Notice>
    </div>
  ];

  const footers = [
    null,
    <React.Fragment>
      <Button variant="secondary" tone="dark" onClick={() => setStep(0)} iconLeft={<Icon name="ArrowLeft" size={16} />}>Back</Button>
      <Button onClick={runValidation} iconRight={<Icon name="ArrowRight" size={18} />}>Validate Data</Button>
    </React.Fragment>,
    <React.Fragment>
      <Button variant="secondary" tone="dark" onClick={() => setStep(1)} iconLeft={<Icon name="ArrowLeft" size={16} />}>Back</Button>
      <Button onClick={() => setStep(3)} disabled={!importable.length} iconRight={<Icon name="ArrowRight" size={18} />}>Preview Employees</Button>
    </React.Fragment>,
    <React.Fragment>
      <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
      <Button variant="secondary" tone="dark" onClick={() => setStep(2)} iconLeft={<Icon name="ArrowLeft" size={16} />}>Back</Button>
      <Button onClick={doImport} iconRight={<Icon name="Check" size={18} />}>Import {importable.length} Employees</Button>
    </React.Fragment>,
    <Button onClick={onClose} iconRight={<Icon name="ArrowRight" size={18} />}>Done</Button>
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Import Employees" subtitle="Bring your existing team in from a spreadsheet." footer={footers[step]}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <StepRail steps={IMPORT_STEPS} current={step} furthest={step} onJump={setStep} />
        {bodies[step]}
      </div>
    </Drawer>
  );
}

Object.assign(window, { EmployeeImport, IMPORT_STEPS, TARGET_FIELDS });
