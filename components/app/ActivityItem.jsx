import React from 'react';
import { IconWrapper } from '../core/IconWrapper.jsx';

export function ActivityItem({ icon, title, meta, time, tone = 'dark', divider = true }) {
  const dark = tone === 'dark';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
      borderBottom: divider ? '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-subtle)') : 'none'
    }}>
      {icon && <IconWrapper tone={tone} size="sm">{icon}</IconWrapper>}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 'var(--fw-semibold)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {meta && <span style={{ fontSize: 'var(--text-caption)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)' }}>{meta}</span>}
      </div>
      {time && <span style={{ fontSize: 'var(--text-caption)', fontFamily: 'var(--font-mono)', color: dark ? 'var(--text-muted-dark)' : 'var(--text-muted)', flex: '0 0 auto' }}>{time}</span>}
    </div>
  );
}
