/* Employee profile — header, tabs, overview, timeline, documents, notes, activity. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const PROFILE_TABS = ['Overview', 'Personal Details', 'Employment', 'Attendance', 'Holiday & Leave', 'Absence',
  'Shifts & Rotas', 'Performance', 'Documents', 'Expenses', 'Training', 'Payroll', 'Notes', 'Activity'];

function KeyValue({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'rgba(245,255,255,.9)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-core)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '—'}</span>
    </div>
  );
}

function InfoCard({ title, rows, cols = 2, action }) {
  return (
    <DashboardCard title={title} action={action}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ',1fr)', gap: 16 }}>
        {rows.map(r => <KeyValue key={r[0]} label={r[0]} value={r[1]} mono={r[2]} />)}
      </div>
    </DashboardCard>
  );
}

function Timeline({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <div key={it.id || i} style={{ display: 'flex', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', marginTop: 6,
              background: i === 0 ? 'var(--nhr-turquoise)' : 'rgba(255,255,255,.22)',
              boxShadow: i === 0 ? '0 0 10px 1px rgba(0,229,212,.7)' : 'none'
            }} />
            {i < items.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--border-dark)', marginTop: 4 }} />}
          </div>
          <div style={{ paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{it.action}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
              {new Date(it.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}{new Date(it.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              {it.user ? ' · ' + it.user : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlankTab({ name }) {
  return (
    <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <Icon name="LayoutPanelTop" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
      <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{name}</span>
      <span style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 520, color: 'var(--text-body-dark)' }}>
        This tab reads from the {name.toLowerCase()} module. No source design was supplied for it, so it is left blank rather than invented — the employee record already carries the fields it needs.
      </span>
    </Card>
  );
}

function DocumentsTab({ employee, onChange }) {
  const S = window.EmployeeStore;
  const [category, setCategory] = React.useState('Employment contract');
  const [expiry, setExpiry] = React.useState('');
  const canWrite = S.can('documents.write');
  const rows = (employee.documents || []).map(d => ({
    id: d.id,
    name: <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="FileText" size={15} style={{ color: 'var(--nhr-turquoise)' }} /><span style={{ color: '#fff', fontWeight: 600 }}>{d.name}</span></span>,
    category: d.category, uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
    expiry: d.expiryDate || '—',
    status: <Badge tone={window.DOC_TONE[d.status] || 'dark'}>{d.status}</Badge>,
    actions: (
      <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <IconButton tone="dark" size={30} label="Preview"><Icon name="Eye" size={14} /></IconButton>
        <IconButton tone="dark" size={30} label="Download"><Icon name="Download" size={14} /></IconButton>
        {canWrite && <IconButton tone="dark" size={30} label="Delete" onClick={() => { S.removeDocument(employee.id, d.id); onChange(); }}><Icon name="Trash2" size={14} /></IconButton>}
      </span>
    )
  }));
  const expiring = (employee.documents || []).filter(d => d.status === 'Expiring soon' || d.status === 'Expired');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {expiring.length > 0 && (
        <Notice icon="TriangleAlert" tone="warn">
          {expiring.length} document{expiring.length > 1 ? 's' : ''} need attention: {expiring.map(d => d.category).join(', ')}. Reminders are sent to the employee and their manager.
        </Notice>
      )}
      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormGrid cols={3}>
            <SelectField label="Category" value={category} onChange={setCategory} options={S.DOC_CATEGORIES} placeholder="Select category" />
            <TextField label="Expiry date" type="date" value={expiry} onChange={setExpiry} />
            <Field label="File">
              <label style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 43, cursor: 'pointer',
                border: '1px dashed rgba(0,229,212,.45)', borderRadius: 'var(--radius-btn)',
                background: 'rgba(0,229,212,.05)', fontSize: 13, fontWeight: 700, color: 'var(--nhr-turquoise)'
              }}>
                <Icon name="Upload" size={15} />Upload document
                <input type="file" style={{ display: 'none' }} onChange={ev => {
                  const f = ev.target.files && ev.target.files[0];
                  if (!f) return;
                  S.addDocument(employee.id, { name: f.name, category, expiryDate: expiry, status: expiry ? 'Valid' : 'Pending review' });
                  setExpiry(''); ev.target.value = ''; onChange();
                }} />
              </label>
            </Field>
          </FormGrid>
        </Card>
      )}
      <DashboardCard title={'Documents (' + (employee.documents || []).length + ')'} padding={16}>
        {rows.length ? (
          <DataTable compact columns={[
            { key: 'name', label: 'Document' }, { key: 'category', label: 'Category' },
            { key: 'uploadedBy', label: 'Uploaded by' }, { key: 'uploadedAt', label: 'Uploaded', mono: true },
            { key: 'expiry', label: 'Expires', mono: true }, { key: 'status', label: 'Status' },
            { key: 'actions', label: '', align: 'right' }
          ]} rows={rows} />
        ) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No documents uploaded yet.</span>}
      </DashboardCard>
    </div>
  );
}

function NotesTab({ employee, onChange }) {
  const S = window.EmployeeStore;
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [visibility, setVisibility] = React.useState('HR only');
  const canWrite = S.can('notes.write');
  if (!S.can('notes.read')) return <BlankTab name="Notes" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Notice icon="EyeOff">Notes are internal. They are never shown to the employee and are excluded from exports shared outside HR.</Notice>
      {canWrite && (
        <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormGrid>
            <TextField label="Note title" value={title} onChange={setTitle} placeholder="Phased return agreed" />
            <SelectField label="Visibility" value={visibility} onChange={setVisibility} options={['HR only', 'HR and manager', 'Super Admin only']} placeholder="Select visibility" />
            <TextareaField label="Note" value={content} onChange={setContent} rows={3} span={2} placeholder="Keep it factual and relevant to employment." />
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" disabled={!title || !content} iconLeft={<Icon name="Plus" size={15} />}
              onClick={() => { S.addNote(employee.id, { title, content, visibility }); setTitle(''); setContent(''); onChange(); }}>
              Add Note
            </Button>
          </div>
        </Card>
      )}
      {(employee.notes || []).length ? (employee.notes || []).map(n => (
        <Card key={n.id} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{n.title}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{n.createdBy} · {n.createdAt} · {n.visibility}</span>
            </span>
            <Badge tone="dark">Internal</Badge>
            {canWrite && <IconButton tone="dark" size={30} label="Delete note" onClick={() => { S.removeNote(employee.id, n.id); onChange(); }}><Icon name="Trash2" size={14} /></IconButton>}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>{n.content}</p>
        </Card>
      )) : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No notes yet.</span>}
    </div>
  );
}

function PayrollTab({ employee }) {
  const S = window.EmployeeStore;
  if (!S.can('payroll.read')) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="Lock" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Payroll information is restricted</span>
        <span style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 480, color: 'var(--text-body-dark)' }}>
          Only authorised administrators can view payroll information. Your current role is <strong style={{ color: '#fff' }}>{S.session.role}</strong>.
        </span>
      </Card>
    );
  }
  const p = employee.payroll || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Notice icon="Lock">Only authorised administrators can view payroll information.</Notice>
      <InfoCard title="Pay" rows={[
        ['Payroll ID', p.payrollId, true], ['Pay frequency', p.payFrequency],
        ['Salary', p.salary ? '£' + Number(p.salary).toLocaleString('en-GB') : '—', true],
        ['Hourly rate', p.hourlyRate ? '£' + p.hourlyRate : '—', true],
        ['Payment method', p.paymentMethod], ['Tax code', p.taxCode, true]
      ]} cols={3} />
      <DashboardCard title="Bank information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <KeyValue label="Account name" value={p.accountName} />
          <SecureValue label="Account number" masked={'••••••' + (p.accountNumberLast4 || '0000')} value={null} />
          <SecureValue label="Sort code" masked="••-••-••" value={null} />
        </div>
        <div style={{ marginTop: 14 }}>
          <SecureValue label="National Insurance number" masked="QQ •• •• •• C" value={employee.nationalInsurance} />
        </div>
      </DashboardCard>
    </div>
  );
}

function OverviewTab({ employee, managerName }) {
  const S = window.EmployeeStore;
  const onboarding = employee.onboarding || {};
  const keys = [['contract', 'Employment contract'], ['rightToWork', 'Right to work verified'], ['emergencyContact', 'Emergency contact'], ['manager', 'Manager assigned'], ['payroll', 'Payroll information']];
  const done = keys.filter(k => onboarding[k[0]]).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
        <StatTile label="Annual leave balance" value="18.5" caption={'of ' + employee.annualLeaveEntitlement + ' days'} icon={<Icon name="Plane" size={18} />} />
        <StatTile label="Attendance (30 days)" value="97.2%" delta="+1.4%" caption="vs previous period" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Sick days (12 months)" value="3" direction="down" delta="-2" caption="vs last year" icon={<Icon name="Thermometer" size={18} />} />
        <StatTile label="Open expenses" value="£184" caption="2 claims pending" icon={<Icon name="ReceiptText" size={18} />} />
      </div>
      <div className="profile-split" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InfoCard title="Employment summary" rows={[
            ['Status', <StatusBadge status={employee.employmentStatus} />],
            ['Start date', employee.startDate, true],
            ['Department', employee.department],
            ['Manager', managerName],
            ['Working hours', employee.hoursPerWeek + ' / week'],
            ['Working pattern', employee.workingPattern],
            ['Location', employee.location],
            ['Employment type', employee.employmentType]
          ]} cols={4} />
          <DashboardCard title="Employee timeline">
            <Timeline items={(employee.activity || []).slice(0, 6)} />
          </DashboardCard>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DashboardCard title="Onboarding">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ProgressMeter label="Complete" value={Math.round(done / keys.length * 100)} valueLabel={done + ' / ' + keys.length} />
              {keys.map(([k, label]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: onboarding[k] ? 'rgba(245,255,255,.86)' : 'var(--text-muted-dark)' }}>
                  <Icon name={onboarding[k] ? 'CircleCheck' : 'Circle'} size={16} style={{ color: onboarding[k] ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />{label}
                </span>
              ))}
            </div>
          </DashboardCard>
          <DashboardCard title="Coming up">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Next shift', 'Tomorrow, 08:00–16:30'], ['Next review', '14 Oct 2026'], ['Probation ends', employee.probationEndDate || 'Not applicable']].map(([k, v]) => (
                <span key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
                  <span style={{ color: 'var(--text-muted-dark)' }}>{k}</span>
                  <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </span>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function EmployeeProfile({ employeeId, onBack, onEdit }) {
  const S = window.EmployeeStore;
  const [, force] = React.useState(0);
  const refresh = () => force(n => n + 1);
  React.useEffect(() => S.subscribe(refresh), []);
  React.useEffect(() => window.EmployeeRecords.subscribe(refresh), []);
  const [tab, setTab] = React.useState('Overview');

  const employee = S.get(employeeId);
  if (!employee) return <Card tone="dark" padding={22}><span style={{ color: 'var(--text-muted-dark)' }}>Employee not found.</span></Card>;
  const manager = employee.managerId ? S.get(employee.managerId) : null;
  const managerName = manager ? S.fullName(manager) : 'Not assigned';

  const body = {
    'Overview': <OverviewTab employee={employee} managerName={managerName} />,
    'Personal Details': (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InfoCard title="Personal" rows={[
          ['Full name', [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')],
          ['Preferred name', employee.preferredName], ['Date of birth', employee.dateOfBirth, true],
          ['Gender', employee.gender], ['Pronouns', employee.pronouns], ['Nationality', employee.nationality]
        ]} cols={3} />
        <InfoCard title="Contact" rows={[
          ['Personal email', employee.personalEmail], ['Work email', employee.workEmail],
          ['Mobile', employee.mobile, true], ['Home phone', employee.homePhone, true]
        ]} />
        <InfoCard title="Address" rows={[
          ['Line 1', employee.address.line1], ['Line 2', employee.address.line2],
          ['City', employee.address.city], ['County', employee.address.county],
          ['Postcode', employee.address.postcode, true], ['Country', employee.address.country]
        ]} cols={3} />
        <DashboardCard title="Emergency contacts">
          {(employee.emergencyContacts || []).length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {employee.emergencyContacts.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 14, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{c.relationship}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(245,255,255,.86)' }}>{c.phone}</span>
                </div>
              ))}
            </div>
          ) : <Notice icon="TriangleAlert" tone="warn">No emergency contact on record. This is required before onboarding is complete.</Notice>}
        </DashboardCard>
        <InfoCard title="Right to work" rows={[
          ['Status', <Badge tone={employee.rightToWorkStatus === 'Verified' ? 'success' : employee.rightToWorkStatus === 'Expired' ? 'danger' : 'warning'}>{employee.rightToWorkStatus}</Badge>],
          ['Expiry', employee.rightToWorkExpiry || 'Not applicable', true]
        ]} />
      </div>
    ),
    'Employment': (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InfoCard title="Role" rows={[
          ['Job title', employee.jobTitle], ['Department', employee.department], ['Location', employee.location],
          ['Manager', managerName], ['Employment type', employee.employmentType], ['Status', <StatusBadge status={employee.employmentStatus} />]
        ]} cols={3} />
        <InfoCard title="Dates" rows={[
          ['Start date', employee.startDate, true], ['Probation ends', employee.probationEndDate || '—', true],
          ['Contract ends', employee.contractEndDate || 'Permanent', true]
        ]} cols={3} />
        <InfoCard title="Working arrangements" rows={[
          ['Pattern', employee.workingPattern], ['Hours per week', String(employee.hoursPerWeek)],
          ['Annual leave', employee.annualLeaveEntitlement + ' days'], ['Category', employee.employeeCategory],
          ['Cost centre', employee.costCentre, true], ['Branch', employee.branch]
        ]} cols={3} />
        <InfoCard title="Record" rows={[
          ['Created', new Date(employee.createdAt).toLocaleDateString('en-GB'), true], ['Created by', employee.createdBy],
          ['Last updated', new Date(employee.updatedAt).toLocaleDateString('en-GB'), true], ['Updated by', employee.updatedBy]
        ]} />
      </div>
    ),
    'Documents': <DocumentsTab employee={employee} onChange={refresh} />,
    'Notes': <NotesTab employee={employee} onChange={refresh} />,
    'Payroll': <PayrollTab employee={employee} />,
    'Attendance': <AttendanceTab employee={employee} onChange={refresh} />,
    'Holiday & Leave': <LeaveTab employee={employee} onChange={refresh} />,
    'Absence': <AbsenceTab employee={employee} onChange={refresh} />,
    'Shifts & Rotas': <RotaTab employee={employee} onChange={refresh} />,
    'Performance': <PerformanceTab employee={employee} onChange={refresh} />,
    'Expenses': <ExpensesTab employee={employee} onChange={refresh} />,
    'Training': <TrainingTab employee={employee} onChange={refresh} />,
    'Activity': (
      <DashboardCard title={'Activity log (' + (employee.activity || []).length + ')'}>
        <Timeline items={employee.activity || []} />
      </DashboardCard>
    )
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" onClick={onBack} style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'none', border: 'none', color: 'var(--nhr-turquoise)', cursor: 'pointer',
        fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: 700, padding: 0, whiteSpace: 'nowrap'
      }}><Icon name="ArrowLeft" size={15} />All employees</button>

      <Card tone="dark" padding="var(--card-padding-lg)" style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', width: 280, height: 280, right: -90, top: -140,
          background: 'radial-gradient(circle,rgba(0,229,212,.13),transparent 62%)', pointerEvents: 'none'
        }} />
        <div className="profile-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {employee.profilePhoto
            ? <img src={employee.profilePhoto} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-dark)' }} />
            : <Avatar employee={employee} size={72} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>{S.fullName(employee)}</h2>
              <StatusBadge status={employee.employmentStatus} />
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-body-dark)' }}>
              {employee.jobTitle} · {employee.department} · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{employee.employeeId}</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
              Updated by {employee.updatedBy} on {new Date(employee.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {S.can('employees.write') && <Button size="sm" onClick={() => onEdit && onEdit(employee.id)} iconLeft={<Icon name="Pencil" size={15} />}>Edit Employee</Button>}
            <Button size="sm" variant="secondary" tone="dark" onClick={() => setTab('Documents')} iconLeft={<Icon name="Upload" size={15} />}>Add Document</Button>
            <Button size="sm" variant="secondary" tone="dark" onClick={() => setTab('Notes')} iconLeft={<Icon name="StickyNote" size={15} />}>Add Note</Button>
            <Menu items={[
              { label: 'Set to Active', icon: 'CircleCheck', onClick: () => S.setStatus(employee.id, 'Active') },
              { label: 'Set to On Leave', icon: 'Plane', onClick: () => S.setStatus(employee.id, 'On Leave') },
              { label: 'Set to Inactive', icon: 'CircleSlash', onClick: () => S.setStatus(employee.id, 'Inactive') },
              { divider: true, key: 'd1' },
              { label: 'Archive employee', icon: 'Archive', danger: true, onClick: () => { S.archive(employee.id); onBack && onBack(); } }
            ]} />
          </div>
        </div>
      </Card>

      <div style={{ borderBottom: '1px solid var(--border-dark)', overflowX: 'auto' }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
          {PROFILE_TABS.map(t => {
            const active = t === tab;
            return (
              <button key={t} type="button" role="tab" aria-selected={active} onClick={() => setTab(t)} style={{
                background: 'none', border: 'none', borderBottom: '2px solid ' + (active ? 'var(--nhr-turquoise)' : 'transparent'),
                padding: '12px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
                color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
                transition: 'color var(--dur-base) var(--ease-out)'
              }}>{t}</button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">{body[tab] || <BlankTab name={tab} />}</div>
    </div>
  );
}

Object.assign(window, { EmployeeProfile, PROFILE_TABS, KeyValue, InfoCard, Timeline, DocumentsTab, NotesTab, PayrollTab, OverviewTab, BlankTab });
