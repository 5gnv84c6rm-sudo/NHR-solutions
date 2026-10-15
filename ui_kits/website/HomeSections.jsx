/* Homepage sections beyond the hero: trust, product ecosystem, product showcases,
   NHR Intelligence, who we serve, integrations, stories, resources, pricing preview, demo CTA. */
const { SectionHeading, Stat, Card, Button, Badge, IconWrapper, StatTile, DashboardCard, BarChart, ProgressMeter, ActivityItem, DataTable, PricingCard } = window.NHRSolutionDesignSystem_0db691;

function TrustStats() {
  const D = window.NHR_SITE;
  return (
    <Section subtle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 44, alignItems: 'center', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-subsection)', fontWeight: 700, letterSpacing: 'var(--tracking-heading)', maxWidth: 620 }}>
          Built for businesses that want to work smarter.
        </h2>
        <div className="logo-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 18, width: '100%', maxWidth: 900 }}>
          {['Northline', 'Brightpath', 'Whitfield & Co.', 'Kerrmore', 'Studio Vale'].map(n => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 10px',
              border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)',
              fontSize: 13.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-muted)', textAlign: 'center'
            }}>{n}</div>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Placeholder names — real customer marks are added once permission is in place.</span>
        <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28, width: '100%', paddingTop: 12 }}>
          {D.trustStats.map(s => <Stat key={s.label} value={s.value} label={s.label} align="center" />)}
        </div>
      </div>
    </Section>
  );
}

function ProductEcosystem() {
  const D = window.NHR_SITE;
  return (
    <Section id="products">
      <SectionHeading align="center" eyebrow="The Ecosystem" title="One Platform. Every Part of Your Business."
        description="Six product areas, one login. Start with what you need and add the rest as your business grows." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 56 }}>
        {D.products.map(p => <ProductCard key={p.title} {...p} />)}
      </div>
    </Section>
  );
}

function ProductCard({ icon, title, description, points = [], href = '#' }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ height: '100%' }}>
      <Card interactive padding="var(--card-padding-lg)" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <IconWrapper highlight={hover}><Icon name={icon} /></IconWrapper>
        <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)' }}>{description}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
          {points.map(pt => (
            <li key={pt} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14, color: 'var(--text-body)' }}>
              <Icon name="Check" size={15} style={{ color: 'var(--text-accent)' }} />{pt}
            </li>
          ))}
        </ul>
        <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-body-sm)', fontWeight: 700 }}>
          Learn More
          <Icon name="ArrowRight" size={16} style={{ transform: hover ? 'translateX(3px)' : 'none', transition: 'transform var(--dur-base) var(--ease-out)' }} />
        </a>
      </Card>
    </div>
  );
}

/* Alternating product showcase: copy on one side, real product UI on the other. */
function Showcase({ eyebrow, title, highlight, description, bullets = [], visual, flip = false, tone = 'light', subtle = false, cta = 'Learn More' }) {
  const dark = tone === 'dark';
  return (
    <Section tone={tone} subtle={subtle} pattern={dark}>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 64, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, order: flip ? 2 : 1 }}>
          <SectionHeading tone={tone} eyebrow={eyebrow}
            title={<React.Fragment>{title} {highlight && <span style={{ color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)' }}>{highlight}</span>}</React.Fragment>}
            description={description} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {bullets.map(b => (
              <span key={b} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14.5, color: dark ? 'var(--text-body-dark)' : 'var(--text-body)' }}>
                <Icon name="Check" size={15} style={{ color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)' }} />{b}
              </span>
            ))}
          </div>
          <div><Button variant={dark ? 'primary' : 'secondary'} tone={tone} iconRight={<Icon name="ArrowRight" size={18} />}>{cta}</Button></div>
        </div>
        <div style={{ order: flip ? 1 : 2, minWidth: 0 }}>{visual}</div>
      </div>
    </Section>
  );
}

/* --- product UI mocks used by the showcases --- */
function LeaveCalendarMock() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const booked = { 4: 'A', 5: 'A', 11: 'S', 12: 'S', 13: 'S', 18: 'H', 25: 'A', 26: 'A' };
  const tones = { A: 'rgba(0,229,212,.85)', S: 'rgba(242,180,65,.85)', H: 'rgba(25,217,230,.55)' };
  return (
    <DashboardCard title="Team Availability — September" action={<Badge tone="dark">4 pending</Badge>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>{d}</span>
        ))}
        {days.map(n => (
          <span key={n} style={{
            aspectRatio: '1', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 600,
            background: booked[n] ? tones[booked[n]] : 'rgba(255,255,255,.04)',
            color: booked[n] ? '#04100f' : 'rgba(245,255,255,.6)',
            border: '1px solid ' + (booked[n] ? 'transparent' : 'var(--border-dark)')
          }}>{n}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        {[['Annual leave', tones.A], ['Sickness', tones.S], ['Public holiday', tones.H]].map(([l, c]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-body-dark)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
          </span>
        ))}
      </div>
    </DashboardCard>
  );
}

function PayrollMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <StatTile label="Gross Payroll" value="£412,880" delta="+2.4%" caption="September" icon={<Icon name="Wallet" size={18} />} />
        <StatTile label="Net Pay" value="£334,770" delta="+2.1%" caption="September" icon={<Icon name="Banknote" size={18} />} />
      </div>
      <DashboardCard title="Payroll Runs" action={<Badge tone="dark">In review</Badge>}>
        <DataTable compact
          columns={[{ key: 'period', label: 'Period' }, { key: 'ref', label: 'Reference', mono: true }, { key: 'status', label: 'Status' }, { key: 'total', label: 'Gross', align: 'right', mono: true }]}
          rows={[
            { period: 'September 2026', ref: 'RUN-2609', status: <Badge tone="warning">In review</Badge>, total: '£412,880' },
            { period: 'August 2026', ref: 'RUN-2608', status: <Badge tone="success">Paid</Badge>, total: '£403,120' },
            { period: 'July 2026', ref: 'RUN-2607', status: <Badge tone="success">Paid</Badge>, total: '£398,440' }
          ]} />
      </DashboardCard>
    </div>
  );
}

function SafetyMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DashboardCard title="Compliance Overview" action={<Badge tone="dark">Q3</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressMeter label="Risk assessments current" value={92} valueLabel="46 / 50" />
          <ProgressMeter label="Safety training complete" value={78} valueLabel="94 / 120" />
          <ProgressMeter label="Open safety tasks closed" value={64} valueLabel="16 / 25" />
        </div>
      </DashboardCard>
      <DashboardCard title="Recent Reports">
        <div>
          <ActivityItem icon={<Icon name="TriangleAlert" size={16} />} title="Near miss — loading bay" meta="Northline depot · logged by M. Bell" time="3h" />
          <ActivityItem icon={<Icon name="ClipboardCheck" size={16} />} title="Risk assessment approved — workshop" meta="Reviewed by P. Raman" time="1d" />
          <ActivityItem icon={<Icon name="FileText" size={16} />} title="COSHH sheet updated" meta="Hazardous substances" time="2d" divider={false} />
        </div>
      </DashboardCard>
    </div>
  );
}

function HrShowcase() {
  return <Showcase eyebrow="HR Software" title="People Management" highlight="Without The Paperwork"
    description="Employee records, holiday, absence, attendance and rotas live together, so managers stop chasing spreadsheets and start approving in one place."
    bullets={['Employee profiles', 'Holiday & leave', 'Absence tracking', 'Shifts & rotas', 'Performance reviews', 'Documents & contracts']}
    visual={<LeaveCalendarMock />} subtle />;
}

function PayrollShowcase() {
  return <Showcase eyebrow="Payroll" title="Payroll You Can" highlight="Follow End To End"
    description="Run payroll from the same employee data you already maintain, then see exactly where the cost sits before anything is approved."
    bullets={['Payroll processing', 'Payslips', 'Approval workflow', 'Cost by department', 'Payroll reporting', 'Payroll support']}
    visual={<PayrollMock />} flip tone="dark" />;
}

function SafetyShowcase() {
  return <Showcase eyebrow="Health & Safety" title="Compliance That" highlight="Stays Up To Date"
    description="Risk assessments, accident and near-miss reports, safety tasks and training records — tracked with reminders so nothing quietly expires."
    bullets={['Risk assessments', 'Accident reporting', 'Near-miss reports', 'Safety documents', 'Training records', 'Task reminders']}
    visual={<SafetyMock />} />;
}

function AiSection() {
  const a = window.NHR_SITE.ai;
  return (
    <Section tone="dark" pattern="both">
      <GridLines opacity={.7} />
      <Glow size={700} right="-10%" top="-30%" strength={.14} />
      <div style={{ position: 'relative' }}>
        <SectionHeading tone="dark" align="center" eyebrow={a.eyebrow} title={<React.Fragment>The Intelligent Layer <span style={{ color: 'var(--nhr-turquoise)' }}>Across Your Workspace</span></React.Fragment>} description={a.description} />
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 52 }}>
          {a.features.map(ft => (
            <Card key={ft.title} tone="dark" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <IconWrapper tone="dark" size="sm"><Icon name={ft.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{ft.title}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{ft.description}</span>
            </Card>
          ))}
        </div>
        <div style={{
          marginTop: 28, display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'center',
          maxWidth: 720, marginInline: 'auto', padding: '14px 18px',
          border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)'
        }}>
          <Icon name="Info" size={16} style={{ color: 'var(--nhr-turquoise)', marginTop: 2 }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{a.disclaimer}</span>
        </div>
      </div>
    </Section>
  );
}

function WhoWeServe() {
  const A = window.NHR_SITE.audiences;
  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Who We Serve" title="Built Around How Your Sector Works"
        description="The workspace stays the same. What changes is which tools sit in front, and which records matter most." />
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40, marginTop: 52 }}>
        <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="nhr-eyebrow">By business size</span>
          {A.size.map(s => (
            <a key={s} href="pricing.html" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              {s}<Icon name="ArrowRight" size={15} />
            </a>
          ))}
        </Card>
        <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="nhr-eyebrow">By industry</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {A.industries.map(n => (
              /* Healthcare is the built sector template; the rest are inert
                 until their page exists, because a chip that scrolls you to the
                 top reads as broken rather than unbuilt. */
              React.createElement(n === 'Healthcare' ? 'a' : 'span', { key: n,
                href: n === 'Healthcare' ? 'industry-healthcare.html' : undefined,
                title: n === 'Healthcare' ? undefined : n + ' — sector page coming soon',
                style: {
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 15px',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)',
                fontSize: 14, fontWeight: 600, color: 'var(--text-heading)',
                opacity: n === 'Healthcare' ? 1 : .6,
                cursor: n === 'Healthcare' ? 'pointer' : 'default'
              } },
                n,
                React.createElement(Icon, { name: n === 'Healthcare' ? 'ArrowUpRight' : 'Clock', size: 14, style: { color: 'var(--text-accent)' } })
              )
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

function IntegrationsSection() {
  const D = window.NHR_SITE;
  return (
    <Section>
      <SectionHeading align="center" eyebrow="Integrations" title="Connects To The Tools You Already Run"
        description="Integration work is planned and clearly labelled. Nothing is listed as available until it is built and tested." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 48 }}>
        {D.integrations.map(it => (
          <Card key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{
              width: 46, height: 46, flex: '0 0 auto', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-accent-soft)', color: 'var(--text-accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800
            }}>{it.name.slice(0, 2)}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{it.name}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted-on-light)' }}>{it.category}</span>
            </span>
            <Badge tone="neutral">{it.status}</Badge>
          </Card>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <Button variant="secondary" iconRight={<Icon name="ArrowRight" size={18} />}>View All Integrations</Button>
      </div>
    </Section>
  );
}

function StoriesSection() {
  const D = window.NHR_SITE;
  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Customer Stories" title="What Changes After The First Month"
        description="Fictional placeholder stories, structured the way real ones will be published." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 48 }}>
        {D.stories.map(s => (
          <Card key={s.company} interactive padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <Badge tone="soft">{s.industry}</Badge>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>{s.company}</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)', flex: 1 }}>{s.result}</p>
            <span style={{ fontSize: 13, color: 'var(--text-muted-on-light)' }}>{s.employees} employees</span>
            <a href="../app/stories.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>Read the story<Icon name="ArrowRight" size={15} /></a>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ResourcesSection() {
  const D = window.NHR_SITE;
  return (
    <Section>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <SectionHeading eyebrow="Resources" title="Guides, Articles And Webinars"
          description="Practical material for the people who actually run HR, payroll and safety day to day." />
        <Button variant="secondary" iconRight={<Icon name="ArrowRight" size={18} />}>Resource Centre</Button>
      </div>
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 48 }}>
        {D.resources.map(r => (
          <Card key={r.title} interactive padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <Badge tone="soft">{r.tag}</Badge>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, letterSpacing: 'var(--tracking-tight)', flex: 1 }}>{r.title}</h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted-on-light)' }}>
              <Icon name="Clock" size={14} />{r.minutes} min
            </span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function PricingPreview() {
  const P = window.NHR_SITE.pricing;
  return (
    <Section subtle id="pricing-preview">
      <SectionHeading align="center" eyebrow="Pricing" title="Simple Pricing. Every Feature Included."
        description={'One plan, priced by team size — from £' + P.bands[0].monthly + ' a month. No VAT is charged.'} />
      <div style={{ marginTop: 48 }}>
        <PriceBands annual={false} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <Button href="pricing.html" variant="secondary" iconRight={<Icon name="ArrowRight" size={18} />}>See Full Pricing</Button>
      </div>
    </Section>
  );
}

function DemoCta() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)', padding: 'clamp(64px,8vw,128px) 0' }}>
      <DotField size={270} opacity={.34} />
      <DotField corner="br" size={270} opacity={.34} />
      <GridLines opacity={.6} />
      <Glow size={760} strength={.16} left="50%" top="-30%" style={{ transform: 'translateX(-50%)' }} />
      <div className="nhr-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 26 }}>
        <img src="../../assets/logo-mark-light.png" alt="" style={{ width: 64 }} />
        <h2 style={{ margin: 0, fontSize: 'var(--text-section)', fontWeight: 800, letterSpacing: 'var(--tracking-hero)', color: '#fff' }}>
          See NHR Solution <span style={{ color: 'var(--nhr-turquoise)' }}>In Action</span>
        </h2>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 'var(--text-lead)', lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          A short walkthrough with someone who knows the product. Bring your own process and we will show you how it maps.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button size="lg" iconRight={<Icon name="ArrowRight" size={20} />}>Get Started</Button>
          <Button size="lg" variant="secondary" tone="dark">Book a Demo</Button>
        </div>
        <span className="nhr-eyebrow" style={{ color: 'var(--nhr-turquoise)' }}>Smart Tools for Smarter Businesses</span>
      </div>
    </div>
  );
}

Object.assign(window, { TrustStats, ProductEcosystem, ProductCard, Showcase, LeaveCalendarMock, PayrollMock, SafetyMock, HrShowcase, PayrollShowcase, SafetyShowcase, AiSection, WhoWeServe, IntegrationsSection, StoriesSection, ResourcesSection, PricingPreview, DemoCta });
