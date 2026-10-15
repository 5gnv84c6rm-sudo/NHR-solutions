import React from 'react';

/* Below `cardsAt` a table stops being a table. Horizontal scrolling inside a
   card is the worst of both worlds on a phone — the columns are still too
   narrow to read and the gesture fights the page scroll — so each row becomes
   a stacked card instead: the first column is the heading, the rest are
   label/value pairs. Semantics stay honest (it is no longer a <table>, so it
   is not announced as one with the wrong shape).

   Set cardsAt={0} to keep a real table at every width — right for a genuine
   matrix where the grid itself carries meaning. */
function useNarrow(px) {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window !== 'undefined' && px > 0 ? window.innerWidth < px : false);
  React.useEffect(() => {
    if (!px) return;
    const mq = window.matchMedia('(max-width:' + (px - 1) + 'px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, [px]);
  return narrow;
}

export function DataTable({ columns = [], rows = [], tone = 'dark', compact = false, cardsAt = 720 }) {
  const dark = tone === 'dark';
  const pad = compact ? '10px 12px' : '14px 12px';
  const narrow = useNarrow(cardsAt);

  const border = dark ? 'var(--border-dark)' : 'var(--border-subtle)';
  const rowBorder = dark ? 'rgba(255,255,255,.05)' : 'var(--nhr-light-2)';
  const muted = dark ? 'var(--text-muted-dark)' : 'var(--text-muted)';
  const body = dark ? 'var(--text-body-dark)' : 'var(--text-body)';

  if (narrow && columns.length > 1) {
    const [head, ...rest] = columns;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r, i) => (
          <div key={r.id || i} style={{
            display: 'flex', flexDirection: 'column', gap: 9,
            padding: compact ? 13 : 15, borderRadius: 'var(--radius-md)',
            border: '1px solid ' + border,
            background: dark ? 'rgba(255,255,255,.025)' : 'var(--surface-card)'
          }}>
            <div style={{
              fontSize: 'var(--text-body)', fontWeight: 'var(--fw-bold)',
              fontFamily: head.mono ? 'var(--font-mono)' : 'var(--font-core)',
              color: dark ? '#fff' : 'var(--text-heading)', lineHeight: 1.35
            }}>{r[head.key]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {rest.map(c => {
                const v = r[c.key];
                if (v == null || v === '' || v === '—') return null;
                return (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 }}>
                    <span style={{
                      flex: '0 0 auto', fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-bold)',
                      letterSpacing: '.05em', textTransform: 'uppercase', color: muted
                    }}>{c.label}</span>
                    <span style={{
                      minWidth: 0, textAlign: 'right', fontSize: 'var(--text-body-sm)',
                      fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-core)',
                      color: body, overflowWrap: 'anywhere'
                    }}>{v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-core)' }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} scope="col" style={{
                textAlign: c.align || 'left', padding: pad,
                fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-bold)',
                letterSpacing: '.06em', textTransform: 'uppercase',
                color: muted, borderBottom: '1px solid ' + border, whiteSpace: 'nowrap'
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map(c => (
                <td key={c.key} style={{
                  textAlign: c.align || 'left', padding: pad,
                  fontSize: 'var(--text-body-sm)',
                  fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-core)',
                  color: body, borderBottom: '1px solid ' + rowBorder, whiteSpace: 'nowrap'
                }}>{r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
