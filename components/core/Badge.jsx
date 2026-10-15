import React from 'react';

const TONES = {
  turquoise: { background: 'var(--nhr-turquoise)', color: '#000', border: 'transparent' },
  soft: { background: 'var(--nhr-soft-turquoise)', color: 'var(--nhr-turquoise-deep)', border: 'transparent' },
  outline: { background: 'transparent', color: 'var(--text-accent)', border: 'var(--nhr-turquoise)' },
  dark: { background: 'rgba(0,229,212,.10)', color: 'var(--nhr-turquoise)', border: 'var(--border-dark)' },
  success: { background: 'rgba(18,196,139,.12)', color: 'var(--nhr-success)', border: 'transparent' },
  warning: { background: 'rgba(242,180,65,.14)', color: '#C4881B', border: 'transparent' },
  danger: { background: 'rgba(242,84,91,.12)', color: 'var(--nhr-danger)', border: 'transparent' },
  neutral: { background: 'var(--nhr-light-2)', color: 'var(--text-body)', border: 'transparent' }
};

export function Badge({ children, tone = 'soft', uppercase = false, icon }) {
  const t = TONES[tone] || TONES.soft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: uppercase ? '6px 12px' : '5px 11px',
      borderRadius: 'var(--radius-pill)',
      background: t.background, color: t.color, border: '1px solid ' + t.border,
      fontFamily: 'var(--font-core)', fontWeight: 'var(--fw-bold)',
      fontSize: uppercase ? 'var(--text-eyebrow)' : 'var(--text-caption)',
      letterSpacing: uppercase ? 'var(--tracking-eyebrow)' : 'var(--tracking-normal)',
      textTransform: uppercase ? 'uppercase' : 'none', lineHeight: 1.2, whiteSpace: 'nowrap'
    }}>{icon}{children}</span>
  );
}
