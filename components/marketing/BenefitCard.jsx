import React, { useState } from 'react';
import { Card } from '../core/Card.jsx';
import { IconWrapper } from '../core/IconWrapper.jsx';

export function BenefitCard({ icon, term, description, tone = 'light' }) {
  const [hover, setHover] = useState(false);
  const dark = tone === 'dark';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ height: '100%' }}>
      <Card tone={tone} interactive style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <IconWrapper tone={tone} size="sm" highlight={hover}>{icon}</IconWrapper>
        <span style={{ fontSize: 'var(--text-eyebrow)', fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)' }}>{term}</span>
        <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-body)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)' }}>{description}</p>
      </Card>
    </div>
  );
}
