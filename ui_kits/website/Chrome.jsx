/* Shared site chrome: theme, announcement bar, navbar, sections, footer, cookie banner. */
const { Button, IconButton, Badge } = window.NHRSolutionDesignSystem_0db691;

/* ---------- theme ---------- */
function useTheme() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('nhr-theme') || 'light');
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nhr-theme', theme);
  }, [theme]);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}

function ThemeToggle({ theme, onToggle, tone = 'dark' }) {
  return (
    <IconButton tone={tone} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} size={38} onClick={onToggle}>
      <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} />
    </IconButton>
  );
}

/* ---------- brand decoration ---------- */
function Wordmark({ tone = 'dark', size = 22, variant = 'lockup' }) {
  const dark = tone === 'dark';
  const src = '../../assets/' + (variant === 'mark' ? 'logo-mark-' : 'logo-') + (dark ? 'light' : 'dark') + '.png';
  const ratio = variant === 'mark' ? 198 / 228 : 548 / 338;
  const h = variant === 'mark' ? size * 1.5 : size * 1.72;
  return <img src={src} alt="NHR Solution" style={{ height: h, width: h * ratio, display: 'block' }} />;
}

function DotField({ corner = 'tl', size = 260, opacity = .34, inset = -70 }) {
  const tl = corner === 'tl';
  const w = Math.min(size, 300);
  const mask = 'radial-gradient(115% 115% at ' + (tl ? '0% 0%' : '100% 100%') + ',#000 0%,rgba(0,0,0,.45) 38%,transparent 72%)';
  return <div aria-hidden="true" style={{
    position: 'absolute', width: w, height: w * 1.13,
    top: tl ? inset : undefined, left: tl ? inset : undefined,
    bottom: tl ? undefined : inset, right: tl ? undefined : inset,
    backgroundImage: 'url(../../assets/pattern-dots-' + corner + '.png)',
    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    WebkitMaskImage: mask, maskImage: mask,
    mixBlendMode: 'screen', opacity, pointerEvents: 'none'
  }} />;
}

function Glow({ size = 620, left, right, top, bottom, strength = .20, style }) {
  return <div aria-hidden="true" style={{
    position: 'absolute', width: size, height: size, left, right, top, bottom,
    background: 'radial-gradient(circle,rgba(0,229,212,' + strength + '),transparent 62%)',
    pointerEvents: 'none', ...style
  }} />;
}

function GridLines({ opacity = .5 }) {
  return <div aria-hidden="true" style={{
    position: 'absolute', inset: 0, opacity,
    backgroundImage: 'linear-gradient(rgba(0,229,212,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,212,.06) 1px,transparent 1px)',
    backgroundSize: '64px 64px',
    WebkitMaskImage: 'radial-gradient(80% 70% at 50% 0%,#000,transparent 75%)',
    maskImage: 'radial-gradient(80% 70% at 50% 0%,#000,transparent 75%)', pointerEvents: 'none'
  }} />;
}

/* tone="dark" is a brand-dark section in both modes; light sections follow the theme. */
function Section({ tone = 'light', children, id, style, pattern = false, subtle = false, narrow = false }) {
  const dark = tone === 'dark';
  return (
    <section id={id} style={{
      position: 'relative', overflow: 'hidden',
      background: dark ? 'var(--nhr-black)' : (subtle ? 'var(--surface-subtle)' : 'var(--surface-page)'),
      color: dark ? 'var(--text-body-dark)' : 'var(--text-body)',
      padding: 'clamp(56px,7vw,120px) 0', ...style
    }}>
      {pattern && <DotField />}
      {pattern === 'both' && <DotField corner="br" />}
      <div className="nhr-container" style={{ position: 'relative', maxWidth: narrow ? 900 : undefined }}>{children}</div>
    </section>
  );
}

/* ---------- announcement bar ---------- */
function AnnouncementBar() {
  const [open, setOpen] = React.useState(() => sessionStorage.getItem('nhr-ann') !== 'closed');
  if (!open) return null;
  const a = window.NHR_SITE.announcement;
  return (
    <div className="announce-bar" style={{
      position: 'relative', background: 'var(--nhr-charcoal)', borderBottom: '1px solid var(--border-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      padding: '11px 48px', fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-body-dark)', textAlign: 'center'
    }}>
      <Icon name="Sparkles" size={15} style={{ color: 'var(--nhr-turquoise)' }} />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</span>
      <a href={a.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {a.cta}<Icon name="ArrowRight" size={14} />
      </a>
      <button type="button" aria-label="Dismiss announcement" onClick={() => { setOpen(false); sessionStorage.setItem('nhr-ann', 'closed'); }}
        style={{ position: 'absolute', right: 14, background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', display: 'inline-flex' }}>
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}

/* ---------- navbar ---------- */
function Navbar({ current = 'Home', theme, onToggleTheme, solid = false }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const read = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', read); read();
    return () => window.removeEventListener('scroll', read);
  }, []);
  const glass = solid || scrolled;
  const links = window.NHR_SITE.nav;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: glass ? 'var(--glass-dark)' : 'transparent',
      backdropFilter: glass ? 'var(--blur-nav)' : 'none',
      WebkitBackdropFilter: glass ? 'var(--blur-nav)' : 'none',
      borderBottom: '1px solid ' + (glass ? 'var(--border-dark)' : 'transparent'),
      boxShadow: glass ? '0 12px 30px -18px rgba(0,0,0,.9)' : 'none',
      transition: 'background var(--dur-slow) var(--ease-out), border-color var(--dur-slow) var(--ease-out), box-shadow var(--dur-slow) var(--ease-out)'
    }}>
      <div className="nhr-container" style={{ height: 'var(--nav-height)', display: 'flex', alignItems: 'center', gap: 24 }}>
        <a href="index.html" style={{ display: 'flex', alignItems: 'center' }}><Wordmark /></a>
        <nav aria-label="Primary" className="nav-links" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 28 }}>
          {links.map(l => {
            const active = l.label === current;
            return <a key={l.label} href={l.href} aria-current={active ? 'page' : undefined} style={{
              fontSize: 15, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.78)'
            }}>{l.label}</a>;
          })}
        </nav>
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <a href="../app/index.html" style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Login</a>
          <Button size="sm" tone="dark">Get Started</Button>
        </div>
        <span className="nav-burger" style={{ display: 'none', gap: 8 }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <IconButton tone="dark" label={open ? 'Close menu' : 'Open menu'} active={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'X' : 'Menu'} size={20} />
          </IconButton>
        </span>
      </div>
      <div className="nav-sheet" style={{
        display: 'none', overflow: 'hidden',
        maxHeight: open ? 520 : 0, opacity: open ? 1 : 0,
        transition: 'max-height var(--dur-slow) var(--ease-in-out), opacity var(--dur-base) var(--ease-out)',
        background: 'var(--glass-dark)', backdropFilter: 'var(--blur-nav)', borderBottom: '1px solid var(--border-dark)'
      }}>
        <div className="nhr-container" style={{ padding: '10px 20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} style={{
              padding: '15px 0', fontSize: 17, fontWeight: 600, color: '#fff', borderBottom: '1px solid var(--border-dark)'
            }}>{l.label}</a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <Button fullWidth>Get Started</Button>
            <Button variant="secondary" tone="dark" fullWidth>Book a Demo</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- page hero for inner pages ---------- */
/* ---------- structured data ----------
   Absolute URL for a site link. On the published site NHR_ROUTES maps source
   files to clean addresses; the prerender build rewrites anything left pointing
   at its local server. */
function siteUrl(href) {
  const u = new URL(href, document.baseURI);
  const m = u.pathname.match(/\/ui_kits\/website\/([a-z0-9-]+\.html)$/);
  const clean = window.NHR_ROUTES && m && window.NHR_ROUTES[m[1]];
  return clean ? location.origin + clean : u.origin + u.pathname;
}
function pageUrl() {
  return window.NHR_ROUTES ? location.origin + location.pathname : siteUrl(location.pathname);
}
function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
function breadcrumbSchema(crumbs) {
  const items = crumbs
    .map((c, i) => ({ c, last: i === crumbs.length - 1 }))
    .filter(({ c, last }) => last || (c.href && c.href !== '#'))
    .map(({ c, last }, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: last ? pageUrl() : siteUrl(c.href) }));
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function PageHero({ eyebrow, title, highlight, description, primary = 'Get Started', secondary = 'Book a Demo', children, breadcrumbs }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)' }}>
      {breadcrumbs && <JsonLd data={breadcrumbSchema(breadcrumbs)} />}
      <DotField size={280} opacity={.38} inset={-110} />
      <DotField corner="br" size={260} opacity={.3} inset={-60} />
      <GridLines />
      <Glow size={720} left="-12%" top="-40%" strength={.14} />
      <div className="nhr-container" style={{ position: 'relative', paddingTop: 72, paddingBottom: 84 }}>
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-muted-dark)', marginBottom: 26 }}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.label}>
                {i > 0 && <Icon name="ChevronRight" size={13} />}
                {b.href ? <a href={b.href} style={{ color: 'var(--text-muted-dark)' }}>{b.label}</a> : <span style={{ color: '#fff' }}>{b.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {eyebrow && <span className="nhr-eyebrow" style={{ color: 'var(--nhr-turquoise)' }}>{eyebrow}</span>}
          <h1 style={{ margin: 0, fontSize: 'var(--text-hero)', fontWeight: 800, letterSpacing: 'var(--tracking-hero)', lineHeight: 'var(--lh-tight)', color: '#fff' }}>
            {title} {highlight && <span style={{ color: 'var(--nhr-turquoise)' }}>{highlight}</span>}
          </h1>
          {description && <p style={{ margin: 0, fontSize: 'var(--text-lead)', lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 640 }}>{description}</p>}
          {/* primary="" suppresses the CTA row entirely — a legal page should not
              be selling anything. */}
          {primary ? (
            <div className="hero-cta" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Button size="lg" iconRight={<Icon name="ArrowRight" size={20} />}>{primary}</Button>
              {secondary && <Button size="lg" variant="secondary" tone="dark">{secondary}</Button>}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- footer + cookie banner ---------- */
function Footer() {
  return (
    <footer style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)', borderTop: '1px solid var(--border-dark)' }}>
      <DotField size={240} opacity={.3} />
      <div className="nhr-container" style={{ position: 'relative', padding: '72px 48px 32px' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(6,1fr)', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 300 }}>
            <Wordmark size={26} />
            <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nhr-turquoise)' }}>Smart Tools for Smarter Businesses</span>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>Smart digital solutions built to help modern businesses work better.</p>
          </div>
          {window.NHR_SITE.footer.map(col => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#fff' }}>{col.title}</span>
              {col.links.map(l => <SafeLink key={l} label={l} style={{ fontSize: 14, color: 'var(--text-body-dark)' }} />)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 52, paddingTop: 24, borderTop: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>© 2026 NHR Solution. All rights reserved. Placeholder content pending legal review.</span>
          <span style={{ display: 'flex', gap: 18 }}>
            {['Linkedin', 'Facebook', 'Instagram', 'Youtube'].map(n => (
              <span key={n} aria-label={n + ' — profile not published yet'} title={n + ' — profile not published yet'}
              style={{ color: 'var(--text-muted-dark)', opacity: .5, cursor: 'default' }}><Icon name={n} size={17} /></span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- pricing ---------- */
function bandLabel(bands, i) {
  const lo = i === 0 ? 1 : bands[i - 1].upTo + 1;
  return lo === 1 ? 'Up to ' + bands[i].upTo + ' employees' : lo + '–' + bands[i].upTo + ' employees';
}
function goToContact() {
  window.location.href = (window.NHR_ROUTES && window.NHR_ROUTES['contact.html']) || 'contact.html';
}
function PriceBands({ annual }) {
  const { PricingCard } = window.NHRSolutionDesignSystem_0db691;
  const P = window.NHR_SITE.pricing;
  const above = P.bands[P.bands.length - 1].upTo + 1;
  return (
    <div className="grid-5 pricing" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, alignItems: 'stretch' }}>
      {P.bands.map((b, i) => (
        <PricingCard key={b.upTo} name={bandLabel(P.bands, i)} blurb="Every feature included."
          price={'£' + (annual ? b.monthly * P.annualMonths : b.monthly).toLocaleString('en-GB')}
          period={annual ? '/year' : '/month'} ctaLabel="Get Started" />
      ))}
      <PricingCard name={above + '+ employees'} blurb="A quote for larger teams." price="Contact us" period=""
        ctaLabel="Contact Us" onSelect={goToContact} />
    </div>
  );
}

/* The published build defines nhrLoadAnalytics and gtag; the prototype does not,
   so this is a no-op when opened from ui_kits/. */
function setAnalyticsConsent(granted) {
  if (granted) {
    if (window.nhrLoadAnalytics) window.nhrLoadAnalytics();
    return;
  }
  if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'denied' });
  const host = location.hostname.replace(/^www\./, '');
  document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => /^_ga/.test(n)).forEach(n => {
    document.cookie = n + '=; Max-Age=0; path=/';
    document.cookie = n + '=; Max-Age=0; path=/; domain=.' + host;
  });
}

function CookieBanner() {
  const [open, setOpen] = React.useState(() => localStorage.getItem('nhr-cookies') === null);
  if (!open) return null;
  const close = (v) => { localStorage.setItem('nhr-cookies', v); setAnalyticsConsent(v === 'all'); setOpen(false); };
  return (
    <div role="dialog" aria-label="Cookie preferences" style={{
      position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 60, maxWidth: 560, margin: '0 auto',
      background: 'rgba(13,17,17,.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-float)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Cookies on nhrsolutions.net</span>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
        Essential cookies keep the site working. Optional cookies help measure how pages are used. You can change this at any time.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={() => close('all')}>Accept All</Button>
        <Button size="sm" variant="secondary" tone="dark" onClick={() => close('essential')}>Reject Non-Essential</Button>
        <Button size="sm" variant="ghost" tone="dark" onClick={() => close('managed')}>Manage Preferences</Button>
      </div>
    </div>
  );
}

/* Page wrapper — every page file uses this. */
function Page({ current, children, solidNav = false }) {
  const [theme, toggle] = useTheme();
  if (window.useSignupCtaBinding) window.useSignupCtaBinding();
  return (
    <React.Fragment>
      <AnnouncementBar />
      <Navbar current={current} theme={theme} onToggleTheme={toggle} solid={solidNav} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
      <CookieBanner />
      {window.SignupModal && <window.SignupModal />}
    </React.Fragment>
  );
}

/* Footer and nav links resolve to the pages that exist. Anything not yet built
   renders as plain text rather than a dead anchor — an href="#" jumps the page
   to the top, which reads as a broken link rather than an unbuilt one. */
const FOOTER_HREFS = {
  'Privacy': 'legal.html?doc=privacy', 'Privacy Policy': 'legal.html?doc=privacy',
  'Terms': 'legal.html?doc=terms', 'Terms and Conditions': 'legal.html?doc=terms',
  'Cookies': 'legal.html?doc=cookies', 'Cookie Policy': 'legal.html?doc=cookies',
  'Accessibility': 'legal.html?doc=accessibility',
  'Data Protection': 'legal.html?doc=data',
  'About': 'about.html', 'Contact': 'contact.html', 'Book a Demo': 'demo.html',
  'Pricing': 'pricing.html', 'Calculators': 'calculators.html',
  'HR Software': 'hr-software.html', 'Payroll': 'payroll.html',
  'Healthcare': 'industry-healthcare.html',
  'Customer Stories': '../app/stories.html', 'Help Centre': '../app/support.html',
  'Support': '../app/support.html',
  'API': '../app/integrations.html', 'Integrations': '../app/integrations.html',
  'Documentation': '../app/integrations.html',
  'Resources': '../app/resources.html', 'Guides': '../app/resources.html',
  'Articles': '../app/resources.html', 'Blog': '../app/resources.html',
  'Webinars': '../app/resources.html', 'Podcasts': '../app/resources.html',
  'Health & Safety': '../app/health-safety.html', 'Wellbeing': '../app/wellbeing.html',
  'eLearning': '../app/elearning.html', 'Training': '../app/training.html',
  'NHR Intelligence': '../app/intelligence.html',
  'Startups': 'pricing.html', 'Small Businesses': 'pricing.html',
  'Medium Businesses': 'pricing.html', 'Large Businesses': 'pricing.html',
  'Team': 'about.html', 'Careers': 'about.html', 'Press': 'about.html', 'Partners': 'about.html',
  'Who We Serve': 'industry-healthcare.html'
};
function footerHref(label) { return FOOTER_HREFS[label] || null; }

/* A link that only becomes an anchor when there is somewhere to go. */
function SafeLink({ label, style, children, title }) {
  const href = footerHref(label);
  if (href) return <a href={href} style={style}>{children || label}</a>;
  return (
    <span style={Object.assign({ cursor: 'default', opacity: .58 }, style)}
      title={title || 'Page not published yet'}>{children || label}</span>
  );
}

Object.assign(window, { useTheme, ThemeToggle, Wordmark, DotField, Glow, GridLines, Section, AnnouncementBar, Navbar, PageHero, Footer, CookieBanner, Page, footerHref, SafeLink, FOOTER_HREFS, siteUrl, pageUrl, JsonLd, setAnalyticsConsent, PriceBands, bandLabel, goToContact });
