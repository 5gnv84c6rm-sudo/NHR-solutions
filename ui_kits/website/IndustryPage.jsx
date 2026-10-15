/* Industry landing page template. Everything is driven by one config object,
   so a new sector is a data change, not a new page. */
const { SectionHeading, Card, Button, Badge, IconWrapper, Stat, DashboardCard, DataTable, ProgressMeter, FaqItem, TestimonialCard } = window.NHRSolutionDesignSystem_0db691;

const INDUSTRIES = {
  healthcare: {
    name: 'Healthcare',
    eyebrow: 'Healthcare & Care Services',
    title: 'HR Built For',
    highlight: 'Round-The-Clock Care',
    description: 'Rotas that cover every shift, training certificates that never quietly expire, and employee records your inspectors can follow.',
    stats: [['24/7', 'Shift coverage'], ['100%', 'Certificate visibility'], ['1', 'Record per carer']],
    challenges: [
      { icon: 'CalendarClock', title: 'Shifts that cannot go uncovered', text: 'Night cover, bank staff and last-minute sickness all have to be resolved the same day, often by a manager on the floor.' },
      { icon: 'BadgeCheck', title: 'Mandatory training that expires', text: 'Safeguarding, moving and handling, first aid — each with its own renewal date, across dozens of staff.' },
      { icon: 'ClipboardList', title: 'Evidence for inspection', text: 'Right-to-work, DBS checks and supervision records need to be produced on request, not reconstructed.' },
      { icon: 'Users', title: 'High turnover and bank staff', text: 'Frequent starters and leavers mean onboarding and offboarding have to be quick and consistent.' }
    ],
    benefits: [
      { icon: 'CalendarRange', title: 'Rota cover at a glance', text: 'Build the week, see gaps before they happen, and publish to staff phones.' },
      { icon: 'BellRing', title: 'Expiry reminders', text: 'DBS, training and right-to-work dates prompt the manager before they lapse.' },
      { icon: 'FolderLock', title: 'Inspection-ready records', text: 'Every document sits in the employee record with who uploaded it and when.' },
      { icon: 'Smartphone', title: 'Mobile for floor staff', text: 'Clock in, request leave and read policies without a desk.' },
      { icon: 'ShieldCheck', title: 'Role-based access', text: 'Team leaders see their own staff. Payroll and personal data stay restricted.' },
      { icon: 'FileCheck2', title: 'Supervision logs', text: 'Notes and review dates recorded against the person, not in a separate folder.' }
    ],
    features: ['Shifts & rotas', 'Attendance & clocking', 'Training records', 'Document expiry', 'Holiday & leave', 'Absence tracking', 'Employee records', 'Payroll'],
    compliance: {
      title: 'Compliance considerations',
      text: 'NHR Solution helps you keep the records and reminders that support your own compliance work. It does not certify or guarantee compliance with CQC, Care Inspectorate or any regulator — your policies and professional judgement remain yours.',
      points: ['Right-to-work records with expiry dates', 'DBS check dates held per employee', 'Mandatory training renewals tracked', 'Document upload trail with user and timestamp', 'Role-based access to personal data']
    },
    story: {
      quote: 'Certificates used to live in a folder nobody opened until an inspection. Now the renewal date sits on the person, and the manager gets told first.',
      name: 'Priya Raman', role: 'Head of People', company: 'Brightpath Care'
    },
    faqs: [
      { q: 'Can it handle bank and agency staff?', a: 'Yes. Bank staff can be held as employment records with a casual or temporary type, and only appear on the rota when assigned to a shift.' },
      { q: 'Does it track mandatory training?', a: 'Training certificates are documents on the employee record with a category and expiry date, so renewals surface as reminders rather than surprises.' },
      { q: 'Is it suitable for multiple sites?', a: 'Locations and branches are fields on the employee record, and rotas are built per site.' },
      { q: 'Does using NHR Solution make us compliant?', a: 'No software can do that. It keeps the records, dates and reminders that make demonstrating your compliance far easier, but the responsibility stays with you.' }
    ]
  }
};

function RotaMock() {
  const staff = ['A. Osei', 'M. Bell', 'L. Mensah', 'R. Doherty', 'I. Khan'];
  const shifts = [
    ['E', 'E', 'L', 'N', 'N', '', ''],
    ['L', 'L', 'E', 'E', '', 'E', 'E'],
    ['N', '', '', 'L', 'L', 'L', 'N'],
    ['E', 'N', 'N', '', 'E', 'E', ''],
    ['', 'E', 'E', 'E', 'N', '', 'L']
  ];
  const tone = { E: 'rgba(0,229,212,.85)', L: 'rgba(25,217,230,.55)', N: 'rgba(255,255,255,.14)' };
  const fg = { E: '#04100f', L: '#04100f', N: 'rgba(245,255,255,.85)' };
  return (
    <DashboardCard title="Week Rota — Ward B" action={<Badge tone="dark">2 gaps</Badge>}>
      <div style={{ display: 'grid', gridTemplateColumns: '84px repeat(7,1fr)', gap: 5, alignItems: 'center' }}>
        <span />
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <span key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>{d}</span>
        ))}
        {staff.map((s, i) => (
          <React.Fragment key={s}>
            <span style={{ fontSize: 11.5, color: 'rgba(245,255,255,.8)', whiteSpace: 'nowrap' }}>{s}</span>
            {shifts[i].map((sh, j) => (
              <span key={j} title={sh ? sh : 'Uncovered'} style={{
                height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: sh ? tone[sh] : 'transparent',
                border: sh ? 'none' : '1px dashed rgba(242,180,65,.5)',
                color: sh ? fg[sh] : 'var(--nhr-warning)'
              }}>{sh || '·'}</span>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        {[['Early', tone.E], ['Late', tone.L], ['Night', tone.N]].map(([l, c]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-body-dark)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
          </span>
        ))}
      </div>
    </DashboardCard>
  );
}

function TrainingMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DashboardCard title="Mandatory Training" action={<Badge tone="warning">4 due</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressMeter label="Safeguarding" value={96} valueLabel="113 / 118" />
          <ProgressMeter label="Moving & handling" value={88} valueLabel="104 / 118" />
          <ProgressMeter label="First aid" value={71} valueLabel="84 / 118" />
        </div>
      </DashboardCard>
      <DashboardCard title="Expiring Certificates" padding={16}>
        <DataTable compact
          columns={[{ key: 'name', label: 'Employee' }, { key: 'cert', label: 'Certificate' }, { key: 'expiry', label: 'Expires', mono: true }, { key: 'status', label: '' }]}
          rows={[
            { name: 'Tomas Nowak', cert: 'DBS check', expiry: '14 Oct 2026', status: <Badge tone="warning">Renew</Badge> },
            { name: 'Leah Mensah', cert: 'First aid', expiry: '02 Nov 2026', status: <Badge tone="warning">Renew</Badge> },
            { name: 'Idris Khan', cert: 'Safeguarding', expiry: '19 Nov 2026', status: <Badge tone="dark">Booked</Badge> }
          ]} />
      </DashboardCard>
    </div>
  );
}

function IndustryBody({ slug = 'healthcare' }) {
  const D = INDUSTRIES[slug];
  const [openFaq, setOpenFaq] = React.useState(0);
  const others = window.NHR_SITE.audiences.industries.filter(i => i !== D.name);
  return (
    <React.Fragment>
      <PageHero eyebrow={D.eyebrow} title={D.title} highlight={D.highlight} description={D.description}
        primary="Get Started" secondary="Book a Demo"
        breadcrumbs={[{ label: 'Home', href: 'index.html' }, { label: 'Who We Serve', href: '#' }, { label: D.name }]}>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', paddingTop: 14 }}>
          {D.stats.map(([v, l]) => <Stat key={l} value={v} label={l} tone="dark" size="sm" />)}
        </div>
      </PageHero>

      <Section>
        <SectionHeading align="center" eyebrow="The Challenge" title={'What Makes ' + D.name + ' Different'}
          description="Four problems that generic HR software tends to handle badly." />
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 52 }}>
          {D.challenges.map(c => (
            <Card key={c.title} style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
              <IconWrapper size="sm"><Icon name={c.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.35 }}>{c.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{c.text}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Showcase eyebrow="Rotas" title="Cover Every Shift" highlight="Before The Week Starts"
        description="Build the rota by ward or site, spot the gaps while there is still time to fill them, and publish straight to staff phones."
        bullets={['Weekly and monthly rotas', 'Open shifts and swaps', 'Staff availability', 'Night and bank cover', 'Mobile publishing', 'Attendance linked to shifts']}
        visual={<RotaMock />} tone="dark" cta="Explore Shifts & Rotas" />

      <Showcase eyebrow="Training & documents" title="Nothing Expires" highlight="Without Warning"
        description="Every certificate is a dated document on the employee record, so renewals arrive as reminders instead of inspection findings."
        bullets={['Training records', 'DBS check dates', 'Right-to-work expiry', 'Renewal reminders', 'Upload audit trail', 'Per-employee folders']}
        visual={<TrainingMock />} flip subtle cta="Explore Documents" />

      <Section>
        <SectionHeading align="center" eyebrow="Benefits" title={'How ' + D.name + ' Teams Use It'} />
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 48 }}>
          {D.benefits.map(b => (
            <Card key={b.title} interactive style={{ display: 'flex', flexDirection: 'column', gap: 13, height: '100%' }}>
              <IconWrapper size="sm"><Icon name={b.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{b.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{b.text}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Section subtle>
        <div className="industry-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <SectionHeading eyebrow="Compliance" title={D.compliance.title} description={D.compliance.text} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {D.compliance.points.map(p => (
                <span key={p} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: 'var(--text-body)' }}>
                  <Icon name="Check" size={16} style={{ color: 'var(--text-accent)' }} />{p}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span className="nhr-eyebrow">Features used most</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {D.features.map(f => (
                  <span key={f} style={{
                    padding: '8px 13px', borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-subtle)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)'
                  }}>{f}</span>
                ))}
              </div>
            </Card>
            <TestimonialCard {...D.story} />
          </div>
        </div>
      </Section>

      <Section narrow>
        <SectionHeading align="center" eyebrow="FAQ" title={D.name + ' Questions'} />
        <div style={{ marginTop: 36 }}>
          {D.faqs.map((q, i) => (
            <FaqItem key={q.q} id={'ifaq-' + i} question={q.q} answer={q.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </Section>

      <Section subtle>
        <SectionHeading align="center" eyebrow="Other sectors" title="Also Built For" description="Each sector page follows this same structure." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 36 }}>
          {others.map(i => (
            <span key={i} style={{
              padding: '10px 16px', borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-subtle)', fontSize: 14, fontWeight: 600, color: 'var(--text-muted-on-light)'
            }}>{i}</span>
          ))}
        </div>
        <p style={{ margin: '24px auto 0', maxWidth: 560, textAlign: 'center', fontSize: 13, color: 'var(--text-muted-on-light)' }}>
          Healthcare is built out as the working template. Adding a sector means adding one entry to <code style={{ fontFamily: 'var(--font-mono)' }}>INDUSTRIES</code> in <code style={{ fontFamily: 'var(--font-mono)' }}>IndustryPage.jsx</code>.
        </p>
      </Section>

      <DemoCta />
    </React.Fragment>
  );
}

Object.assign(window, { IndustryBody, INDUSTRIES, RotaMock, TrainingMock });
