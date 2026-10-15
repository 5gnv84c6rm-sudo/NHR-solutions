import React from 'react';

export function ProgressMeter({ label, value = 0, valueLabel, tone = 'dark', height = 8 }) {
  const dark = tone === 'dark';
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(label || valueLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--text-caption)' }}>
          <span style={{ color: dark ? 'var(--text-body-dark)' : 'var(--text-body)', fontWeight: 'var(--fw-semibold)' }}>{label}</span>
          <span style={{ color: dark ? 'var(--nhr-turquoise)' : 'var(--text-accent)', fontWeight: 'var(--fw-bold)', fontFamily: 'var(--font-mono)' }}>{valueLabel || pct + '%'}</span>
        </div>
      )}
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} style={{
        height, borderRadius: 'var(--radius-pill)',
        background: dark ? 'rgba(255,255,255,.08)' : 'var(--nhr-line-light)', overflow: 'hidden'
      }}>
        <div style={{
          width: pct + '%', height: '100%', borderRadius: 'var(--radius-pill)',
          background: 'linear-gradient(90deg,var(--nhr-turquoise-deep),var(--nhr-turquoise))',
          boxShadow: '0 0 14px -2px rgba(0,229,212,.65)',
          transition: 'width var(--dur-slow) var(--ease-out)'
        }} />
      </div>
    </div>
  );
}
