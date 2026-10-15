import React from 'react';

export function DashboardCard({ title, action, children, padding = 20, style, tone = 'dark' }) {
  const dark = tone === 'dark';
  return (
    <section style={{
      background: dark ? 'var(--surface-card-dark)' : 'var(--surface-card)',
      border: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-subtle)'),
      borderRadius: 'var(--radius-card)',
      boxShadow: dark ? 'var(--shadow-inset-hairline)' : 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', ...style
    }}>
      {(title || action) && (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: padding + 'px ' + padding + 'px 0'
        }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-tight)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)' }}>{title}</h3>
          {action}
        </header>
      )}
      <div style={{ padding, flex: 1, minWidth: 0 }}>{children}</div>
    </section>
  );
}
