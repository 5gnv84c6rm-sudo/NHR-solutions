import React, { useState } from 'react';

export function Card({ children, tone = 'light', interactive = false, padding, radius, style, onClick, as = 'div', ...rest }) {
  const [hover, setHover] = useState(false);
  const dark = tone === 'dark';
  const on = interactive && hover;
  const Tag = as;
  return (
    <Tag
      {...rest}
      onClick={onClick}
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        background: dark ? (on ? 'var(--surface-card-dark-hover)' : 'var(--surface-card-dark)') : 'var(--surface-card)',
        border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'var(--border-subtle)')),
        borderRadius: radius || 'var(--radius-card)',
        padding: padding || 'var(--card-padding)',
        boxShadow: on
          ? 'var(--shadow-glow-card)'
          : (dark ? 'var(--shadow-inset-hairline)' : 'var(--shadow-card)'),
        color: dark ? 'var(--text-body-dark)' : 'var(--text-body)',
        transform: on ? 'translateY(var(--lift-hover))' : 'none',
        transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)',
        cursor: onClick ? 'pointer' : undefined,
        ...style
      }}
    >{children}</Tag>
  );
}
