import React from 'react';

const SIZES = { sm: 40, md: 48, lg: 56 };

export function IconWrapper({ children, tone = 'light', size = 'md', highlight = false, style }) {
  const dark = tone === 'dark';
  const px = SIZES[size] || SIZES.md;
  return (
    <span style={{
      width: px, height: px, flex: '0 0 auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      background: dark ? 'rgba(255,255,255,.06)' : 'var(--nhr-soft-turquoise)',
      border: '1px solid ' + (highlight ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'transparent')),
      color: dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)',
      boxShadow: highlight ? 'var(--shadow-glow-card)' : 'none',
      transition: 'all var(--dur-base) var(--ease-out)', ...style
    }}>{children}</span>
  );
}
