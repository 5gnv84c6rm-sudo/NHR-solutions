/* Access screens for the platform app: trial signup, sign in, demo entry,
   trial banner, expired state and per-module plan locks.
   Marketing-site previews of AppWindow are NOT gated — gating is opt-in via the
   `gated` prop, set only on the real app pages. */
const { Button, Card, Badge } = window.NHRSolutionDesignSystem_0db691;

const TRIAL_POINTS = [
  ['Users', 'Your whole team, from day one', 'Add employees, managers and self-service access without a seat limit during the trial.'],
  ['ShieldCheck', 'Nothing shared until you say so', 'Your data stays in your workspace. Cancel inside 14 days and it is removed.'],
  ['CreditCard', 'No card to start', 'The trial runs for 14 days. We ask for payment details only if you continue.']
];

function BrandPanel() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--nhr-black)', borderRight: '1px solid var(--border-dark)', padding: 'clamp(28px,4vw,56px)', display: 'flex', flexDirection: 'column', gap: 34, justifyContent: 'center', minHeight: 0 }}>
      <img src="../../assets/pattern-dots-tl.png" alt="" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '62%', opacity: .5, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <img src="../../assets/pattern-dots-br.png" alt="" aria-hidden="true" style={{ position: 'absolute', bottom: 0, right: 0, width: '54%', opacity: .35, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 520, height: 520, left: '-18%', bottom: '-22%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,212,.16),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 34 }}>
        <img src="../../assets/logo-light.png" alt="NHR Solution" style={{ width: 200, maxWidth: '60%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.12, fontWeight: 800, letterSpacing: '-.03em', color: '#fff', textWrap: 'pretty' }}>
            Your workspace is<br /><span style={{ color: 'var(--nhr-turquoise)' }}>ready when you are.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: 'var(--text-body-dark)', maxWidth: 420 }}>
            Employees, attendance, payroll, documents and reporting in one place. Start a 14-day trial and bring your team in today.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {TRIAL_POINTS.map(([ic, t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 14 }}>
              <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.28)', color: 'var(--nhr-turquoise)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{t}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{d}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onIn }) {
  const A = window.AuthStore;
  const [mode, setMode] = React.useState('trial');
  const [f, setF] = React.useState({ firstName: '', lastName: '', business: '', email: '', password: '', employees: '', plan: 'Professional' });
  const [signin, setSignin] = React.useState({ email: '', password: '' });
  const [errors, setErrors] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(null);
  const set = (k, v) => setF(p => Object.assign({}, p, { [k]: v }));

  const formMessage = (errors.form || notice) ? (
    <p role="alert" style={{ margin: 0, padding: '11px 13px', borderRadius: 'var(--radius-btn)', fontSize: 13.5, lineHeight: 1.55,
      background: errors.form ? 'rgba(242,84,91,.12)' : 'rgba(0,229,212,.10)',
      color: errors.form ? 'var(--nhr-danger)' : 'var(--nhr-turquoise)' }}>
      {errors.form || notice}
    </p>
  ) : null;

  function submitTrial() {
    const e = {};
    if (!f.firstName.trim()) e.firstName = 'Required';
    if (!f.lastName.trim()) e.lastName = 'Required';
    if (!f.business.trim()) e.business = 'Required';
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(f.email)) e.email = 'Enter a valid work email';
    if (f.password.length < 10) e.password = 'Use at least 10 characters';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    A.signUp(f)
      .then(() => { setBusy(false); onIn(); })
      .catch(err => { setBusy(false); setErrors(Object.assign({}, err.fields || {}, { form: err.message })); });
  }

  function submitSignin() {
    const e = {};
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(signin.email)) e.email = 'Enter a valid email';
    if (!signin.password) e.password = 'Required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    A.signIn(signin.email, signin.password)
      .then(() => { setBusy(false); onIn(); })
      .catch(err => { setBusy(false); setErrors({ form: err.message }); });
  }

  function sendReset() {
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(signin.email)) {
      setErrors({ email: 'Enter your email first, then choose Reset password.' });
      return;
    }
    setBusy(true);
    A.resetPassword(signin.email)
      /* Says "if there is an account" on purpose: confirming an address exists
         would tell anyone whose customers we have. */
      .then(() => { setBusy(false); setNotice('If there is an account for that address, a reset link is on its way.'); setErrors({}); })
      .catch(err => { setBusy(false); setErrors({ form: err.message }); });
  }

  const tab = (id, label) => (
    <button type="button" onClick={() => { setMode(id); setErrors({}); }}
      style={{ flex: 1, padding: '11px 14px', borderRadius: 'var(--radius-btn)', border: '1px solid ' + (mode === id ? 'rgba(0,229,212,.35)' : 'transparent'), background: mode === id ? 'rgba(0,229,212,.10)' : 'transparent', color: mode === id ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)', fontFamily: 'var(--font-core)', fontSize: 14, fontWeight: mode === id ? 700 : 600, cursor: 'pointer', transition: 'all var(--dur-base) var(--ease-out)' }}>
      {label}
    </button>
  );

  return (
    <div className="auth-split" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: '100vh', background: 'var(--nhr-dark)' }}>
      <BrandPanel />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,4vw,56px)', minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: 452, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)' }}>
            {tab('trial', 'Start free trial')}{tab('signin', 'Sign in')}
          </div>

          {mode === 'trial' ? (
            <React.Fragment>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Start your 14-day trial</h2>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body-dark)' }}>Full access for 14 days. No card required.</p>
              </div>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <TextField label="First name" required value={f.firstName} onChange={v => set('firstName', v)} error={errors.firstName} />
                <TextField label="Last name" required value={f.lastName} onChange={v => set('lastName', v)} error={errors.lastName} />
                <TextField label="Business name" required span={2} value={f.business} onChange={v => set('business', v)} error={errors.business} />
                <TextField label="Work email" required span={2} type="email" value={f.email} onChange={v => set('email', v)} error={errors.email} placeholder="you@yourbusiness.co.uk" />
                <TextField label="Password" required span={2} type="password" value={f.password} onChange={v => set('password', v)} error={errors.password} hint="At least 10 characters. Length beats complexity." />
                <SelectField label="Number of employees" value={f.employees} onChange={v => set('employees', v)}
                  options={['1–5', '6–15', '16–50', '51–150', '150+']} placeholder="Select…" />
                <SelectField label="Plan to trial" value={f.plan} onChange={v => set('plan', v)}
                  options={['Starter', 'Professional', 'Business']} />
              </div>
              {formMessage}
              <Button onClick={submitTrial} disabled={busy} iconRight={<Icon name="ArrowRight" size={18} />}>
                {busy ? 'Creating your workspace…' : 'Start Free Trial'}
              </Button>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                By starting a trial you agree to the terms and privacy policy. Your trial locks after 14 days unless you choose a plan.
                Your account works on any device — sign in with the same email and password.
              </p>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Sign in</h2>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body-dark)' }}>Use the account your business was set up with.</p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <TextField label="Email" required type="email" value={signin.email} onChange={v => setSignin(p => Object.assign({}, p, { email: v }))} error={errors.email} />
                <TextField label="Password" required type="password" value={signin.password} onChange={v => setSignin(p => Object.assign({}, p, { password: v }))} error={errors.password} />
              </div>
              {formMessage}
              <Button onClick={submitSignin} disabled={busy} iconRight={<Icon name="ArrowRight" size={18} />}>
                {busy ? 'Signing in…' : 'Sign In'}
              </Button>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
                <button type="button" onClick={sendReset} style={{ padding: 0, background: 'none', border: 0, color: 'var(--nhr-turquoise)', font: 'inherit', cursor: 'pointer' }}>Reset password</button>
                {' · '}No account yet? Start a free trial above, or <a href="../website/pricing.html">see pricing</a>.
              </p>
            </React.Fragment>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border-dark)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border-dark)' }} />
          </div>
          <Button variant="secondary" tone="dark" onClick={() => { A.startDemo(); onIn(); }} iconLeft={<Icon name="PlayCircle" size={17} />}>
            View Demo
          </Button>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)', textAlign: 'center' }}>
            The demo opens a sample business with illustrative data. Nothing you change there affects a real account.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Shown above the app while a trial is running, and when it has lapsed. */
function TrialBanner({ onChange }) {
  const A = window.AuthStore;
  const s = A.session();
  if (!s) return null;
  if (s.mode === 'demo') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 20px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid var(--border-dark)', fontSize: 13.5, color: 'var(--text-body-dark)' }}>
        <Badge tone="dark">Demo</Badge>
        <span style={{ flex: 1, minWidth: 200 }}>You are viewing a sample business with illustrative data.</span>
        <Button size="sm" onClick={() => { A.signOut(); onChange(); }}>Start Free Trial</Button>
      </div>
    );
  }
  if (s.mode !== 'trial') return null;
  const left = A.trialDaysLeft();
  const low = left <= 3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 20px', background: low ? 'rgba(242,180,65,.10)' : 'rgba(0,229,212,.08)', borderBottom: '1px solid ' + (low ? 'rgba(242,180,65,.30)' : 'rgba(0,229,212,.25)'), fontSize: 13.5, color: 'var(--text-body-dark)' }}>
      <Badge tone={low ? 'warning' : 'dark'}>{left === 0 ? 'Last day' : left + ' ' + (left === 1 ? 'day' : 'days') + ' left'}</Badge>
      <span style={{ flex: 1, minWidth: 200 }}>Free trial of the {s.plan} plan. Choose a plan any time to keep your workspace.</span>
      <Button size="sm" variant="secondary" tone="dark" as="a" href="../website/pricing.html">See Plans</Button>
      <Button size="sm" onClick={() => { A.setPlan(s.plan); onChange(); }}>Upgrade Now</Button>
    </div>
  );
}

function CenteredPanel({ icon, eyebrow, title, description, children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,5vw,64px)', background: 'var(--nhr-black)', overflow: 'hidden' }}>
      <img src="../../assets/pattern-dots-tl.png" alt="" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '46%', opacity: .4, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <img src="../../assets/pattern-dots-br.png" alt="" aria-hidden="true" style={{ position: 'absolute', bottom: 0, right: 0, width: '42%', opacity: .3, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ position: 'relative', maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', alignItems: 'center' }}>
        <span style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.28)', color: 'var(--nhr-turquoise)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={24} /></span>
        {eyebrow && <Badge tone="dark">{eyebrow}</Badge>}
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff', textWrap: 'pretty' }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--text-body-dark)', maxWidth: 440 }}>{description}</p>
        {children}
      </Card>
    </div>
  );
}

function TrialExpired({ onChange }) {
  const A = window.AuthStore;
  const s = A.session();
  return (
    <CenteredPanel icon="Lock" eyebrow="Trial ended"
      title="Your 14-day trial has finished"
      description={'Your workspace and everything in it is still here. Choose a plan to unlock it again, or sign out.'}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button onClick={() => { A.setPlan(s.plan || 'Professional'); onChange(); }} iconRight={<Icon name="ArrowRight" size={18} />}>Choose a Plan</Button>
        <Button variant="secondary" tone="dark" as="a" href="../website/pricing.html">See Pricing</Button>
        <Button variant="ghost" tone="dark" onClick={() => { A.signOut(); onChange(); }}>Sign Out</Button>
      </div>
    </CenteredPanel>
  );
}

/* Module the current plan does not include. */
function ModuleLocked({ name, onChange }) {
  const A = window.AuthStore;
  const need = A.requiredPlan(name) || 'Professional';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360, padding: 24 }}>
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center' }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.28)', color: 'var(--nhr-turquoise)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Lock" size={22} /></span>
        <Badge tone="dark">{need} plan</Badge>
        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>{name} is part of {need}</h3>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-body-dark)', maxWidth: 400 }}>
          Your workspace is on the {A.plan()} plan. Move up to {need} to open {name} — your existing data stays exactly as it is.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button size="sm" onClick={() => { A.setPlan(need); onChange && onChange(); }} iconRight={<Icon name="ArrowRight" size={16} />}>Upgrade to {need}</Button>
          <Button size="sm" variant="secondary" tone="dark" as="a" href="../website/pricing.html">Compare Plans</Button>
        </div>
      </Card>
    </div>
  );
}

/* Wraps the app. Not authed → auth screen. Trial lapsed → locked panel. */
function AppGate({ children }) {
  const A = window.AuthStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  /* Signed in on another device? The server session is the truth, so check it
     before deciding this browser is signed out. */
  const [checking, setChecking] = React.useState(!A.isAuthed() && !!(window.NHRSupabase && window.NHRSupabase.enabled()));
  React.useEffect(() => A.subscribe(force), []);
  React.useEffect(() => {
    if (!A.restore) { setChecking(false); return; }
    A.restore().then(() => setChecking(false)).catch(() => setChecking(false));
  }, []);

  if (checking) return null;
  if (!A.isAuthed()) return <AuthScreen onIn={force} />;
  if (A.isExpired()) return <TrialExpired onChange={force} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <TrialBanner onChange={force} />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { AppGate, AuthScreen, TrialBanner, TrialExpired, ModuleLocked, BrandPanel, CenteredPanel });
