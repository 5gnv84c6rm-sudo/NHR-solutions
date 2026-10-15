/* NHR Solution platform — dark app shell: sidebar, top bar, notifications. */
const { IconButton, Badge, Input } = window.NHRSolutionDesignSystem_0db691;

/* `label` is the stable key used by APP_SCREENS, permissions and the initial=
   prop on each page. `name` is what the sidebar shows, and `group` puts the
   supporting tools below the core workspace. Order follows the client spec. */
const APP_NAV = [
  { label: 'Overview', name: 'Dashboard', icon: 'LayoutDashboard' },
  { label: 'Employees', icon: 'Users', dynamicCount: true },
  { label: 'Leave', name: 'Holiday & Leave', icon: 'Plane' },
  { label: 'Attendance', icon: 'CalendarCheck' },
  { label: 'Absence', icon: 'Thermometer' },
  { label: 'Rotas', name: 'Shifts & Rotas', icon: 'CalendarRange' },
  { label: 'Payroll', icon: 'Wallet' },
  { label: 'Documents', icon: 'FileText' },
  { label: 'Performance', icon: 'Target' },
  { label: 'Expenses', icon: 'Receipt' },
  { label: 'Recruitment', icon: 'UserPlus' },
  { label: 'Health & Safety', icon: 'HardHat' },
  { label: 'Training', icon: 'GraduationCap' },
  { label: 'Wellbeing', icon: 'HeartHandshake' },
  { label: 'Reports', icon: 'ClipboardList' },
  { label: 'Analytics', icon: 'BarChart3' },
  { label: 'Settings', icon: 'Settings' },
  { label: 'Tasks', icon: 'ListChecks', group: 'More' },
  { label: 'eLearning', icon: 'BookOpen', group: 'More' },
  { label: 'NHR Intelligence', icon: 'Sparkles', group: 'More' },
  { label: 'Integrations', icon: 'Blocks', group: 'More' },
  { label: 'Resources', icon: 'Library', group: 'More' },
  { label: 'Calculators', icon: 'Calculator', group: 'More' },
  { label: 'Plan & Billing', icon: 'CreditCard', group: 'More' },
  { label: 'Customer Stories', icon: 'Newspaper', group: 'More' },
  { label: 'Support', icon: 'LifeBuoy', group: 'More' }
];

/* Viewport width hook — the shell needs real breakpoints and inline styles
   cannot carry media queries. 'mobile' collapses the sidebar into a drawer. */
function useViewport() {
  const get = () => (typeof window === 'undefined' ? 1440 : window.innerWidth);
  const [w, setW] = React.useState(get);
  React.useEffect(() => {
    let raf = null;
    const on = () => { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setW(get())); };
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return { width: w, isMobile: w < 720, isTablet: w >= 720 && w < 1080, isDesktop: w >= 1080 };
}

function todayLabel() {
  try { return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return ''; }
}

function SidebarLink({ item, active, onClick, compact, locked }) {
  const [hover, setHover] = React.useState(false);
  const on = active || hover;
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: compact ? '9px 11px' : '11px 13px', borderRadius: 'var(--radius-btn)',
        background: active ? 'rgba(0,229,212,.10)' : (hover ? 'rgba(255,255,255,.04)' : 'transparent'),
        border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
        color: on ? (active ? 'var(--nhr-turquoise)' : '#fff') : 'rgba(245,255,255,.62)',
        fontFamily: 'var(--font-core)', fontSize: compact ? 13 : 14.5, fontWeight: active ? 700 : 600,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all var(--dur-base) var(--ease-out)'
      }}>
      <Icon name={item.icon} size={compact ? 16 : 18} />
      <span style={{ flex: 1 }}>{item.name || item.label}</span>
      {locked && <Icon name="Lock" size={compact ? 13 : 14} style={{ color: 'var(--text-muted-dark)' }} aria-label="Requires a higher plan" />}
      {!locked && item.dynamicCount && window.EmployeeStore && <Badge tone="dark">{window.EmployeeStore.counts().total}</Badge>}
      {!locked && item.badge && <Badge tone="dark">{item.badge}</Badge>}
    </button>
  );
}

function Sidebar({ active, onSelect, compact = false, gated = false, drawer = false, onClose }) {
  const A = window.AuthStore;
  const s = gated && A ? A.session() : null;
  const trialLeft = s && A.isTrial() ? A.trialDaysLeft() : null;
  return (
    <aside style={{
      width: drawer ? 268 : (compact ? 190 : 244), flex: '0 0 auto', display: 'flex', flexDirection: 'column',
      background: 'var(--nhr-charcoal)', borderRight: '1px solid var(--border-dark)',
      padding: compact && !drawer ? '16px 12px' : '22px 16px', gap: 22, minHeight: 0,
      height: drawer ? '100%' : 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 4px' }}>
        <Wordmark size={compact && !drawer ? 18 : 21} />
        {drawer && <IconButton tone="dark" label="Close menu" onClick={onClose}><Icon name="X" size={18} /></IconButton>}
      </div>
      <nav aria-label="Platform" style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {APP_NAV.map((item, i) => (
          <React.Fragment key={item.label}>
            {item.group === 'More' && APP_NAV[i - 1] && APP_NAV[i - 1].group !== 'More' && (
              <span style={{
                padding: compact && !drawer ? '14px 10px 6px' : '16px 12px 6px',
                fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                color: 'rgba(245,255,255,.34)'
              }}>{compact && !drawer ? '•••' : 'More tools'}</span>
            )}
            <SidebarLink item={item} compact={compact && !drawer}
              locked={gated && A ? A.isLocked(item.label) : false}
              active={active === item.label} onClick={() => { onSelect && onSelect(item.label); onClose && onClose(); }} />
          </React.Fragment>
        ))}
      </nav>
      {/* Always-available way back out to the marketing site and the page index. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: '1px solid var(--border-dark)', flexShrink: 0 }}>
        {[['All Pages', 'LayoutGrid', '../preview.html'], ['View Website', 'Globe', '../website/index.html']].map(([label, icon, href]) => (
          <a key={label} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: compact && !drawer ? '9px 10px' : '10px 12px',
            borderRadius: 'var(--radius-btn)', textDecoration: 'none',
            fontSize: compact && !drawer ? 13 : 13.5, fontWeight: 600, color: 'rgba(245,255,255,.62)',
            transition: 'background var(--dur-base) var(--ease-out),color var(--dur-base) var(--ease-out)'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,212,.07)'; e.currentTarget.style.color = 'var(--nhr-turquoise)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,255,255,.62)'; }}>
            <Icon name={icon} size={compact && !drawer ? 16 : 18} />
            <span style={{ flex: 1 }}>{label}</span>
            <Icon name="ArrowUpRight" size={13} />
          </a>
        ))}
      </div>
      <div style={{
        border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
        background: 'rgba(0,229,212,.06)', padding: compact && !drawer ? 12 : 14,
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nhr-turquoise)' }}>{s ? (trialLeft !== null ? s.plan + ' trial' : s.plan + ' plan') : 'Professional plan'}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-body-dark)', lineHeight: 1.5 }}>
          {s
            ? (trialLeft !== null
              ? (trialLeft === 0 ? 'Last day of your trial.' : trialLeft + ' ' + (trialLeft === 1 ? 'day' : 'days') + ' left in your trial.')
              : (s.mode === 'demo' ? 'Sample business — illustrative data.' : s.business))
            : '120 of 150 employee seats used.'}
        </span>
      </div>
    </aside>
  );
}

function Topbar({ title, compact = false, onBell, gated = false, onSignOut, onMenu, showMenu = false, showSearch = true, showWho = true }) {
  const A = window.AuthStore;
  const s = gated && A ? A.session() : null;
  /* The sub-line shows the permission role actually in force. The account's own
     role and the demo "viewing as" role can differ, and showing the account one
     while the switcher says otherwise puts two roles on screen at once. */
  const S = window.EmployeeStore;
  const [, forceRole] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => (S ? S.subscribe(forceRole) : undefined), []);
  const activeRole = S && S.session ? S.session.role : null;
  const who = s
    ? { initials: s.initials || 'NA', name: s.name, sub: activeRole || s.role }
    : { initials: 'AO', name: 'Amara Osei', sub: activeRole || 'Operations Director' };
  const [search, setSearch] = React.useState(false);
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: compact ? 10 : 16,
      padding: compact ? '12px 16px' : '16px 24px',
      borderBottom: '1px solid var(--border-dark)', background: 'rgba(5,5,5,.72)',
      backdropFilter: 'var(--blur-nav)', WebkitBackdropFilter: 'var(--blur-nav)', flexWrap: 'wrap'
    }}>
      {showMenu && (
        <IconButton tone="dark" label="Open menu" onClick={onMenu}><Icon name="Menu" size={19} /></IconButton>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: compact ? 16 : 20, fontWeight: 700, letterSpacing: '-.02em', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
        {showWho && <span style={{ fontSize: 12, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{todayLabel()}</span>}
      </div>
      {showSearch
        ? <div style={{ width: 280, flex: '0 1 280px' }}><GlobalSearch /></div>
        : <IconButton tone="dark" label="Search" onClick={() => setSearch(v => !v)}><Icon name="Search" size={17} /></IconButton>}
      <IconButton tone="dark" label="Notifications" onClick={onBell}><Icon name="Bell" size={compact ? 16 : 18} /></IconButton>
      {gated && <IconButton tone="dark" label="Sign out" onClick={onSignOut}><Icon name="LogOut" size={compact ? 16 : 18} /></IconButton>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: '50%', flex: '0 0 auto',
          background: 'rgba(0,229,212,.14)', color: 'var(--nhr-turquoise)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700
        }}>{who.initials}</span>
        {showWho && !compact && (
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{who.name}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{who.sub}</span>
          </span>
        )}
      </div>
      {!showSearch && search && (
        <div style={{ flexBasis: '100%', minWidth: 0 }}><GlobalSearch /></div>
      )}
    </header>
  );
}

/* Full chrome + screen area. compact=true is the version embedded in the marketing site. */
function AppWindow({ compact = false, initial = 'Overview', height = 620, gated = false }) {
  const [active, setActive] = React.useState(initial);
  const A = window.AuthStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => (gated && A ? A.subscribe(force) : undefined), [gated]);
  React.useEffect(() => {
    const go = e => setActive(e.detail);
    const add = () => { setActive('Employees'); setTimeout(() => window.dispatchEvent(new CustomEvent('nhr-open-wizard')), 60); };
    window.addEventListener('nhr-goto-screen', go);
    window.addEventListener('nhr-add-employee', add);
    return () => { window.removeEventListener('nhr-goto-screen', go); window.removeEventListener('nhr-add-employee', add); };
  }, []);
  const locked = gated && A ? A.isLocked(active) : false;
  const Screen = window.APP_SCREENS[active] || window.APP_SCREENS.__fallback;

  /* Below 1080px the sidebar becomes a drawer so the screen area keeps its width. */
  const vp = useViewport();
  const drawerMode = !compact && !vp.isDesktop;
  const [menu, setMenu] = React.useState(false);
  React.useEffect(() => { if (!drawerMode) setMenu(false); }, [drawerMode]);
  React.useEffect(() => {
    if (!menu) return;
    const esc = e => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [menu]);

  return (
    <div style={{
      position: 'relative', display: 'flex', height, minHeight: 0, overflow: 'hidden',
      background: 'var(--nhr-dark)', border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-float)'
    }}>
      {!drawerMode && <Sidebar active={active} onSelect={setActive} compact={compact} gated={gated} />}

      {drawerMode && (
        <React.Fragment>
          <div onClick={() => setMenu(false)} aria-hidden={!menu} style={{
            position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.62)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            opacity: menu ? 1 : 0, pointerEvents: menu ? 'auto' : 'none',
            transition: 'opacity var(--dur-base) var(--ease-out)'
          }} />
          <div role="dialog" aria-label="Platform menu" aria-modal="true" style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 41, maxWidth: '84%',
            transform: menu ? 'translateX(0)' : 'translateX(-102%)',
            transition: 'transform var(--dur-slow) var(--ease-out)',
            boxShadow: menu ? 'var(--shadow-float)' : 'none', display: 'flex'
          }}>
            <Sidebar drawer active={active} gated={gated}
              onSelect={setActive} onClose={() => setMenu(false)} />
          </div>
        </React.Fragment>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Title uses the nav display name, so the top bar and sidebar cannot
            show two different names for the same screen. */}
        <Topbar title={(APP_NAV.find(n => n.label === active) || {}).name || active} compact={compact} gated={gated}
          showMenu={drawerMode} onMenu={() => setMenu(true)}
          showSearch={!compact && vp.width >= 900}
          showWho={vp.width >= 560}
          onSignOut={() => { if (A) A.signOut(); }} />
        <main id="app-main" tabIndex={-1} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: compact ? 16 : (vp.isMobile ? 16 : 24), background: 'var(--nhr-dark)', outline: 'none' }}>
          {locked ? <ModuleLocked name={active} onChange={force} /> : <Screen compact={compact} name={active} />}
        </main>
      </div>
    </div>
  );
}

/* Global employee search — results open the profile. */
function GlobalSearch() {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  const S = window.EmployeeStore;
  const results = q.length > 1 && S ? S.list({ query: q }).slice(0, 6) : [];
  return (
    <span ref={ref} style={{ position: 'relative', display: 'block' }}>
      <span style={{ position: 'relative', display: 'flex' }}>
        <Icon name="Search" size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted-dark)' }} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          aria-label="Search employees, documents" placeholder="Search employees, documents…"
          style={{
            width: '100%', fontFamily: 'var(--font-core)', fontSize: 13, color: '#fff',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', padding: '10px 12px 10px 34px', outline: 'none'
          }} />
      </span>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 44, left: 0, right: 0, zIndex: 30,
          background: 'rgba(13,17,17,.97)', backdropFilter: 'blur(14px)',
          border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-float)', padding: 6, display: 'flex', flexDirection: 'column'
        }}>
          {results.map(e => (
            <button key={e.id} type="button" onClick={() => {
              setOpen(false); setQ('');
              window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Employees' }));
              setTimeout(() => window.dispatchEvent(new CustomEvent('nhr-open-employee', { detail: e.id })), 60);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', width: '100%',
              background: 'none', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left'
            }}
              onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
              onMouseLeave={ev => { ev.currentTarget.style.background = 'none'; }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flex: '0 0 auto',
                background: 'rgba(0,229,212,.12)', color: 'var(--nhr-turquoise)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
              }}>{S.initials(e).toUpperCase()}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{S.fullName(e)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{e.jobTitle} · {e.department}</span>
              </span>
              <Badge tone={(window.STATUS_TONE || {})[e.employmentStatus] || 'dark'}>{e.employmentStatus}</Badge>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

Object.assign(window, { APP_NAV, Sidebar, SidebarLink, Topbar, AppWindow, GlobalSearch, useViewport, todayLabel });
