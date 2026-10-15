import React from 'react';
import { Card } from '../core/Card.jsx';

function Stars({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }} aria-label={count + ' out of 5'}>
      {Array.from({ length: count }).map((_, i) => (
        <svg aria-hidden="true" key={i} width="16" height="16" viewBox="0 0 24 24" fill="#00E5D4" stroke="none"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" /></svg>
      ))}
    </div>
  );
}

export function TestimonialCard({ quote, name, role, company, rating = 5, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <Card tone={tone} padding="var(--card-padding-lg)" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Stars count={rating} />
      <p style={{ margin: 0, fontSize: 'var(--text-body-md)', lineHeight: 'var(--lh-body)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)', flex: 1 }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <span style={{
          width: 40, height: 40, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? 'rgba(0,229,212,.12)' : 'var(--nhr-soft-turquoise)',
          color: dark ? 'var(--nhr-turquoise)' : 'var(--nhr-turquoise-deep)',
          fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-bold)'
        }}>{String(name || '').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-bold)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{name}</span>
          <span style={{ fontSize: 'var(--text-caption)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{role}{company ? ', ' + company : ''}</span>
        </span>
      </div>
    </Card>
  );
}
