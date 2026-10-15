/* Shared bits for the Employees module: field controls, avatars, status badges, drawer. */
const { Badge, Button, IconButton, Input, Select, Checkbox, Switch, Card } = window.NHRSolutionDesignSystem_0db691;

const STATUS_TONE = { Active: 'success', 'On Leave': 'warning', Probation: 'dark', Pending: 'warning', Inactive: 'neutral' };
const DOC_TONE = { Valid: 'success', 'Expiring soon': 'warning', Expired: 'danger', 'Pending review': 'dark' };

function StatusBadge({ status }) { return <Badge tone={STATUS_TONE[status] || 'dark'}>{status}</Badge>; }

function Avatar({ employee, size = 36 }) {
  const S = window.EmployeeStore;
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, flex: '0 0 auto', borderRadius: '50%',
      background: 'rgba(0,229,212,.12)', color: 'var(--nhr-turquoise)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '.02em',
      border: '1px solid rgba(0,229,212,.22)'
    }}>{S.initials(employee).toUpperCase() || '—'}</span>
  );
}

/* Dark-surface form field — the product theme's input. */
function Field({ label, required, hint, error, children, span }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: span ? 'span ' + span : undefined, minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(245,255,255,.72)' }}>
        {label}{required && <span style={{ color: 'var(--nhr-turquoise)' }}> *</span>}
      </span>
      {children}
      {/* An error announced only in colour is invisible to a screen reader and
          to anyone who cannot distinguish red. role="alert" makes it spoken,
          and the icon makes it visible without relying on hue. */}
      {(error || hint) && (
        <span role={error ? 'alert' : undefined}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11.5, lineHeight: 1.5, color: error ? 'var(--nhr-danger)' : 'var(--text-muted-dark)' }}>
          {error && <Icon name="TriangleAlert" size={12} style={{ marginTop: 2 }} />}
          <span>{error || hint}</span>
        </span>
      )}
    </label>
  );
}

const inputStyle = (invalid) => ({
  width: '100%', fontFamily: 'var(--font-core)', fontSize: 14, color: '#fff',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid ' + (invalid ? 'var(--nhr-danger)' : 'var(--border-dark)'),
  borderRadius: 'var(--radius-btn)', padding: '11px 13px', outline: 'none',
  transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
});

function TextField({ label, required, hint, error, value, onChange, type = 'text', placeholder, span, mono, disabled }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <Field label={label} required={required} hint={hint} error={error} span={span}>
      <input type={type} value={value || ''} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        aria-invalid={error ? true : undefined}
        style={Object.assign({}, inputStyle(!!error), {
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-core)',
          borderColor: error ? 'var(--nhr-danger)' : focus ? 'var(--nhr-turquoise)' : 'var(--border-dark)',
          boxShadow: focus && !error ? '0 0 0 3px rgba(0,229,212,.18)' : 'none',
          opacity: disabled ? .6 : 1
        })} />
    </Field>
  );
}

function SelectField({ label, required, hint, error, value, onChange, options = [], placeholder = 'Select…', span }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <Field label={label} required={required} hint={hint} error={error} span={span}>
      <select value={value || ''} onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        aria-invalid={error ? true : undefined}
        aria-label={label}
        style={Object.assign({}, inputStyle(!!error), {
          appearance: 'none', cursor: 'pointer', padding: '11px 36px 11px 13px',
          borderColor: error ? 'var(--nhr-danger)' : focus ? 'var(--nhr-turquoise)' : 'var(--border-dark)',
          boxShadow: focus && !error ? '0 0 0 3px rgba(0,229,212,.18)' : 'none',
          backgroundImage: 'linear-gradient(45deg,transparent 50%,#8A9998 50%),linear-gradient(135deg,#8A9998 50%,transparent 50%)',
          backgroundPosition: 'calc(100% - 19px) 19px,calc(100% - 14px) 19px',
          backgroundSize: '5px 5px,5px 5px', backgroundRepeat: 'no-repeat'
        })}>
        <option value="">{placeholder}</option>
        {options.map(o => {
          const v = typeof o === 'string' ? o : o.id || o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </Field>
  );
}

function TextareaField({ label, required, hint, value, onChange, rows = 3, span, placeholder }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <Field label={label} required={required} hint={hint} span={span}>
      <textarea value={value || ''} rows={rows} placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={Object.assign({}, inputStyle(false), {
          resize: 'vertical', lineHeight: 1.6,
          borderColor: focus ? 'var(--nhr-turquoise)' : 'var(--border-dark)',
          boxShadow: focus ? '0 0 0 3px rgba(0,229,212,.18)' : 'none'
        })} />
    </Field>
  );
}

/* Masked sensitive value with a permission-gated reveal. */
function SecureValue({ label, value, masked, permission = 'payroll.read' }) {
  const S = window.EmployeeStore;
  const [shown, setShown] = React.useState(false);
  const allowed = S.can(permission);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: allowed ? '#fff' : 'var(--text-muted-dark)' }}>
          {!allowed ? 'Restricted' : shown ? (value || '—') : (masked || '••••••')}
        </span>
        {allowed && value && (
          <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide ' + label : 'Reveal ' + label}
            style={{ background: 'none', border: 'none', color: 'var(--nhr-turquoise)', cursor: 'pointer', display: 'inline-flex', padding: 0 }}>
            <Icon name={shown ? 'EyeOff' : 'Eye'} size={14} />
          </button>
        )}
      </span>
    </div>
  );
}

/* Right-hand drawer used for Add Employee, Import and Edit. */
function Drawer({ open, onClose, title, subtitle, children, footer, width = 720 }) {
  React.useEffect(() => {
    const esc = e => { if (e.key === 'Escape' && open) onClose && onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  return (
    <div aria-hidden={!open} style={{
      position: 'fixed', inset: 0, zIndex: 70, pointerEvents: open ? 'auto' : 'none'
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.62)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        opacity: open ? 1 : 0, transition: 'opacity var(--dur-slow) var(--ease-out)'
      }} />
      <div role="dialog" aria-modal="true" aria-label={title} className="nhr-drawer" style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: width,
        background: 'var(--nhr-dark)', borderLeft: '1px solid var(--border-dark)',
        boxShadow: '-30px 0 80px -30px rgba(0,0,0,.9)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform var(--dur-slow) var(--ease-emphasis)',
        display: 'flex', flexDirection: 'column', minHeight: 0
      }}>
        <header style={{
          display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px',
          borderBottom: '1px solid var(--border-dark)', flex: '0 0 auto'
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', color: '#fff' }}>{title}</h2>
            {subtitle && <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>{subtitle}</span>}
          </span>
          <IconButton tone="dark" label="Close" onClick={onClose}><Icon name="X" size={18} /></IconButton>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24 }}>{children}</div>
        {footer && (
          <footer style={{
            flex: '0 0 auto', padding: '16px 24px', borderTop: '1px solid var(--border-dark)',
            background: 'rgba(5,5,5,.6)', backdropFilter: 'var(--blur-nav)',
            display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap'
          }}>{footer}</footer>
        )}
      </div>
    </div>
  );
}

/* Small dropdown menu (row "More" actions). */
function Menu({ items = [], label = 'More actions' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <IconButton tone="dark" size={32} label={label} active={open} onClick={() => setOpen(!open)}>
        <Icon name="EllipsisVertical" size={16} />
      </IconButton>
      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 38, zIndex: 20, minWidth: 200,
          background: 'rgba(13,17,17,.97)', backdropFilter: 'blur(14px)',
          border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-float)', padding: 6, display: 'flex', flexDirection: 'column'
        }}>
          {items.map(it => it.divider ? (
            <span key={it.key || Math.random()} style={{ height: 1, background: 'var(--border-dark)', margin: '5px 8px' }} />
          ) : (
            <button key={it.label} type="button" role="menuitem"
              onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
                color: it.danger ? 'var(--nhr-danger)' : 'rgba(245,255,255,.86)',
                fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left', width: '100%'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
              {it.icon && <Icon name={it.icon} size={15} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/* Step rail for the wizard. */
function StepRail({ steps, current, onJump, furthest = 0 }) {
  return (
    <ol className="step-rail" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const done = i < furthest;
        const active = i === current;
        return (
          <li key={s} style={{ flex: 1, minWidth: 96 }}>
            <button type="button" onClick={() => i <= furthest && onJump && onJump(i)} disabled={i > furthest}
              style={{
                width: '100%', textAlign: 'left', background: 'none', cursor: i <= furthest ? 'pointer' : 'default',
                border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 7
              }}>
              <span style={{
                height: 3, borderRadius: 2, width: '100%',
                background: active ? 'var(--nhr-turquoise)' : done ? 'rgba(0,229,212,.45)' : 'rgba(255,255,255,.10)',
                boxShadow: active ? '0 0 12px -2px rgba(0,229,212,.8)' : 'none',
                transition: 'background var(--dur-base) var(--ease-out)'
              }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {done && <Icon name="Check" size={12} style={{ color: 'var(--nhr-turquoise)' }} />}
                <span style={{
                  fontSize: 11.5, fontWeight: active ? 700 : 600,
                  color: active ? '#fff' : done ? 'rgba(245,255,255,.7)' : 'var(--text-muted-dark)'
                }}>{s}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SectionLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nhr-turquoise)' }}>{children}</span>
      {hint && <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{hint}</span>}
    </div>
  );
}

function FormGrid({ children, cols = 2 }) {
  return <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ',1fr)', gap: 16 }}>{children}</div>;
}

function Notice({ icon = 'Info', tone = 'info', children }) {
  const colors = { info: 'rgba(0,229,212,.35)', warn: 'rgba(242,180,65,.4)', danger: 'rgba(242,84,91,.4)' };
  const fg = { info: 'var(--nhr-turquoise)', warn: 'var(--nhr-warning)', danger: 'var(--nhr-danger)' };
  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-start', padding: '13px 15px',
      border: '1px solid ' + colors[tone], borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,.03)'
    }}>
      <Icon name={icon} size={16} style={{ color: fg[tone], marginTop: 1 }} />
      <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{children}</span>
    </div>
  );
}

/* CSV download used by Export and the import template. Payroll columns are
   omitted unless the current role may read payroll. */
function downloadCsv(filename, columns, rows) {
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [columns.map(c => esc(c.label)).join(',')]
    .concat(rows.map(r => columns.map(c => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(',')))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportEmployees(list) {
  const S = window.EmployeeStore;
  const name = e => [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
  const manager = e => { const m = e.managerId && S.get(e.managerId); return m ? [m.firstName, m.lastName].join(' ') : ''; };
  const columns = [
    { label: 'Employee ID', key: 'employeeId' }, { label: 'Full name', get: name },
    { label: 'Preferred name', key: 'preferredName' }, { label: 'Job title', key: 'jobTitle' },
    { label: 'Department', key: 'department' }, { label: 'Location', key: 'location' },
    { label: 'Manager', get: manager }, { label: 'Employment type', key: 'employmentType' },
    { label: 'Status', key: 'employmentStatus' }, { label: 'Start date', key: 'startDate' },
    { label: 'Working pattern', key: 'workingPattern' }, { label: 'Hours per week', key: 'hoursPerWeek' },
    { label: 'Annual leave', key: 'annualLeaveEntitlement' }, { label: 'Work email', key: 'workEmail' },
    { label: 'Personal email', key: 'personalEmail' }, { label: 'Mobile', key: 'mobile' },
    { label: 'Cost centre', key: 'costCentre' }
  ];
  if (S.can('payroll.read')) columns.push(
    { label: 'Pay frequency', get: e => e.payroll && e.payroll.payFrequency },
    { label: 'Salary', get: e => e.payroll && e.payroll.salary },
    { label: 'Tax code', get: e => e.payroll && e.payroll.taxCode }
  );
  downloadCsv('nhr-employees-' + new Date().toISOString().slice(0, 10) + '.csv', columns, list);
  return { rows: list.length, payroll: S.can('payroll.read') };
}

Object.assign(window, { downloadCsv, exportEmployees, STATUS_TONE, DOC_TONE, StatusBadge, Avatar, Field, TextField, SelectField, TextareaField, SecureValue, Drawer, Menu, StepRail, SectionLabel, FormGrid, Notice, inputStyle });
