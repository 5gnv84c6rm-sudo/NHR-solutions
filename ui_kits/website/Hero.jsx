const { Button } = window.NHRSolutionDesignSystem_0db691;

function Hero() {
  return (
    <div id="top" style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)' }}>
      <DotField size={280} opacity={.4} inset={-110} />
      <DotField corner="br" size={280} opacity={.32} inset={-60} />
      <GridLines opacity={.6} />
      <Glow size={820} left={-180} top={-260} strength={.16} />
      <Glow size={620} right={-140} bottom={-280} strength={.12} />
      <div className="nhr-container" style={{ position: 'relative', paddingTop: 84, paddingBottom: 104 }}>
        <div className="hero-copy" style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 780 }}>
          <span className="nhr-eyebrow" style={{ color: 'var(--nhr-turquoise)' }}>Smart Tools for Smarter Businesses</span>
          <h1 style={{
            margin: 0, fontSize: 'var(--text-hero)', fontWeight: 800,
            letterSpacing: 'var(--tracking-hero)', lineHeight: 'var(--lh-tight)', color: '#fff'
          }}>Everything Your Business Needs to <span style={{ color: 'var(--nhr-turquoise)' }}>Work Smarter</span>.</h1>
          <p style={{ margin: 0, fontSize: 'var(--text-lead)', lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Powerful HR, workforce, payroll, compliance and business tools designed to simplify your day-to-day operations.
          </p>
          <div className="hero-cta" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Button size="lg" iconRight={<Icon name="ArrowRight" size={20} />}>Get Started</Button>
            <Button size="lg" variant="secondary" tone="dark">Book a Demo</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted-dark)', fontSize: 14 }}>
            <Icon name="Check" size={16} style={{ color: 'var(--nhr-turquoise)' }} />
            Built for modern businesses
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Hero });
