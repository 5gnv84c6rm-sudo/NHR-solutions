import React, { useState } from 'react';

export function IconButton({ children, label, tone = 'light', size = 40, active = false, onClick, ...rest }) {
  const [hover, setHover] = useState(false);
  const dark = tone === 'dark';
  const on = hover || active;
  return (
    <button
      type="button" aria-label={label} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        background: on ? (dark ? 'rgba(0,229,212,.12)' : 'var(--nhr-soft-turquoise)') : (dark ? 'rgba(255,255,255,.04)' : 'transparent'),
        border: '1px solid ' + (on ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'var(--border-subtle)')),
        color: on ? (dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)') : (dark ? 'var(--nhr-white)' : 'var(--text-heading)'),
        transition: 'all var(--dur-base) var(--ease-out)'
      }}
      {...rest}
    >{children}</button>
  );
}
