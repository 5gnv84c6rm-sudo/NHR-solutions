import React from 'react';

export function Switch({ label, checked = false, onChange, disabled = false, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-semibold)',
      color: dark ? 'var(--text-body-dark)' : 'var(--text-heading)'
    }}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 44, height: 24, margin: 0 }} />
      <span aria-hidden="true" style={{
        width: 44, height: 24, borderRadius: 'var(--radius-pill)', padding: 3,
        display: 'inline-flex', alignItems: 'center',
        background: checked ? 'var(--nhr-turquoise)' : (dark ? 'rgba(255,255,255,.12)' : 'var(--nhr-line-light)'),
        boxShadow: checked ? 'var(--shadow-glow-btn)' : 'none',
        transition: 'background var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%',
          background: checked ? '#000' : (dark ? '#8A9998' : '#fff'),
          boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform var(--dur-base) var(--ease-out)'
        }} />
      </span>
      {label}
    </label>
  );
}
