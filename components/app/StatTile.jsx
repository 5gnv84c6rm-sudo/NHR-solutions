import React from 'react';
import { IconWrapper } from '../core/IconWrapper.jsx';

export function StatTile({ label, value, delta, direction = 'up', icon, caption, tone = 'dark' }) {
  const dark = tone === 'dark';
  const up = direction === 'up';
  const deltaColor = up ? 'var(--nhr-turquoise)' : 'var(--nhr-danger)';
  return (
    <div style={{
      background: dark ? 'var(--surface-card-dark)' : 'var(--surface-card)',
      border: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-subtle)'),
      borderRadius: 'var(--radius-card)', padding: 20,
      boxShadow: dark ? 'var(--shadow-inset-hairline)' : 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-semibold)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{label}</span>
        {icon && <IconWrapper tone={tone} size="sm">{icon}</IconWrapper>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-heading)', lineHeight: 1, color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{value}</span>
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-bold)', color: deltaColor }}>
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'rotate(180deg)' }}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
            {delta}
          </span>
        )}
      </div>
      {caption && <span style={{ fontSize: 'var(--text-caption)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{caption}</span>}
    </div>
  );
}
