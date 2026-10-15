/* About — company page sections.

   The constraint that shapes this page: NHR Solution has no awards, no
   certifications, no named customers and no funding announcements. Most About
   pages are built out of exactly those things, so this one is built out of what
   is actually true — what the product covers, how it was decided, and what has
   deliberately not been claimed.

   The one interactive piece reads the live platform: the module list and the
   count come from the same nav definition the app uses, so this page cannot
   claim a module that does not exist.
*/
const { SectionHeading, Stat, Card, Button, Badge, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

/* ---------- Our story ---------- */
function AboutStory() {
  return (
    <Section subtle>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 64, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <SectionHeading eyebrow="Our story"
            title="Built Because The Tools Did Not Fit."
            description="NHR Solution started from a straightforward observation: most businesses run their people operations across a spreadsheet, an inbox and somebody's memory." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              'That arrangement works until it does not. A certificate lapses because the person who tracked renewals was on leave. A near miss is mentioned in passing and never written down. Payroll and HR hold different versions of the same employee list, so a starter gets entered twice and a leaver once.',
              'None of those failures happen because people are careless. They happen because the information lives in a place that cannot remind anyone of anything.',
              'So the platform was built around dates and records rather than around dashboards. Expiry drives reminders. An incident derives its own reporting deadline. A course pass writes its own certificate. The software does the remembering, which is the only part of the job software is reliably better at.'
            ].map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: 15.5, lineHeight: 1.8, color: 'var(--text-body)', textWrap: 'pretty' }}>{p}</p>
            ))}
          </div>
        </div>

        <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
            What N, H and R stand for
          </span>
          {[
            ['N', 'Next-generation', 'Built now, for how businesses actually work now — mobile, distributed, and audited more closely than they were ten years ago.'],
            ['H', 'Human', 'Every record is a person. The software is judged on whether it treats them fairly, not only on whether it is efficient.'],
            ['R', 'Resources', 'People, time, money and compliance capacity. All four are finite, and all four are what this platform is for.']
          ].map(([letter, word, blurb]) => (
            <div key={letter} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{
                width: 44, height: 44, flex: '0 0 auto', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--nhr-black)', color: 'var(--nhr-turquoise)',
                fontFamily: 'var(--font-core)', fontSize: 20, fontWeight: 800
              }}>{letter}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{word}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)' }}>{blurb}</span>
              </span>
            </div>
          ))}
          <span style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-heading)' }}>Smart Tools for Smarter Businesses.</strong> The tagline is
            a claim about the tools, not about the customer — the intelligence should be in the software so the business
            does not have to supply it.
          </span>
        </Card>
      </div>
    </Section>
  );
}

/* ---------- Mission and vision ---------- */
function AboutMission() {
  const items = [
    ['Target', 'Our mission', 'To make the administrative half of running a business quiet enough that people can get on with the other half. Not to replace judgement — to remove the work that was never judgement in the first place.'],
    ['Telescope', 'Our vision', 'Every business, at any size, holding its people information in one place that is accurate, current and understood by the people it describes. Compliance as a by-product of doing the work properly, rather than a separate exercise before an audit.']
  ];
  return (
    <Section tone="dark" pattern>
      <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {items.map(([icon, title, body]) => (
          <Card key={title} tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <IconWrapper tone="dark" size={52}><Icon name={icon} size={22} /></IconWrapper>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>{title}</span>
            <span style={{ fontSize: 15.5, lineHeight: 1.8, color: 'var(--text-body-dark)', textWrap: 'pretty' }}>{body}</span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Values, as decisions ---------- */
/* Values are usually unfalsifiable. These are written as decisions already
   taken in the product, each with the thing it was chosen over — which is the
   only way a stated value carries information. */
function AboutValues() {
  const [open, setOpen] = React.useState(0);
  const values = [
    {
      name: 'Show the working',
      instead: 'instead of a confident number',
      body: 'Every calculated figure in the platform can be opened to show its inputs — Bradford scores, holiday accrual, risk ratings, take-home pay, turnover. A number without its method cannot be defended in a conversation with the employee it describes, and those are the conversations that matter.',
      proof: 'Insights in NHR Intelligence carry the figures they came from and the module they were read from.'
    },
    {
      name: 'Derive, never ask twice',
      instead: 'instead of trusting a stored flag',
      body: 'Status is computed from the underlying facts wherever it can be. A certificate is expired because its date has passed, not because someone remembered to change a dropdown. A scheduled review past its date reads as overdue whatever the record says.',
      proof: 'RIDDOR reportability is derived from severity, incident type and days off — the reporter does not have to know the regulations.'
    },
    {
      name: 'Permissions hold everywhere',
      instead: 'instead of hiding fields in the interface',
      body: 'Where a role cannot read payroll, the payroll figures are not calculated at all — so they cannot be exported, reported on, or handed to an assistant. Restriction by omission rather than by concealment, because a hidden field is still in the page.',
      proof: 'Reports and the AI assistant both inherit the reader\'s permissions; wellbeing suppression survives into CSV exports.'
    },
    {
      name: 'Say what is not built',
      instead: 'instead of a roadmap presented as a feature list',
      body: 'Integrations carry an honest build status and only the finished ones can be connected. There are no customer references because there are no customers to reference yet. Placeholder content is labelled as placeholder wherever it appears.',
      proof: 'Six of nine integrations are marked In development or Planned, with the Connect button disabled.'
    },
    {
      name: 'A record is a person',
      instead: 'instead of a row to be optimised',
      body: 'Wellbeing check-ins carry no employee id, so there is nobody to follow up and no way to build a profile. Adjustments are recorded without a diagnosis. Bradford scores trigger a conversation and say so on the screen, rather than presenting themselves as grounds for action.',
      proof: 'Team wellbeing results are withheld below five responses, including from managers and from the export.'
    }
  ];

  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="What we decided"
        title="Values, Written As Decisions"
        description="A value only means something when it cost you an easier option. Each of these names the thing it was chosen over." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 48, maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
        {values.map((v, i) => {
          const isOpen = open === i;
          return (
            <Card key={v.name} padding={0} style={{ overflow: 'hidden' }}>
              <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '20px 24px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 64
                }}>
                <span style={{
                  width: 30, height: 30, flex: '0 0 auto', borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isOpen ? 'var(--nhr-turquoise)' : 'var(--surface-subtle)',
                  color: isOpen ? 'var(--nhr-black)' : 'var(--text-muted-light)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>{v.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted-light)' }}>{v.instead}</span>
                </span>
                <Icon name={isOpen ? 'Minus' : 'Plus'} size={18} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise-ink)' }} />
              </button>
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px 22px 70px' }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.78, color: 'var(--text-body)', textWrap: 'pretty' }}>{v.body}</p>
                  <span style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', borderRadius: 12,
                    background: 'var(--surface-subtle)', border: '1px solid var(--border-light)'
                  }}>
                    <Icon name="Check" size={14} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--nhr-turquoise-ink)' }} />
                    <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)' }}>
                      <strong style={{ color: 'var(--text-heading)' }}>In the product: </strong>{v.proof}
                    </span>
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- The platform, read from the app ---------- */
/* Counts come from the app's own nav definition, so this section cannot
   advertise a module that has not been built. */
function AboutPlatform() {
  const nav = window.APP_NAV || [];
  const screens = window.APP_SCREENS || {};
  const built = nav.filter(n => screens[n.label]);
  const [filter, setFilter] = React.useState('All');

  const groups = {
    'People': ['Employees', 'Leave', 'Absence', 'Attendance', 'Rotas', 'Recruitment', 'Performance'],
    'Pay': ['Payroll', 'Expenses', 'Plan & Billing'],
    'Compliance': ['Documents', 'Training', 'Health & Safety', 'eLearning'],
    'Insight': ['Overview', 'Reports', 'Analytics', 'NHR Intelligence'],
    'Everything else': ['Wellbeing', 'Integrations', 'Resources', 'Calculators', 'Customer Stories', 'Support', 'Settings']
  };
  function groupOf(label) {
    const k = Object.keys(groups).find(g => groups[g].indexOf(label) > -1);
    return k || 'Everything else';
  }

  const list = built.filter(n => filter === 'All' || groupOf(n.label) === filter);

  return (
    <Section>
      <SectionHeading align="center" eyebrow="Our technology"
        title={built.length + ' Modules, One Employee Record'}
        description="The list below is read from the application itself rather than written by hand, so it cannot describe something that does not exist." />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 40 }}>
        {['All'].concat(Object.keys(groups)).map(g => (
          <button key={g} type="button" onClick={() => setFilter(g)} style={{
            padding: '10px 16px', minHeight: 42, borderRadius: 999, cursor: 'pointer',
            border: '1px solid ' + (filter === g ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
            background: filter === g ? 'var(--nhr-turquoise-tint)' : 'transparent',
            color: filter === g ? 'var(--nhr-turquoise-ink)' : 'var(--text-body)',
            fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: filter === g ? 700 : 600
          }}>{g}</button>
        ))}
      </div>

      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, marginTop: 32 }}>
        {list.map(n => (
          <Card key={n.label} padding={18} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <IconWrapper size={38}><Icon name={n.icon} size={17} /></IconWrapper>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>{n.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted-light)' }}>{groupOf(n.label)}</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, marginTop: 56 }}>
        {[
          ['Database', 'One employee record', 'Every module reads the same record. A change to someone\'s department shows up in rotas, reports and permissions at once, because there is only one copy of it.'],
          ['ShieldCheck', 'Role-based by design', 'Four roles decide what each person sees, and the restriction is applied where the data is assembled rather than where it is displayed.'],
          ['Smartphone', 'Built for the phone too', 'Managers approve leave and staff clock in from a phone. Mobile was designed rather than shrunk down.']
        ].map(([icon, title, body]) => (
          <Card key={title} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <IconWrapper size={46}><Icon name={icon} size={20} /></IconWrapper>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
            <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-body)' }}>{body}</span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Team ---------- */
/* No invented people. The roles are what the business needs to fill, marked
   as such, which is more useful to a visitor than four stock portraits. */
function AboutTeam() {
  const roles = [
    ['Product', 'Decides what gets built and what deliberately does not. Owns the rule that a feature ships only when its edge cases are handled.'],
    ['Engineering', 'Builds the platform and its data layer. Responsible for the derived-status principle holding across every module.'],
    ['HR and compliance', 'Keeps the employment-law content current and signs off anything the product asserts about statutory duties.'],
    ['Customer support', 'Answers tickets and writes the help articles. Rewrites the ones customers mark unhelpful.']
  ];

  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Our team"
        title="The People Behind It"
        description="NHR Solution has not published its team yet. Rather than fill this space with placeholder portraits, here are the functions the product depends on." />
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginTop: 48 }}>
        {roles.map(([name, blurb]) => (
          <Card key={name} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--surface-subtle)',
              border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Icon name="User" size={20} style={{ color: 'var(--text-muted-light)' }} /></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{name}</span>
              <Badge>Placeholder</Badge>
            </span>
            <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>{blurb}</span>
          </Card>
        ))}
      </div>
      <p style={{ margin: '32px auto 0', maxWidth: 680, textAlign: 'center', fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-muted-light)' }}>
        Real names, photographs and biographies replace these once NHR Solution is ready to publish them. Nothing on
        this page attributes a quote or a credential to a person who has not agreed to it.
      </p>
    </Section>
  );
}

/* ---------- What we do not claim ---------- */
/* The most unusual section on the page, and the most defensible. Every SaaS
   About page asserts certifications and customer counts; stating plainly which
   ones do not exist yet is both honest and a differentiator. */
function AboutClaims() {
  const rows = [
    ['Customer numbers', 'Not claimed', 'NHR Solution is new. Any figure would be invented, and an invented figure is the kind of thing that ends a sale when it is checked.'],
    ['Certifications and accreditations', 'Not claimed', 'No ISO certification, no HMRC recognition, no CIPP accreditation is asserted anywhere on this site or in the product.'],
    ['Awards', 'Not claimed', 'None held.'],
    ['Legal advice', 'Not offered', 'The platform contains employment-law information to help you run a process properly. It is not advice, and the product says so at the point of output.'],
    ['Integrations', 'Partly built', 'CSV import and export and outbound webhooks work today. Xero, Sage and Microsoft 365 are in development; the rest are planned and cannot be connected.'],
    ['Platform reliability figures', 'Placeholder', 'The uptime and reliability numbers shown on the homepage are editable placeholders pending real measurement.']
  ];

  return (
    <Section tone="dark" pattern>
      <SectionHeading tone="dark" align="center" eyebrow="Straight answers"
        title="What We Do Not Claim"
        description="An About page is where software companies list their certifications and customer counts. Here is the honest position on each." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 48, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
        {rows.map(([what, status, why]) => (
          <Card key={what} tone="dark" padding={20} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 210 }}>
              <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>{what}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body-dark)' }}>{why}</span>
            </span>
            <Badge tone={status === 'Partly built' ? 'warning' : 'dark'}>{status}</Badge>
          </Card>
        ))}
      </div>
      <p style={{ margin: '36px auto 0', maxWidth: 700, textAlign: 'center', fontSize: 14, lineHeight: 1.75, color: 'var(--text-body-dark)' }}>
        This list gets shorter as things become true. Until then it is here, because the alternative is finding out
        later that something on the website was not accurate.
      </p>
    </Section>
  );
}

Object.assign(window, { AboutStory, AboutMission, AboutValues, AboutPlatform, AboutTeam, AboutClaims });
