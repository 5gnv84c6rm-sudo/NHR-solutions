/* Contact — page sections with a working, validated enquiry form.

   The form does real work rather than posting nowhere:

   - Routing is derived from the enquiry type. Sales, support, data protection
     and careers go to different places with different response targets, and
     the form states where the message is going before it is sent.
   - Validation is per-field and runs on blur, with errors that say what to do
     rather than "invalid input".
   - A support enquiry from an existing customer is diverted: raising it in-app
     carries the workspace context automatically, so the form says so and links
     there instead of silently taking a worse route.
   - Submissions are held in localStorage so the confirmation can show a real
     reference, and the page states plainly that nothing is emailed anywhere in
     this prototype.

   Data protection notice sits next to the submit button, not in a footer.
*/
const { SectionHeading, Card, Button, Badge, IconWrapper, Input, Select } = window.NHRSolutionDesignSystem_0db691;

const CONTACT_ROUTES = {
  'Sales enquiry': { team: 'Sales', target: 'One working day', icon: 'Briefcase', note: 'Pricing, plans, migration from another system, or a demo.' },
  'Product support': { team: 'Customer Support', target: 'Eight working hours', icon: 'LifeBuoy', note: 'Something not working as expected in the platform.' },
  'Book a demo': { team: 'Sales', target: 'One working day', icon: 'Monitor', note: 'A walkthrough of the modules relevant to your business.' },
  'Partnership or reseller': { team: 'Partnerships', target: 'Three working days', icon: 'Handshake', note: 'Integrations, referrals and reseller arrangements.' },
  'Data protection request': { team: 'Data Protection', target: 'One month (statutory)', icon: 'ShieldCheck', note: 'Access, correction or deletion of personal data we hold.' },
  'Careers': { team: 'People team', target: 'Two weeks', icon: 'UserPlus', note: 'Roles at NHR Solution.' },
  'Something else': { team: 'General enquiries', target: 'Two working days', icon: 'MessageCircle', note: 'Anything that does not fit the categories above.' }
};

const EMPLOYEE_BANDS = ['1–10', '11–50', '51–200', '201–500', '500+'];

/* ---------- store ---------- */
const ContactStore = (function () {
  const KEY = 'nhr-enquiries-v1';
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  return {
    list: read,
    add(row) {
      const all = read();
      const refs = all.map(r => Number(String(r.reference).replace(/\D/g, '')) || 0);
      const saved = Object.assign({
        reference: 'ENQ-' + String(Math.max.apply(null, refs.concat([8200])) + 1),
        at: new Date().toISOString()
      }, row);
      all.unshift(saved);
      localStorage.setItem(KEY, JSON.stringify(all));
      return saved;
    }
  };
})();

/* ---------- field ---------- */
function CField({ label, required, hint, error, children, span }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
        {label}{required && <span style={{ color: 'var(--nhr-danger)' }}> *</span>}
      </span>
      {children}
      {error
        ? <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
          <Icon name="TriangleAlert" size={12} />{error}
        </span>
        : hint ? <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted-light)' }}>{hint}</span> : null}
    </label>
  );
}

const inputStyle = err => ({
  width: '100%', fontFamily: 'var(--font-core)', fontSize: 14.5, color: 'var(--text-heading)',
  background: 'var(--surface-card)', borderRadius: 'var(--radius-ctrl)',
  border: '1px solid ' + (err ? 'var(--nhr-danger)' : 'var(--border-light)'),
  padding: '13px 15px', outline: 'none', minHeight: 48
});

/* ---------- the form ---------- */
function ContactForm() {
  const [f, setF] = React.useState({
    type: 'Sales enquiry', firstName: '', lastName: '', email: '', phone: '',
    company: '', employees: '11–50', existing: 'No', message: '', consent: false
  });
  const [touched, setTouched] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [sent, setSent] = React.useState(null);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState(null);

  const route = CONTACT_ROUTES[f.type];
  const supportDiversion = f.type === 'Product support' && f.existing === 'Yes';

  function validate(state) {
    const e = {};
    if (!state.firstName.trim()) e.firstName = 'Enter your first name.';
    if (!state.lastName.trim()) e.lastName = 'Enter your last name.';
    if (!state.email.trim()) e.email = 'Enter an email address so we can reply.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) e.email = 'That does not look like a complete email address.';
    if (state.phone.trim() && !/^[\d\s+()-]{9,}$/.test(state.phone.trim())) e.phone = 'Use digits, spaces and + ( ) - only.';
    if (f.type !== 'Careers' && f.type !== 'Data protection request' && !state.company.trim()) e.company = 'Enter your business name.';
    if (!state.message.trim()) e.message = 'Tell us what you need — a sentence is enough.';
    else if (state.message.trim().length < 15) e.message = 'A little more detail will get you a useful first reply.';
    if (!state.consent) e.consent = 'We need your agreement before we can hold your details.';
    return e;
  }

  function set(patch) {
    const next = Object.assign({}, f, patch);
    setF(next);
    /* Re-validate only fields already touched, so errors appear as you leave a
       field rather than while you are still typing in it. */
    const e = validate(next);
    setErrors(prev => {
      const out = {};
      Object.keys(e).forEach(k => { if (touched[k]) out[k] = e[k]; });
      return out;
    });
  }
  function blur(name) {
    setTouched(t => Object.assign({}, t, { [name]: true }));
    const e = validate(f);
    setErrors(prev => Object.assign({}, prev, e[name] ? { [name]: e[name] } : { [name]: undefined }));
  }

  /* A data protection request starts a statutory one-month clock the moment it
     arrives, so the deadline is stored with it rather than worked out later. */
  function dsrDueOn() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

  function submit(ev) {
    ev.preventDefault();
    const e = validate(f);
    const keys = Object.keys(e);
    if (keys.length) {
      setErrors(e);
      setTouched(keys.reduce((a, k) => Object.assign(a, { [k]: true }), Object.assign({}, touched)));
      return;
    }
    setSendError(null);

    const local = () => setSent(ContactStore.add({
      type: f.type, team: route.team, name: f.firstName + ' ' + f.lastName,
      email: f.email, phone: f.phone, company: f.company,
      employees: f.employees, existing: f.existing, message: f.message
    }));

    if (!window.NHRSupabase || !window.NHRSupabase.enabled()) { local(); return; }

    const isDsr = f.type === 'Data protection request';
    setSending(true);
    window.NHRSupabase.submitEnquiry({
      name: (f.firstName + ' ' + f.lastName).trim(),
      email: f.email.trim(),
      phone: f.phone.trim() || null,
      company: f.company.trim() || null,
      employee_band: f.employees,
      route: route.team,
      subject: f.type,
      message: f.message.trim(),
      is_dsr: isDsr,
      dsr_due_on: isDsr ? dsrDueOn() : null,
      source_page: location.pathname
    }).then(() => {
      setSending(false);
      local();
    }).catch((err) => {
      setSending(false);
      setSendError('Your enquiry could not be sent: ' + err.message + ' Please try again, or email the team directly.');
    });
  }

  if (sent) {
    return (
      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <IconWrapper size={52}><Icon name="CircleCheck" size={22} /></IconWrapper>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>
          Thank you, {sent.name.split(' ')[0]}.
        </span>
        <span style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-body)' }}>
          Your enquiry is with <strong style={{ color: 'var(--text-heading)' }}>{sent.team}</strong> under reference{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>{sent.reference}</span>.
          The target for a first reply is {CONTACT_ROUTES[sent.type].target.toLowerCase()}.
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 14, background: 'var(--surface-subtle)', border: '1px solid var(--border-light)' }}>
          {[['Enquiry type', sent.type], ['Reply to', sent.email], ['Business', sent.company || '—']].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted-light)' }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)', textAlign: 'right' }}>{v}</span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted-light)' }}>
          This is a prototype: the enquiry is stored in your browser and no message is sent to anyone. A live
          deployment would post it to the relevant inbox and email you a copy of what you wrote.
        </span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button onClick={() => { setSent(null); setF(p => Object.assign({}, p, { message: '', consent: false })); setTouched({}); setErrors({}); }}>
            Send Another
          </Button>
          <Button variant="secondary" onClick={() => { window.location.href = 'index.html'; }}>Back to Home</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="var(--card-padding-lg)">
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>Send us a message</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body)' }}>
            Fields marked * are required. We will only use these details to answer your enquiry.
          </span>
        </div>

        <CField label="What is this about?" required span={2} hint={route.note}>
          <select value={f.type} onChange={e => set({ type: e.target.value })} style={inputStyle(false)}>
            {Object.keys(CONTACT_ROUTES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </CField>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14,
          background: 'var(--nhr-turquoise-tint)', border: '1px solid var(--nhr-turquoise-border)'
        }}>
          <Icon name={route.icon} size={17} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise-ink)' }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body)' }}>
            Goes to <strong style={{ color: 'var(--text-heading)' }}>{route.team}</strong> · target first reply {route.target.toLowerCase()}
          </span>
        </div>

        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <CField label="First name" required error={errors.firstName}>
            <input value={f.firstName} onChange={e => set({ firstName: e.target.value })} onBlur={() => blur('firstName')}
              autoComplete="given-name" style={inputStyle(errors.firstName)} />
          </CField>
          <CField label="Last name" required error={errors.lastName}>
            <input value={f.lastName} onChange={e => set({ lastName: e.target.value })} onBlur={() => blur('lastName')}
              autoComplete="family-name" style={inputStyle(errors.lastName)} />
          </CField>
          <CField label="Email" required error={errors.email}>
            <input type="email" value={f.email} onChange={e => set({ email: e.target.value })} onBlur={() => blur('email')}
              autoComplete="email" placeholder="you@company.co.uk" style={inputStyle(errors.email)} />
          </CField>
          <CField label="Phone" error={errors.phone} hint="Optional — only if you would rather we called.">
            <input type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} onBlur={() => blur('phone')}
              autoComplete="tel" style={inputStyle(errors.phone)} />
          </CField>

          {f.type !== 'Careers' && f.type !== 'Data protection request' && (
            <React.Fragment>
              <CField label="Business name" required error={errors.company}>
                <input value={f.company} onChange={e => set({ company: e.target.value })} onBlur={() => blur('company')}
                  autoComplete="organization" style={inputStyle(errors.company)} />
              </CField>
              <CField label="Employees" hint="Used to price a plan accurately.">
                <select value={f.employees} onChange={e => set({ employees: e.target.value })} style={inputStyle(false)}>
                  {EMPLOYEE_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </CField>
            </React.Fragment>
          )}

          <CField label="Already using NHR Solution?" span={2}>
            <div style={{ display: 'flex', gap: 10 }}>
              {['No', 'Yes'].map(v => (
                <button key={v} type="button" onClick={() => set({ existing: v })} style={{
                  flex: 1, padding: '13px 16px', minHeight: 48, borderRadius: 'var(--radius-ctrl)', cursor: 'pointer',
                  border: '1px solid ' + (f.existing === v ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
                  background: f.existing === v ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)',
                  color: f.existing === v ? 'var(--nhr-turquoise-ink)' : 'var(--text-body)',
                  fontFamily: 'var(--font-core)', fontSize: 14.5, fontWeight: f.existing === v ? 700 : 500
                }}>{v}</button>
              ))}
            </div>
          </CField>

          <CField label="How can we help?" required span={2} error={errors.message}
            hint="A specific example gets a more useful first reply than a general description.">
            <textarea rows={5} value={f.message} onChange={e => set({ message: e.target.value })} onBlur={() => blur('message')}
              style={Object.assign({}, inputStyle(errors.message), { resize: 'vertical', lineHeight: 1.65, minHeight: 120 })} />
          </CField>
        </div>

        {supportDiversion && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 14,
            background: 'var(--surface-subtle)', border: '1px solid var(--border-light)'
          }}>
            <Icon name="Lightbulb" size={17} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--nhr-turquoise-ink)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
                You can raise this from inside the platform instead. A ticket opened there attaches your role, plan and
                workspace details automatically, so the first reply is an answer rather than a request for information —
                and you can follow the thread in one place.
              </span>
              <a href="../app/support.html" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
                Open Support in the platform →
              </a>
            </span>
          </div>
        )}

        <button type="button" onClick={() => { set({ consent: !f.consent }); setTouched(t => Object.assign({}, t, { consent: true })); }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 13, padding: 16, textAlign: 'left',
            borderRadius: 14, cursor: 'pointer',
            border: '1px solid ' + (errors.consent ? 'var(--nhr-danger)' : f.consent ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
            background: f.consent ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)'
          }}>
          <span style={{
            width: 20, height: 20, flex: '0 0 auto', marginTop: 2, borderRadius: 6,
            border: '1px solid ' + (f.consent ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
            background: f.consent ? 'var(--nhr-turquoise)' : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>{f.consent && <Icon name="Check" size={13} style={{ color: 'var(--nhr-black)' }} />}</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            I agree that NHR Solution may hold these details to answer my enquiry.
            {' '}<strong style={{ color: 'var(--text-heading)' }}>We will not add you to a marketing list</strong> — if you
            want updates, ask in your message. You can ask us to delete your details at any time.
          </span>
        </button>
        {errors.consent && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
            <Icon name="TriangleAlert" size={12} />{errors.consent}
          </span>
        )}

        {sendError && (
          <span role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--nhr-danger)' }}>
            <Icon name="TriangleAlert" size={14} style={{ marginTop: 2, flex: '0 0 auto' }} />{sendError}
          </span>
        )}

        <Button type="submit" size="lg" disabled={sending} iconRight={<Icon name="ArrowRight" size={18} />}>
          {sending ? 'Sending…' : 'Send Enquiry'}
        </Button>

        <span style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted-light)' }}>
          Your enquiry is stored securely and read only by the NHR Solution team — no email is sent automatically yet.
          See the privacy notice for how your details are handled.
        </span>
      </form>
    </Card>
  );
}

/* ---------- contact detail column ---------- */
function ContactDetails() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
          Other ways to reach us
        </span>
        {[
          ['Mail', 'Email', 'Published once the addresses are live', 'Quote your business name so we can find your workspace.'],
          ['Phone', 'Phone', 'Published once the line is live', 'Business hours, Monday to Friday.'],
          ['MapPin', 'Office', 'United Kingdom', 'Registered address published at launch.'],
          ['Clock', 'Hours', '09:00 – 17:30 GMT', 'Enquiries received outside these hours are answered the next working day.']
        ].map(([icon, label, value, note]) => (
          <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <IconWrapper size={40}><Icon name={icon} size={17} /></IconWrapper>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted-light)' }}>{label}</span>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>{value}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{note}</span>
            </span>
          </div>
        ))}
        <span style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted-light)' }}>
          Contact details are placeholders until NHR Solution publishes real ones. Nothing here invents a phone number
          or an address.
        </span>
      </Card>

      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IconWrapper size={44}><Icon name="Zap" size={19} /></IconWrapper>
        <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)' }}>Already a customer?</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
          Raise a ticket from inside the platform. It attaches your role, plan and workspace details automatically, and
          the help centre may answer it before you finish typing.
        </span>
        <a href="../app/support.html" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
          Open Support →
        </a>
      </Card>
    </div>
  );
}

/* ---------- routing reference ---------- */
function ContactRouting() {
  return (
    <Section subtle>
      <SectionHeading align="center" eyebrow="Where things go"
        title="Who Answers What"
        description="The form routes automatically, but if you would rather know in advance — this is the split." />
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18, marginTop: 44 }}>
        {Object.keys(CONTACT_ROUTES).map(k => {
          const r = CONTACT_ROUTES[k];
          return (
            <Card key={k} padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <IconWrapper size={42}><Icon name={r.icon} size={18} /></IconWrapper>
              <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{k}</span>
              <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body)', flex: 1 }}>{r.note}</span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>{r.team}</Badge>
                <Badge>{r.target}</Badge>
              </span>
            </Card>
          );
        })}
      </div>
      <p style={{ margin: '36px auto 0', maxWidth: 720, textAlign: 'center', fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-muted-light)' }}>
        A data protection request carries a statutory deadline of one month from when it reaches anyone at the company,
        not from when it reaches the right desk — so those are logged on arrival.
      </p>
    </Section>
  );
}

/* ---------- main section ---------- */
function ContactMain() {
  return (
    <Section>
      <div className="contact-split" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 40, alignItems: 'start' }}>
        <ContactForm />
        <ContactDetails />
      </div>
    </Section>
  );
}

Object.assign(window, { ContactMain, ContactForm, ContactDetails, ContactRouting, CONTACT_ROUTES, ContactStore });
