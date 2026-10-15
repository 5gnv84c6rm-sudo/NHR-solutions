const { SectionHeading, Card, Button, Badge, IconWrapper, Stat, DashboardCard, BarChart, DataTable, ProgressMeter, FaqItem, StatTile } = window.NHRSolutionDesignSystem_0db691;

const PAYROLL_FEATURES = [
  { icon: 'Calculator', title: 'Payroll processing', description: 'Run monthly or weekly payroll from the same employee records your managers already use.' },
  { icon: 'ArrowRightLeft', title: 'Gross-to-net', description: 'Tax, National Insurance, pension and student loan deductions calculated line by line.' },
  { icon: 'FileText', title: 'Payslips', description: 'Itemised payslips published to employee self-service, with history kept per person.' },
  { icon: 'ClipboardList', title: 'Payroll reporting', description: 'Cost by department, cost centre and period, ready to export for your accounts.' },
  { icon: 'Users', title: 'Employee payroll data', description: 'Salary, hourly rate, tax code and pension settings held on the employee record.' },
  { icon: 'Timer', title: 'Hours and overtime', description: 'Approved timesheets and overtime feed the run instead of being retyped.' },
  { icon: 'ShieldCheck', title: 'Approvals and audit', description: 'Two-step approval before a run closes, with a log of who changed what.' },
  { icon: 'Landmark', title: 'HMRC workflows', description: 'Structured submission workflows and reference tracking for each pay period.' },
  { icon: 'Headset', title: 'Payroll support', description: 'Talk to a person when a run does not look right. Available on paid plans.' },
  { icon: 'Repeat', title: 'Managed payroll', description: 'Hand the whole run to our team and approve the figures before payment.' },
  { icon: 'Plug', title: 'Accounting integration', description: 'Push journals to your accounting system once a run is approved.' },
  { icon: 'History', title: 'Year-to-date', description: 'Running totals per employee, per tax year, visible in the record.' }
];

function PayslipMock() {
  return (
    <DashboardCard title="Payslip — September 2026" action={<Badge tone="dark">A. Osei</Badge>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DataTable compact
          columns={[{ key: 'item', label: 'Item' }, { key: 'basis', label: 'Basis' }, { key: 'amount', label: 'Amount', align: 'right', mono: true }]}
          rows={[
            { item: 'Basic salary', basis: 'Monthly', amount: '£3,750.00' },
            { item: 'Overtime', basis: '6.0 hrs', amount: '£194.60' },
            { item: 'Income tax', basis: 'Code 1257L', amount: '−£611.32' },
            { item: 'National Insurance', basis: 'Category A', amount: '−£243.15' },
            { item: 'Pension', basis: '5% qualifying', amount: '−£157.28' }
          ]} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Net pay</span>
          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>£2,932.85</span>
        </div>
      </div>
    </DashboardCard>
  );
}

function PayrollReportMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DashboardCard title="Cost By Department" action={<Badge tone="dark">September</Badge>}>
        <BarChart unit="k" height={180} data={[
          { label: 'Ops', value: 148 }, { label: 'Care', value: 121 }, { label: 'Admin', value: 63 },
          { label: 'Sales', value: 44 }, { label: 'IT', value: 24 }, { label: 'Other', value: 13, muted: true }
        ]} />
      </DashboardCard>
      <DashboardCard title="This Run">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressMeter label="Timesheets approved" value={100} valueLabel="120 / 120" />
          <ProgressMeter label="Payslips checked" value={72} valueLabel="86 / 120" />
        </div>
      </DashboardCard>
    </div>
  );
}

function PayrollBody() {
  const [openFaq, setOpenFaq] = React.useState(0);
  const faqs = [
    { q: 'Is this payroll software or a payroll service?', a: 'Both. Run payroll yourself in the software, or choose managed payroll and our team prepares the run for you to approve.' },
    { q: 'Where do the hours come from?', a: 'Approved timesheets, overtime and leave already sit on the employee record, so the run reads them directly rather than needing a separate import.' },
    { q: 'Can employees see their own payslips?', a: 'Yes. Payslips publish to employee self-service, with history kept per person and access limited by role.' },
    { q: 'What about HMRC submissions?', a: 'The product provides structured submission workflows and reference tracking for each pay period. Any specific accreditation will be confirmed here once formally in place.' },
    { q: 'Can I export to my accounting system?', a: 'Approved runs can be exported, and accounting integrations are on the integrations roadmap. Status for each connection is listed on the integrations page.' }
  ];
  return (
    <React.Fragment>
      <PageHero eyebrow="Payroll" title="Payroll That Runs On" highlight="Data You Already Have."
        description="Salaries, hours, overtime and leave live on the employee record. Payroll reads them, calculates gross to net, and produces payslips your team can see."
        primary="Get Started" secondary="Book a Demo"
        breadcrumbs={[{ label: 'Home', href: 'index.html' }, { label: 'Products', href: '#' }, { label: 'Payroll' }]}>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', paddingTop: 14 }}>
          <Stat value="1" label="Employee record" tone="dark" size="sm" />
          <Stat value="2" label="Approval steps" tone="dark" size="sm" />
          <Stat value="24/7" label="Payslip access" tone="dark" size="sm" />
        </div>
      </PageHero>

      <Section>
        <SectionHeading align="center" eyebrow="What's inside" title="Everything A Pay Run Needs"
          description="Processing, payslips, reporting and support — with the option to hand the whole run to our team." />
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 52 }}>
          {PAYROLL_FEATURES.map(ft => (
            <Card key={ft.title} interactive style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
              <IconWrapper size="sm"><Icon name={ft.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{ft.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{ft.description}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Showcase eyebrow="Payroll runs" title="Open The Run," highlight="Not Six Spreadsheets"
        description="Each period opens with hours, overtime and leave already applied. Check the exceptions, approve, and the run closes with a reference."
        bullets={['Weekly or monthly', 'Gross-to-net calculation', 'Two-step approval', 'Run references', 'Change log', 'Year-to-date totals']}
        visual={<PayrollMock />} subtle cta="See Pricing" />

      <Showcase eyebrow="Payslips" title="Every Deduction" highlight="Explained On The Line"
        description="Itemised payslips show basic pay, overtime, tax, National Insurance and pension separately, so questions get answered without a phone call."
        bullets={['Itemised payslips', 'Employee self-service', 'Payslip history', 'Tax code on record', 'Pension contributions', 'Role-based access']}
        visual={<PayslipMock />} flip tone="dark" cta="Book a Demo" />

      <Showcase eyebrow="Reporting" title="Cost You Can" highlight="Actually Break Down"
        description="Payroll cost by department, cost centre and period, alongside the checks still outstanding on the current run."
        bullets={['Cost by department', 'Cost by period', 'Outstanding checks', 'Export for accounts', 'Headcount cost', 'Overtime spend']}
        visual={<PayrollReportMock />} subtle cta="Explore Reporting" />

      <Section tone="dark" pattern>
        <SectionHeading tone="dark" align="center" eyebrow="Two ways to run it" title="Do It Yourself, Or Hand It Over" />
        <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 48 }}>
          {[['MonitorCog', 'Payroll software', 'You run it', 'Your team opens the run, checks exceptions and approves. Support is there if a figure looks wrong.',
            ['Full control of the schedule', 'Unlimited runs per period', 'Payslips published on approval', 'Support on paid plans']],
          ['Handshake', 'Managed payroll', 'We prepare it', 'Send us the changes and our team prepares the run. You review the figures and approve before anyone is paid.',
            ['Prepared for your approval', 'Exception report each period', 'Named payroll contact', 'Quoted on headcount']]].map(([ic, t, tag, d, list]) => (
            <Card key={t} tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <IconWrapper tone="dark"><Icon name={ic} /></IconWrapper>
                <Badge tone="dark">{tag}</Badge>
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 700, color: '#fff', letterSpacing: 'var(--tracking-tight)' }}>{t}</h3>
              <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)', color: 'var(--text-body-dark)' }}>{d}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                {list.map(li => (
                  <span key={li} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: 'var(--text-body-dark)' }}>
                    <Icon name="Check" size={16} style={{ color: 'var(--nhr-turquoise)' }} />{li}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading align="center" eyebrow="Benefits" title="What Changes At Month End" />
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 48 }}>
          {[['Clock', 'No retyping', 'Hours, overtime and leave arrive from the record instead of a separate spreadsheet.'],
            ['SearchCheck', 'Exceptions first', 'The run surfaces what changed since last period, so checking is targeted.'],
            ['ScrollText', 'A defensible trail', 'Every change, approval and run reference is logged against the period.']].map(([ic, t, d]) => (
            <Card key={t} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
              <IconWrapper><Icon name={ic} /></IconWrapper>
              <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>{t}</h3>
              <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)' }}>{d}</p>
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: 32, background: 'var(--surface-subtle)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <IconWrapper size="sm"><Icon name="Info" size={18} /></IconWrapper>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>
            NHR Solution does not currently claim HMRC recognition, CIPP membership or any payroll accreditation. Figures shown on this page are illustrative placeholders.
            Accreditations will be listed here once formally confirmed.
          </p>
        </Card>
      </Section>

      <Section subtle narrow>
        <SectionHeading align="center" eyebrow="FAQ" title="Payroll Questions" />
        <div style={{ marginTop: 36 }}>
          {faqs.map((q, i) => (
            <FaqItem key={q.q} id={'payfaq-' + i} question={q.q} answer={q.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </Section>

      <DemoCta />
    </React.Fragment>
  );
}

Object.assign(window, { PayrollBody, PAYROLL_FEATURES, PayslipMock, PayrollReportMock });
