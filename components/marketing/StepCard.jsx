import React from 'react';

export function StepCard({ number, title, description, tone = 'light', last = false, orientation = 'horizontal' }) {
  const dark = tone === 'dark';
  const horizontal = orientation === 'horizontal';
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: horizontal ? 24 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          width: 52, height: 52, borderRadius: '50%', flex: '0 0 auto',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? 'rgba(0,229,212,.10)' : 'var(--nhr-soft-turquoise)',
          border: '1px solid ' + (dark ? 'var(--border-dark)' : 'transparent'),
          color: dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)',
          fontSize: 18, fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-tight)'
        }}>{number}</span>
        {!last && <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(0,229,212,.55),' + (dark ? 'rgba(255,255,255,.06)' : 'rgba(0,229,212,.08)') + ')' }} />}
      </div>
      <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-tight)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)', maxWidth: 320, color: dark ? 'var(--text-body-dark)' : 'var(--text-body)' }}>{description}</p>
    </div>
  );
}
