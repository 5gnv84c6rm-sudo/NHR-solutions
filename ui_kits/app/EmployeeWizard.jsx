/* Add New Employee — six-step wizard, draft save, validation, success screen. */
const { Button, Badge, Card, IconButton, ProgressMeter } = window.NHRSolutionDesignSystem_0db691;

const WIZARD_STEPS = ['Personal Details', 'Employment Details', 'Contact & Emergency', 'Payroll Information', 'Documents', 'Review & Create'];
const DRAFT_KEY = 'nhr-employee-draft';

function validateStep(step, d) {
  const e = {};
  if (step === 0) {
    if (!d.firstName) e.firstName = 'First name is required';
    if (!d.lastName) e.lastName = 'Last name is required';
    if (!d.employeeId) e.employeeId = 'Employee ID is required';
  }
  if (step === 1) {
    if (!d.jobTitle) e.jobTitle = 'Job title is required';
    if (!d.department) e.department = 'Department is required';
    if (!d.employmentType) e.employmentType = 'Employment type is required';
    if (!d.startDate) e.startDate = 'Start date is required';
  }
  if (step === 2) {
    if (!d.personalEmail) e.personalEmail = 'Personal email is required';
    else if (!/.+@.+\..+/.test(d.personalEmail)) e.personalEmail = 'Enter a valid email address';
    if (!d.mobile) e.mobile = 'Mobile number is required';
    const c = (d.emergencyContacts || [])[0] || {};
    if (!c.name) e.ecName = 'Emergency contact name is required';
    if (!c.relationship) e.ecRelationship = 'Relationship is required';
    if (!c.phone) e.ecPhone = 'Phone number is required';
  }
  return e;
}

function PhotoUpload({ value, onChange, employee }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {value ? (
        <img src={value} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-dark)' }} />
      ) : (
        <span style={{
          width: 64, height: 64, borderRadius: '50%', border: '1px dashed rgba(0,229,212,.45)',
          background: 'rgba(0,229,212,.06)', color: 'var(--nhr-turquoise)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 700
        }}>{window.EmployeeStore.initials(employee).toUpperCase() || <Icon name="User" size={22} />}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', cursor: 'pointer',
            border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)',
            fontSize: 13, fontWeight: 700, color: '#fff'
          }}>
            <Icon name="Upload" size={14} />Upload photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={ev => {
              const f = ev.target.files && ev.target.files[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => onChange(r.result);
              r.readAsDataURL(f);
            }} />
          </label>
          {value && <Button size="sm" variant="ghost" tone="dark" onClick={() => onChange(null)}>Remove</Button>}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>Square image, at least 200×200. Optional.</span>
      </div>
    </div>
  );
}

function EmergencyContactRow({ contact, index, onChange, onRemove, errors, first }) {
  const set = (k, v) => onChange(Object.assign({}, contact, { [k]: v }));
  return (
    <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Contact {index + 1}</span>
        {!first && <IconButton tone="dark" size={30} label="Remove contact" onClick={onRemove}><Icon name="Trash2" size={14} /></IconButton>}
      </div>
      <FormGrid>
        <TextField label="Name" required value={contact.name} onChange={v => set('name', v)} error={first ? errors.ecName : undefined} />
        <TextField label="Relationship" required value={contact.relationship} onChange={v => set('relationship', v)} error={first ? errors.ecRelationship : undefined} />
        <TextField label="Phone number" required value={contact.phone} onChange={v => set('phone', v)} error={first ? errors.ecPhone : undefined} />
        <TextField label="Alternative phone" value={contact.altPhone} onChange={v => set('altPhone', v)} />
        <TextField label="Email" type="email" value={contact.email} onChange={v => set('email', v)} span={2} />
      </FormGrid>
    </Card>
  );
}

function DocumentRow({ doc, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border-dark)' }}>
      <Icon name="FileText" size={16} style={{ color: 'var(--nhr-turquoise)' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{doc.category}{doc.expiryDate ? ' · expires ' + doc.expiryDate : ''}</span>
      </span>
      <Badge tone={window.DOC_TONE[doc.status] || 'dark'}>{doc.status}</Badge>
      {onRemove && <IconButton tone="dark" size={30} label="Remove document" onClick={onRemove}><Icon name="Trash2" size={14} /></IconButton>}
    </div>
  );
}

function EmployeeWizard({ open, onClose, onCreated }) {
  const S = window.EmployeeStore;
  const [step, setStep] = React.useState(0);
  const [furthest, setFurthest] = React.useState(0);
  const [errors, setErrors] = React.useState({});
  const [created, setCreated] = React.useState(null);
  const [draft, setDraft] = React.useState(() => Object.assign(S.blank(), { employeeId: '' }));
  const [autoId, setAutoId] = React.useState(true);
  const [pendingDoc, setPendingDoc] = React.useState({ name: '', category: 'Employment contract', expiryDate: '' });

  React.useEffect(() => {
    if (!open) return;
    let base = Object.assign(S.blank(), { employeeId: S.nextEmployeeId ? '' : '' });
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) base = Object.assign(base, JSON.parse(raw));
    } catch (err) { /* ignore malformed draft */ }
    if (!base.employeeId) base.employeeId = nextId();
    if (!base.emergencyContacts.length) base.emergencyContacts = [{ id: 'ec-1', name: '', relationship: '', phone: '', altPhone: '', email: '' }];
    setDraft(base); setStep(0); setFurthest(0); setErrors({}); setCreated(null);
  }, [open]);

  function nextId() {
    const all = S.list({ includeArchived: true });
    const nums = all.map(e => parseInt(String(e.employeeId).replace(/\D/g, ''), 10) || 0);
    return 'NHR-' + String((nums.length ? Math.max.apply(null, nums) : 100) + 1).padStart(6, '0');
  }

  const set = (patch) => setDraft(d => Object.assign({}, d, patch));
  const setPayroll = (patch) => setDraft(d => Object.assign({}, d, { payroll: Object.assign({}, d.payroll, patch) }));
  const setAddress = (patch) => setDraft(d => Object.assign({}, d, { address: Object.assign({}, d.address, patch) }));

  function goNext() {
    const errs = validateStep(step, draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const n = Math.min(step + 1, WIZARD_STEPS.length - 1);
    setStep(n); setFurthest(f => Math.max(f, n));
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (err) { /* storage full */ }
    onClose && onClose();
  }
  function submit() {
    let errs = {};
    [0, 1, 2].forEach(i => { errs = Object.assign(errs, validateStep(i, draft)); });
    if (Object.keys(errs).length) { setErrors(errs); setStep(0); return; }
    const rec = S.create(draft);
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
    setCreated(rec);
    onCreated && onCreated(rec);
  }

  const managers = S.managers();

  /* ---------- success / onboarding ---------- */
  if (created) {
    const checks = [
      ['Employee record created', true],
      ['Upload employment contract', created.onboarding.contract],
      ['Verify right to work', created.onboarding.rightToWork],
      ['Add emergency contact', created.onboarding.emergencyContact],
      ['Assign manager', created.onboarding.manager],
      ['Add payroll information', created.onboarding.payroll]
    ];
    const done = checks.filter(c => c[1]).length;
    return (
      <Drawer open={open} onClose={onClose} title="Employee Created Successfully" subtitle="The record is live in your Employees list."
        footer={<React.Fragment>
          <Button variant="ghost" tone="dark" onClick={() => { setCreated(null); setDraft(Object.assign(S.blank(), { employeeId: nextId(), emergencyContacts: [{ id: 'ec-1', name: '', relationship: '', phone: '', altPhone: '', email: '' }] })); setStep(0); setFurthest(0); }}>Add Another Employee</Button>
          <Button variant="secondary" tone="dark" onClick={onClose}>Continue Onboarding</Button>
          <Button onClick={() => { onClose && onClose(); window.dispatchEvent(new CustomEvent('nhr-open-employee', { detail: created.id })); }} iconRight={<Icon name="ArrowRight" size={18} />}>Go to Employee Profile</Button>
        </React.Fragment>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{
              width: 52, height: 52, borderRadius: '50%', flex: '0 0 auto',
              background: 'rgba(0,229,212,.14)', color: 'var(--nhr-turquoise)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}><Icon name="Check" size={26} /></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>{S.fullName(created)}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>
                {created.jobTitle} · {created.department} · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{created.employeeId}</span>
              </span>
            </span>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionLabel hint="Finish these to complete the record.">Next steps</SectionLabel>
            <ProgressMeter label="Onboarding complete" value={Math.round(done / checks.length * 100)} valueLabel={done + ' / ' + checks.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {checks.map(([label, ok]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: '1px solid var(--border-dark)' }}>
                  <Icon name={ok ? 'CircleCheck' : 'Circle'} size={17} style={{ color: ok ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
                  <span style={{ fontSize: 14, color: ok ? 'rgba(245,255,255,.88)' : 'var(--text-muted-dark)', textDecoration: 'none' }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    );
  }

  /* ---------- steps ---------- */
  const steps = [
    /* 0 — Personal */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="Who they are. Only name and employee ID are required to start.">Personal details</SectionLabel>
      <PhotoUpload value={draft.profilePhoto} onChange={v => set({ profilePhoto: v })} employee={draft} />
      <FormGrid>
        <TextField label="First name" required value={draft.firstName} onChange={v => set({ firstName: v })} error={errors.firstName} />
        <TextField label="Last name" required value={draft.lastName} onChange={v => set({ lastName: v })} error={errors.lastName} />
        <TextField label="Middle name" value={draft.middleName} onChange={v => set({ middleName: v })} />
        <TextField label="Preferred name" value={draft.preferredName} onChange={v => set({ preferredName: v })} hint="Used across the workspace if set" />
        <TextField label="Date of birth" type="date" value={draft.dateOfBirth} onChange={v => set({ dateOfBirth: v })} />
        <SelectField label="Gender" value={draft.gender} onChange={v => set({ gender: v })} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} />
        <TextField label="Pronouns" value={draft.pronouns} onChange={v => set({ pronouns: v })} placeholder="she/her" />
        <TextField label="Nationality" value={draft.nationality} onChange={v => set({ nationality: v })} />
      </FormGrid>
      <SectionLabel>Identifiers</SectionLabel>
      <FormGrid>
        <TextField label="Employee ID" required mono value={draft.employeeId} disabled={autoId} error={errors.employeeId}
          onChange={v => set({ employeeId: v })} hint={autoId ? 'Generated automatically' : 'Must be unique'} />
        <Field label="ID generation">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 43 }}>
            <Switch tone="dark" label="Generate automatically" checked={autoId}
              onChange={e => { setAutoId(e.target.checked); if (e.target.checked) set({ employeeId: nextId() }); }} />
          </div>
        </Field>
        <TextField label="National Insurance number" mono value={draft.nationalInsurance} onChange={v => set({ nationalInsurance: v })}
          hint="Sensitive — masked for anyone without payroll access" />
        <SelectField label="Right-to-work status" value={draft.rightToWorkStatus} onChange={v => set({ rightToWorkStatus: v })} options={S.RTW_STATUSES} placeholder="Select status" />
        <TextField label="Right-to-work expiry" type="date" value={draft.rightToWorkExpiry} onChange={v => set({ rightToWorkExpiry: v })} />
      </FormGrid>
      <Notice icon="ShieldCheck">National Insurance numbers, payroll and bank details are permission-controlled. Managers see employment data only.</Notice>
    </div>,

    /* 1 — Employment */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="Role, reporting line and working pattern.">Employment details</SectionLabel>
      <FormGrid>
        <TextField label="Job title" required value={draft.jobTitle} onChange={v => set({ jobTitle: v })} error={errors.jobTitle} />
        <SelectField label="Department" required value={draft.department} onChange={v => set({ department: v })} options={S.DEPARTMENTS} error={errors.department} />
        <TextField label="Location" value={draft.location} onChange={v => set({ location: v })} placeholder="Manchester" />
        <SelectField label="Reporting manager" value={draft.managerId || ''} onChange={v => set({ managerId: v || null })} options={managers} placeholder="No manager assigned" />
        <SelectField label="Employment type" required value={draft.employmentType} onChange={v => set({ employmentType: v })} options={S.EMPLOYMENT_TYPES} error={errors.employmentType} />
        <SelectField label="Employment status" value={draft.employmentStatus} onChange={v => set({ employmentStatus: v })} options={['Active', 'Probation', 'On Leave', 'Pending', 'Inactive']} placeholder="Select status" />
        <TextField label="Start date" required type="date" value={draft.startDate} onChange={v => set({ startDate: v })} error={errors.startDate} />
        <TextField label="Probation end date" type="date" value={draft.probationEndDate} onChange={v => set({ probationEndDate: v })} />
        <TextField label="Contract end date" type="date" value={draft.contractEndDate} onChange={v => set({ contractEndDate: v })} hint="Fixed-term and contractor records only" />
        <SelectField label="Working pattern" value={draft.workingPattern} onChange={v => set({ workingPattern: v })} options={S.WORKING_PATTERNS} placeholder="Select pattern" />
        <TextField label="Hours per week" type="number" value={draft.hoursPerWeek} onChange={v => set({ hoursPerWeek: v })} />
        <TextField label="Annual leave entitlement (days)" type="number" value={draft.annualLeaveEntitlement} onChange={v => set({ annualLeaveEntitlement: v })} />
        <TextField label="Employee category" value={draft.employeeCategory} onChange={v => set({ employeeCategory: v })} />
        <TextField label="Cost centre" value={draft.costCentre} onChange={v => set({ costCentre: v })} mono />
        <TextField label="Branch / workplace" value={draft.branch} onChange={v => set({ branch: v })} span={2} />
      </FormGrid>
    </div>,

    /* 2 — Contact & emergency */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="How to reach them, and who to call in an emergency.">Contact details</SectionLabel>
      <FormGrid>
        <TextField label="Personal email" required type="email" value={draft.personalEmail} onChange={v => set({ personalEmail: v })} error={errors.personalEmail} />
        <TextField label="Work email" type="email" value={draft.workEmail} onChange={v => set({ workEmail: v })} />
        <TextField label="Mobile number" required value={draft.mobile} onChange={v => set({ mobile: v })} error={errors.mobile} />
        <TextField label="Home phone" value={draft.homePhone} onChange={v => set({ homePhone: v })} />
      </FormGrid>
      <SectionLabel>Address</SectionLabel>
      <FormGrid>
        <TextField label="Address line 1" value={draft.address.line1} onChange={v => setAddress({ line1: v })} span={2} />
        <TextField label="Address line 2" value={draft.address.line2} onChange={v => setAddress({ line2: v })} span={2} />
        <TextField label="City" value={draft.address.city} onChange={v => setAddress({ city: v })} />
        <TextField label="County" value={draft.address.county} onChange={v => setAddress({ county: v })} />
        <TextField label="Postcode" value={draft.address.postcode} onChange={v => setAddress({ postcode: v })} mono />
        <TextField label="Country" value={draft.address.country} onChange={v => setAddress({ country: v })} />
      </FormGrid>
      <SectionLabel hint="At least one contact is required. Add more if the employee provides them.">Emergency contacts</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(draft.emergencyContacts || []).map((c, i) => (
          <EmergencyContactRow key={c.id || i} contact={c} index={i} first={i === 0} errors={errors}
            onChange={next => set({ emergencyContacts: draft.emergencyContacts.map((x, j) => j === i ? next : x) })}
            onRemove={() => set({ emergencyContacts: draft.emergencyContacts.filter((x, j) => j !== i) })} />
        ))}
        <Button variant="secondary" tone="dark" size="sm" iconLeft={<Icon name="Plus" size={15} />}
          onClick={() => set({ emergencyContacts: draft.emergencyContacts.concat([{ id: 'ec-' + Date.now(), name: '', relationship: '', phone: '', altPhone: '', email: '' }]) })}>
          Add another contact
        </Button>
      </div>
    </div>,

    /* 3 — Payroll */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="Only Super Admins and HR Admins can see this section once the record exists.">Payroll information</SectionLabel>
      <Notice icon="Lock">Only authorised administrators can view payroll information. Bank details are stored masked and are never shown in full in the interface.</Notice>
      {!S.can('payroll.write') && !S.can('payroll.read') ? (
        <Card tone="dark" padding={20}><span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>Your role does not have payroll access. You can create the employee and payroll can be added later by an administrator.</span></Card>
      ) : (
        <React.Fragment>
          <FormGrid>
            <TextField label="Payroll ID" mono value={draft.payroll.payrollId} onChange={v => setPayroll({ payrollId: v })} />
            <SelectField label="Pay frequency" value={draft.payroll.payFrequency} onChange={v => setPayroll({ payFrequency: v })} options={S.PAY_FREQUENCIES} placeholder="Select frequency" />
            <TextField label="Salary (£ per year)" type="number" value={draft.payroll.salary} onChange={v => setPayroll({ salary: v })} />
            <TextField label="Hourly rate (£)" type="number" value={draft.payroll.hourlyRate} onChange={v => setPayroll({ hourlyRate: v })} hint="For hourly and casual workers" />
            <SelectField label="Payment method" value={draft.payroll.paymentMethod} onChange={v => setPayroll({ paymentMethod: v })} options={['Bank transfer', 'Cheque', 'Other']} placeholder="Select method" />
            <TextField label="Tax code" mono value={draft.payroll.taxCode} onChange={v => setPayroll({ taxCode: v })} placeholder="1257L" />
          </FormGrid>
          <SectionLabel hint="Enter the last four digits only. Full bank details are collected through your payroll provider, not here.">Bank information</SectionLabel>
          <FormGrid>
            <TextField label="Account name" value={draft.payroll.accountName} onChange={v => setPayroll({ accountName: v })} />
            <TextField label="Account number (last 4)" mono value={draft.payroll.accountNumberLast4} onChange={v => setPayroll({ accountNumberLast4: v.slice(0, 4) })} placeholder="1234" />
          </FormGrid>
        </React.Fragment>
      )}
    </div>,

    /* 4 — Documents */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="Attach what you have now — the rest can be uploaded from the employee profile.">Documents</SectionLabel>
      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGrid>
          <SelectField label="Category" value={pendingDoc.category} onChange={v => setPendingDoc(p => Object.assign({}, p, { category: v }))} options={S.DOC_CATEGORIES} placeholder="Select category" />
          <TextField label="Expiry date" type="date" value={pendingDoc.expiryDate} onChange={v => setPendingDoc(p => Object.assign({}, p, { expiryDate: v }))} hint="Leave blank if it does not expire" />
        </FormGrid>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 20px', cursor: 'pointer',
          border: '1px dashed rgba(0,229,212,.4)', borderRadius: 'var(--radius-md)', background: 'rgba(0,229,212,.04)', textAlign: 'center'
        }}>
          <Icon name="Upload" size={22} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Choose a file to attach</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>PDF, JPG or PNG. Files are held in this demo session only.</span>
          <input type="file" style={{ display: 'none' }} onChange={ev => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            set({ documents: [{ id: 'doc-' + Date.now(), name: f.name, category: pendingDoc.category, uploadedBy: S.session.name, uploadedAt: S.today(), expiryDate: pendingDoc.expiryDate, status: pendingDoc.expiryDate ? 'Valid' : 'Pending review' }].concat(draft.documents || []) });
            ev.target.value = '';
          }} />
        </label>
      </Card>
      {(draft.documents || []).length ? (
        <div>{draft.documents.map(d => (
          <DocumentRow key={d.id} doc={d} onRemove={() => set({ documents: draft.documents.filter(x => x.id !== d.id) })} />
        ))}</div>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>No documents attached yet.</span>
      )}
    </div>,

    /* 5 — Review */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel hint="Check the record before it is created. Everything remains editable afterwards.">Review &amp; create</SectionLabel>
      {[['Personal', [['Name', [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(' ') || '—'], ['Employee ID', draft.employeeId], ['Date of birth', draft.dateOfBirth || '—'], ['Right to work', draft.rightToWorkStatus]]],
        ['Employment', [['Job title', draft.jobTitle || '—'], ['Department', draft.department || '—'], ['Type', draft.employmentType], ['Start date', draft.startDate || '—'], ['Manager', (managers.find(m => m.id === draft.managerId) || {}).label || 'Not assigned'], ['Hours / week', String(draft.hoursPerWeek || '—')]]],
        ['Contact', [['Personal email', draft.personalEmail || '—'], ['Mobile', draft.mobile || '—'], ['City', draft.address.city || '—'], ['Emergency contact', ((draft.emergencyContacts || [])[0] || {}).name || '—']]],
        ['Payroll', [['Payroll ID', draft.payroll.payrollId || '—'], ['Frequency', draft.payroll.payFrequency], ['Salary', draft.payroll.salary ? '£' + Number(draft.payroll.salary).toLocaleString('en-GB') : '—'], ['Tax code', draft.payroll.taxCode || '—']]]
      ].map(([title, rows]) => (
        <Card key={title} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{title}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {rows.map(([k, v]) => (
              <span key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{k}</span>
                <span style={{ fontSize: 13.5, color: 'rgba(245,255,255,.88)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
              </span>
            ))}
          </div>
        </Card>
      ))}
      <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Documents ({(draft.documents || []).length})</span>
        {(draft.documents || []).length ? draft.documents.map(d => <DocumentRow key={d.id} doc={d} />) : <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>None attached.</span>}
      </Card>
      {Object.keys(errors).length > 0 && <Notice icon="TriangleAlert" tone="danger">Some required fields are missing. Go back to the highlighted steps to complete them.</Notice>}
    </div>
  ];

  const last = step === WIZARD_STEPS.length - 1;

  return (
    <Drawer open={open} onClose={onClose} title="Add New Employee"
      subtitle="Create a complete employee record and get them set up in NHR Solution."
      footer={<React.Fragment>
        <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
        <Button variant="ghost" tone="dark" onClick={saveDraft} iconLeft={<Icon name="Save" size={16} />}>Save as Draft</Button>
        {step > 0 && <Button variant="secondary" tone="dark" onClick={() => setStep(step - 1)} iconLeft={<Icon name="ArrowLeft" size={16} />}>Back</Button>}
        {last
          ? <Button onClick={submit} iconRight={<Icon name="Check" size={18} />}>Create Employee</Button>
          : <Button onClick={goNext} iconRight={<Icon name="ArrowRight" size={18} />}>Save &amp; Continue</Button>}
      </React.Fragment>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <StepRail steps={WIZARD_STEPS} current={step} furthest={furthest} onJump={setStep} />
        {steps[step]}
      </div>
    </Drawer>
  );
}

Object.assign(window, { EmployeeWizard, WIZARD_STEPS, validateStep, PhotoUpload, DocumentRow });
