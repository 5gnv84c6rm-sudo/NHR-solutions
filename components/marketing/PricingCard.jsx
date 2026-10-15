import React from 'react';
import { Card } from '../core/Card.jsx';
import { Badge } from '../core/Badge.jsx';
import { Button } from '../core/Button.jsx';

export function PricingCard({
  name, blurb, price, period = '/month', features = [],
  featured = false, ctaLabel = 'Get Started', badgeLabel = 'Most Popular', onSelect, tone = 'light'
}) {
  const dark = featured || tone === 'dark';
  return (
    <Card
      tone={dark ? 'dark' : 'light'}
      padding="var(--card-padding-lg)"
      radius={featured ? 'var(--radius-lg)' : 'var(--radius-card)'}
      style={{
        height: '100%', display: 'flex', flexDirection: 'column', gap: 22,
        position: 'relative',
        borderColor: featured ? 'var(--nhr-turquoise)' : undefined,
        boxShadow: featured ? 'var(--shadow-glow-card)' : undefined,
        transform: featured ? 'translateY(-8px)' : undefined
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 'var(--text-eyebrow)', fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)' }}>{name}</span>
        {featured && <Badge tone="turquoise" uppercase>{badgeLabel}</Badge>}
      </div>
      {blurb && <p style={{ margin: 0, fontSize: 'var(--text-body-sm)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)' }}>{blurb}</p>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 44, fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-heading)', lineHeight: 1, color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{price}</span>
        {period && <span style={{ fontSize: 'var(--text-body-sm)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{period}</span>}
      </div>
      <div style={{ height: 1, background: dark ? 'var(--border-dark)' : 'var(--border-subtle)' }} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {features.map((ft) => (
          <li key={ft} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-body-sm)', lineHeight: 'var(--lh-snug)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)' }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#00E5D4' : '#00BFB2'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flex: '0 0 auto' }}><path d="M20 6 9 17l-5-5" /></svg>
            {ft}
          </li>
        ))}
      </ul>
      <Button variant={featured ? 'primary' : 'secondary'} tone={dark ? 'dark' : 'light'} fullWidth onClick={onSelect}>{ctaLabel}</Button>
    </Card>
  );
}
