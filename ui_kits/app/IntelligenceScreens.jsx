/* NHR Intelligence — insight feed, grounded assistant, data query, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const SEV_STYLE = {
  high: { border: 'rgba(242,84,91,.3)', bg: 'rgba(242,84,91,.04)', fg: 'var(--nhr-danger)', tone: 'danger', label: 'Act now' },
  medium: { border: 'rgba(242,180,65,.26)', bg: 'rgba(242,180,65,.03)', fg: 'var(--nhr-warning)', tone: 'warning', label: 'Review' },
  low: { border: 'var(--border-dark)', bg: 'rgba(255,255,255,.02)', fg: 'var(--nhr-turquoise)', tone: 'dark', label: 'Worth knowing' }
};

/* ---------------- Insight feed ---------------- */
function InsightFeed({ a, onAsk }) {
  const insights = window.buildInsights(a);
  const [open, setOpen] = React.useState(insights.length ? insights[0].id : null);
  const [dismissed, setDismissed] = React.useState([]);

  const live = insights.filter(i => dismissed.indexOf(i.id) < 0);
  const high = live.filter(i => i.severity === 'high');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Insights" value={String(live.length)} caption="From live platform data" icon={<Icon name="Sparkles" size={18} />} />
        <StatTile label="Act now" value={String(high.length)} caption="Time-bound or statutory" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Modules read" value="8" caption="Across the platform" icon={<Icon name="Database" size={18} />} />
        <StatTile label="Dismissed" value={String(dismissed.length)} caption="This session" icon={<Icon name="EyeOff" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Calculator" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          These are <strong style={{ color: '#fff' }}>calculated, not predicted</strong>. Each one opens to show the figures
          it came from and which module they were read from, so you can check it rather than take it on trust. Nothing on
          this tab was written by a language model.
        </span>
      </Card>

      {live.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {live.map(i => {
            const st = SEV_STYLE[i.severity];
            const isOpen = open === i.id;
            return (
              <Card key={i.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: st.border, background: st.bg
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{
                    width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,.04)', border: '1px solid ' + st.border, color: st.fg
                  }}><Icon name={i.icon} size={18} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 210 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: '#fff' }}>{i.title}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{i.body}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <Badge tone="dark">{i.module}</Badge>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(isOpen ? null : i.id)}
                    iconLeft={<Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={13} />}>
                    {isOpen ? 'Hide working' : 'Show working'}
                  </Button>
                  <Button size="xs" variant="ghost" tone="dark" onClick={() => onAsk('Tell me more about: ' + i.title)}
                    iconLeft={<Icon name="MessageCircle" size={13} />}>Ask about this</Button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>Confidence: {i.confidence}</span>
                  <IconButton tone="dark" size={28} label="Dismiss" onClick={() => setDismissed(d => d.concat([i.id]))}>
                    <Icon name="X" size={13} />
                  </IconButton>
                </div>

                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-dark)' }}>
                    <DataTable compact columns={[{ key: 'k', label: 'Figure' }, { key: 'v', label: 'Value', mono: true, align: 'right' }]}
                      rows={i.working.map((w, k) => ({ id: i.id + '-' + k, k: w[0], v: String(w[1]) }))} />
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                      <Icon name="ArrowRight" size={13} style={{ flex: '0 0 auto', marginTop: 3, color: st.fg }} />
                      <span>{i.action}</span>
                    </span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                      Confidence is based on how much data supports the figure — {i.confidence.toLowerCase()} here.
                      A small team produces volatile percentages, and one person's absence can move a departmental rate
                      by several points.
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {dismissed.length ? 'Everything dismissed for now' : 'Nothing needs attention'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {dismissed.length ? 'Dismissals last for this session only.' : 'No compliance gaps, overdue reports or stalled processes found in your scope.'}
          </span>
          {dismissed.length > 0 && <Button size="sm" variant="secondary" tone="dark" onClick={() => setDismissed([])}>Restore all</Button>}
        </Card>
      )}
    </div>
  );
}

/* ---------------- Assistant ---------------- */
const SUGGESTED = [
  'Summarise where we stand on compliance',
  'What should I deal with first this week?',
  'How is absence tracking compared with headcount?',
  'Write a short update for the leadership meeting'
];

function Assistant({ a, seed, onSeedUsed }) {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [degraded, setDegraded] = React.useState(false);
  const scroller = React.useRef(null);

  React.useEffect(() => {
    if (seed) { send(seed); onSeedUsed(); }
  }, [seed]);

  React.useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy]);

  const context = window.buildContext(a);

  /* The fallback answer. Built from the same snapshot the model receives, so
     the figures never differ — only the prose does. */
  function fallback(q) {
    const lower = q.toLowerCase();
    const insights = window.buildInsights(a);
    if (/first|priorit|urgent|this week/.test(lower)) {
      const top = insights.slice(0, 3);
      return top.length
        ? 'In order of urgency:\n\n' + top.map((i, n) => (n + 1) + '. ' + i.title + ' — ' + i.action).join('\n\n')
        : 'Nothing in your scope is overdue or outstanding.';
    }
    if (/complian|training|riddor|safety/.test(lower)) {
      return 'Mandatory training is at ' + a.trainingRate + '% (' + a.mandatoryMet + ' of ' + a.mandatoryRequired
        + ' required records met), with ' + a.expiredCerts + ' expired certificates. On safety there are '
        + a.riddorDue + ' RIDDOR reports outstanding, ' + a.openActions + ' open corrective actions and '
        + a.assessmentsOverdue + ' risk assessments overdue for review.';
    }
    if (/absence|sick|bradford/.test(lower)) {
      return 'Absence is running at ' + a.absenceRate + '% over the last ' + Math.round(a.windowDays / 7)
        + ' weeks (' + a.absenceDays + ' days against ' + a.availableDays + ' available). The average Bradford score is '
        + a.bradfordAvg + ', with ' + a.bradfordHigh + ' at or above 50.';
    }
    if (/turnover|leaver|retention|headcount/.test(lower)) {
      return 'Headcount is ' + a.employees.length + ', with ' + a.joiners.length + ' joiners and '
        + a.recentLeavers.length + ' leavers in the last 12 months. Turnover is ' + a.turnover
        + '% against an average headcount of ' + a.avgHeadcount + '.';
    }
    return 'Here is the current position:\n\n' + context;
  }

  async function send(text) {
    const q = (text || '').trim();
    if (!q || busy) return;
    setMessages(m => m.concat([{ role: 'user', text: q }]));
    setInput('');
    setBusy(true);

    const system = 'You are NHR Intelligence, an assistant inside a UK HR platform. '
      + 'Answer ONLY from the figures in the context below. Never invent a number; if something is not in the context, '
      + 'say it is not available. Be direct and concise — a few short paragraphs at most, plain British English, no bullet '
      + 'lists unless genuinely a list. Do not give legal, medical or financial advice; where a question touches those, '
      + 'answer factually from the data and say the user should take proper advice. Never speculate about individuals.'
      + '\n\nCURRENT PLATFORM FIGURES:\n' + context;

    let answer = null, usedModel = false;
    try {
      if (window.claude && window.claude.complete) {
        answer = await window.claude.complete(system + '\n\nQUESTION: ' + q);
        usedModel = !!(answer && String(answer).trim());
      }
    } catch (e) {
      answer = null;
    }
    if (!usedModel) { answer = fallback(q); setDegraded(true); }

    setMessages(m => m.concat([{ role: 'assistant', text: String(answer).trim(), ai: usedModel }]));
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="ShieldCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          The assistant is given a snapshot of your platform figures and answers from that alone. It inherits your
          permissions — {a.canPayroll ? 'payroll figures are included because your role can read them' : 'payroll figures are withheld because your role cannot read them'},
          individual wellbeing responses do not exist to share, and absence reasons and HR notes are never passed to it.
        </span>
      </Card>

      <Card tone="dark" padding={0} style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
        <div ref={scroller} style={{ flex: 1, maxHeight: 460, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!messages.length && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <Icon name="MessageCircle" size={22} style={{ color: 'var(--nhr-turquoise)' }} />
              <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>Ask about your workforce data</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)', maxWidth: 520 }}>
                Questions about figures the platform holds. It will tell you when something is not available rather than
                estimating it.
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUGGESTED.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} style={{
                    padding: '10px 14px', minHeight: 40, borderRadius: 999, cursor: 'pointer', textAlign: 'left',
                    border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,.03)',
                    color: 'var(--text-body-dark)', fontFamily: 'var(--font-core)', fontSize: 12.5
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              {m.role === 'assistant' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <window.AILabel>{m.ai ? 'AI generated' : 'Generated from your data'}</window.AILabel>
                </span>
              )}
              <span style={{
                maxWidth: '86%', padding: '13px 15px', borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.7,
                border: '1px solid ' + (m.role === 'user' ? 'rgba(0,229,212,.28)' : 'var(--border-dark)'),
                background: m.role === 'user' ? 'rgba(0,229,212,.08)' : 'rgba(255,255,255,.025)',
                color: m.role === 'user' ? '#fff' : 'var(--text-body-dark)'
              }}>{m.text}</span>
              {m.role === 'assistant' && (
                <span style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted-dark)', maxWidth: '86%' }}>
                  Check any figure against the module it came from before acting on it. This is not legal, medical or
                  financial advice.
                </span>
              )}
            </div>
          ))}

          {busy && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted-dark)' }}>
              <Icon name="Loader" size={15} style={{ color: 'var(--nhr-turquoise)' }} />Reading your platform figures…
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--border-dark)', flexWrap: 'wrap' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(input); }}
            placeholder="Ask about headcount, absence, compliance…" aria-label="Ask NHR Intelligence"
            style={{
              flex: 1, minWidth: 200, fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff',
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
              borderRadius: 'var(--radius-btn)', padding: '12px 14px', outline: 'none', minHeight: 44
            }} />
          <Button disabled={busy || !input.trim()} onClick={() => send(input)} iconLeft={<Icon name="Send" size={15} />}>Ask</Button>
          {messages.length > 0 && (
            <Button variant="ghost" tone="dark" onClick={() => setMessages([])}>Clear</Button>
          )}
        </div>
      </Card>

      {degraded && (
        <Notice icon="Info">
          The language model was not reachable, so answers are being composed directly from your platform figures
          instead. The numbers are identical either way — only the wording differs.
        </Notice>
      )}
    </div>
  );
}

/* ---------------- Ask the data ---------------- */
function AskTheData({ a }) {
  const context = window.buildContext(a);
  const [copied, setCopied] = React.useState(false);

  const lines = context.split('\n');

  const excluded = [
    ['Individual wellbeing responses', 'They do not exist — check-ins carry no employee id.'],
    ['Absence reasons', 'Health information; the count of days is enough to spot a pattern.'],
    ['HR notes and case records', 'Free text about individuals, often the most sensitive material in the system.'],
    ['Candidate CVs and personal details', 'Short retention period and no reason to include them in an aggregate view.'],
    ['Payroll figures', a.canPayroll ? 'Included — your role can read payroll.' : 'Excluded — your role cannot read payroll.']
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="Database" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ flex: 1, minWidth: 250, fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          This is exactly what the assistant is given — nothing more. Publishing it is the point: an assistant whose
          inputs you cannot inspect is one you cannot audit, and in HR that matters more than the quality of the answer.
        </span>
      </Card>

      <DashboardCard title="Context passed to the assistant" padding={16}
        action={
          <Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name={copied ? 'Check' : 'Copy'} size={13} />}
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(context);
              setCopied(true); setTimeout(() => setCopied(false), 1800);
            }}>{copied ? 'Copied' : 'Copy'}</Button>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {lines.map((l, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-body-dark)',
              padding: '8px 11px', borderRadius: 6, background: 'rgba(255,255,255,.025)',
              border: '1px solid var(--border-dark)', wordBreak: 'break-word'
            }}>{l}</span>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Deliberately excluded" padding={16} action={<Badge tone="dark">{excluded.length}</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {excluded.map(([what, why]) => (
            <div key={what} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
              <Icon name={/Included/.test(why) ? 'Check' : 'X'} size={14}
                style={{ flex: '0 0 auto', marginTop: 3, color: /Included/.test(why) ? 'var(--nhr-turquoise)' : 'var(--nhr-danger)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{what}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>{why}</span>
              </span>
            </div>
          ))}
        </div>
      </DashboardCard>

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-warning)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Before this goes live: decide your lawful basis for processing staff data through a model, record it in your
          ROPA, and tell staff in the privacy notice. Keep a human decision-maker on anything affecting an individual —
          UK GDPR Article 22 restricts decisions based solely on automated processing where they have a legal or
          similarly significant effect, which covers dismissal, discipline and selection for redundancy.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function IntelligenceScreen() {
  const a = window.useAnalytics();
  const [view, setView] = React.useState('Insights');
  const [seed, setSeed] = React.useState(null);

  const insights = window.buildInsights(a);
  const priority = insights.filter(i => i.severity === 'high').length;

  function ask(q) { setSeed(q); setView('Assistant'); }

  const body = {
    'Insights': <InsightFeed a={a} onAsk={ask} />,
    'Assistant': <Assistant a={a} seed={seed} onSeedUsed={() => setSeed(null)} />,
    'Ask the Data': <AskTheData a={a} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 240 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>NHR Intelligence</h2>
            <window.AILabel>Assisted</window.AILabel>
          </span>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            Insights calculated from your own platform data, each showing its working, and an assistant that answers only from figures you are entitled to see.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Ask the Data')} iconLeft={<Icon name="Database" size={15} />}>What it can see</Button>
          <Button size="sm" onClick={() => setView('Assistant')} iconLeft={<Icon name="MessageCircle" size={15} />}>Open Assistant</Button>
        </div>
      </div>

      <window.IntelligenceSubnav view={view} onSelect={setView} counts={{ priority }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
    </div>
  );
}

Object.assign(window, { IntelligenceScreen, InsightFeed, Assistant, AskTheData });
