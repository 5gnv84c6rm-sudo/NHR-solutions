const { SectionHeading, Card, Button, Badge, IconWrapper, Stat, DashboardCard, BarChart, DataTable, ProgressMeter, FaqItem } = window.NHRSolutionDesignSystem_0db691;

const HR_FEATURES = [
  { icon: 'IdCard', title: 'Employee management', description: 'Profiles, employment details, contracts and emergency contacts in one record.' },
  { icon: 'Plane', title: 'Holiday & leave', description: 'Requests, approvals, allowances and team availability on one calendar.' },
  { icon: 'Thermometer', title: 'Absence tracking', description: 'Sickness, lateness and return-to-work notes with absence reporting.' },
  { icon: 'Clock', title: 'Attendance & time', description: 'Timesheets, breaks and manager approvals, with mobile clocking.' },
  { icon: 'CalendarRange', title: 'Shifts & rotas', description: 'Build weekly and monthly rotas, publish open shifts and handle swaps.' },
  { icon: 'Target', title: 'Performance', description: 'Goals, reviews, feedback and development plans per employee.' },
  { icon: 'FileText', title: 'Documents', description: 'Secure folders, policies and contracts with expiry reminders.' },
  { icon: 'ReceiptText', title: 'Expenses', description: 'Submissions with receipts, approval routing and reimbursement tracking.' },
  { icon: 'UserPlus', title: 'Recruitment', description: 'Vacancies, candidates, interview tracking and hiring notes.' },
  { icon: 'Award', title: 'Recognition', description: 'Milestones, achievements and rewards that managers can actually use.' },
  { icon: 'Timer', title: 'Overtime', description: 'Overtime capture and approval alongside standard hours.' },
  { icon: 'ClipboardList', title: 'Reporting', description: 'Headcount, absence, attendance and cost reports ready to export.' }
];

function AttendanceMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DashboardCard title="Attendance This Week" action={<Badge tone="dark">96% average</Badge>}>
        <BarChart unit="%" height={170} data={[
          { label: 'Mon', value: 96 }, { label: 'Tue', value: 98 }, { label: 'Wed', value: 94 },
          { label: 'Thu', value: 97 }, { label: 'Fri', value: 91 }, { label: 'Sat', value: 18, muted: true }, { label: 'Sun', value: 6, muted: true }
        ]} />
      </DashboardCard>
      <DashboardCard title="Today">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressMeter label="Clocked in" value={93} valueLabel="112 / 120" />
          <ProgressMeter label="Timesheets approved" value={61} valueLabel="73 / 120" />
        </div>
      </DashboardCard>
    </div>
  );
}

function DocumentsMock() {
  return (
    <DashboardCard title="Employee Documents" action={<Badge tone="warning">3 expiring</Badge>}>
      <DataTable compact
        columns={[{ key: 'doc', label: 'Document' }, { key: 'owner', label: 'Employee' }, { key: 'expiry', label: 'Expires', mono: true }, { key: 'status', label: 'Status' }]}
        rows={[
          { doc: 'Employment contract', owner: 'Amara Osei', expiry: '—', status: <Badge tone="success">Signed</Badge> },
          { doc: 'Right to work', owner: 'Tomas Nowak', expiry: '14 Oct 2026', status: <Badge tone="warning">Expiring</Badge> },
          { doc: 'First aid certificate', owner: 'Leah Mensah', expiry: '02 Nov 2026', status: <Badge tone="warning">Expiring</Badge> },
          { doc: 'Handbook acknowledgement', owner: 'Marcus Bell', expiry: '—', status: <Badge tone="success">Signed</Badge> },
          { doc: 'DBS check', owner: 'Priya Raman', expiry: '18 Mar 2027', status: <Badge tone="success">Current</Badge> }
        ]} />
    </DashboardCard>
  );
}

function HrSoftwareBody() {
  const [openFaq, setOpenFaq] = React.useState(0);
  const faqs = [
    { q: 'Who is HR Software for?', a: 'Managers and owners who currently keep people data in spreadsheets, email threads and paper files.' },
    { q: 'What problem does it solve?', a: 'It puts employee records, holiday, absence, attendance and documents in one place, with approvals that leave a trail.' },
    { q: 'How does it work?', a: 'Add your business and team, choose which tools to switch on, then invite managers. Employees get self-service for their own requests.' },
    { q: 'How long does setup take?', a: 'Most small businesses are working in the same day. Larger teams usually import records first — support can help with that.' }
  ];
  return (
    <React.Fragment>
      <PageHero eyebrow="HR Software" title="HR Software That Makes" highlight="People Management Simple."
        description="Records, holiday, absence, attendance, rotas, performance and documents — one workspace, one set of approvals, no spreadsheet handovers."
        primary="Get Started" secondary="Book a Demo"
        breadcrumbs={[{ label: 'Home', href: 'index.html' }, { label: 'Products', href: '#' }, { label: 'HR Software' }]}>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', paddingTop: 14 }}>
          <Stat value="12" label="Tools included" tone="dark" size="sm" />
          <Stat value="1" label="Employee record" tone="dark" size="sm" />
          <Stat value="24/7" label="Self-service access" tone="dark" size="sm" />
        </div>
      </PageHero>

      <Section>
        <SectionHeading align="center" eyebrow="What's inside" title="Everything People Management Needs"
          description="Switch tools on as you need them. Every one reads from the same employee record." />
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 52 }}>
          {HR_FEATURES.map(ft => (
            <Card key={ft.title} interactive style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
              <IconWrapper size="sm"><Icon name={ft.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{ft.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{ft.description}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Showcase eyebrow="Holiday & leave" title="Approvals That Take" highlight="Seconds, Not Emails"
        description="Requests arrive with the allowance already calculated and the team calendar in view, so managers can approve with context."
        bullets={['Holiday calendar', 'Leave requests', 'Approval workflow', 'Allowance tracking', 'Public holidays', 'Leave history']}
        visual={<LeaveCalendarMock />} subtle cta="Explore Leave Management" />

      <Showcase eyebrow="Attendance & time" title="See The Day" highlight="As It Happens"
        description="Clocking, breaks and timesheets feed the same attendance record managers approve at the end of the week."
        bullets={['Clock in / out', 'Break tracking', 'Timesheets', 'Mobile clocking', 'Manager approvals', 'Attendance reports']}
        visual={<AttendanceMock />} flip tone="dark" cta="Explore Time Tracking" />

      <Showcase eyebrow="Documents" title="Paperwork With" highlight="An Expiry Date Attached"
        description="Contracts, policies and certificates sit in the employee record with reminders before anything lapses."
        bullets={['Secure folders', 'Contracts & policies', 'Expiry reminders', 'Document search', 'Upload & download', 'Permissions']}
        visual={<DocumentsMock />} subtle cta="Explore Documents" />

      <Section>
        <SectionHeading align="center" eyebrow="Benefits" title="What Changes For Your Managers" />
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 48 }}>
          {[['Clock', 'Less admin', 'Requests, approvals and records stop living in inboxes and spreadsheets.'],
            ['Eye', 'One source of truth', 'Every tool reads the same employee record, so numbers agree across reports.'],
            ['ShieldCheck', 'A visible trail', 'Approvals, changes and documents are logged with who did what, and when.']].map(([ic, t, d]) => (
            <Card key={t} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
              <IconWrapper><Icon name={ic} /></IconWrapper>
              <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>{t}</h3>
              <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)' }}>{d}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section subtle narrow>
        <SectionHeading align="center" eyebrow="FAQ" title="HR Software Questions" />
        <div style={{ marginTop: 36 }}>
          {faqs.map((q, i) => (
            <FaqItem key={q.q} id={'hrfaq-' + i} question={q.q} answer={q.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </Section>

      <DemoCta />
    </React.Fragment>
  );
}

Object.assign(window, { HrSoftwareBody, HR_FEATURES, AttendanceMock, DocumentsMock });
