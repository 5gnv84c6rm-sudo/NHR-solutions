/* Support & Help Centre — knowledge base, ticket thread, contact routes. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const TICKET_TONE = { 'Open': 'warning', 'Waiting on you': 'danger', 'In progress': 'warning', 'Resolved': 'success' };
const PRIORITY_TONE = { 'Urgent': 'danger', 'High': 'danger', 'Normal': 'dark', 'Low': 'dark' };

function supportWhen(s) {
  if (!s) return '—';
  const days = Math.floor((Date.now() - new Date(s)) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return days + ' days ago';
  return window.shortDate(String(s).slice(0, 10));
}

function SupportSubnav({ view, onSelect, counts }) {
  const items = [['Help Centre', 'LifeBuoy'], ['My Tickets', 'MessageSquare'], ['Contact', 'Send']];
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'My Tickets' ? counts.waiting : 0;
        return (
          <button key={label} type="button" onClick={() => onSelect(label)} aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid ' + (active ? 'rgba(0,229,212,.35)' : 'transparent'),
              background: active ? 'rgba(0,229,212,.10)' : 'transparent',
              color: active ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13.5, fontWeight: active ? 700 : 600,
              transition: 'all var(--dur-base) var(--ease-out)'
            }}>
            <Icon name={icon} size={15} />{label}
            {n > 0 && <Badge tone="danger">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useSupport() {
  const SU = window.SupportStore, S = window.EmployeeStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => SU.subscribe(force), []);
  const tickets = SU.tickets();
  return {
    SU, S, refresh: force,
    articles: SU.articles(), tickets,
    waiting: tickets.filter(t => t.status === 'Waiting on you').length,
    openCount: tickets.filter(t => t.status !== 'Resolved').length
  };
}

/* ---------------- Help centre ---------------- */
function HelpCentre({ d, onRaise }) {
  const { SU, articles, refresh } = d;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const [open, setOpen] = React.useState(null);

  const searched = q.trim() ? SU.search(q) : articles;
  const list = searched.filter(a => cat === 'All' || a.category === cat);
  const cats = Array.from(new Set(articles.map(a => a.category)));

  /* Articles voted down more than up are surfaced, because a help article that
     does not help is a product problem disguised as a content problem. */
  const failing = articles.filter(a => a.notHelpful > a.helpful && a.notHelpful > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>How can we help?</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {articles.length} articles covering the modules in this workspace.
          </span>
        </span>
        <span style={{ position: 'relative', display: 'flex' }}>
          <Icon name="Search" size={18} style={{ position: 'absolute', left: 15, top: 15, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for an answer…" aria-label="Search help articles"
            style={{
              width: '100%', fontFamily: 'var(--font-core)', fontSize: 15, color: '#fff',
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
              borderRadius: 'var(--radius-btn)', padding: '15px 15px 15px 44px', outline: 'none', minHeight: 52
            }} />
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All'].concat(cats).map(k => (
            <button key={k} type="button" onClick={() => setCat(k)} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (cat === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: cat === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: cat === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 12.5, fontWeight: cat === k ? 700 : 600
            }}>{k}</button>
          ))}
        </div>
      </Card>

      {q.trim() && (
        <span style={{ fontSize: 13, color: 'var(--text-muted-dark)' }}>
          {list.length} {list.length === 1 ? 'result' : 'results'} for “{q}”
          {!list.length && ' — try fewer words, or raise a ticket and we will answer directly.'}
        </span>
      )}

      {list.length ? (
        <div className="sup-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 16 }}>
          {list.map(a => (
            <Card key={a.id} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                }}><Icon name="FileText" size={17} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, color: '#fff' }}>{a.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{a.category} · {a.minutes} min</span>
                </span>
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>
                {a.body.split('\n\n')[0].slice(0, 130)}…
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <Button size="sm" onClick={() => setOpen(a.id)}>Read</Button>
                <Badge tone="dark">{a.module}</Badge>
                {a.helpful + a.notHelpful > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>
                    {a.helpful} of {a.helpful + a.notHelpful} found this helpful
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'flex-start' }}>
          <Icon name="SearchX" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing matched that search</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
            Search matches titles, categories and article text. Try a shorter phrase — or raise a ticket and we will
            answer it directly, which also tells us what to write next.
          </span>
          <Button size="sm" onClick={() => onRaise(q)} iconLeft={<Icon name="Send" size={15} />}>Raise a Ticket</Button>
        </Card>
      )}

      {failing.length > 0 && (
        <Notice icon="Info">
          {failing.length} {failing.length === 1 ? 'article is' : 'articles are'} rated unhelpful more often than
          helpful. Those are logged for rewriting — an article that does not answer the question is usually a sign the
          product is confusing at that point, not just the wording.
        </Notice>
      )}

      {open && <ArticleReader d={d} id={open} onClose={() => setOpen(null)} onRaise={onRaise} />}
    </div>
  );
}

function ArticleReader({ d, id, onClose, onRaise }) {
  const { SU, refresh } = d;
  const a = SU.article(id);
  const mine = SU.myVote(id);
  const [voted, setVoted] = React.useState(mine);
  if (!a) return null;

  const related = SU.articles().filter(x => x.id !== a.id && (x.category === a.category || x.module === a.module)).slice(0, 3);

  function vote(up) {
    SU.vote(id, up);
    setVoted(up ? 'up' : 'down');
    refresh();
  }

  return (
    <Drawer open onClose={onClose} title={a.title} subtitle={a.category + ' · ' + a.minutes + ' minute read · updated ' + window.shortDate(a.updated)} width={740}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {a.body.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.78, color: 'var(--text-body-dark)', textWrap: 'pretty' }}>{p}</p>
          ))}
        </Card>

        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 180, fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
            {voted ? (voted === 'up' ? 'Thanks — glad it helped.' : 'Thanks. We will rewrite this one.') : 'Did this answer your question?'}
          </span>
          {!voted ? (
            <span style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="secondary" tone="dark" onClick={() => vote(true)} iconLeft={<Icon name="ThumbsUp" size={14} />}>Yes</Button>
              <Button size="sm" variant="secondary" tone="dark" onClick={() => vote(false)} iconLeft={<Icon name="ThumbsDown" size={14} />}>No</Button>
            </span>
          ) : voted === 'down' ? (
            <Button size="sm" onClick={() => { onClose(); onRaise(a.title); }} iconLeft={<Icon name="Send" size={14} />}>Raise a Ticket</Button>
          ) : null}
        </Card>

        {related.length > 0 && (
          <DashboardCard title="Related" padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {related.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                  <Icon name="FileText" size={14} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{r.minutes} min</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Tickets ---------------- */
function MyTickets({ d, onRaise }) {
  const { SU, tickets, refresh } = d;
  const [open, setOpen] = React.useState(null);
  const [show, setShow] = React.useState('Open');

  const openList = tickets.filter(t => t.status !== 'Resolved');
  const resolved = tickets.filter(t => t.status === 'Resolved');
  const list = show === 'Open' ? openList : resolved;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Open tickets" value={String(openList.length)} caption="With support" icon={<Icon name="MessageSquare" size={18} />} />
        <StatTile label="Waiting on you" value={String(tickets.filter(t => t.status === 'Waiting on you').length)} caption="Needs your reply" icon={<Icon name="Reply" size={18} />} />
        <StatTile label="Resolved" value={String(resolved.length)} caption="Closed out" icon={<Icon name="CircleCheck" size={18} />} />
        <StatTile label="Target response" value={SU.SLA.Normal + ' hrs'} caption="Normal priority, working hours" icon={<Icon name="Clock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Open', openList.length], ['Resolved', resolved.length]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k}<Badge tone="dark">{n}</Badge></button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" onClick={() => onRaise('')} iconLeft={<Icon name="Plus" size={16} />}>New Ticket</Button>
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(t => {
            const last = (t.thread || [])[(t.thread || []).length - 1];
            return (
              <Card key={t.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: t.status === 'Waiting on you' ? 'rgba(242,84,91,.26)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{
                    width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                  }}><Icon name="MessageSquare" size={16} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.subject}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {t.reference} · {t.category} · raised {supportWhen(t.createdAt)} · {(t.thread || []).length} messages
                    </span>
                  </span>
                  <Badge tone={PRIORITY_TONE[t.priority] || 'dark'}>{t.priority}</Badge>
                  <Badge tone={TICKET_TONE[t.status] || 'dark'}>{t.status}</Badge>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(t.id)}>Open</Button>
                </div>
                {last && (
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
                    <strong style={{ color: last.staff ? 'var(--nhr-turquoise)' : '#fff' }}>{last.from}:</strong> {last.text.slice(0, 150)}{last.text.length > 150 ? '…' : ''}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {show === 'Open' ? 'No open tickets' : 'Nothing resolved yet'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {show === 'Open' ? 'Nothing outstanding with support.' : 'Resolved tickets are kept here for reference.'}
          </span>
        </Card>
      )}

      {open && <TicketThread d={d} id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TicketThread({ d, id, onClose }) {
  const { SU, S, refresh } = d;
  const t = SU.ticket(id);
  const [text, setText] = React.useState('');
  if (!t) return null;

  function send() {
    if (!text.trim()) return;
    SU.reply(id, text.trim(), S.session.name);
    setText(''); refresh();
  }

  return (
    <Drawer open onClose={onClose} title={t.subject}
      subtitle={t.reference + ' · ' + t.category + ' · ' + t.priority + ' priority'} width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone={TICKET_TONE[t.status] || 'dark'}>{t.status}</Badge>
          <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>
            Raised {supportWhen(t.createdAt)} · target response {SU.SLA[t.priority]} working hours
          </span>
          <span style={{ flex: 1 }} />
          {t.status !== 'Resolved' && (
            <Button size="xs" variant="secondary" tone="dark" onClick={() => { SU.setStatus(id, 'Resolved'); refresh(); }}>
              Mark Resolved
            </Button>
          )}
          {t.status === 'Resolved' && (
            <Button size="xs" variant="secondary" tone="dark" onClick={() => { SU.setStatus(id, 'Open'); refresh(); }}>Reopen</Button>
          )}
        </div>

        {t.context && (
          <DashboardCard title="Attached context" padding={16} action={<Badge tone="dark">Sent with the ticket</Badge>}>
            <DataTable compact columns={[{ key: 'k', label: 'Detail' }, { key: 'v', label: '', mono: true, align: 'right' }]}
              rows={[
                { id: 'm', k: 'Module', v: t.module || '—' },
                { id: 'r', k: 'Your role', v: t.context.role },
                { id: 'p', k: 'Plan', v: t.context.plan },
                { id: 'h', k: 'Employees on record', v: String(t.context.headcount) }
              ]} />
            <span style={{ display: 'block', marginTop: 11, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
              No employee names, salaries, absence reasons or notes are attached to a ticket. Support sees the shape of
              the workspace, not its contents.
            </span>
          </DashboardCard>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(t.thread || []).map(m => (
            <div key={m.id} style={{
              display: 'flex', flexDirection: 'column', gap: 7,
              alignItems: m.staff ? 'flex-start' : 'flex-end'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                {m.staff && <Icon name="Headset" size={12} style={{ color: 'var(--nhr-turquoise)' }} />}
                <strong style={{ color: m.staff ? 'var(--nhr-turquoise)' : '#fff' }}>{m.from}</strong> · {supportWhen(m.at)}
              </span>
              <span style={{
                maxWidth: '88%', padding: '13px 15px', borderRadius: 'var(--radius-md)',
                fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                border: '1px solid ' + (m.staff ? 'rgba(0,229,212,.22)' : 'var(--border-dark)'),
                background: m.staff ? 'rgba(0,229,212,.05)' : 'rgba(255,255,255,.025)',
                color: 'var(--text-body-dark)'
              }}>{m.text}</span>
            </div>
          ))}
        </div>

        {t.status !== 'Resolved' && (
          <Card tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextareaField label="Reply" rows={3} value={text} onChange={setText} placeholder="Add to the conversation…" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" disabled={!text.trim()} onClick={send} iconLeft={<Icon name="Send" size={15} />}>Send Reply</Button>
            </div>
          </Card>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Raise a ticket ---------------- */
function RaiseTicket({ d, seed, onClose }) {
  const { SU, S, refresh } = d;
  const [form, setForm] = React.useState({
    subject: seed || '', category: SU.CATEGORIES[1], priority: 'Normal',
    module: 'Employees', message: ''
  });
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(null);
  const context = SU.captureContext();

  const suggestions = form.subject.trim().length > 3 ? SU.search(form.subject).slice(0, 3) : [];

  function submit() {
    if (!form.subject.trim()) return setError('Give the ticket a subject.');
    if (!form.message.trim()) return setError('Describe what happened — what you did, what you expected, what you saw.');
    const row = SU.addTicket(Object.assign({}, form, {
      raisedBy: S.session.name, context
    }));
    setDone(row); refresh();
  }

  if (done) {
    return (
      <Drawer open onClose={onClose} title="Ticket raised" subtitle={done.reference} width={620}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 11, borderColor: 'rgba(0,229,212,.3)', background: 'rgba(0,229,212,.05)' }}>
            <Icon name="CircleCheck" size={22} style={{ color: 'var(--nhr-turquoise)' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{done.reference} is open</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
              Target first response is {SU.SLA[done.priority]} working hours at {done.priority.toLowerCase()} priority.
              It will appear under My Tickets, and replies are added to the same thread.
            </span>
          </Card>
          <Notice icon="Info">
            In this prototype the ticket is stored locally and no message is sent anywhere. A live deployment would post
            it to your helpdesk and email the requester a copy.
          </Notice>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title="Raise a Ticket" subtitle="Context from your workspace is attached automatically." width={660}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <TextField label="Subject" required span={2} value={form.subject} onChange={v => setForm(p => Object.assign({}, p, { subject: v }))}
            placeholder="What is going wrong, in one line" />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={SU.CATEGORIES} />
          <SelectField label="Priority" value={form.priority} onChange={v => setForm(p => Object.assign({}, p, { priority: v }))}
            options={SU.PRIORITIES} hint={'Target response ' + SU.SLA[form.priority] + ' working hours.'} />
          <SelectField label="Module" span={2} value={form.module} onChange={v => setForm(p => Object.assign({}, p, { module: v }))}
            options={['Employees', 'Leave', 'Absence', 'Attendance', 'Rotas', 'Payroll', 'Documents', 'Performance', 'Expenses', 'Recruitment', 'Training', 'Health & Safety', 'eLearning', 'Wellbeing', 'Reports', 'Integrations', 'Plan & Billing', 'Other']} />
          <TextareaField label="What happened" required span={2} rows={4} value={form.message} onChange={v => setForm(p => Object.assign({}, p, { message: v }))}
            placeholder="What you did, what you expected, and what happened instead. A specific example with a reference number gets a faster answer than a general description." />
        </FormGrid>

        {suggestions.length > 0 && (
          <DashboardCard title="These might answer it already" padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {suggestions.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid rgba(0,229,212,.2)', borderRadius: 'var(--radius-md)' }}>
                  <Icon name="Lightbulb" size={14} style={{ flex: '0 0 auto', color: 'var(--nhr-turquoise)' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{a.category} · {a.minutes} min read</span>
                  </span>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        <DashboardCard title="What gets attached" padding={16} action={<Badge tone="dark">Visible to you</Badge>}>
          <DataTable compact columns={[{ key: 'k', label: 'Detail' }, { key: 'v', label: '', mono: true, align: 'right' }]}
            rows={[
              { id: 'r', k: 'Your role', v: context.role },
              { id: 'p', k: 'Plan', v: context.plan + (context.trial ? ' (trial)' : '') },
              { id: 'h', k: 'Employees on record', v: String(context.headcount) },
              { id: 'b', k: 'Browser', v: context.browser },
              { id: 'v', k: 'Viewport', v: context.viewport }
            ]} />
          <span style={{ display: 'block', marginTop: 11, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
            Support asks for most of this in their first reply, so it is collected up front. No employee names,
            salaries, absence reasons or record contents are attached — if a specific record is relevant, quote its
            reference in the message rather than expecting support to have it.
          </span>
        </DashboardCard>

        {(form.priority === 'Urgent' || form.priority === 'High') && (
          <Notice icon="TriangleAlert" tone="warn">
            Reserve urgent for something blocking payroll or a statutory deadline. If everything is urgent, the queue
            stops telling us what actually is.
          </Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Send" size={15} />}>Raise Ticket</Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Contact ---------------- */
function ContactRoutes({ d, onRaise }) {
  const { SU } = d;
  const routes = [
    ['Support ticket', 'MessageSquare', 'Anything in the product. Carries your workspace context automatically, so the first reply is an answer rather than a question.', SU.SLA.Normal + ' working hours', true],
    ['Email', 'Mail', 'For attachments, or when you would rather keep the thread in your inbox. Quote your workspace name.', 'Same targets as a ticket', false],
    ['Phone', 'Phone', 'For something blocking payroll or a statutory deadline. Have your workspace name and the reference of anything affected ready.', 'Business hours', false],
    ['Account manager', 'UserCheck', 'Business and Enterprise plans have a named contact for commercial and onboarding questions.', 'By arrangement', false]
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Notice icon="Info">
        Contact details are placeholders until NHR Solution publishes real ones. Response targets are working hours and
        should be confirmed against your contract rather than taken from this screen.
      </Notice>

      <div className="sup-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {routes.map(([name, icon, blurb, target, primary]) => (
          <Card key={name} tone="dark" padding={18} style={{
            display: 'flex', flexDirection: 'column', gap: 13,
            borderColor: primary ? 'rgba(0,229,212,.26)' : undefined,
            background: primary ? 'rgba(0,229,212,.03)' : undefined
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
            }}><Icon name={icon} size={18} /></span>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>{name}</span>
            <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>{blurb}</span>
            <Badge tone="dark">{target}</Badge>
            {primary && <Button size="sm" onClick={() => onRaise('')} iconLeft={<Icon name="Send" size={14} />}>Raise a Ticket</Button>}
          </Card>
        ))}
      </div>

      <DashboardCard title="Response targets by priority" padding={16}>
        <DataTable compact columns={[
          { key: 'priority', label: 'Priority' },
          { key: 'target', label: 'First response', mono: true, align: 'right' },
          { key: 'use', label: 'When to use it' }
        ]} rows={[
          { id: 'u', priority: 'Urgent', target: SU.SLA.Urgent + ' hrs', use: 'Payroll or a statutory deadline is blocked' },
          { id: 'h', priority: 'High', target: SU.SLA.High + ' hrs', use: 'A team cannot do their work' },
          { id: 'n', priority: 'Normal', target: SU.SLA.Normal + ' hrs', use: 'Something is wrong but there is a workaround' },
          { id: 'l', priority: 'Low', target: SU.SLA.Low + ' hrs', use: 'A question, or a change request' }
        ]} />
      </DashboardCard>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function SupportScreen() {
  const d = useSupport();
  const [view, setView] = React.useState('Help Centre');
  const [raising, setRaising] = React.useState(null);

  function raise(seed) { setRaising(seed || ''); }

  const body = {
    'Help Centre': <HelpCentre d={d} onRaise={raise} />,
    'My Tickets': <MyTickets d={d} onRaise={raise} />,
    'Contact': <ContactRoutes d={d} onRaise={raise} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Support</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 620 }}>
            Answers written for the modules in this workspace, and tickets that carry your role, plan and workspace shape so the first reply is an answer rather than a request for details.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('My Tickets')} iconLeft={<Icon name="MessageSquare" size={15} />}>
            My Tickets{d.waiting > 0 ? ' (' + d.waiting + ')' : ''}
          </Button>
          <Button size="sm" onClick={() => raise('')} iconLeft={<Icon name="Send" size={15} />}>Raise a Ticket</Button>
        </div>
      </div>

      <SupportSubnav view={view} onSelect={setView} counts={{ waiting: d.waiting }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {raising != null && <RaiseTicket d={d} seed={raising} onClose={() => setRaising(null)} />}
    </div>
  );
}

Object.assign(window, {
  SupportScreen, SupportSubnav, useSupport, HelpCentre, ArticleReader,
  MyTickets, TicketThread, RaiseTicket, ContactRoutes, supportWhen
});
