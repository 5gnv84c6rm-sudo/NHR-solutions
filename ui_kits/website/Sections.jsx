const { SectionHeading, Stat, SolutionCard, BenefitCard, StepCard, Card, Button, Badge, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

function TrustSection() {
  const D = window.NHR_SITE;
  return (
    <Section id="about" subtle>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center' }}>
        <SectionHeading eyebrow="NHR Solution"
          title="Technology That Works For Your Business."
          description="NHR Solution brings smart digital tools together to help businesses manage operations, improve productivity and make better decisions." />
        <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
          {D.stats.map(s => <Stat key={s.label} value={s.value} label={s.label} />)}
        </div>
      </div>
    </Section>
  );
}

function Solutions() {
  const D = window.NHR_SITE;
  return (
    <Section id="solutions">
      <SectionHeading align="center" eyebrow="Solutions"
        title="Solutions Designed Around Your Business"
        description="Every tool covers a part of the operational day — used on its own, or together as one workspace." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 56 }}>
        {D.solutions.map(s => (
          <SolutionCard key={s.title} icon={<Icon name={s.icon} />} title={s.title} description={s.description} />
        ))}
      </div>
    </Section>
  );
}

function DashboardShowcase() {
  return (
    <Section id="features" tone="dark" pattern="both">
      <SectionHeading tone="dark" align="center"
        eyebrow="The Platform"
        title="Everything Your Business Needs. In One Place."
        description="Overview, employees, attendance, payroll, tasks, documents and reporting — one workspace, one login." />
      <div style={{ marginTop: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '56px 32px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card-dark)', border: '1px solid var(--border-dark)' }}>
        <IconWrapper tone="dark"><Icon name="MonitorPlay" size={24} /></IconWrapper>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.01em', color: '#fff' }}>See The Platform In A Live Demo</span>
        <span style={{ maxWidth: 520, fontSize: 16, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          Book a 30-minute walkthrough and the full workspace opens as soon as your booking is confirmed.
        </span>
        <Button href="demo.html" size="lg" iconRight={<Icon name="ArrowRight" size={20} />}>Book A Demo</Button>
      </div>
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 32 }}>
        {[['Gauge', 'Live business overview', 'Revenue, headcount, productivity and tasks on one screen.'],
          ['CalendarCheck', 'Attendance and leave', 'Daily attendance, approvals and balances tracked automatically.'],
          ['Wallet', 'Payroll you can follow', 'Run payroll, track approvals and see cost by department.']].map(([ic, t, d]) => (
          <div key={t} style={{ display: 'flex', gap: 14 }}>
            <IconWrapper tone="dark" size="sm"><Icon name={ic} size={18} /></IconWrapper>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t}</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{d}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WhyNHR() {
  const D = window.NHR_SITE;
  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Why NHR" title="Why Businesses Choose NHR Solution" />
      <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 20, marginTop: 52 }}>
        {D.benefits.map(b => (
          <BenefitCard key={b.term} icon={<Icon name={b.icon} size={20} />} term={b.term} description={b.description} />
        ))}
      </div>
    </Section>
  );
}

function SecuritySection() {
  const D = window.NHR_SITE;
  return (
    <Section tone="dark" pattern>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SectionHeading tone="dark" eyebrow="Security"
            title="Built With Security At The Core"
            description="Your business information deserves protection. NHR Solution is designed with security, privacy and reliability in mind." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {D.security.map(s => (
              <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconWrapper tone="dark" size="sm"><Icon name={s.icon} size={18} /></IconWrapper>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
          <Glow size={520} strength={.22} />
          <img src="../../assets/logo-mark-light.png" alt="" style={{ position: 'relative', width: 200, opacity: .96, isolation: 'isolate' }} />
        </div>
      </div>
    </Section>
  );
}

function HowItWorks() {
  const D = window.NHR_SITE;
  return (
    <Section>
      <SectionHeading align="center" eyebrow="How It Works" title="Simple To Start. Powerful To Use." />
      <div className="grid-3 steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32, marginTop: 56 }}>
        {D.steps.map((s, i) => (
          <StepCard key={s.number} number={s.number} title={s.title} description={s.description} last={i === D.steps.length - 1} />
        ))}
      </div>
    </Section>
  );
}

function PhoneFrame({ children, style }) {
  return (
    <div style={{
      width: 244, height: 500, borderRadius: 38, padding: 9,
      background: 'linear-gradient(180deg,#1b2222,#050505)',
      border: '1px solid rgba(255,255,255,.14)',
      boxShadow: '0 40px 80px -30px rgba(0,0,0,.9)', flex: '0 0 auto', ...style
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 30, background: 'var(--nhr-dark)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px 8px', fontSize: 10.5, color: 'var(--text-muted-dark)', fontFamily: 'var(--font-mono)' }}>
          <span>9:41</span><span style={{ display: 'flex', gap: 5 }}><Icon name="Wifi" size={11} /><Icon name="BatteryFull" size={11} /></span>
        </div>
        {children}
      </div>
    </div>
  );
}

function MobileApp() {
  return (
    <Section tone="dark" pattern="both">
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 56, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SectionHeading tone="dark" eyebrow="Mobile" title="Your Business. Wherever You Are."
            description="Approve leave, check attendance and follow performance from your phone. The same workspace, sized for one hand." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Approvals and notifications', 'Employee directory and profiles', 'Tasks and daily attendance'].map(t => (
              <span key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: 'var(--text-body-dark)' }}>
                <Icon name="Check" size={16} style={{ color: 'var(--nhr-turquoise)' }} />{t}
              </span>
            ))}
          </div>
          <div><Button iconRight={<Icon name="ArrowRight" size={18} />}>Get Started</Button></div>
        </div>
        <div className="phones" style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
          <PhoneFrame style={{ transform: 'translateY(22px)' }}>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <img src="../../assets/logo-light.png" alt="NHR Solution" style={{ width: 96, alignSelf: 'flex-start' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>Good morning, Amara</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Present', '112'], ['On leave', '6'], ['Tasks', '34'], ['Growth', '+32%']].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--surface-card-dark)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: l === 'Growth' ? 'var(--nhr-turquoise)' : '#fff' }}>{v}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--surface-card-dark)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>Attendance</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54 }}>
                  {[70, 88, 64, 96, 80].map((h, i) => <div key={i} style={{ flex: 1, height: h + '%', borderRadius: 4, background: 'linear-gradient(180deg,var(--nhr-turquoise),rgba(0,229,212,.3))' }} />)}
                </div>
              </div>
            </div>
          </PhoneFrame>
          <PhoneFrame>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Notifications</span>
              {[['Leave request — T. Nowak', 'Awaiting approval', 'UserCheck'],
                ['August payslips issued', '120 employees', 'FileCheck2'],
                ['26 timesheets to approve', 'Due today', 'ClipboardCheck'],
                ['Q3 report ready', 'Reports', 'ClipboardList']].map(([t, m, ic]) => (
                <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-card-dark)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: 11 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(0,229,212,.10)', color: 'var(--nhr-turquoise)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name={ic} size={15} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{m}</span>
                  </span>
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>
    </Section>
  );
}

Object.assign(window, { TrustSection, Solutions, DashboardShowcase, WhyNHR, SecuritySection, HowItWorks, MobileApp, PhoneFrame });
