import React from 'react';

export function SectionHeading({ eyebrow, title, description, tone = 'light', align = 'left', level = 2, maxWidth = 640, style }) {
  const dark = tone === 'dark';
  const H = 'h' + level;
  const center = align === 'center';
  return (
    <header style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      textAlign: center ? 'center' : 'left',
      alignItems: center ? 'center' : 'flex-start',
      maxWidth: center ? maxWidth : undefined,
      margin: center ? '0 auto' : undefined, ...style
    }}>
      {eyebrow && (
        <span style={{
          fontSize: 'var(--text-eyebrow)', fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase',
          color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)'
        }}>{eyebrow}</span>
      )}
      <H style={{
        margin: 0, fontFamily: 'var(--font-core)', fontSize: 'var(--text-section)',
        fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-heading)',
        lineHeight: 'var(--lh-heading)', textWrap: 'pretty',
        color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)'
      }}>{title}</H>
      {description && (
        <p style={{
          margin: 0, fontSize: 'var(--text-lead)', lineHeight: 'var(--lh-body)',
          maxWidth, color: dark ? 'var(--text-body-dark)' : 'var(--text-body)'
        }}>{description}</p>
      )}
    </header>
  );
}
