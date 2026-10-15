/* Employees module root: summary cards, toolbar, table/cards, pagination, empty state. */
const { Button, Badge, Card, IconButton, StatTile, DashboardCard, Switch } = window.NHRSolutionDesignSystem_0db691;

const PAGE_SIZE = 8;

function SummaryCards({ counts, onFilter }) {
  const items = [
    ['Total Employees', counts.total, 'Users', null],
    ['Active', counts.active, 'UserCheck', 'Active'],
    ['On Leave', counts.onLeave, 'Plane', 'On Leave'],
    ['New Starters', counts.newStarters, 'UserPlus', null],
    ['Pending Information', counts.pendingInfo, 'TriangleAlert', 'Pending']
  ];
  return (
    <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
      {items.map(([label, value, icon, status]) => (
        <button key={label} type="button" onClick={() => onFilter && onFilter(status)}
          style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: status ? 'pointer' : 'default', minWidth: 0 }}>
          <StatTile label={label} value={value} icon={<Icon name={icon} size={17} />} />
        </button>
      ))}
    </div>
  );
}

function Toolbar({ query, setQuery, dept, setDept, status, setStatus, type, setType, sortBy, setSortBy, sortDir, setSortDir, onReset, resultCount }) {
  const S = window.EmployeeStore;
  const [showFilters, setShowFilters] = React.useState(false);
  const active = (dept !== 'All' ? 1 : 0) + (status !== 'All' ? 1 : 0) + (type !== 'All' ? 1 : 0);
  return (
    <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="toolbar-row" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 220, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search employees"
            placeholder="Search by name, employee ID or email"
            style={Object.assign({}, window.inputStyle(false), { paddingLeft: 38 })} />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 11, top: 11, background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', display: 'inline-flex' }}>
              <Icon name="X" size={15} />
            </button>
          )}
        </span>
        <Button size="sm" variant={showFilters || active ? 'primary' : 'secondary'} tone="dark"
          onClick={() => setShowFilters(!showFilters)} iconLeft={<Icon name="SlidersHorizontal" size={15} />}>
          Filter{active ? ' (' + active + ')' : ''}
        </Button>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort by"
            style={Object.assign({}, window.inputStyle(false), { appearance: 'none', width: 'auto', padding: '10px 12px', fontSize: 13, cursor: 'pointer' })}>
            <option value="name">Sort: Name</option>
            <option value="startDate">Sort: Start date</option>
            <option value="department">Sort: Department</option>
          </select>
          <IconButton tone="dark" size={38} label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
            <Icon name={sortDir === 'asc' ? 'ArrowUpNarrowWide' : 'ArrowDownWideNarrow'} size={16} />
          </IconButton>
        </span>
      </div>
      {showFilters && (
        <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr) auto', gap: 12, alignItems: 'end', paddingTop: 4, borderTop: '1px solid var(--border-dark)' }}>
          <SelectField label="Department" value={dept} onChange={setDept} options={['All'].concat(S.DEPARTMENTS)} placeholder="All departments" />
          <SelectField label="Employment status" value={status} onChange={setStatus} options={['All'].concat(S.STATUSES)} placeholder="All statuses" />
          <SelectField label="Employment type" value={type} onChange={setType} options={['All'].concat(S.EMPLOYMENT_TYPES)} placeholder="All types" />
          <Button size="sm" variant="ghost" tone="dark" onClick={onReset}>Clear all</Button>
        </div>
      )}
      <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{resultCount} {resultCount === 1 ? 'employee' : 'employees'} shown</span>
    </Card>
  );
}

function EmptyState({ onAdd, onImport }) {
  return (
    <Card tone="dark" padding="var(--card-padding-lg)" style={{ position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(../../assets/pattern-dots-tl.png)', backgroundSize: '260px auto',
        backgroundRepeat: 'no-repeat', backgroundPosition: '-60px -70px',
        WebkitMaskImage: 'radial-gradient(110% 110% at 0% 0%,#000,transparent 70%)',
        maskImage: 'radial-gradient(110% 110% at 0% 0%,#000,transparent 70%)',
        mixBlendMode: 'screen', opacity: .4, pointerEvents: 'none'
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', width: 420, height: 420, right: -120, bottom: -240,
        background: 'radial-gradient(circle,rgba(0,229,212,.16),transparent 62%)', pointerEvents: 'none'
      }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '48px 20px' }}>
        <img src="../../assets/logo-mark-light.png" alt="" style={{ width: 56, opacity: .95 }} />
        <h3 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Start building your team</h3>
        <p style={{ margin: 0, maxWidth: 460, fontSize: 15, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Add your first employee to begin managing HR, holidays, attendance, documents and more.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button onClick={onAdd} iconLeft={<Icon name="Plus" size={18} />}>Add Your First Employee</Button>
          <Button variant="secondary" tone="dark" onClick={onImport} iconLeft={<Icon name="Upload" size={17} />}>Import Employees</Button>
        </div>
      </div>
    </Card>
  );
}

function rowMenu(S, e, open, refresh) {
  return [
    { label: 'View employee', icon: 'Eye', onClick: () => open(e.id) },
    { label: 'Edit employee', icon: 'Pencil', onClick: () => open(e.id, 'edit') },
    { label: 'Add document', icon: 'Upload', onClick: () => open(e.id, 'documents') },
    { label: 'Add note', icon: 'StickyNote', onClick: () => open(e.id, 'notes') },
    { divider: true, key: 'd1' },
    { label: 'Change status to Active', icon: 'CircleCheck', onClick: () => { S.setStatus(e.id, 'Active'); refresh(); } },
    { label: 'Change status to On Leave', icon: 'Plane', onClick: () => { S.setStatus(e.id, 'On Leave'); refresh(); } },
    { label: 'Assign manager', icon: 'UserCog', onClick: () => open(e.id, 'edit') },
    { divider: true, key: 'd2' },
    { label: 'Archive employee', icon: 'Archive', danger: true, onClick: () => { S.archive(e.id); refresh(); } }
  ];
}

function EmployeeTable({ list, managerName, onOpen, refresh }) {
  const S = window.EmployeeStore;
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 940, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Employee', 'Employee ID', 'Job title', 'Department', 'Type', 'Start date', 'Manager', 'Status', ''].map(h => (
              <th key={h} scope="col" style={{
                textAlign: h === '' ? 'right' : 'left', padding: '13px 12px',
                fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)', whiteSpace: 'nowrap'
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map(e => (
            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={ev => { if (!ev.target.closest('button')) onOpen(e.id); }}>
              <td style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {e.profilePhoto
                    ? <img src={e.profilePhoto} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                    : <Avatar employee={e} size={34} />}
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{S.fullName(e)}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)', whiteSpace: 'nowrap' }}>{e.workEmail || e.personalEmail}</span>
                  </span>
                </span>
              </td>
              <td style={{ padding: '12px', fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{e.employeeId}</td>
              <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{e.jobTitle}</td>
              <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{e.department}</td>
              <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{e.employmentType}</td>
              <td style={{ padding: '12px', fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{e.startDate}</td>
              <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-body-dark)', borderBottom: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap' }}>{managerName(e)}</td>
              <td style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,.05)' }}><StatusBadge status={e.employmentStatus} /></td>
              <td style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,.05)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" tone="dark" onClick={() => onOpen(e.id)}>View</Button>
                  {S.can('employees.write') && <Button size="sm" variant="ghost" tone="dark" onClick={() => onOpen(e.id, 'edit')}>Edit</Button>}
                  <Menu items={rowMenu(S, e, onOpen, refresh)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeCards({ list, onOpen, refresh }) {
  const S = window.EmployeeStore;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {list.map(e => (
        <Card key={e.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {e.profilePhoto
              ? <img src={e.profilePhoto} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
              : <Avatar employee={e} size={42} />}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{S.fullName(e)}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{e.jobTitle} · {e.department}</span>
              <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{e.employeeId}</span>
            </span>
            <StatusBadge status={e.employmentStatus} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" fullWidth onClick={() => onOpen(e.id)}>View</Button>
            {S.can('employees.write') && <Button size="sm" variant="secondary" tone="dark" fullWidth onClick={() => onOpen(e.id, 'edit')}>Edit</Button>}
            <Menu items={rowMenu(S, e, onOpen, refresh)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Pagination({ page, pages, onPage, total }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
        Page {page + 1} of {pages} · {total} records
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <IconButton tone="dark" size={34} label="Previous page" onClick={() => onPage(Math.max(0, page - 1))}><Icon name="ChevronLeft" size={16} /></IconButton>
        {Array.from({ length: pages }).slice(0, 7).map((_, i) => (
          <button key={i} type="button" onClick={() => onPage(i)} aria-current={i === page ? 'page' : undefined} style={{
            minWidth: 34, height: 34, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            border: '1px solid ' + (i === page ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
            background: i === page ? 'rgba(0,229,212,.12)' : 'transparent',
            color: i === page ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.7)',
            fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: 700
          }}>{i + 1}</button>
        ))}
        <IconButton tone="dark" size={34} label="Next page" onClick={() => onPage(Math.min(pages - 1, page + 1))}><Icon name="ChevronRight" size={16} /></IconButton>
      </div>
    </div>
  );
}

function RoleSwitcher() {
  const S = window.EmployeeStore;
  return (
    <Card tone="dark" padding={14} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
        <Icon name="ShieldCheck" size={15} style={{ color: 'var(--nhr-turquoise)' }} />
        Viewing as
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {S.ROLES.map(r => (
          <button key={r} type="button" onClick={() => S.setRole(r)} style={{
            padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            border: '1px solid ' + (S.session.role === r ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
            background: S.session.role === r ? 'rgba(0,229,212,.12)' : 'transparent',
            color: S.session.role === r ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.7)',
            fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: 700
          }}>{r}</button>
        ))}
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)', flex: 1, minWidth: 200 }}>
        Role changes what this screen can see and edit — payroll, notes and the full directory are permission-gated.
      </span>
    </Card>
  );
}

function EmployeesModule({ compact }) {
  const S = window.EmployeeStore;
  const [, force] = React.useState(0);
  const refresh = () => force(n => n + 1);
  React.useEffect(() => S.subscribe(refresh), []);

  const [view, setView] = React.useState({ name: 'list', id: null });
  const [wizard, setWizard] = React.useState(false);
  const [importer, setImporter] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [dept, setDept] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const [type, setType] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('name');
  const [sortDir, setSortDir] = React.useState('asc');
  const [page, setPage] = React.useState(0);
  const [exported, setExported] = React.useState(null);

  React.useEffect(() => {
    const open = e => setView({ name: 'profile', id: e.detail });
    const openWizard = () => setWizard(true);
    window.addEventListener('nhr-open-employee', open);
    window.addEventListener('nhr-open-wizard', openWizard);
    return () => { window.removeEventListener('nhr-open-employee', open); window.removeEventListener('nhr-open-wizard', openWizard); };
  }, []);
  React.useEffect(() => { setPage(0); }, [query, dept, status, type, sortBy, sortDir]);

  const all = S.list({ query, department: dept, status, type, sortBy, sortDir });
  const counts = S.counts();
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageRows = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const managerName = e => { const m = e.managerId ? S.get(e.managerId) : null; return m ? S.fullName(m) : '—'; };
  const openProfile = (id) => setView({ name: 'profile', id });
  const totalRecords = S.list({}).length;

  if (view.name === 'profile') {
    return (
      <React.Fragment>
        <EmployeeProfile employeeId={view.id} onBack={() => setView({ name: 'list' })} onEdit={() => setWizard(false)} />
        <EmployeeWizard open={wizard} onClose={() => setWizard(false)} onCreated={refresh} />
      </React.Fragment>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Employees</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body-dark)', maxWidth: 560 }}>
            Manage your people, employee records and HR information in one secure place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setImporter(true)} iconLeft={<Icon name="Upload" size={15} />}>Import</Button>
          <Button variant="secondary" tone="dark" size="sm" iconLeft={<Icon name="Download" size={15} />}
            onClick={() => { const r = window.exportEmployees(all); setExported(r); setTimeout(() => setExported(null), 5000); }}>Export</Button>
          {S.can('employees.write') && <Button size="sm" onClick={() => setWizard(true)} iconLeft={<Icon name="Plus" size={16} />}>Add New Employee</Button>}
        </div>
      </div>

      <RoleSwitcher />

      {exported && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'rgba(0,229,212,.10)', border: '1px solid rgba(0,229,212,.30)', fontSize: 13.5, color: 'var(--nhr-turquoise)' }}>
          <Icon name="CircleCheck" size={16} />
          <span>Exported {exported.rows} {exported.rows === 1 ? 'record' : 'records'} to CSV{exported.payroll ? ' (payroll columns included)' : ' — payroll columns excluded for your role'}.</span>
        </div>
      )}

      {totalRecords === 0 ? (
        <EmptyState onAdd={() => setWizard(true)} onImport={() => setImporter(true)} />
      ) : (
        <React.Fragment>
          <SummaryCards counts={counts} onFilter={s => { if (s) { setStatus(s); } }} />
          <Toolbar query={query} setQuery={setQuery} dept={dept} setDept={setDept} status={status} setStatus={setStatus}
            type={type} setType={setType} sortBy={sortBy} setSortBy={setSortBy} sortDir={sortDir} setSortDir={setSortDir}
            resultCount={all.length}
            onReset={() => { setDept('All'); setStatus('All'); setType('All'); setQuery(''); }} />
          {all.length === 0 ? (
            <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <Icon name="SearchX" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>No employees match those filters</span>
              <span style={{ fontSize: 14, color: 'var(--text-body-dark)' }}>Try a different search term, or clear the filters to see everyone.</span>
              <Button size="sm" variant="secondary" tone="dark" onClick={() => { setDept('All'); setStatus('All'); setType('All'); setQuery(''); }}>Clear filters</Button>
            </Card>
          ) : (
            <React.Fragment>
              <Card tone="dark" padding={0} style={{ overflow: 'hidden' }}>
                <div className="table-only"><EmployeeTable list={pageRows} managerName={managerName} onOpen={openProfile} refresh={refresh} /></div>
                <div className="cards-only" style={{ display: 'none', padding: 12 }}><EmployeeCards list={pageRows} onOpen={openProfile} refresh={refresh} /></div>
              </Card>
              <Pagination page={page} pages={pages} onPage={setPage} total={all.length} />
            </React.Fragment>
          )}
        </React.Fragment>
      )}

      <EmployeeWizard open={wizard} onClose={() => setWizard(false)} onCreated={refresh} />
      <EmployeeImport open={importer} onClose={() => setImporter(false)} onImported={refresh} />
    </div>
  );
}

/* Dashboard widget for the Overview screen. */
function EmployeesWidget({ onViewAll, onAdd }) {
  const S = window.EmployeeStore;
  const [, force] = React.useState(0);
  React.useEffect(() => S.subscribe(() => force(n => n + 1)), []);
  const c = S.counts();
  return (
    <DashboardCard title="Employees" action={<Badge tone="dark">+{c.newStarters} new</Badge>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>{c.total}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>total</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[['Active', c.active], ['On Leave', c.onLeave], ['Probation', c.probation]].map(([l, v]) => (
            <span key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--nhr-turquoise)' }}>{v}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{l}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" tone="dark" fullWidth onClick={onViewAll}>View All Employees</Button>
          {S.can('employees.write') && <Button size="sm" fullWidth onClick={onAdd} iconLeft={<Icon name="Plus" size={15} />}>Add</Button>}
        </div>
      </div>
    </DashboardCard>
  );
}

Object.assign(window, { EmployeesModule, EmployeesWidget, SummaryCards, Toolbar, EmptyState, EmployeeTable, EmployeeCards, Pagination, RoleSwitcher });
