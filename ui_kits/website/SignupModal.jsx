/* Get Started / Book a Demo modal. Opened by any CTA via the nhr-signup event. */
const { Button, IconButton, Badge } = window.NHRSolutionDesignSystem_0db691;

function tierOptions() {
  return window.NHR_SITE.signupTiers.map(t => {
    const band = window.nhrPriceFor(t.employees);
    return { value: t.label, label: t.label + (band ? ' (£' + band.monthly + '/month)' : ' (contact us)') };
  });
}

function ModalField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--nhr-text-dark)' }}>{label}</span>
      {children}
    </label>
  );
}

const modalInput = (focus) => ({
  width: '100%', fontFamily: 'var(--font-core)', fontSize: 15.5,
  color: 'var(--nhr-text-dark)', background: '#fff',
  border: '1px solid ' + (focus ? 'var(--nhr-turquoise-deep)' : 'var(--nhr-line-light)'),
  borderRadius: 'var(--radius-btn)', padding: '13px 15px', outline: 'none',
  boxShadow: focus ? '0 0 0 3px rgba(0,229,212,.20)' : 'none',
  transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
});

function ModalInput({ label, type = 'text', placeholder, value, onChange, required }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <ModalField label={label}>
      <input type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={modalInput(focus)} />
    </ModalField>
  );
}

function ModalSelect({ label, value, onChange, options }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <ModalField label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={Object.assign({}, modalInput(focus), {
          appearance: 'none', cursor: 'pointer', padding: '13px 40px 13px 15px',
          backgroundImage: 'linear-gradient(45deg,transparent 50%,#5b6a69 50%),linear-gradient(135deg,#5b6a69 50%,transparent 50%)',
          backgroundPosition: 'calc(100% - 21px) 22px,calc(100% - 16px) 22px',
          backgroundSize: '5px 5px,5px 5px', backgroundRepeat: 'no-repeat'
        })}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </ModalField>
  );
}

function SignupModal() {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState('trial');
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', company: '', tier: '', phone: '', date: '' });
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState(null);
  const set = (k, v) => setForm(f => Object.assign({}, f, { [k]: v }));
  const opts = React.useMemo(() => tierOptions(), []);

  /* Both modes land in enquiries: this is an interest form, not a sign-up —
     creating an account needs the provisioning flow and a real login. */
  function submit(ev) {
    ev.preventDefault();
    setSendError(null);
    const isDemo = mode === 'demo';

    if (!window.NHRSupabase || !window.NHRSupabase.enabled()) { setSent(true); return; }

    setSending(true);
    window.NHRSupabase.submitEnquiry({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      employee_band: form.tier || null,
      route: 'Sales',
      subject: isDemo ? 'Demo request' : 'Free trial request',
      message: [
        isDemo ? 'Demo requested from the site.' : 'Free trial requested from the site.',
        form.date ? 'Preferred date: ' + form.date : ''
      ].filter(Boolean).join(' '),
      source_page: location.pathname
    }).then(() => {
      setSending(false);
      setSent(true);
    }).catch((err) => {
      setSending(false);
      setSendError('That could not be sent: ' + err.message + ' Please try again.');
    });
  }

  React.useEffect(() => {
    if (!form.tier && opts.length) set('tier', opts[0].value);
  }, [opts]);

  React.useEffect(() => {
    const show = e => { setMode((e.detail && e.detail.mode) || 'trial'); setSent(false); setOpen(true); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('nhr-signup', show);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('nhr-signup', show); window.removeEventListener('keydown', esc); };
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const demo = mode === 'demo';
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={demo ? 'Book a demo' : 'Start your free trial'}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={() => setOpen(false)} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.66)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
      }} />
      <div className="signup-card" style={{
        position: 'relative', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: '#fff', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 40px 90px -30px rgba(0,0,0,.6)', padding: 'clamp(24px,4vw,40px)'
      }}>
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{
            width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--nhr-light)', border: '1px solid var(--nhr-line-light)',
            borderRadius: 'var(--radius-sm)', color: 'var(--nhr-text-dark)', cursor: 'pointer'
          }}><Icon name="X" size={17} /></button>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start', paddingTop: 8 }}>
            <span style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--nhr-soft-turquoise)',
              color: 'var(--nhr-turquoise-deep)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}><Icon name="Check" size={26} /></span>
            <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--nhr-text-dark)' }}>
              {demo ? 'Demo request received' : 'You are all set'}
            </h2>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: '#3B4747' }}>
              {demo
                ? 'Someone from the team will confirm your slot by email within one working day.'
                : 'Your request is with the team, who will set your workspace up and email ' + (form.email || 'you') + ' within one working day. Nothing is charged during the trial.'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button onClick={() => setOpen(false)}>Close</Button>
              <Button variant="secondary" href="../app/index.html">Open The Platform</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 40 }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(24px,3.4vw,30px)', fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.15, color: 'var(--nhr-text-dark)' }}>
                {demo ? 'Book a demo' : 'Start your free 30-day trial'}
              </h2>
              <p style={{ margin: 0, fontSize: 15.5, color: '#5b6a69' }}>
                {demo ? 'Twenty minutes, walked through your own processes.' : 'No card required. Set up in minutes.'}
              </p>
            </div>

            <ModalInput label="Full name" placeholder="John Smith" value={form.name} onChange={v => set('name', v)} required />
            <ModalInput label="Work email" type="email" placeholder="john@company.com" value={form.email} onChange={v => set('email', v)} required />
            <ModalInput label="Company name" placeholder="Your company Ltd" value={form.company} onChange={v => set('company', v)} required />
            <ModalSelect label="Number of employees" value={form.tier} onChange={v => set('tier', v)} options={opts} />
            <ModalInput label="Phone number" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={v => set('phone', v)} />
            {demo && <ModalInput label="Preferred date" type="date" value={form.date} onChange={v => set('date', v)} />}

            {sendError && (
              <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--nhr-danger)' }}>{sendError}</p>
            )}

            <Button type="submit" size="lg" fullWidth disabled={sending} iconRight={<Icon name="ArrowRight" size={20} />}>
              {sending ? 'Sending…' : (demo ? 'Book my demo' : 'Start free trial')}
            </Button>

            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#8A9998' }}>
              No VAT is added. By continuing you agree to the Privacy Policy.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* Any button labelled Get Started / Book a Demo / Start Free Trial opens the modal. */
function useSignupCtaBinding() {
  React.useEffect(() => {
    const labels = ['get started', 'book a demo', 'book my demo', 'start free trial', 'talk to sales', 'add your first employee'];
    const onClick = (ev) => {
      const el = ev.target.closest('button,a');
      if (!el) return;
      const text = (el.textContent || '').trim().toLowerCase();
      if (!labels.some(l => text === l || text.startsWith(l))) return;
      /* Never hijack a control inside the real booking or enquiry forms — those
         submit their own data. */
      if (el.closest('.signup-card') || el.closest('.nhr-drawer') || el.closest('.nhr-booking') || el.closest('form')) return;
      if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#') return;
      ev.preventDefault();
      const demo = text.indexOf('demo') > -1 || text.indexOf('sales') > -1;
      /* A demo CTA now has a real page to go to, so send it there rather than
         collecting the same details twice in a modal. */
      const demoUrl = (window.NHR_ROUTES && window.NHR_ROUTES['demo.html']) || '/ui_kits/website/demo.html';
      const onDemoPage = /demo\.html$/.test(window.location.pathname) || window.location.pathname === demoUrl;
      if (demo && !onDemoPage) {
        window.location.href = demoUrl;
        return;
      }
      window.dispatchEvent(new CustomEvent('nhr-signup', { detail: { mode: demo ? 'demo' : 'trial' } }));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

Object.assign(window, { SignupModal, useSignupCtaBinding, tierOptions });
