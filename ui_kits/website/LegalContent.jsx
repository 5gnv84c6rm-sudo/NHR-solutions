/* Legal — the five documents, plus the machinery a legal page actually needs.

   Five documents in one file with one shell, because they share everything:
   a contents sidebar, scroll tracking, a version line, and a review banner.

   Two decisions worth stating:

   1. EVERY DOCUMENT IS MARKED FOR LEGAL REVIEW, at the top, in colour, and the
      marker cannot be dismissed. Placeholder legal text that reads as final is
      the single most dangerous thing on a website of this kind — a customer
      relying on an unreviewed privacy notice has a real problem, and so does
      the operator.

   2. THE CONTENT IS SPECIFIC TO THIS PRODUCT, not generic boilerplate. The
      privacy notice names the categories of employee data the platform holds
      because the modules exist; the cookie policy lists the actual localStorage
      keys the prototype writes. Generic legal text is where the review effort
      goes to waste, since a solicitor has to rewrite it from scratch anyway.

   The cookie policy page reads and writes the real consent state, so
   "Manage preferences" is functional rather than decorative.
*/
const { SectionHeading, Card, Button, Badge, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

const LEGAL_UPDATED = '15 September 2026';
const LEGAL_VERSION = '0.9 — draft';

/* Document definitions. Body is an array of [heading, paragraphs[]] so the
   contents list and the scroll tracking can be generated rather than hand-kept
   in step with the text. */
const LEGAL_DOCS = {
  privacy: {
    slug: 'privacy', name: 'Privacy Policy', icon: 'ShieldCheck',
    intro: 'How NHR Solution handles personal data — both the data of people who visit this site, and the employee data our customers hold in the platform.',
    sections: [
      ['Who we are and our role', [
        'NHR Solution provides HR, payroll, compliance and workforce software to UK businesses.',
        'Our role under UK GDPR depends on whose data it is. For visitors to this website and people who contact us, we are the controller — we decide what to collect and why. For employee data our customers put into the platform, the customer is the controller and we are the processor: we hold and process it on their instructions, and we do not decide what goes in or how it is used.',
        'That distinction matters in practice. If you are an employee of one of our customers and want to see or correct your record, the request goes to your employer, not to us. We will help them answer it.'
      ]],
      ['What we collect from website visitors', [
        'Contact and demo enquiries: your name, email address, telephone number if you give one, business name, employee-count band, sector, and what you wrote in the message. We collect these because you asked us to reply.',
        'Trial sign-ups: the same, plus the plan you selected.',
        'Technical information: pages visited, approximate location derived from IP address, browser and device type. Used to keep the service working and to understand which pages are useful. Page-visit measurement uses Google Analytics, and only if you accept optional cookies — see the cookie policy.',
        'We do not buy contact lists, and we do not add enquirers to marketing email unless they ask to be added.'
      ]],
      ['Employee data held in the platform', [
        'When a customer uses NHR Solution, the platform can hold: identity and contact details; employment terms including job title, department, start date, hours and manager; pay and pension information; bank details where payroll is used; absence records including dates and reasons; leave requests and balances; attendance and clocking records; shift patterns; documents such as contracts, right-to-work evidence and certificates; training and certification records; performance notes, goals and review outcomes; expense claims and receipts; safety incident records; recruitment records for candidates; and anonymous wellbeing check-in responses.',
        'Some of this is special category data under Article 9 — health information in absence reasons, occupational health reports, and anything revealing ethnicity, religion or trade union membership. It is held separately and access is restricted by role.',
        'Wellbeing check-in responses carry no employee identifier by design. There is no technical route from a response back to a person, which is why team results are withheld below a minimum number of responses.'
      ]],
      ['Lawful basis', [
        'For website enquiries we rely on legitimate interests — you contacted us and expect a reply — and on consent where you have asked for marketing. Website analytics rely on consent, which you can withdraw at any time from the cookie policy.',
        'For employee data in the platform, the lawful basis is the customer\'s to determine as controller. In most cases it will be performance of the employment contract, compliance with a legal obligation such as PAYE and working-time records, or legitimate interests.',
        'Where a customer processes staff data through an AI feature, they should record their own lawful basis for doing so. Our assistant is given aggregate figures only; it is never given individual records, notes, or absence reasons.'
      ]],
      ['Who we share data with', [
        'Sub-processors: hosting, email delivery, error monitoring and payment processing. A current list is available on request, and we will give notice before adding or replacing one.',
        'Website analytics: Google, which provides Google Analytics, receives page-visit data from visitors who have accepted optional cookies.',
        'We do not sell personal data. We do not share it for advertising.',
        'We disclose data where we are legally required to, and will tell the controller unless prohibited from doing so.'
      ]],
      ['Where data is held', [
        'Customer data is held in the United Kingdom or the European Economic Area.',
        'Where any sub-processor operates outside those areas, transfers are covered by the UK International Data Transfer Agreement or the addendum to the EU standard contractual clauses, with a transfer risk assessment on file.'
      ]],
      ['How long we keep it', [
        'Website enquiries: 24 months from last contact, unless a commercial relationship begins.',
        'Customer platform data: for the term of the subscription, then 30 days for retrieval, then deletion. A customer can delete their data at any point during the term.',
        'Backups are retained for 35 days and then overwritten, so deletion completes within that window.',
        'Employee records themselves carry statutory retention periods the customer must determine — payroll records for at least three years after the tax year, working time records for two, accident records for three. The platform does not delete records automatically, because getting that wrong is worse than keeping them.'
      ]],
      ['Your rights', [
        'You have the right to be informed, to access your data, to have inaccuracies corrected, to erasure in some circumstances, to restrict or object to processing, and to data portability.',
        'To exercise a right over data we hold as controller, contact us. We will respond within one month; the deadline runs from when the request reaches anyone at the company, not when it reaches the right person.',
        'To exercise a right over employee data held by your employer in the platform, contact your employer.',
        'You can complain to the Information Commissioner\'s Office. We would prefer the chance to put it right first.'
      ]],
      ['Security', [
        'Access to customer data is restricted by role within the platform, and internally on a least-privilege basis. Data is encrypted in transit and at rest.',
        'We do not hold card details. Payment is handled by a provider whose systems hold that data.',
        'We do not currently hold an ISO 27001 certification or any other security accreditation, and this policy does not claim one.'
      ]]
    ]
  },

  terms: {
    slug: 'terms', name: 'Terms and Conditions', icon: 'FileText',
    intro: 'The agreement between NHR Solution and a business subscribing to the platform.',
    sections: [
      ['The agreement', [
        'These terms apply when a business subscribes to NHR Solution. Together with the order confirmation and the data processing terms, they form the whole agreement.',
        'The person accepting these terms confirms they have authority to bind their business.'
      ]],
      ['The subscription', [
        'We grant a non-exclusive, non-transferable right for the customer and its authorised users to use the platform for its own internal business purposes during the subscription term.',
        'Modules available depend on the plan. Changing plan changes what can be opened; data in a locked module is retained and becomes available again on upgrade.',
        'We may improve or change the platform, and will not materially reduce core functionality during a paid term without notice.'
      ]],
      ['Fees and payment', [
        'Fees are based on the plan and the number of active employee records. Archived leavers are not charged for.',
        'Charges are calculated at the start of each period. Adding employees mid-period is charged on the next invoice; removing them reduces the next invoice rather than generating a refund.',
        'NHR Solution is not VAT registered, so no VAT is charged. Invoices are due within the period stated on them.',
        'Prices shown on this website are per month. Yearly billing is ten times the monthly price.'
      ]],
      ['Customer responsibilities', [
        'The customer is the controller of the employee data it puts into the platform. It is responsible for having a lawful basis, for telling its staff in a privacy notice, and for the accuracy of what it enters.',
        'The customer is responsible for its users\' credentials and for setting appropriate roles. Giving an administrator role to someone who should not see payroll is a configuration choice, not a platform fault.',
        'The customer must not use the platform to store data it has no lawful basis to hold, nor attempt to circumvent role restrictions.'
      ]],
      ['What the platform is not', [
        'The platform provides information and calculation tools. It does not provide legal, financial, medical or tax advice, and the content in Resources is general information rather than advice on a particular situation.',
        'Calculations — take-home pay, holiday accrual, employer cost, Bradford scores, risk ratings — are estimates to support a decision. They are not a substitute for a payroll bureau, an accountant, or professional advice, and the customer should verify any figure it relies on.',
        'RIDDOR reportability shown in the platform is derived from what the customer enters. Making the statutory report remains the customer\'s duty. Marking a report as sent records that the customer did it; it does not submit anything to the HSE.',
        'We are not HMRC-recognised, CIPP-accredited or otherwise certified, and nothing in the platform should be read as such.'
      ]],
      ['Availability and support', [
        'We aim to keep the platform available during UK business hours and beyond, and will give notice of planned maintenance where practicable.',
        'Support response targets are stated in the platform and in the plan. They are targets measured in working hours, not guarantees, unless a written service level agreement says otherwise.'
      ]],
      ['Liability', [
        'Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.',
        'Subject to that, neither party is liable for loss of profit, loss of business, loss of anticipated savings, or indirect or consequential loss.',
        'Subject to that, our total liability in any twelve-month period is limited to the fees paid in that period.',
        'These limits are subject to legal review and may not be enforceable as drafted.'
      ]],
      ['Ending the agreement', [
        'Either party may end the agreement at the end of a subscription term by giving notice before it renews.',
        'Either party may end it immediately for material breach not remedied within 30 days of being told about it.',
        'On termination the customer can export its data. We retain it for 30 days and then delete it, including from backups within the backup cycle.'
      ]],
      ['Governing law', [
        'These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.'
      ]]
    ]
  },

  cookies: {
    slug: 'cookies', name: 'Cookie Policy', icon: 'Cookie',
    intro: 'What this website and the platform store on your device, and how to change it.',
    sections: [
      ['The short version', [
        'This site sets no advertising cookies. It uses Google Analytics only if you accept optional cookies; otherwise what it stores is functional: what you have dismissed, which theme you chose, and — in the platform demo — the demo data itself so your changes survive a page refresh.',
        'Under the Privacy and Electronic Communications Regulations, strictly necessary storage does not need consent. Anything else does, and must be off until you agree.'
      ]],
      ['What is stored', [
        'Strictly necessary: your cookie choice itself, your signed-in session in the platform, and the security token that protects form submissions. Without these the service cannot work.',
        'Functional: the light or dark theme you picked, whether you dismissed the announcement bar, and which article votes you have cast so you are not asked twice.',
        'Demo data: the platform prototype keeps its example employee, leave, payroll and safety records in your browser rather than on a server. Clearing site data resets the demo and loses anything you entered — it is not stored anywhere else.',
        'Analytics (optional): Google Analytics 4, provided by Google, measures which pages are visited and how people move through the site. It sets the _ga and _ga_<ID> cookies and is not loaded at all until you choose Accept All. Choosing Reject Non-Essential, or clearing your preferences, switches it off and removes those cookies.'
      ]],
      ['Changing your mind', [
        'Use the controls below to see and change what is stored. You can also clear everything from your browser settings.',
        'Rejecting non-essential storage does not stop you using the site. The theme will revert to light on each visit and the announcement bar will reappear.'
      ]],
      ['Third-party storage', [
        'This site loads React, Babel and an icon library from a public content delivery network. Those requests reveal your IP address to the CDN operator but set no cookies.',
        'A production deployment should serve those files from its own domain, which removes the third-party request entirely.'
      ]]
    ]
  },

  accessibility: {
    slug: 'accessibility', name: 'Accessibility Statement', icon: 'Accessibility',
    intro: 'What we have done, what is not finished, and how to tell us about a barrier.',
    sections: [
      ['Our commitment', [
        'We want NHR Solution to be usable by everyone who has to use it — and in an HR platform that includes people who did not choose the software and cannot work around it.',
        'We aim to meet WCAG 2.2 Level AA. This statement describes the position honestly rather than claiming compliance we have not tested.'
      ]],
      ['What has been done', [
        'Semantic HTML with landmarks, headings in order, and labelled form controls throughout.',
        'Keyboard operation for navigation, menus, dialogs and forms, with visible focus indicators.',
        'Colour contrast checked against the 4.5:1 minimum for body text; the turquoise accent is used at full opacity on text rather than as a tint.',
        'Touch targets of at least 44 pixels on interactive controls, including on mobile.',
        'Layouts that reflow to 320 pixels without horizontal scrolling, and no reliance on colour alone to convey status — every badge carries a word.',
        'Respect for reduced-motion preferences on animated elements.'
      ]],
      ['Known gaps', [
        'Screen reader testing has been partial. Dialogs, drawers and the multi-step forms need a full pass with JAWS, NVDA and VoiceOver.',
        'Some data tables are wide and scroll horizontally on small screens. A card view is the better answer for those and is not built everywhere yet.',
        'Charts convey information visually. The underlying figures are available in adjacent tables or exports, but the charts themselves are not yet described in text.',
        'The rota grid is difficult to operate by keyboard alone and needs rework.',
        'No formal independent audit has been carried out.'
      ]],
      ['Telling us about a problem', [
        'If something is not usable, tell us what you were trying to do, what got in the way, and what you use — browser, assistive technology, and any settings. That combination is what makes a barrier reproducible.',
        'We will acknowledge within five working days and say what we can do and when.',
        'If we cannot fix something quickly, we will offer an alternative way to complete the task rather than leaving you without one.'
      ]]
    ]
  },

  data: {
    slug: 'data', name: 'Data Protection', icon: 'Database',
    intro: 'The processor commitments behind the platform, written for the person who has to sign off the DPIA.',
    sections: [
      ['Processing terms', [
        'Where a customer uses NHR Solution, we act as processor and the customer as controller. These terms form the written contract required by Article 28 of the UK GDPR.',
        'We process personal data only on the customer\'s documented instructions, which are the instructions given by using the platform\'s features and the terms of the subscription.',
        'We will tell the customer if an instruction appears to infringe data protection law rather than simply carrying it out.'
      ]],
      ['Subject matter and duration', [
        'Subject matter: provision of HR, payroll, compliance and workforce management software.',
        'Duration: the subscription term plus the 30-day retrieval period.',
        'Nature and purpose: storage, retrieval, calculation, reporting and transmission of employee records to operate the customer\'s HR and payroll processes.',
        'Categories of data subject: the customer\'s employees, workers, contractors and job candidates, and the customer\'s own users.'
      ]],
      ['Our obligations', [
        'Confidentiality: our personnel are bound by confidentiality obligations and access data only where needed to provide or support the service.',
        'Security: appropriate technical and organisational measures, including role-based access control, encryption in transit and at rest, logical separation between customers, and audit logging of administrative action.',
        'Sub-processors: engaged only under equivalent written terms. We will give notice before adding or replacing one, and the customer may object.',
        'Assistance: we will help the customer respond to data subject requests, to a personal data breach, and to a data protection impact assessment or prior consultation.',
        'Deletion: on termination we delete or return the data at the customer\'s choice, subject to any legal retention requirement.',
        'Audit: we will make available the information needed to demonstrate compliance and allow for audit, on reasonable notice.'
      ]],
      ['Breach notification', [
        'We will notify the customer without undue delay after becoming aware of a personal data breach affecting their data, and in any event in time for them to meet their own 72-hour obligation to the ICO.',
        'The notification will describe what happened, the categories and approximate number of records affected, the likely consequences, and what we are doing about it — including what we do not yet know.',
        'It is the controller\'s decision whether a breach is notifiable to the ICO and whether affected individuals must be told. We will give them what they need to decide.'
      ]],
      ['What a customer must do', [
        'Determine the lawful basis for each category of processing, and record it.',
        'Tell staff what is held and why, in a privacy notice — the platform does not do this for you.',
        'Set roles so that access matches need. The platform enforces the roles you configure; it cannot tell whether you configured them correctly.',
        'Run a data protection impact assessment where processing is high risk. Monitoring attendance or location, and any use of AI features on staff data, are the likely triggers here.',
        'Keep a human decision-maker on anything affecting an individual. Article 22 restricts decisions based solely on automated processing where they have a legal or similarly significant effect, which covers dismissal, discipline and selection for redundancy.'
      ]],
      ['Transparency about AI features', [
        'NHR Intelligence is given aggregate figures from the customer\'s own workspace — headcount, rates, counts and totals. It is never given individual employee records, HR notes, absence reasons, or wellbeing responses.',
        'The context passed to the assistant is published in the product, on screen, and can be copied. An assistant whose inputs cannot be inspected cannot be audited.',
        'Model output is labelled as AI generated wherever it appears, and is not presented as legal, medical or financial advice.'
      ]]
    ]
  }
};

/* ---------- review banner ---------- */
function LegalReviewBanner({ doc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, padding: 18, borderRadius: 16,
      background: 'rgba(242,180,65,.10)', border: '1px solid rgba(242,180,65,.42)'
    }}>
      <Icon name="TriangleAlert" size={19} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--nhr-warning)' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-heading)' }}>
          Draft — requires legal review before publication
        </span>
        <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
          This {doc.name.toLowerCase()} was written to be specific to what NHR Solution actually does, so that a
          solicitor is reviewing real statements rather than rewriting boilerplate. It has not been reviewed, it is not
          legal advice, and it must not be relied on by a customer or published as final. Version {LEGAL_VERSION}.
        </span>
      </span>
    </div>
  );
}

/* ---------- cookie controls (functional) ---------- */
function CookieControls() {
  const [choice, setChoice] = React.useState(() => localStorage.getItem('nhr-cookies') || null);
  const [cleared, setCleared] = React.useState(false);

  /* Read the real keys this prototype writes, so the table is accurate rather
     than aspirational. */
  const keys = [
    ['nhr-cookies', 'Strictly necessary', 'Your cookie choice. Without it you would be asked on every page.'],
    ['nhr-theme', 'Functional', 'Light or dark mode.'],
    ['nhr-ann', 'Functional', 'Whether you dismissed the announcement bar. Session only.'],
    ['nhr-auth-v1', 'Strictly necessary', 'Your platform session and trial state.'],
    ['nhr-employees-v1', 'Demo data', 'Example employee records for the platform prototype.'],
    ['nhr-support-v1', 'Demo data', 'Help articles, your article votes and demo tickets.'],
    ['nhr-enquiries-v1', 'Demo data', 'Contact enquiries submitted in this prototype.'],
    ['nhr-demos-v1', 'Demo data', 'Demo bookings made in this prototype.'],
    ['_ga', 'Analytics (optional)', 'Google Analytics visitor identifier. Only set after you accept.']
  ];

  function present(k) {
    if (k === '_ga') return /(^|; )_ga/.test(document.cookie);
    try { return localStorage.getItem(k) !== null || sessionStorage.getItem(k) !== null; } catch (e) { return false; }
  }

  function setPref(v) {
    localStorage.setItem('nhr-cookies', v);
    setAnalyticsConsent(v === 'accepted');
    setChoice(v);
    setCleared(false);
    /* Rejecting non-essential means actually removing the functional keys, not
       just recording a preference. */
    if (v === 'rejected') {
      try { localStorage.removeItem('nhr-theme'); sessionStorage.removeItem('nhr-ann'); } catch (e) { /* ignore */ }
      document.documentElement.removeAttribute('data-theme');
    }
  }

  return (
    <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>Your current choice</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Badge tone={choice === 'accepted' ? 'success' : choice === 'rejected' ? 'warning' : 'dark'}>
          {choice === 'accepted' ? 'All storage accepted' : choice === 'rejected' ? 'Non-essential rejected' : 'No choice recorded yet'}
        </Badge>
        {cleared && <Badge tone="success">Preferences cleared</Badge>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={() => setPref('accepted')}>Accept All</Button>
        <Button size="sm" variant="secondary" onClick={() => setPref('rejected')}>Reject Non-Essential</Button>
        <Button size="sm" variant="ghost" onClick={() => {
          try { localStorage.removeItem('nhr-cookies'); localStorage.removeItem('nhr-theme'); sessionStorage.removeItem('nhr-ann'); } catch (e) { /* ignore */ }
          setAnalyticsConsent(false);
          setChoice(null); setCleared(true);
        }}>Clear My Preferences</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>What is on your device right now</span>
        {keys.map(([k, cat, why]) => {
          const here = present(k);
          return (
            <div key={k} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: 13, borderRadius: 12,
              border: '1px solid var(--border-light)', background: here ? 'var(--surface-subtle)' : 'transparent',
              opacity: here ? 1 : 0.55
            }}>
              <Icon name={here ? 'Check' : 'Minus'} size={14}
                style={{ flex: '0 0 auto', marginTop: 3, color: here ? 'var(--nhr-turquoise-ink)' : 'var(--text-muted-light)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: 'var(--text-heading)', wordBreak: 'break-all' }}>{k}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{why}</span>
              </span>
              <Badge tone={cat === 'Strictly necessary' ? 'dark' : 'dark'}>{cat}</Badge>
            </div>
          );
        })}
        <span style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted-light)' }}>
          Read live from your browser, so this list reflects what is actually stored rather than what we intended to
          store. Demo data keys appear once you have used the relevant part of the platform prototype.
        </span>
      </div>
    </Card>
  );
}

Object.assign(window, { LEGAL_DOCS, LEGAL_UPDATED, LEGAL_VERSION, LegalReviewBanner, CookieControls });
