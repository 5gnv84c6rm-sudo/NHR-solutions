/* Legal — the page shell: document switcher, contents sidebar with scroll
   tracking, print, and the cookie controls injected into the cookie policy.

   One file serves all five documents, switched by ?doc= in the URL so each has
   a linkable address without five near-identical HTML files to keep in step.
*/
const { SectionHeading, Card, Button, Badge, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* ---------- contents with scroll tracking ---------- */
function LegalContents({ doc, active, onJump }) {
  return (
    <nav aria-label="On this page" style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 100 }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, color: 'var(--nhr-turquoise-ink)', marginBottom: 8 }}>
        On this page
      </span>
      {doc.sections.map(([heading]) => {
        const id = slugify(heading);
        const on = active === id;
        return (
          <a key={id} href={'#' + id} onClick={ev => { ev.preventDefault(); onJump(id); }}
            style={{
              display: 'block', padding: '10px 13px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.45,
              textDecoration: 'none', borderLeft: '2px solid ' + (on ? 'var(--nhr-turquoise)' : 'transparent'),
              background: on ? 'var(--nhr-turquoise-tint)' : 'transparent',
              color: on ? 'var(--nhr-turquoise-ink)' : 'var(--text-body)',
              fontWeight: on ? 700 : 500
            }}>{heading}</a>
        );
      })}
      <span style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button size="sm" variant="secondary" onClick={() => window.print()} iconLeft={<Icon name="Printer" size={14} />}>Print or save PDF</Button>
        <a href="contact.html" style={{ fontSize: 13, color: 'var(--nhr-turquoise-ink)', fontWeight: 600 }}>Ask about this document →</a>
      </span>
    </nav>
  );
}

/* ---------- document body ---------- */
function LegalBody({ doc }) {
  const [active, setActive] = React.useState(slugify(doc.sections[0][0]));

  React.useEffect(() => {
    /* Highlight the heading nearest the top of the viewport rather than using
       an observer threshold, which behaves badly on short final sections. */
    function onScroll() {
      let best = null, bestTop = Infinity;
      doc.sections.forEach(([h]) => {
        const el = document.getElementById(slugify(h));
        if (!el) return;
        const top = Math.abs(el.getBoundingClientRect().top - 120);
        if (top < bestTop) { bestTop = top; best = slugify(h); }
      });
      if (best) setActive(best);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [doc.slug]);

  function jump(id) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
    setActive(id);
  }

  return (
    <Section>
      <div className="legal-split" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 48, alignItems: 'start' }}>
        <div className="legal-nav"><LegalContents doc={doc} active={active} onJump={jump} /></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 780 }}>
          <window.LegalReviewBanner doc={doc} />

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
            {[['Last updated', window.LEGAL_UPDATED], ['Version', window.LEGAL_VERSION], ['Applies to', 'nhrsolutions.net and the NHR Solution platform']].map(([k, v]) => (
              <span key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted-light)' }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{v}</span>
              </span>
            ))}
          </div>

          {doc.sections.map(([heading, paras], i) => (
            <section key={heading} id={slugify(heading)} style={{ display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 110 }}>
              <h2 style={{
                margin: 0, display: 'flex', alignItems: 'baseline', gap: 12,
                fontSize: 'clamp(19px,2.2vw,23px)', fontWeight: 800, letterSpacing: '-.015em', color: 'var(--text-heading)'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {heading}
              </h2>
              {paras.map((p, k) => (
                <p key={k} style={{ margin: 0, fontSize: 15, lineHeight: 1.82, color: 'var(--text-body)', textWrap: 'pretty' }}>{p}</p>
              ))}
              {doc.slug === 'cookies' && heading === 'Changing your mind' && <window.CookieControls />}
            </section>
          ))}

          <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <IconWrapper size={44}><Icon name="Mail" size={19} /></IconWrapper>
            <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)' }}>Questions about this document</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
              A data protection request, or a question about how we hold information, goes to the data protection route
              on the contact form. The statutory deadline for a subject access request is one month from when it reaches
              anyone here, so those are logged on arrival.
            </span>
            <a href="contact.html" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>Contact us →</a>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ---------- document switcher ---------- */
function LegalSwitcher({ current, onSelect }) {
  const docs = Object.keys(window.LEGAL_DOCS).map(k => window.LEGAL_DOCS[k]);
  return (
    <Section subtle style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        {docs.map(d => {
          const on = d.slug === current;
          return (
            <button key={d.slug} type="button" onClick={() => onSelect(d.slug)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', textAlign: 'left',
              borderRadius: 16, cursor: 'pointer', minHeight: 72,
              border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
              background: on ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)'
            }}>
              <span style={{
                width: 38, height: 38, flex: '0 0 auto', borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? 'var(--nhr-turquoise)' : 'var(--surface-subtle)',
                color: on ? 'var(--nhr-black)' : 'var(--text-muted-light)'
              }}><Icon name={d.icon} size={17} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, lineHeight: 1.3, color: on ? 'var(--nhr-turquoise-ink)' : 'var(--text-heading)' }}>{d.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-light)' }}>{d.sections.length} sections</span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- page ---------- */
function LegalPage() {
  const params = new URLSearchParams(window.location.search);
  const initial = window.LEGAL_DOCS[params.get('doc')] ? params.get('doc') : 'privacy';
  const [slug, setSlug] = React.useState(initial);
  const doc = window.LEGAL_DOCS[slug];

  function select(next) {
    setSlug(next);
    /* Keep the address linkable without reloading the whole page. */
    const url = new URL(window.location.href);
    url.searchParams.set('doc', next);
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  React.useEffect(() => { document.title = doc.name + ' | NHR Solution'; }, [slug]);

  return (
    <Page current="Legal" solidNav>
      <PageHero eyebrow="Legal"
        title={doc.name.split(' ')[0]}
        highlight={doc.name.split(' ').slice(1).join(' ')}
        description={doc.intro}
        primary="" secondary=""
        breadcrumbs={[{ label: 'Home', href: 'index.html' }, { label: 'Legal' }, { label: doc.name }]} />
      <LegalSwitcher current={slug} onSelect={select} />
      <LegalBody doc={doc} />
    </Page>
  );
}

Object.assign(window, { LegalPage, LegalBody, LegalContents, LegalSwitcher, slugify });
