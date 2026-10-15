/* NHR Solution — Billing & Plan (in-app pricing).

   The public pricing page asks a visitor how many employees they have. This
   one already knows: it counts the real records in EmployeeStore, so the
   estimate is the actual bill rather than a guess someone typed.

   Prices are NOT redefined here. They come from window.NHR_SITE.pricing — the
   same object the marketing site renders — loaded from ../website/data.js, so
   the price a customer saw before signing up and the price they see inside the
   product cannot drift apart. That was the original requirement: one source of
   truth for pricing, edited in one file.

   Plan entitlements come from AuthStore, which already governs which modules
   open. Changing plan here really does lock and unlock modules in the sidebar.
*/
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const BILL_DAY = 864e5;
const pgbp = n => '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pgbp0 = n => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB');

/* Pricing falls back to the same figures as data.js only if the marketing data
   has not loaded — the fallback exists so the screen cannot render blank, not
   as a second source to maintain. */
function pricingConfig() {
  const site = window.NHR_SITE && window.NHR_SITE.pricing;
  if (site && site.plans && site.plans.length) return site;
  return {
    annualDiscount: 0.1667,
    plans: [
      { name: 'Starter', blurb: 'For small businesses finding their feet.', base: 19, perEmployee: 2, features: ['Basic business tools', 'Employee management', 'Dashboard', 'Basic reporting', 'Email support'] },
      { name: 'Professional', blurb: 'For growing teams that need the full workspace.', base: 49, perEmployee: 3.5, featured: true, features: ['Everything in Starter', 'Advanced analytics', 'Workforce management', 'Payroll tools', 'Advanced reporting', 'Priority support'] },
      { name: 'Business', blurb: 'For established organisations with structure.', base: 99, perEmployee: 5, features: ['Everything in Professional', 'Advanced controls', 'Custom integrations', 'Dedicated support', 'Custom onboarding'] },
      { name: 'Enterprise', blurb: 'For multi-site and complex operations.', price: 'Custom', features: ['Everything in Business', 'Multi-site controls', 'Custom SLAs', 'Named account team', 'Migration support'] }
    ]
  };
}

function monthlyFor(plan, employees, annual, discount) {
  if (!plan || plan.price === 'Custom') return null;
  const gross = (Number(plan.base) || 0) + (Number(plan.perEmployee) || 0) * (Number(employees) || 0);
  return annual ? gross * (1 - discount) : gross;
}

function BillingSubnav({ view, onSelect }) {
  const items = [['Your Plan', 'CreditCard'], ['Compare', 'Columns3'], ['Usage', 'ChartColumn'], ['Invoices', 'Receipt']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)} aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
              background: active ? 'rgba(0,229,212,.10)' : 'transparent',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
          </button>
        );
      })}
    </div>
  );
}

function useBilling() {
  const S = window.EmployeeStore, A = window.AuthStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => S.subscribe(force), []);
  React.useEffect(() => (A ? A.subscribe(force) : undefined), []);

  const employees = S.list({ includeArchived: false });
  const session = A ? A.session() : null;
  const cfg = pricingConfig();

  return {
    S, A, refresh: force, cfg,
    /* Billable headcount is active employees. Archived leavers are excluded —
       charging for someone who left is the fastest way to lose a customer. */
    headcount: employees.length,
    plan: session ? session.plan : 'Professional',
    session,
    isTrial: A ? A.isTrial() : false,
    daysLeft: A ? A.trialDaysLeft() : null,
    expired: A ? A.isExpired() : false,
    isDemo: A ? A.isDemo() : false,
    canManage: S.can('settings.write') || S.session.role === 'Super Admin'
  };
}

/* ---------------- Your plan ---------------- */
function YourPlan({ b, onCompare }) {
  const { cfg, headcount, plan, isTrial, daysLeft, expired, isDemo, canManage, A, refresh } = b;
  const [annual, setAnnual] = React.useState(false);
  const [confirm, setConfirm] = React.useState(null);

  const current = cfg.plans.find(p => p.name === plan) || cfg.plans[1];
  const monthly = monthlyFor(current, headcount, annual, cfg.annualDiscount);
  const monthlyStd = monthlyFor(current, headcount, false, cfg.annualDiscount);
  const saving = monthlyStd != null && monthly != null ? (monthlyStd - monthly) * 12 : 0;

  const locked = window.AuthStore ? window.AuthStore.LOCKABLE : [];
  const unlocked = A ? A.modules() : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Current plan" value={plan} caption={isDemo ? 'Demo workspace' : isTrial ? 'On trial' : 'Active subscription'} icon={<Icon name="CreditCard" size={18} />} />
        <StatTile label="Billable employees" value={String(headcount)} caption="Active records, leavers excluded" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Estimated monthly" value={monthly == null ? 'Custom' : pgbp0(monthly)} caption={annual ? 'Billed annually' : 'Billed monthly'} icon={<Icon name="Wallet" size={18} />} />
        <StatTile label={isTrial ? 'Trial remaining' : 'Modules unlocked'}
          value={isTrial ? (daysLeft == null ? '—' : daysLeft + ' days') : String(unlocked.length) + '/' + locked.length}
          caption={isTrial ? (expired ? 'Trial has ended' : 'Then a plan is needed') : 'Premium modules'}
          icon={<Icon name={isTrial ? 'CalendarClock' : 'Unlock'} size={18} />} />
      </div>

      {isTrial && (
        <Card tone="dark" padding={16} style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          borderColor: expired ? 'rgba(242,84,91,.3)' : 'rgba(242,180,65,.26)',
          background: expired ? 'rgba(242,84,91,.04)' : 'rgba(242,180,65,.03)'
        }}>
          <Icon name={expired ? 'TriangleAlert' : 'CalendarClock'} size={18}
            style={{ flex: '0 0 auto', color: expired ? 'var(--nhr-danger)' : 'var(--nhr-warning)' }} />
          <span style={{ flex: 1, minWidth: 230, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
            {expired
              ? 'Your free trial has ended. Premium modules are locked until a plan is chosen — your data is untouched and returns the moment you subscribe.'
              : daysLeft + ' days left on your free trial. Everything is unlocked until then; after that the plan you choose decides what stays open.'}
          </span>
          {canManage && <Button size="sm" onClick={onCompare}>Choose a Plan</Button>}
        </Card>
      )}

      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>{current.name}</span>
              {current.featured && <Badge tone="success">Most popular</Badge>}
            </span>
            <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{current.blurb}</span>
          </span>
          <div style={{ display: 'flex', gap: 5, padding: 4, borderRadius: 'var(--radius-btn)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)' }}>
            {[['Monthly', false], ['Annual', true]].map(([label, val]) => (
              <button key={label} type="button" onClick={() => setAnnual(val)} style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: 'none',
                background: annual === val ? 'rgba(0,229,212,.14)' : 'transparent',
                color: annual === val ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.6)',
                fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: annual === val ? 700 : 600
              }}>{label}</button>
            ))}
          </div>
        </div>

        {monthly == null ? (
          <span style={{ fontSize: 15, color: 'var(--text-body-dark)' }}>Enterprise pricing is agreed individually. Talk to sales for a quote.</span>
        ) : (
          <React.Fragment>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-.03em', color: 'var(--nhr-turquoise)' }}>
                {pgbp0(monthly)}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-muted-dark)' }}>
                per month{annual ? ', billed annually' : ''} · {headcount} employees
              </span>
            </div>

            <DataTable compact columns={[{ k: 'k' }, { k: 'v' }].map((c, i) => i === 0 ? { key: 'k', label: 'How this is calculated' } : { key: 'v', label: '', mono: true, align: 'right' })}
              rows={[
                { id: 'b', k: 'Platform fee', v: pgbp0(current.base) },
                { id: 'p', k: headcount + ' employees × ' + pgbp(current.perEmployee), v: pgbp0(current.perEmployee * headcount) },
                { id: 's', k: 'Monthly subtotal', v: pgbp0(monthlyStd) },
                annual ? { id: 'd', k: 'Annual discount (' + Math.round(cfg.annualDiscount * 100) + '%)', v: '−' + pgbp0(monthlyStd - monthly) } : null,
                { id: 't', k: annual ? 'Effective monthly' : 'Monthly total', v: pgbp0(monthly) },
                { id: 'y', k: 'Annual total', v: pgbp0(monthly * 12) }
              ].filter(Boolean)} />

            {!annual && saving > 0 && (
              <Notice icon="Info">
                Paying annually would save {pgbp0(saving)} a year at your current headcount.
              </Notice>
            )}
          </React.Fragment>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={onCompare} iconLeft={<Icon name="Columns3" size={15} />}>Compare Plans</Button>
          {canManage && !isDemo && <Button size="sm" onClick={() => setConfirm(plan)} iconLeft={<Icon name="RefreshCw" size={15} />}>Change Plan</Button>}
        </div>
      </Card>

      <DashboardCard title="What your plan opens" padding={16} action={<Badge tone="dark">{unlocked.length} of {locked.length}</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {locked.map(m => {
            const open = unlocked.indexOf(m) > -1;
            return (
              <div key={m} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                border: '1px solid ' + (open ? 'rgba(0,229,212,.2)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)'
              }}>
                <Icon name={open ? 'Unlock' : 'Lock'} size={15}
                  style={{ flex: '0 0 auto', color: open ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: open ? '#fff' : 'var(--text-muted-dark)' }}>{m}</span>
                {open
                  ? <Badge tone="success">{isTrial ? 'Open during trial' : 'Included'}</Badge>
                  : <Badge tone="dark">Needs {A ? A.requiredPlan(m) : 'Professional'}</Badge>}
              </div>
            );
          })}
        </div>
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Everything else — Employees, Leave, Attendance, Absence, Rotas, Recruitment, Training, Health &amp; Safety,
          eLearning, Wellbeing, Expenses, Resources and Calculators — is on every plan.
        </span>
      </DashboardCard>

      {confirm && <ChangePlanDialog b={b} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ---------------- Change plan ---------------- */
function ChangePlanDialog({ b, onClose }) {
  const { cfg, headcount, plan, A, refresh } = b;
  const [picked, setPicked] = React.useState(plan);
  const [annual, setAnnual] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const from = cfg.plans.find(p => p.name === plan);
  const to = cfg.plans.find(p => p.name === picked);
  const fromCost = monthlyFor(from, headcount, annual, cfg.annualDiscount);
  const toCost = monthlyFor(to, headcount, annual, cfg.annualDiscount);
  const delta = fromCost != null && toCost != null ? toCost - fromCost : null;

  /* Downgrading can lock a module that is currently in use — say so before the
     change, not after the sidebar goes grey. */
  const losing = A && to
    ? (A.PLANS[plan] ? A.PLANS[plan].unlocks : []).filter(m => (A.PLANS[picked] ? A.PLANS[picked].unlocks : []).indexOf(m) === -1)
    : [];

  function apply() {
    if (A && A.setPlan) A.setPlan(picked);
    setDone(true);
    refresh();
  }

  return (
    <Drawer open onClose={onClose} title="Change Plan"
      subtitle={'Priced on your current headcount of ' + headcount + ' employees.'} width={660}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {done ? (
          <React.Fragment>
            <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 11, borderColor: 'rgba(0,229,212,.3)', background: 'rgba(0,229,212,.05)' }}>
              <Icon name="CircleCheck" size={22} style={{ color: 'var(--nhr-turquoise)' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Now on {picked}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
                Module access has been updated across the workspace — check the sidebar. In this prototype no payment is
                taken and no card details are collected; a live deployment would run this through a payment provider and
                only change entitlements once the charge succeeded.
              </span>
            </Card>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>Done</Button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div style={{ display: 'flex', gap: 5, padding: 4, borderRadius: 'var(--radius-btn)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', alignSelf: 'flex-start' }}>
              {[['Monthly', false], ['Annual', true]].map(([label, val]) => (
                <button key={label} type="button" onClick={() => setAnnual(val)} style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: 'none',
                  background: annual === val ? 'rgba(0,229,212,.14)' : 'transparent',
                  color: annual === val ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.6)',
                  fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: annual === val ? 700 : 600
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cfg.plans.map(p => {
                const on = picked === p.name;
                const cost = monthlyFor(p, headcount, annual, cfg.annualDiscount);
                return (
                  <button key={p.name} type="button" onClick={() => setPicked(p.name)} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 15, textAlign: 'left',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', minHeight: 64,
                    border: '1px solid ' + (on ? 'rgba(0,229,212,.42)' : 'var(--border-dark)'),
                    background: on ? 'rgba(0,229,212,.08)' : 'rgba(255,255,255,.02)'
                  }}>
                    <span style={{
                      width: 18, height: 18, flex: '0 0 auto', borderRadius: '50%',
                      border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
                      background: on ? 'var(--nhr-turquoise)' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                    }}>{on && <Icon name="Check" size={11} style={{ color: '#000' }} />}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                        {p.name}{p.name === plan ? ' · current' : ''}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{p.blurb}</span>
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: on ? 'var(--nhr-turquoise)' : '#fff', whiteSpace: 'nowrap' }}>
                      {cost == null ? 'Custom' : pgbp0(cost) + '/mo'}
                    </span>
                  </button>
                );
              })}
            </div>

            {delta != null && picked !== plan && (
              <Notice icon={delta > 0 ? 'TrendingUp' : 'TrendingDown'}>
                {delta > 0
                  ? 'This increases your bill by ' + pgbp0(delta) + ' a month (' + pgbp0(delta * 12) + ' a year) at ' + headcount + ' employees.'
                  : 'This reduces your bill by ' + pgbp0(Math.abs(delta)) + ' a month (' + pgbp0(Math.abs(delta) * 12) + ' a year) at ' + headcount + ' employees.'}
              </Notice>
            )}

            {losing.length > 0 && (
              <Notice icon="TriangleAlert" tone="warn">
                Moving to {picked} locks {losing.join(', ')}. The data stays in place and returns if you upgrade again,
                but nobody will be able to open {losing.length === 1 ? 'that module' : 'those modules'} in the meantime.
              </Notice>
            )}

            {picked === 'Enterprise' && (
              <Notice icon="Info">Enterprise is priced individually. Selecting it here records the intent; a real deployment would route this to sales rather than charging a card.</Notice>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
              <Button disabled={picked === plan} onClick={apply} iconLeft={<Icon name="Check" size={15} />}>
                {picked === plan ? 'Already on this plan' : 'Switch to ' + picked}
              </Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Compare ---------------- */
const COMPARE_ROWS = [
  ['Employee records', true, true, true, true],
  ['Leave, absence and attendance', true, true, true, true],
  ['Rotas and shifts', true, true, true, true],
  ['Recruitment', true, true, true, true],
  ['Training and eLearning', true, true, true, true],
  ['Health & Safety', true, true, true, true],
  ['Wellbeing', true, true, true, true],
  ['Expenses', true, true, true, true],
  ['Documents', false, true, true, true],
  ['Performance', false, true, true, true],
  ['Payroll', false, true, true, true],
  ['Reports and Analytics', false, true, true, true],
  ['API access and webhooks', false, true, true, true],
  ['Custom integrations', false, false, true, true],
  ['Multi-site controls', false, false, false, true],
  ['Named account team', false, false, false, true]
];

function ComparePlans({ b }) {
  const { cfg, headcount, plan } = b;
  const [annual, setAnnual] = React.useState(false);
  const [count, setCount] = React.useState(headcount);

  React.useEffect(() => setCount(headcount), [headcount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Users" size={17} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Price at</span>
        <input type="number" min="1" value={count} onChange={e => setCount(Number(e.target.value) || 0)}
          aria-label="Employee count" style={{
            width: 100, fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#fff',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '10px 12px', outline: 'none', minHeight: 44
          }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>
          employees{count !== headcount ? ' · your workspace has ' + headcount : ' · your current headcount'}
        </span>
        {count !== headcount && (
          <Button size="xs" variant="ghost" tone="dark" onClick={() => setCount(headcount)}>Reset to actual</Button>
        )}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 5, padding: 4, borderRadius: 'var(--radius-btn)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)' }}>
          {[['Monthly', false], ['Annual', true]].map(([label, val]) => (
            <button key={label} type="button" onClick={() => setAnnual(val)} style={{
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: 'none',
              background: annual === val ? 'rgba(0,229,212,.14)' : 'transparent',
              color: annual === val ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.6)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: annual === val ? 700 : 600
            }}>{label}</button>
          ))}
        </div>
      </Card>

      <div className="plan-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        {cfg.plans.map(p => {
          const cost = monthlyFor(p, count, annual, cfg.annualDiscount);
          const current = p.name === plan;
          return (
            <Card key={p.name} tone="dark" padding={18} style={{
              display: 'flex', flexDirection: 'column', gap: 13,
              borderColor: current ? 'rgba(0,229,212,.32)' : p.featured ? 'rgba(0,229,212,.2)' : undefined,
              background: current ? 'rgba(0,229,212,.04)' : undefined
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16.5, fontWeight: 800, color: '#fff' }}>{p.name}</span>
                {current && <Badge tone="success">Current</Badge>}
                {!current && p.featured && <Badge tone="dark">Popular</Badge>}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted-dark)', minHeight: 38 }}>{p.blurb}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 27, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em', color: 'var(--nhr-turquoise)' }}>
                  {cost == null ? 'Custom' : pgbp0(cost)}
                </span>
                {cost != null && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>/month</span>}
              </span>
              {cost != null && (
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {pgbp0(p.base)} + {pgbp(p.perEmployee)} × {count}{annual ? ', less ' + Math.round(cfg.annualDiscount * 100) + '%' : ''}
                </span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                {p.features.map(f => (
                  <span key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-body-dark)' }}>
                    <Icon name="Check" size={13} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--nhr-turquoise)' }} />{f}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <DashboardCard title="Feature comparison" padding={16} action={<Badge tone="dark">{COMPARE_ROWS.length} rows</Badge>}>
        <DataTable compact columns={[
          { key: 'feature', label: 'Feature' },
          { key: 'starter', label: 'Starter', align: 'center' },
          { key: 'pro', label: 'Professional', align: 'center' },
          { key: 'business', label: 'Business', align: 'center' },
          { key: 'ent', label: 'Enterprise', align: 'center' }
        ]} rows={COMPARE_ROWS.map((r, i) => {
          const tick = on => on
            ? <Icon name="Check" size={14} style={{ color: 'var(--nhr-turquoise)' }} />
            : <Icon name="Minus" size={14} style={{ color: 'var(--text-muted-dark)' }} />;
          return { id: 'cmp' + i, feature: r[0], starter: tick(r[1]), pro: tick(r[2]), business: tick(r[3]), ent: tick(r[4]) };
        })} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Figures are placeholders held in one place and shared with the public pricing page, so the price a customer
          saw before signing up and the price shown in here cannot drift apart. VAT is not included. Set real prices
          before launch.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Usage ---------------- */
function PlanUsage({ b }) {
  const { S, cfg, headcount, plan } = b;
  const R = window.EmployeeRecords;
  const all = S.list({ includeArchived: true });
  const archived = all.filter(e => e.archived);

  const current = cfg.plans.find(p => p.name === plan) || cfg.plans[1];
  const perHead = Number(current.perEmployee) || 0;
  const monthly = monthlyFor(current, headcount, false, cfg.annualDiscount);

  const byDept = {};
  S.list({}).forEach(e => { byDept[e.department] = (byDept[e.department] || 0) + 1; });
  const bars = Object.keys(byDept).map(k => ({ label: k.slice(0, 6), value: byDept[k] })).sort((a, b) => b.value - a.value);

  /* Counting stored records makes the cost of keeping stale data visible. */
  let docs = 0, training = 0;
  S.list({}).forEach(e => {
    docs += (e.documents || []).length;
    training += ((R && R.get(e).training) || []).length;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Billable now" value={String(headcount)} caption="Active employee records" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Archived leavers" value={String(archived.length)} caption="Not billed" icon={<Icon name="UserMinus" size={18} />} />
        <StatTile label="Cost per employee" value={monthly && headcount ? pgbp(monthly / headcount) : '—'} caption="All in, at current headcount" icon={<Icon name="Wallet" size={18} />} />
        <StatTile label="Documents stored" value={String(docs)} caption={training + ' training records'} icon={<Icon name="FolderOpen" size={18} />} />
      </div>

      <DashboardCard title="Billable headcount by department" action={<Badge tone="dark">{headcount} total</Badge>}>
        {bars.length ? <BarChart height={170} data={bars} />
          : <span style={{ fontSize: 13.5, color: 'var(--text-muted-dark)' }}>No employees on record.</span>}
      </DashboardCard>

      <DashboardCard title="What each change costs" padding={16}>
        <DataTable compact columns={[
          { key: 'scenario', label: 'If headcount' },
          { key: 'head', label: 'Employees', mono: true, align: 'right' },
          { key: 'cost', label: 'Monthly', mono: true, align: 'right' },
          { key: 'diff', label: 'Change', mono: true, align: 'right' }
        ]} rows={[-5, -1, 0, 1, 5, 10].map(d => {
          const h = Math.max(0, headcount + d);
          const c = monthlyFor(current, h, false, cfg.annualDiscount);
          const diff = c - monthly;
          return {
            id: 'sc' + d,
            scenario: d === 0 ? 'stays as it is' : d > 0 ? 'grows by ' + d : 'falls by ' + Math.abs(d),
            head: String(h), cost: pgbp0(c),
            diff: d === 0 ? '—' : (diff > 0 ? '+' : '') + pgbp0(diff)
          };
        })} />
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          Each additional employee adds {pgbp(perHead)} a month on {current.name}. Archiving a leaver removes them from
          the count — their record stays accessible for your retention period but stops being billed.
        </span>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Invoices ---------------- */
function Invoices({ b }) {
  const { cfg, headcount, plan, session, isDemo } = b;
  const current = cfg.plans.find(p => p.name === plan) || cfg.plans[1];
  const monthly = monthlyFor(current, headcount, false, cfg.annualDiscount) || 0;

  /* Three months of history derived from the current price, clearly marked as
     illustrative — inventing plausible past invoices would be worse. */
  const rows = [0, 1, 2].map(i => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      id: 'inv' + i,
      ref: 'INV-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0'),
      period: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      plan: current.name, employees: headcount,
      net: monthly, vat: monthly * 0.2, total: monthly * 1.2,
      status: i === 0 ? 'Current period' : 'Paid'
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Notice icon="Info">
        {isDemo
          ? 'This is a demo workspace, so no billing account exists. The figures below are worked from your current plan and headcount to show the shape of an invoice.'
          : 'Invoice history is illustrative in this prototype — it is derived from your current plan and headcount rather than from real charges. No payment method is stored.'}
      </Notice>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Current period" value={pgbp0(monthly * 1.2)} caption="Including VAT at 20%" icon={<Icon name="Receipt" size={18} />} />
        <StatTile label="Net" value={pgbp0(monthly)} caption="Before VAT" icon={<Icon name="Wallet" size={18} />} />
        <StatTile label="Billing contact" value={session ? (session.email || '—').split('@')[0] : '—'} caption={session ? session.email : 'Not set'} icon={<Icon name="Mail" size={18} />} />
        <StatTile label="Payment method" value="None" caption="Not collected in this prototype" icon={<Icon name="CreditCard" size={18} />} />
      </div>

      <DashboardCard title="Invoices" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-invoices-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Reference', key: 'ref' }, { label: 'Period', key: 'period' }, { label: 'Plan', key: 'plan' },
            { label: 'Employees', key: 'employees' }, { label: 'Net', key: 'net' }, { label: 'VAT', key: 'vat' },
            { label: 'Total', key: 'total' }, { label: 'Status', key: 'status' }],
            rows.map(r => Object.assign({}, r, { net: r.net.toFixed(2), vat: r.vat.toFixed(2), total: r.total.toFixed(2) })))}>Export</Button>}>
        <DataTable compact columns={[
          { key: 'ref', label: 'Reference', mono: true },
          { key: 'period', label: 'Period' },
          { key: 'plan', label: 'Plan' },
          { key: 'employees', label: 'Employees', mono: true, align: 'right' },
          { key: 'netLabel', label: 'Net', mono: true, align: 'right' },
          { key: 'totalLabel', label: 'Total', mono: true, align: 'right' },
          { key: 'statusBadge', label: 'Status' }
        ]} rows={rows.map(r => Object.assign({}, r, {
          netLabel: pgbp(r.net), totalLabel: pgbp(r.total),
          statusBadge: <Badge tone={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>
        }))} />
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="ShieldCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          A live deployment should never hold card details itself. Use a payment provider that keeps card data off your
          servers, store only their customer and subscription identifiers, and change module entitlements when their
          webhook confirms the charge rather than when the user clicks the button.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function BillingScreen() {
  const b = useBilling();
  const [view, setView] = React.useState('Your Plan');

  const body = {
    'Your Plan': <YourPlan b={b} onCompare={() => setView('Compare')} />,
    'Compare': <ComparePlans b={b} />,
    'Usage': <PlanUsage b={b} />,
    'Invoices': <Invoices b={b} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Plan &amp; Billing</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            Your bill worked from the {b.headcount} employee records actually in this workspace, priced from the same figures the public pricing page uses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Usage')} iconLeft={<Icon name="ChartColumn" size={15} />}>Usage</Button>
          <Button size="sm" onClick={() => setView('Compare')} iconLeft={<Icon name="Columns3" size={15} />}>Compare Plans</Button>
        </div>
      </div>

      <BillingSubnav view={view} onSelect={setView} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
    </div>
  );
}

Object.assign(window, {
  BillingScreen, BillingSubnav, useBilling, YourPlan, ChangePlanDialog,
  ComparePlans, PlanUsage, Invoices, pricingConfig, monthlyFor
});
