/* eLearning — shared hook, My Learning dashboard and the course catalogue. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

const EL_DAY = 864e5;

function ELearningSubnav({ view, onSelect, counts, allow }) {
  const items = [['My Learning', 'BookOpen'], ['Catalogue', 'Library'], ['Team Progress', 'Users'], ['Certificates', 'Award']]
    .filter(([label]) => !allow || allow.indexOf(label) > -1);
  return (
    <div className="nhr-scrollrow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 5, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-dark)' }}>
      {items.map(([label, icon]) => {
        const active = view === label;
        const n = label === 'My Learning' ? counts.assigned : 0;
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
            {n > 0 && <Badge tone="warning">{n}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function useLearningData() {
  const S = window.EmployeeStore, R = window.EmployeeRecords, L = window.LearningStore;
  const [, force] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => L.subscribe(force), []);
  React.useEffect(() => R.subscribe(force), []);
  React.useEffect(() => S.subscribe(force), []);

  const courses = L.courses();
  const employees = S.list({});

  /* The learner is whoever the session maps to, by employee reference. The role
     switcher changes what S.list returns, so as an Employee this screen shows
     only that person's learning. */
  const me = employees.find(e => e.employeeId === S.session.employeeId) || employees[0] || null;

  /* One row per course for the current learner: their assignment from the
     Training module, and their progress through the content here. */
  const myTraining = me ? (R.get(me).training || []) : [];
  const myCourses = courses.map(c => {
    const assignment = myTraining.find(t => t.course === c.title) || null;
    const enrol = me ? L.enrolment(me.id, c.id) : { lessonsComplete: [], attempts: 0, bestScore: null, passed: false };
    const lessonPct = c.lessons.length ? Math.round(enrol.lessonsComplete.length / c.lessons.length * 100) : 0;
    /* Someone can hold a valid certificate without having been assessed here —
       training recorded before the content existed, or delivered by an outside
       provider. That is complete, so it must not be listed as outstanding work;
       but it is worth distinguishing from a pass earned in this module. */
    const certified = !!(assignment && assignment.status === 'Complete'
      && (!assignment.expiresAt || new Date(assignment.expiresAt) >= Date.now()));
    const done = enrol.passed || certified;
    return Object.assign({}, c, {
      assignment, enrol, lessonPct,
      assigned: !!assignment,
      dueAt: assignment ? assignment.dueAt : '',
      /* A course counts as done when the assessment is passed here, or when a
         valid certificate is already on the employee record. */
      done,
      certified, assessedHere: enrol.passed,
      overdue: !!(assignment && assignment.dueAt && !done && new Date(assignment.dueAt) < Date.now()),
      mandatory: me ? !!(window.isMandatoryFor && window.isMandatoryFor(c.title, me.department)) : false
    });
  });

  return { courses, myCourses, employees, me, refresh: force, S, R, L };
}

/* ---------------- My Learning ---------------- */
function MyLearning({ data, onOpen }) {
  const { myCourses, me, L } = data;
  const assigned = myCourses.filter(c => c.assigned && !c.done);
  const inProgress = assigned.filter(c => c.lessonPct > 0 || c.enrol.attempts > 0);
  const notStarted = assigned.filter(c => c.lessonPct === 0 && c.enrol.attempts === 0);
  const done = myCourses.filter(c => c.done);
  const overdue = assigned.filter(c => c.overdue);

  const minutesLeft = assigned.reduce((n, c) => n + Math.round(c.minutes * (1 - c.lessonPct / 100)), 0);

  if (!me) {
    return (
      <Card tone="dark" padding="var(--card-padding-lg)">
        <span style={{ fontSize: 14, color: 'var(--text-body-dark)' }}>No employee record is linked to this session.</span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Assigned to you" value={String(assigned.length)} caption={overdue.length ? overdue.length + ' past due' : 'Nothing overdue'} icon={<Icon name="BookOpen" size={18} />} />
        <StatTile label="In progress" value={String(inProgress.length)} caption="Started, not passed" icon={<Icon name="Loader" size={18} />} />
        <StatTile label="Time remaining" value={minutesLeft ? minutesLeft + ' min' : '—'} caption="Estimated across assigned courses" icon={<Icon name="Clock" size={18} />} />
        <StatTile label="Passed" value={String(done.length)} caption={done.filter(c => c.assessedHere).length + ' assessed in eLearning'} icon={<Icon name="Award" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Avatar employee={me} size={38} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 190 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{window.EmployeeStore.fullName(me)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>{me.jobTitle} · {me.department}</span>
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>
          Pass mark {L.PASS_MARK}% · a valid certificate already on your record counts as complete
        </span>
      </Card>

      {overdue.length > 0 && (
        <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(242,84,91,.28)' }}>
          <Icon name="TriangleAlert" size={18} style={{ color: 'var(--nhr-danger)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            {overdue.length} assigned {overdue.length === 1 ? 'course is' : 'courses are'} past the due date.
          </span>
          <Button size="sm" onClick={() => onOpen(overdue[0].id)}>Start Now</Button>
        </Card>
      )}

      {assigned.length > 0 && (
        <DashboardCard title={'To do (' + assigned.length + ')'} padding={16} action={<Badge tone="dark">{notStarted.length} not started</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {assigned.map(c => (
              <div key={c.id} style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                border: '1px solid ' + (c.overdue ? 'rgba(242,84,91,.26)' : 'var(--border-dark)'),
                borderRadius: 'var(--radius-md)',
                background: c.overdue ? 'rgba(242,84,91,.035)' : 'rgba(255,255,255,.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
                  <span style={{
                    width: 38, height: 38, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
                  }}><Icon name={c.category === 'Health & Safety' ? 'HardHat' : c.category === 'Technology' ? 'Shield' : 'Scale'} size={17} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {c.lessons.length} lessons · {c.minutes} min · {c.quiz.length} questions
                      {c.mandatory ? ' · mandatory' : ''}
                    </span>
                  </span>
                  {c.dueAt && (
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 84 }}>
                      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.overdue ? 'var(--nhr-danger)' : '#fff' }}>
                        {window.shortDate(c.dueAt)}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{c.overdue ? 'overdue' : 'due'}</span>
                    </span>
                  )}
                  {c.enrol.attempts > 0 && !c.enrol.passed && (
                    <Badge tone="warning">Best {c.enrol.bestScore}%</Badge>
                  )}
                  {c.assignment && c.assignment.status === 'Complete' && c.assignment.expiresAt && new Date(c.assignment.expiresAt) < Date.now() && (
                    <Badge tone="danger">Certificate expired</Badge>
                  )}
                  <Button size="sm" onClick={() => onOpen(c.id)}>
                    {c.lessonPct > 0 || c.enrol.attempts > 0 ? 'Continue' : 'Start'}
                  </Button>
                </div>
                {c.lessonPct > 0 && <ProgressMeter label={c.enrol.lessonsComplete.length + ' of ' + c.lessons.length + ' lessons'} value={c.lessonPct} valueLabel={c.lessonPct + '%'} />}
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {done.length > 0 && (
        <DashboardCard title={'Complete (' + done.length + ')'} padding={16}
          action={<Badge tone="dark">{done.filter(c => c.assessedHere).length} assessed here</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {done.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', padding: 13, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
                <Icon name="Award" size={17} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 175 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{c.title}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    {c.assessedHere
                      ? 'Passed ' + (c.enrol.completedAt ? window.shortDate(c.enrol.completedAt) : '') + ' · ' + c.enrol.attempts + ' ' + (c.enrol.attempts === 1 ? 'attempt' : 'attempts')
                      : 'Recorded ' + (c.assignment && c.assignment.completedAt ? window.shortDate(c.assignment.completedAt) : 'on your record') + ' · not assessed in eLearning'}
                    {c.assignment && c.assignment.expiresAt ? ' · valid until ' + window.shortDate(c.assignment.expiresAt) : ''}
                  </span>
                </span>
                {c.assessedHere
                  ? <Badge tone="success">{c.enrol.bestScore}%</Badge>
                  : <Badge tone="dark">Certified</Badge>}
                <Button size="xs" variant="secondary" tone="dark" onClick={() => onOpen(c.id)}>
                  {c.assessedHere ? 'Review' : 'Take Refresher'}
                </Button>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {assigned.length === 0 && done.length === 0 && (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="BookOpen" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing assigned yet</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>
            Courses assigned in the Training module appear here. You can also take anything from the catalogue voluntarily.
          </span>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Catalogue ---------------- */
function CourseCatalogue({ data, onOpen }) {
  const { myCourses, S, L } = data;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const categories = Array.from(new Set(myCourses.map(c => c.category)));

  const list = myCourses
    .filter(c => cat === 'All' || c.category === cat)
    .filter(c => !q || (c.title + ' ' + c.summary).toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the catalogue…" aria-label="Search courses"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)' }}>{list.length} of {myCourses.length} courses</span>
      </Card>

      <div className="el-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
        {list.map(c => (
          <Card key={c.id} tone="dark" padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{
                width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
              }}><Icon name={c.category === 'Health & Safety' ? 'HardHat' : c.category === 'Technology' ? 'Shield' : 'Scale'} size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{c.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>{c.code} · {c.category}</span>
              </span>
              {c.done ? <Badge tone="success">Passed</Badge> : c.assigned ? <Badge tone="warning">Assigned</Badge> : null}
            </div>

            <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)', flex: 1 }}>{c.summary}</span>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[['Lessons', c.lessons.length], ['Minutes', c.minutes], ['Questions', c.quiz.length]].map(([label, n]) => (
                <span key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{n}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                </span>
              ))}
            </div>

            {c.lessonPct > 0 && !c.done && <ProgressMeter label="Progress" value={c.lessonPct} valueLabel={c.lessonPct + '%'} />}

            <Button size="sm" onClick={() => onOpen(c.id)} iconLeft={<Icon name={c.done ? 'Eye' : 'Play'} size={14} />}>
              {c.done ? 'Review Course' : c.lessonPct > 0 ? 'Continue' : 'Start Course'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { EL_DAY, ELearningSubnav, useLearningData, MyLearning, CourseCatalogue });
