const { SectionHeading, Card, Button, Badge, Switch, FaqItem, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

function money(n) { return '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 }); }

function PriceCalculator({ employees, setEmployees, annual, setAnnual }) {
  const P = window.NHR_SITE.pricing;
  const top = P.bands[P.bands.length - 1].upTo;
  const band = window.nhrPriceFor(employees);
  return (
    <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="emp-count" style={{ fontSize: 'var(--text-caption)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted-on-light)' }}>How many employees?</label>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text-heading)' }}>{employees > top ? top + '+' : employees}</span>
        </span>
        <Switch label="Yearly billing (2 months free)" checked={annual} onChange={e => setAnnual(e.target.checked)} />
      </div>
      <input id="emp-count" type="range" min="1" max={top + 1} step="1" value={employees}
        onChange={e => setEmployees(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--nhr-turquoise)', height: 30 }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {P.bands.map(b => b.upTo).concat([top + 1]).map(n => (
          <button key={n} type="button" onClick={() => setEmployees(n)} style={{
            padding: '8px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            border: '1px solid ' + (employees === n ? 'var(--nhr-turquoise)' : 'var(--border-subtle)'),
            background: employees === n ? 'var(--surface-accent-soft)' : 'transparent',
            color: employees === n ? 'var(--text-accent)' : 'var(--text-body)',
            fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: 700
          }}>{n > top ? top + '+' : n}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
        {band ? (
          <React.Fragment>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text-accent)' }}>{money(annual ? band.monthly * P.annualMonths : band.monthly)}</span>
              <span style={{ fontSize: 15, color: 'var(--text-body)' }}>{annual ? '/year' : '/month'}</span>
            </span>
            <span style={{ fontSize: 13.5, color: 'var(--text-muted-on-light)' }}>
              {annual ? 'Equivalent to ' + money(band.monthly * P.annualMonths / 12) + ' a month. ' : 'Or ' + money(band.monthly * P.annualMonths) + ' billed yearly. '}Excludes VAT.
            </span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-heading)' }}>Contact us for a quote</span>
            <Button onClick={goToContact} iconRight={<Icon name="ArrowRight" size={18} />}>Contact Us</Button>
          </React.Fragment>
        )}
      </div>
    </Card>
  );
}

function IncludedFeatures() {
  const P = window.NHR_SITE.pricing;
  return (
    <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
      {P.features.map(g => (
        <Card key={g.group} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>{g.group}</span>
          {g.items.map(item => (
            <span key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: 'var(--text-heading)' }}>
              <Icon name="Check" size={17} style={{ color: 'var(--text-accent)', flex: '0 0 auto' }} />{item}
            </span>
          ))}
        </Card>
      ))}
    </div>
  );
}

function PricingPageBody() {
  const P = window.NHR_SITE.pricing;
  const top = P.bands[P.bands.length - 1].upTo;
  const [employees, setEmployees] = React.useState(10);
  const [annual, setAnnual] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(0);

  const bandList = P.bands.map((b, i) => bandLabel(P.bands, i).replace('Up to', 'up to') + ' £' + b.monthly).join(', ');
  const faqs = [
    { q: 'How is the price calculated?', a: 'By team size. There is one plan with every feature, priced per month: ' + bandList + '.' },
    { q: 'What if I have more than ' + top + ' employees?', a: 'Contact the team for a quote based on your headcount.' },
    { q: 'Is VAT added at checkout?', a: 'No. NHR Solution is not VAT registered, so the price you see is the price you pay.' },
    { q: 'Is there a discount for paying yearly?', a: 'Yes. Yearly billing costs ' + P.annualMonths + ' times the monthly price, so you get two months free.' },
    { q: 'What counts as an employee?', a: 'Anyone with a record in your workspace. Employees who leave stop counting from the following billing period.' }
  ];
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const offerSchema = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'NHR Solution', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: pageUrl(),
    offers: P.bands.map((b, i) => ({
      '@type': 'Offer', name: bandLabel(P.bands, i), price: String(b.monthly), priceCurrency: 'GBP',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: String(b.monthly), priceCurrency: 'GBP', unitText: 'MONTH', valueAddedTaxIncluded: false }
    }))
  };

  return (
    <React.Fragment>
      <JsonLd data={faqSchema} />
      <JsonLd data={offerSchema} />
      <PageHero eyebrow="Pricing" title="Simple Pricing." highlight="Every Feature Included."
        description={'One plan with the full platform, priced by team size. From £' + P.bands[0].monthly + ' a month for up to ' + P.bands[0].upTo + ' employees.'}
        primary="Get Started" secondary="Book a Demo"
        breadcrumbs={[{ label: 'Home', href: 'index.html' }, { label: 'Pricing' }]} />

      <Section>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <PriceCalculator employees={employees} setEmployees={setEmployees} annual={annual} setAnnual={setAnnual} />
        </div>
        <div style={{ marginTop: 48 }}>
          <PriceBands annual={annual} />
        </div>
        <p style={{ margin: '28px auto 0', maxWidth: 720, textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted-on-light)' }}>
          Prices are per {annual ? 'year' : 'month'}, with no VAT added. Yearly billing is {P.annualMonths} × the monthly price.
        </p>
      </Section>

      <Section subtle>
        <SectionHeading align="center" eyebrow="What's included" title="Every Feature, On Every Price"
          description="There are no tiers and nothing held back. The only thing that changes the price is how many people you employ." />
        <div style={{ marginTop: 44 }}><IncludedFeatures /></div>
      </Section>

      <Section narrow>
        <SectionHeading align="center" eyebrow="FAQ" title="Pricing Questions" />
        <div style={{ marginTop: 36 }}>
          {faqs.map((q, i) => (
            <FaqItem key={q.q} id={'pfaq-' + i} question={q.q} answer={q.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </Section>
    </React.Fragment>
  );
}

Object.assign(window, { PricingPageBody, PriceCalculator, IncludedFeatures });
