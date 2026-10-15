/* Demo — Book a Demo page.

   The brief listed every field for this form. It is built as a three-step
   booking rather than one long column, because a ten-field form asking for a
   phone number before it has earned anything is the most abandoned pattern on
   a SaaS site.

   What makes it functional rather than decorative:

   - Real date and time selection. A working-day calendar generated from today,
     weekends disabled, with morning and afternoon slots; the chosen slot is
     shown back in plain English before confirming.
   - The product interest list is read from the app's own module registry, so
     the form cannot offer a demo of something that is not built.
   - Employee count drives a live price estimate from the same pricing data the
     pricing page uses, so the visitor knows roughly what it costs before the
     call rather than after it.
   - Step validation: you cannot advance past a step with an invalid field, and
     the step indicator shows which are complete.
   - The booking is stored and a reference issued, with the page stating that
     nothing is emailed in this prototype.
*/
const { SectionHeading, Card, Button, Badge, IconWrapper } = window.NHRSolutionDesignSystem_0db691;

const DEMO_DAY = 864e5;
const INDUSTRIES = ['Healthcare', 'Construction', 'Hospitality', 'Retail', 'Logistics', 'Professional services', 'Care services', 'Education', 'Charity', 'Other'];
const DEMO_BANDS = ['1–5', '6–10', '11–15', '16–20', '21+'];
const BAND_TOP = { '1–5': 5, '6–10': 10, '11–15': 15, '16–20': 20, '21+': 21 };
const SLOTS = ['09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'];

const DemoStore = (function () {
  const KEY = 'nhr-demos-v1';
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  return {
    list: read,
    add(row) {
      const all = read();
      const refs = all.map(r => Number(String(r.reference).replace(/\D/g, '')) || 0);
      const saved = Object.assign({ reference: 'DEMO-' + String(Math.max.apply(null, refs.concat([1400])) + 1), at: new Date().toISOString() }, row);
      all.unshift(saved);
      localStorage.setItem(KEY, JSON.stringify(all));
      return saved;
    },
    /* A slot already taken cannot be offered again. With one seeded booking
       this is mostly demonstrative, but the check is real. */
    taken(date, time) { return read().some(r => r.date === date && r.time === time); }
  };
})();

/* Next 21 days, weekends excluded — a demo is a working-day activity. */
function workingDays(count) {
  const out = [];
  let d = new Date(); d.setHours(0, 0, 0, 0);
  d = new Date(d.getTime() + DEMO_DAY);          /* never today */
  while (out.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d = new Date(d.getTime() + DEMO_DAY);
  }
  return out;
}

function dfield(label, required, hint, error, children, span) {
  return (
    <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: span === 2 ? '1 / -1' : undefined }}>
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

const dstyle = err => ({
  width: '100%', fontFamily: 'var(--font-core)', fontSize: 14.5, color: 'var(--text-heading)',
  background: 'var(--surface-card)', borderRadius: 'var(--radius-ctrl)',
  border: '1px solid ' + (err ? 'var(--nhr-danger)' : 'var(--border-light)'),
  padding: '13px 15px', outline: 'none', minHeight: 48
});

/* ---------- step indicator ---------- */
function DemoSteps({ step, done }) {
  const labels = ['About you', 'Your business', 'Pick a time'];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {labels.map((l, i) => {
        const active = step === i, complete = done.indexOf(i) > -1 && !active;
        return (
          <div key={l} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px', flex: '1 1 160px',
            borderRadius: 'var(--radius-ctrl)',
            border: '1px solid ' + (active ? 'var(--nhr-turquoise)' : complete ? 'var(--nhr-turquoise-border)' : 'var(--border-light)'),
            background: active ? 'var(--nhr-turquoise-tint)' : 'transparent'
          }}>
            <span style={{
              width: 26, height: 26, flex: '0 0 auto', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active || complete ? 'var(--nhr-turquoise)' : 'var(--surface-subtle)',
              color: active || complete ? 'var(--nhr-black)' : 'var(--text-muted-light)',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 800
            }}>{complete ? <Icon name="Check" size={12} /> : i + 1}</span>
            <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 600, color: active ? 'var(--nhr-turquoise-ink)' : 'var(--text-body)' }}>{l}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- the booking form ---------- */
function DemoForm({ onBooked }) {
  /* Products offered are read from the app registry so nothing unbuilt is
     advertised as demoable. */
  const nav = window.APP_NAV || [];
  const screens = window.APP_SCREENS || {};
  const products = nav.filter(n => screens[n.label] && n.label !== 'Overview' && n.label !== 'Settings').map(n => n.label);

  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [booked, setBooked] = React.useState(null);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState(null);
  const [f, setF] = React.useState({
    firstName: '', lastName: '', email: '', phone: '',
    business: '', employees: '6–10', industry: 'Healthcare', role: '',
    interests: ['Employees', 'Leave'], date: '', time: '', message: '', consent: false
  });

  const days = React.useMemo(() => workingDays(15), []);
  const band = window.nhrPriceFor(BAND_TOP[f.employees] || 10);

  function set(patch) { setF(p => Object.assign({}, p, patch)); }

  function validateStep(i, state) {
    const e = {};
    if (i === 0) {
      if (!state.firstName.trim()) e.firstName = 'Enter your first name.';
      if (!state.lastName.trim()) e.lastName = 'Enter your last name.';
      if (!state.email.trim()) e.email = 'We need an email to send the invitation.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) e.email = 'That does not look like a complete email address.';
      if (state.phone.trim() && !/^[\d\s+()-]{9,}$/.test(state.phone.trim())) e.phone = 'Use digits, spaces and + ( ) - only.';
    }
    if (i === 1) {
      if (!state.business.trim()) e.business = 'Enter your business name.';
      if (!state.interests.length) e.interests = 'Pick at least one area so we can tailor the call.';
    }
    if (i === 2) {
      if (!state.date) e.date = 'Choose a day.';
      if (!state.time) e.time = 'Choose a time.';
      if (!state.consent) e.consent = 'We need your agreement before we can hold your details.';
    }
    return e;
  }

  function next() {
    const e = validateStep(step, f);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setDone(d => d.indexOf(step) > -1 ? d : d.concat([step]));
    setStep(step + 1);
  }

  function submit() {
    const e = validateStep(2, f);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSendError(null);

    const local = () => {
      const saved = DemoStore.add({
        name: f.firstName + ' ' + f.lastName, email: f.email, phone: f.phone,
        business: f.business, employees: f.employees, industry: f.industry, role: f.role,
        interests: f.interests.slice(), date: f.date, time: f.time, message: f.message
      });
      setDone([0, 1, 2]);
      setBooked(saved);
      if (onBooked) onBooked(saved);
    };

    if (!window.NHRSupabase || !window.NHRSupabase.enabled()) { local(); return; }

    setSending(true);
    window.NHRSupabase.submitDemoBooking({
      first_name: f.firstName.trim(),
      last_name: f.lastName.trim(),
      email: f.email.trim(),
      phone: f.phone.trim() || null,
      company: f.business.trim(),
      employee_band: f.employees,
      sector: f.industry,
      modules_of_interest: f.interests.slice(),
      preferred_on: f.date || null,
      preferred_slot: f.time || null,
      message: [f.role ? 'Role: ' + f.role : '', f.message].filter(Boolean).join(' — ') || null,
      source_page: location.pathname
    }).then(() => {
      setSending(false);
      local();
    }).catch((err) => {
      setSending(false);
      setSendError('Your booking could not be sent: ' + err.message + ' Please try again.');
    });
  }

  function toggleInterest(label) {
    set({ interests: f.interests.indexOf(label) > -1 ? f.interests.filter(x => x !== label) : f.interests.concat([label]) });
  }

  if (booked) {
    const when = new Date(booked.date + 'T' + booked.time);
    return (
      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <IconWrapper size={52}><Icon name="CalendarCheck" size={22} /></IconWrapper>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>
          You are booked in, {booked.name.split(' ')[0]}.
        </span>
        <span style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-body)' }}>
          <strong style={{ color: 'var(--text-heading)' }}>
            {when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {booked.time}
          </strong>{' '}
          — reference{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>{booked.reference}</span>.
          Allow 30 minutes; we will cover {booked.interests.slice(0, 3).join(', ').toLowerCase()}
          {booked.interests.length > 3 ? ' and ' + (booked.interests.length - 3) + ' more' : ''}.
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 14, background: 'var(--surface-subtle)', border: '1px solid var(--border-light)' }}>
          {[['Invitation to', booked.email], ['Business', booked.business], ['Size', booked.employees + ' employees'], ['Sector', booked.industry]].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted-light)' }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)', textAlign: 'right' }}>{v}</span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
          You do not have to wait for the call to look around — the platform opens with demo data and no card details.
        </span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button onClick={() => { window.location.href = '../app/index.html'; }} iconRight={<Icon name="ArrowRight" size={18} />}>Explore the Platform</Button>
          <Button variant="secondary" onClick={() => { setBooked(null); if (onBooked) onBooked(null); setStep(0); setDone([]); set({ date: '', time: '', consent: false, message: '' }); }}>
            Book Another
          </Button>
        </div>
        <span style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-muted-light)' }}>
          This is a prototype: the booking is stored in your browser and no invitation is sent. A live deployment would
          create the calendar event and email both parties.
        </span>
      </Card>
    );
  }

  return (
    /* nhr-booking keeps the global CTA binding from hijacking "Book My Demo". */
    <div className="nhr-booking">
    <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <DemoSteps step={step} done={done} />

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>Who are we meeting?</span>
          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {dfield('First name', true, null, errors.firstName,
              <input value={f.firstName} onChange={e => set({ firstName: e.target.value })} autoComplete="given-name" style={dstyle(errors.firstName)} />)}
            {dfield('Last name', true, null, errors.lastName,
              <input value={f.lastName} onChange={e => set({ lastName: e.target.value })} autoComplete="family-name" style={dstyle(errors.lastName)} />)}
            {dfield('Work email', true, 'The invitation goes here.', errors.email,
              <input type="email" value={f.email} onChange={e => set({ email: e.target.value })} autoComplete="email" placeholder="you@company.co.uk" style={dstyle(errors.email)} />)}
            {dfield('Phone', false, 'Optional — only used if we cannot reach you.', errors.phone,
              <input type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} autoComplete="tel" style={dstyle(errors.phone)} />)}
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>Tell us about the business</span>
          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {dfield('Business name', true, null, errors.business,
              <input value={f.business} onChange={e => set({ business: e.target.value })} autoComplete="organization" style={dstyle(errors.business)} />)}
            {dfield('Your role', false, 'So we pitch it at the right level.', null,
              <input value={f.role} onChange={e => set({ role: e.target.value })} placeholder="HR Manager" style={dstyle(false)} />)}
            {dfield('Employees', false, 'Shows your price below.', null,
              <select value={f.employees} onChange={e => set({ employees: e.target.value })} style={dstyle(false)}>
                {DEMO_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>)}
            {dfield('Industry', false, null, null,
              <select value={f.industry} onChange={e => set({ industry: e.target.value })} style={dstyle(false)}>
                {INDUSTRIES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>)}
          </div>

          {(
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 16, borderRadius: 14,
              background: 'var(--nhr-turquoise-tint)', border: '1px solid var(--nhr-turquoise-border)'
            }}>
              <Icon name="Calculator" size={18} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise-ink)' }} />
              <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)' }}>
                {band
                  ? <React.Fragment><strong style={{ color: 'var(--text-heading)' }}>£{band.monthly} a month</strong> for {f.employees} employees, with every feature included. </React.Fragment>
                  : <React.Fragment>Teams of 21 or more get a quote, which we can cover on the call. </React.Fragment>}
                See all prices on <a href="pricing.html" style={{ fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>the pricing page</a>.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
              What should we cover?<span style={{ color: 'var(--nhr-danger)' }}> *</span>
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {products.map(p => {
                const on = f.interests.indexOf(p) > -1;
                return (
                  <button key={p} type="button" onClick={() => toggleInterest(p)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 15px', minHeight: 44,
                    borderRadius: 999, cursor: 'pointer',
                    border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
                    background: on ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)',
                    color: on ? 'var(--nhr-turquoise-ink)' : 'var(--text-body)',
                    fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: on ? 700 : 500
                  }}>
                    <Icon name={on ? 'Check' : 'Plus'} size={12} />{p}
                  </button>
                );
              })}
            </div>
            {errors.interests
              ? <span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
                <Icon name="TriangleAlert" size={12} />{errors.interests}
              </span>
              : <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted-light)' }}>
                {f.interests.length} selected. Thirty minutes covers three or four areas properly — more than that and it
                becomes a tour rather than a demonstration.
              </span>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text-heading)' }}>Pick a time</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
              Day<span style={{ color: 'var(--nhr-danger)' }}> *</span>
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8 }}>
              {days.map(d => {
                const iso = d.toISOString().slice(0, 10);
                const on = f.date === iso;
                return (
                  <button key={iso} type="button" onClick={() => set({ date: iso, time: '' })} style={{
                    display: 'flex', flexDirection: 'column', gap: 2, padding: '11px 8px', minHeight: 62,
                    borderRadius: 'var(--radius-ctrl)', cursor: 'pointer',
                    border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
                    background: on ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)'
                  }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: on ? 'var(--nhr-turquoise-ink)' : 'var(--text-muted-light)' }}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: on ? 'var(--nhr-turquoise-ink)' : 'var(--text-heading)' }}>
                      {d.getDate()}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted-light)' }}>
                      {d.toLocaleDateString('en-GB', { month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
                <Icon name="TriangleAlert" size={12} />{errors.date}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted-light)' }}>Weekends are not shown — demos run on working days.</span>
          </div>

          {f.date && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
                Time<span style={{ color: 'var(--nhr-danger)' }}> *</span>
                <span style={{ fontWeight: 500, color: 'var(--text-muted-light)' }}> — 30 minutes, UK time</span>
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 8 }}>
                {SLOTS.map(t => {
                  const gone = DemoStore.taken(f.date, t);
                  const on = f.time === t;
                  return (
                    <button key={t} type="button" disabled={gone} onClick={() => set({ time: t })} style={{
                      padding: '13px 8px', minHeight: 48, borderRadius: 'var(--radius-ctrl)',
                      cursor: gone ? 'not-allowed' : 'pointer',
                      border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-light)'),
                      background: on ? 'var(--nhr-turquoise-tint)' : 'var(--surface-card)',
                      color: gone ? 'var(--text-muted-light)' : on ? 'var(--nhr-turquoise-ink)' : 'var(--text-heading)',
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: on ? 800 : 600,
                      textDecoration: gone ? 'line-through' : 'none'
                    }}>{t}</button>
                  );
                })}
              </div>
              {errors.time && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
                  <Icon name="TriangleAlert" size={12} />{errors.time}
                </span>
              )}
            </div>
          )}

          {f.date && f.time && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: 16, borderRadius: 14,
              background: 'var(--nhr-turquoise-tint)', border: '1px solid var(--nhr-turquoise-border)'
            }}>
              <Icon name="CalendarCheck" size={18} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise-ink)' }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)' }}>
                <strong style={{ color: 'var(--text-heading)' }}>
                  {new Date(f.date + 'T' + f.time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {f.time}
                </strong>, 30 minutes, UK time.
              </span>
            </div>
          )}

          {dfield('Anything specific you want to see?', false, 'Optional. A concrete problem makes for a much better call than a general walkthrough.', null,
            <textarea rows={3} value={f.message} onChange={e => set({ message: e.target.value })}
              style={Object.assign({}, dstyle(false), { resize: 'vertical', lineHeight: 1.65, minHeight: 90 })} />, 2)}

          <button type="button" onClick={() => set({ consent: !f.consent })} style={{
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
              I agree that NHR Solution may hold these details to arrange and follow up this demo.
              {' '}<strong style={{ color: 'var(--text-heading)' }}>No marketing list</strong>, and you can ask us to delete
              them at any time.
            </span>
          </button>
          {errors.consent && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--nhr-danger)' }}>
              <Icon name="TriangleAlert" size={12} />{errors.consent}
            </span>
          )}
        </div>
      )}

      {sendError && (
        <span role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--nhr-danger)' }}>
          <Icon name="TriangleAlert" size={14} style={{ marginTop: 2, flex: '0 0 auto' }} />{sendError}
        </span>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
        {step > 0 && (
          <Button variant="secondary" onClick={() => { setErrors({}); setStep(step - 1); }} iconLeft={<Icon name="ChevronLeft" size={17} />}>Back</Button>
        )}
        <span style={{ flex: 1 }} />
        {step < 2
          ? <Button size="lg" onClick={next} iconRight={<Icon name="ArrowRight" size={18} />}>Continue</Button>
          : <Button size="lg" onClick={submit} disabled={sending} iconRight={<Icon name="CalendarCheck" size={18} />}>
              {sending ? 'Booking…' : 'Book My Demo'}
            </Button>}
      </div>
    </Card>
    </div>
  );
}

/* ---------- what to expect ---------- */
function DemoExpect() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
          What the 30 minutes looks like
        </span>
        {[
          ['MessageCircle', '5 min — your situation', 'What you run today and where it breaks. We cannot tailor anything without this part.'],
          ['Monitor', '20 min — the actual product', 'Your chosen areas, in a live workspace. Not slides.'],
          ['Calculator', '5 min — cost and next step', 'A real figure for your headcount, and what setting up would involve.']
        ].map(([icon, title, body]) => (
          <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <IconWrapper size={40}><Icon name={icon} size={17} /></IconWrapper>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
              <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-body)' }}>{body}</span>
            </span>
          </div>
        ))}
        <span style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: 13, lineHeight: 1.7, color: 'var(--text-body)' }}>
          <strong style={{ color: 'var(--text-heading)' }}>No obligation and no card details.</strong> If it is not right for
          you we would rather establish that in half an hour than after a migration.
        </span>
      </Card>

      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IconWrapper size={44}><Icon name="Zap" size={19} /></IconWrapper>
        <span style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)' }}>Would rather just look?</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
          The platform opens with demo data — every module, all four user roles, nothing to fill in first. A demo is for
          questions about your situation, not for permission to look around.
        </span>
        <a href="../app/index.html" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--nhr-turquoise-ink)' }}>
          Open the platform →
        </a>
      </Card>

      <Card padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>Not the right route?</span>
        {[['Pricing questions', 'pricing.html', 'Calculator'], ['General enquiry', 'contact.html', 'Mail'], ['Existing customer support', '../app/support.html', 'LifeBuoy']].map(([label, href, icon]) => (
          <a key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-body)' }}>
            <Icon name={icon} size={15} style={{ color: 'var(--nhr-turquoise-ink)' }} />{label}
            <Icon name="ArrowRight" size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted-light)' }} />
          </a>
        ))}
      </Card>
    </div>
  );
}

function DemoMain() {
  const [booked, setBooked] = React.useState(null);
  return (
    <React.Fragment>
      <Section>
        <div className="demo-split" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 40, alignItems: 'start' }}>
          <DemoForm onBooked={setBooked} />
          <DemoExpect />
        </div>
      </Section>
      {booked && (
        <Section tone="dark" pattern="both">
          <SectionHeading tone="dark" align="center"
            eyebrow="Your demo workspace"
            title="Everything Your Business Needs. In One Place."
            description="Click around before the call — every screen runs on demo data." />
          <div style={{ marginTop: 52 }}>
            <AppWindow height={640} />
          </div>
        </Section>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { DemoMain, DemoForm, DemoExpect, DemoSteps, DemoStore, workingDays });
