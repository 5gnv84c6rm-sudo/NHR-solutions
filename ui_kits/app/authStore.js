/* NHR Solution — access layer for the platform app.

   Owns: the signed-in session, the 14-day free trial clock, the plan, and which
   modules that plan may open. Frontend prototype only — persisted to
   localStorage. A real deployment replaces this with server-issued sessions and
   an entitlements check on every request; the function names are kept close to
   what that API would expose.

   window.AuthStore = { session, isAuthed, signUp, signIn, signOut, startDemo,
                        trialDaysLeft, isTrial, isExpired, isDemo, plan, setPlan,
                        modules, isLocked, requiredPlan, subscribe, reset }
*/
(function () {
  const KEY = 'nhr.auth.v1';
  const TRIAL_DAYS = 14;
  const DAY = 864e5;

  /* Modules that need a paid tier above Starter. Everything not listed here is
     available on every plan. */
  const LOCKABLE = ['Payroll', 'Analytics', 'Documents', 'Performance'];

  const PLANS = {
    Starter: { label: 'Starter', unlocks: [] },
    Professional: { label: 'Professional', unlocks: LOCKABLE.slice() },
    Business: { label: 'Business', unlocks: LOCKABLE.slice() },
    Enterprise: { label: 'Enterprise', unlocks: LOCKABLE.slice() }
  };

  /* Lowest plan that includes a given module — shown on the locked screen. */
  function requiredPlan(module) {
    if (LOCKABLE.indexOf(module) === -1) return null;
    return 'Professional';
  }

  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* listener detached */ } }); }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  }
  function write(s) {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
    notify();
    return s;
  }

  function initials(name) {
    const p = String(name || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '' + (p[1] || '')[0] || '').toUpperCase() +
      ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase();
  }

  const AuthStore = {
    TRIAL_DAYS, LOCKABLE, PLANS,

    session() { return read(); },
    isAuthed() { return !!read(); },
    isDemo() { const s = read(); return !!s && s.mode === 'demo'; },
    plan() { const s = read(); return s ? s.plan : null; },

    /* --- trial clock --- */
    isTrial() { const s = read(); return !!s && s.mode === 'trial'; },
    trialEndsAt() { const s = read(); return s && s.trialStartedAt ? s.trialStartedAt + TRIAL_DAYS * DAY : null; },
    trialDaysLeft() {
      const s = read();
      if (!s || s.mode !== 'trial' || !s.trialStartedAt) return null;
      return Math.max(0, Math.ceil((s.trialStartedAt + TRIAL_DAYS * DAY - Date.now()) / DAY));
    },
    isExpired() {
      const s = read();
      if (!s || s.mode !== 'trial') return false;
      return Date.now() > s.trialStartedAt + TRIAL_DAYS * DAY;
    },

    /* --- entry points ---
       signUp and signIn talk to Supabase Auth, so an account created on one
       device opens on any other. The local record below is a cache for the UI;
       the account itself lives on the server. Both return promises.

       Without Supabase configured they fall back to the old local-only
       behaviour, so the prototype still runs from a file. */
    signUp(form) {
      const name = [form.firstName, form.lastName].filter(Boolean).join(' ');
      const cache = (extra) => write(Object.assign({
        mode: 'trial',
        plan: form.plan || 'Professional',
        name, initials: initials(name),
        email: form.email, business: form.business,
        employees: Number(form.employees) || 0,
        role: 'Super Admin',
        trialStartedAt: Date.now(),
        createdAt: new Date().toISOString()
      }, extra || {}));

      const sb = window.NHRSupabase;
      if (!sb || !sb.enabled()) return Promise.resolve(cache());

      return sb.signUpAccount({
        email: form.email,
        password: form.password,
        admin_name: name,
        company_name: form.business,
        employee_band: form.employees ? String(form.employees) : null,
        sector: form.sector || null
      })
        .then(result => sb.signIn(form.email, form.password).then(user => ({ result, user })))
        .then(({ result, user }) => cache({
          userId: user.id,
          tenantId: result.tenant_id,
          trialEndsAt: result.trial_ends_at
        }));
    },

    signIn(email, password) {
      const fallback = () => {
        const local = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
        const name = local.replace(/\b\w/g, c => c.toUpperCase()) || 'Account Owner';
        return write({
          mode: 'paid', plan: 'Professional',
          name, initials: initials(name), email,
          business: 'Your Business', role: 'Super Admin',
          createdAt: new Date().toISOString()
        });
      };

      const sb = window.NHRSupabase;
      if (!sb || !sb.enabled()) return Promise.resolve(fallback());

      return sb.signIn(email, password).then(user => {
        const name = (user.user_metadata && user.user_metadata.name) || email.split('@')[0];
        const s = write({
          mode: 'paid', plan: 'Professional',
          name, initials: initials(name), email: user.email,
          business: 'Your Business', role: 'Super Admin',
          userId: user.id,
          createdAt: new Date().toISOString()
        });
        return AuthStore.refreshTenant().then(() => s, () => s);
      });
    },

    /* Reads the workspace this account belongs to. Returns nothing until the
       custom access token hook is registered, because the tenant policy matches
       on a claim the token does not carry yet — so the name falls back rather
       than the app breaking. */
    refreshTenant() {
      const sb = window.NHRSupabase;
      const s = read();
      if (!sb || !sb.enabled() || !s || !s.userId) return Promise.resolve(s);
      return sb.client()
        .then(db => db.from('tenants').select('name, plan, status, trial_ends_at').limit(1))
        .then(res => {
          const row = res.data && res.data[0];
          if (!row) return s;
          const cur = read();
          if (!cur) return cur;
          cur.business = row.name;
          if (row.status === 'trial' && row.trial_ends_at) {
            cur.mode = 'trial';
            cur.trialEndsAt = row.trial_ends_at;
          }
          return write(cur);
        })
        .catch(() => s);
    },

    /* Rebuilds the local cache from the server session, so signing in on a
       second device shows a signed-in app after a refresh. */
    restore() {
      const sb = window.NHRSupabase;
      if (!sb || !sb.enabled()) return Promise.resolve(read());
      return sb.currentUser().then(user => {
        const s = read();
        if (!user) {
          // Demo sessions are local by design and must survive.
          if (s && s.mode === 'demo') return s;
          return s && s.userId ? write(null) : s;
        }
        if (s && s.userId === user.id) return s;
        const name = (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0];
        const next = write({
          mode: 'paid', plan: 'Professional',
          name, initials: initials(name), email: user.email,
          business: 'Your Business', role: 'Super Admin',
          userId: user.id,
          createdAt: new Date().toISOString()
        });
        return AuthStore.refreshTenant().then(() => next, () => next);
      }).catch(() => read());
    },

    resetPassword(email) {
      const sb = window.NHRSupabase;
      if (!sb || !sb.enabled()) return Promise.reject(new Error('Password reset needs the live service.'));
      return sb.resetPassword(email);
    },

    startDemo() {
      return write({
        mode: 'demo', plan: 'Professional',
        name: 'Amara Osei', initials: 'AO', email: 'demo@nhrsolution.example',
        business: 'Demo Business', role: 'Super Admin',
        createdAt: new Date().toISOString()
      });
    },

    signOut() {
      const sb = window.NHRSupabase;
      if (sb && sb.enabled()) sb.signOut();
      return write(null);
    },

    setPlan(plan) {
      const s = read();
      if (!s) return null;
      s.plan = plan; s.mode = 'paid'; delete s.trialStartedAt;
      return write(s);
    },

    /* --- entitlements --- */
    modules() {
      const s = read();
      if (!s) return [];
      if (s.mode === 'demo') return LOCKABLE.slice();
      if (s.mode === 'trial' && !AuthStore.isExpired()) return LOCKABLE.slice();
      return (PLANS[s.plan] || PLANS.Starter).unlocks;
    },
    isLocked(module) {
      if (LOCKABLE.indexOf(module) === -1) return false;
      return AuthStore.modules().indexOf(module) === -1;
    },
    requiredPlan,

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { return write(null); }
  };

  window.AuthStore = AuthStore;
})();
