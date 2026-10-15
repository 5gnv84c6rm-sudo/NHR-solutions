import React, { useState } from 'react';

export function Select({ label, id, options = [], value, onChange, placeholder = 'Select…', disabled = false, tone = 'light', helper }) {
  const [focus, setFocus] = useState(false);
  const dark = tone === 'dark';
  const fieldId = id || (label ? 's-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <label htmlFor={fieldId} style={{ fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-semibold)', color: dark ? 'var(--text-body-dark)' : 'var(--text-heading)' }}>{label}</label>}
      <select
        id={fieldId} value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          appearance: 'none', width: '100%', fontFamily: 'var(--font-core)',
          fontSize: 'var(--text-body-sm)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)',
          background: (dark ? 'rgba(255,255,255,.04)' : 'var(--nhr-white)'),
          border: '1px solid ' + (focus ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'var(--border-subtle)')),
          borderRadius: 'var(--radius-btn)', padding: '13px 40px 13px 14px',
          boxShadow: focus ? '0 0 0 3px rgba(0,229,212,.20)' : 'none', outline: 'none',
          backgroundImage: 'linear-gradient(45deg,transparent 50%,' + (dark ? '#8A9998' : '#8A9998') + ' 50%),linear-gradient(135deg,#8A9998 50%,transparent 50%)',
          backgroundPosition: 'calc(100% - 20px) 22px,calc(100% - 15px) 22px',
          backgroundSize: '5px 5px,5px 5px', backgroundRepeat: 'no-repeat',
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
      {helper && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>{helper}</span>}
    </div>
  );
}
