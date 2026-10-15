import React, { useState } from 'react';
import { Card } from '../core/Card.jsx';
import { IconWrapper } from '../core/IconWrapper.jsx';

export function SolutionCard({ icon, title, description, href = '#', linkLabel = 'Learn More', tone = 'light' }) {
  const [hover, setHover] = useState(false);
  const dark = tone === 'dark';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ height: '100%' }}>
      <Card tone={tone} interactive padding="var(--card-padding-lg)" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <IconWrapper tone={tone} highlight={hover}>{icon}</IconWrapper>
        <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-tight)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)', flex: 1 }}>{description}</p>
        <a href={href} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-bold)',
          color: dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)', textDecoration: 'none'
        }}>
          {linkLabel}
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hover ? 'translateX(3px)' : 'none', transition: 'transform var(--dur-base) var(--ease-out)' }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </a>
      </Card>
    </div>
  );
}
