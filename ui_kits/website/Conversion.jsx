const { SectionHeading, PricingCard, TestimonialCard, FaqItem, Button, Switch, Input, Select, Card } = window.NHRSolutionDesignSystem_0db691;

function Testimonials() {
  const D = window.NHR_SITE;
  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Customers" title="Trusted By Businesses That Think Ahead"
        description="Placeholder testimonials — replaced once real customer quotes are approved." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 52 }}>
        {D.testimonials.map(t => <TestimonialCard key={t.name} {...t} />)}
      </div>
    </Section>
  );
}

function Faq() {
  const D = window.NHR_SITE;
  const [open, setOpen] = React.useState(0);
  const schema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: D.faqs.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } }))
  };
  return (
    <Section>
      <JsonLd data={schema} />
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <SectionHeading align="center" eyebrow="FAQ" title="Questions, Answered" />
        <div style={{ marginTop: 40 }}>
          {D.faqs.map((q, i) => (
            <FaqItem key={q.q} id={'faq-' + i} question={q.q} answer={q.a}
              open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ContactBlock() {
  return (
    <Section id="contact" subtle>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <SectionHeading eyebrow="Contact" title="Book A Demo"
          description="Tell us how your business runs today and the team will show you the tools that fit." />
        <Card padding="var(--card-padding-lg)">
          <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={e => e.preventDefault()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="Full name" placeholder="Amara Osei" required />
              <Input label="Work email" type="email" placeholder="you@company.com" required />
            </div>
            <Select label="Company size" options={['1–10', '11–50', '51–200', '200+']} />
            <Input label="What would you like to simplify?" multiline rows={3} placeholder="Attendance, payroll, reporting…" />
            <Button type="submit" fullWidth>Get Started</Button>
          </form>
        </Card>
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)', padding: 'clamp(64px,8vw,128px) 0' }}>
      <DotField size={270} opacity={.34} />
      <DotField corner="br" size={270} opacity={.34} />
      <Glow size={760} strength={.16} left="50%" top="-30%" style={{ transform: 'translateX(-50%)' }} />
      <div className="nhr-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 26 }}>
        <img src="../../assets/logo-mark-light.png" alt="" style={{ width: 64 }} />
        <h2 style={{ margin: 0, fontSize: 'var(--text-section)', fontWeight: 800, letterSpacing: 'var(--tracking-hero)', color: '#fff' }}>Ready To <span style={{ color: 'var(--nhr-turquoise)' }}>Work Smarter</span>?</h2>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 'var(--text-lead)', lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
          Discover smarter tools designed to help your business save time, improve productivity and grow with confidence.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button size="lg" iconRight={<Icon name="ArrowRight" size={20} />}>Get Started</Button>
          <Button size="lg" variant="secondary" tone="dark">Contact Us</Button>
        </div>
        <span className="nhr-eyebrow" style={{ color: 'var(--nhr-turquoise)' }}>Smart Tools for Smarter Businesses</span>
      </div>
    </div>
  );
}

Object.assign(window, { Testimonials, Faq, ContactBlock, FinalCta });
