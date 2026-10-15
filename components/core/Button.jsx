import React, { useState } from 'react';

const SIZES = {
  sm: { padding: '9px 16px', fontSize: 14, gap: 7 },
  md: { padding: '13px 22px', fontSize: 15, gap: 8 },
  lg: { padding: '16px 30px', fontSize: 17, gap: 10 }
};

export function Button({
  children, variant = 'primary', size = 'md', tone = 'light',
  iconLeft, iconRight, fullWidth = false, disabled = false,
  href, onClick, type = 'button', ariaLabel, ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const dark = tone === 'dark';

  const base = {
    display: fullWidth ? 'flex' : 'inline-flex',
    width: fullWidth ? '100%' : undefined,
    alignItems: 'center', justifyContent: 'center', gap: s.gap,
    padding: s.padding, fontSize: s.fontSize,
    fontFamily: 'var(--font-core)', fontWeight: 'var(--fw-bold)',
    letterSpacing: 'var(--tracking-tight)', lineHeight: 1.1,
    borderRadius: 'var(--radius-btn)', border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
    transform: disabled ? 'none' : press ? 'translateY(0) scale(var(--press-scale))' : hover ? 'translateY(-2px)' : 'none',
    opacity: disabled ? (variant === 'primary' ? 0.35 : 0.45) : 1
  };

  const variants = {
    primary: {
      background: hover && !disabled ? 'var(--action-primary-bg-hover)' : 'var(--action-primary-bg)',
      color: 'var(--action-primary-fg)',
      boxShadow: disabled ? 'none' : hover ? 'var(--shadow-glow-btn-hover)' : 'var(--shadow-glow-btn)'
    },
    secondary: {
      background: hover && !disabled ? (dark ? 'rgba(0,229,212,.10)' : 'rgba(0,229,212,.07)') : 'transparent',
      color: hover && !disabled ? (dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)') : (dark ? 'var(--nhr-white)' : 'var(--text-heading)'),
      borderColor: hover && !disabled ? 'var(--nhr-turquoise)' : (dark ? 'rgba(255,255,255,.38)' : 'var(--border-subtle)')
    },
    ghost: {
      background: 'transparent', padding: 0,
      color: hover && !disabled ? (dark ? 'var(--nhr-turquoise-bright)' : 'var(--text-heading)') : (dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)')
    }
  };

  const style = { ...base, ...(variants[variant] || variants.primary) };
  const arrow = iconRight ? (
    <span style={{ display: 'inline-flex', transition: 'transform var(--dur-base) var(--ease-out)', transform: hover && !disabled ? 'translateX(3px)' : 'none' }}>{iconRight}</span>
  ) : null;

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => { setHover(false); setPress(false); },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    onClick: disabled ? undefined : onClick,
    style, 'aria-label': ariaLabel, ...rest
  };

  if (href && !disabled) return <a href={href} {...handlers}>{iconLeft}{children}{arrow}</a>;
  return <button type={type} disabled={disabled} aria-disabled={disabled || undefined} {...handlers}>{iconLeft}{children}{arrow}</button>;
}
