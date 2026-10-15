import React from 'react';

export function FaqItem({ question, answer, open = false, onToggle, tone = 'light', id }) {
  const dark = tone === 'dark';
  const panelId = (id || 'faq') + '-panel';
  return (
    <div style={{
      borderBottom: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-subtle)'),
      background: 'transparent'
    }}>
      <button
        type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          padding: '22px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-core)', fontSize: 'var(--text-body-md)', fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--tracking-tight)',
          color: open ? (dark ? 'var(--nhr-turquoise)' : 'var(--text-heading)') : (dark ? 'var(--text-heading-dark)' : 'var(--text-heading)'),
          transition: 'color var(--dur-base) var(--ease-out)'
        }}
      >
        {question}
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={open ? '#00E5D4' : (dark ? '#8A9998' : '#8A9998')} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-slow) var(--ease-in-out), stroke var(--dur-base) var(--ease-out)' }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div id={panelId} role="region" style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows var(--dur-slow) var(--ease-in-out)' }}>
        <div style={{ overflow: 'hidden' }}>
          <p style={{
            margin: 0, padding: '0 60px 24px 4px', fontSize: 'var(--text-body-sm)',
            lineHeight: 'var(--lh-relaxed)', color: dark ? 'var(--text-body-dark)' : 'var(--text-body)'
          }}>{answer}</p>
        </div>
      </div>
    </div>
  );
}
