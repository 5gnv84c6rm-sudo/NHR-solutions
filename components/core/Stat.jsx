import React from 'react';

export function Stat({ value, label, tone = 'light', size = 'md', align = 'left' }) {
  const dark = tone === 'dark';
  const fs = size === 'lg' ? 56 : size === 'sm' ? 30 : 44;
  return (
    <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-core)', fontSize: fs, fontWeight: 'var(--fw-extrabold)',
        letterSpacing: 'var(--tracking-heading)', lineHeight: 1,
        color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)'
      }}>{value}</span>
      <span style={{
        fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-medium)',
        color: dark ? 'var(--text-body-dark)' : 'var(--text-body)'
      }}>{label}</span>
    </div>
  );
}
