import React from 'react';

export function Checkbox({ label, checked = false, onChange, disabled = false, tone = 'light', id }) {
  const dark = tone === 'dark';
  const fieldId = id || 'c-' + String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <label htmlFor={fieldId} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      fontSize: 'var(--text-body-sm)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)'
    }}>
      <input id={fieldId} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 20, height: 20, margin: 0 }} />
      <span aria-hidden="true" style={{
        width: 20, height: 20, borderRadius: 'var(--radius-xs)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? 'var(--nhr-turquoise)' : (dark ? 'rgba(255,255,255,.04)' : 'var(--nhr-white)'),
        border: '1px solid ' + (checked ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'var(--border-subtle)')),
        transition: 'all var(--dur-fast) var(--ease-out)'
      }}>
        {checked && (
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        )}
      </span>
      {label}
    </label>
  );
}
