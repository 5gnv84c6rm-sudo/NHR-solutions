import React from 'react';

export function BarChart({ data = [], height = 150, tone = 'dark', showAxis = true, unit = '' }) {
  const dark = tone === 'dark';
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 8, height: '100%' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{d.value}{unit}</span>
            <div title={d.label + ': ' + d.value + unit} style={{
              width: '100%', maxWidth: 34, height: Math.max(4, (d.value / max) * (height - 34)),
              borderRadius: '6px 6px 3px 3px',
              background: d.muted
                ? (dark ? 'rgba(255,255,255,.10)' : 'var(--nhr-line-light)')
                : 'linear-gradient(180deg,var(--nhr-turquoise),rgba(0,229,212,.35))',
              boxShadow: d.muted ? 'none' : '0 0 18px -6px rgba(0,229,212,.7)',
              transition: 'height var(--dur-slow) var(--ease-out)'
            }} />
          </div>
        ))}
      </div>
      {showAxis && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, borderTop: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-subtle)'), paddingTop: 8 }}>
          {data.map(d => (
            <span key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
