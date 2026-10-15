/* eLearning — course player with assessment, team progress, certificates, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Course player ---------------- */
function CoursePlayer({ data, courseId, onClose }) {
  const { myCourses, me, L, refresh } = data;
  const course = myCourses.find(c => c.id === courseId);
  const [step, setStep] = React.useState(0);          /* 0..lessons-1, then the quiz */
  const [answers, setAnswers] = React.useState({});
  const [result, setResult] = React.useState(null);
  if (!course || !me) return null;

  const lessons = course.lessons;
  const onQuiz = step >= lessons.length;
  const lesson = lessons[step];
  const enrol = course.enrol;
  const lessonsDone = enrol.lessonsComplete.length;
  const allLessonsDone = lessonsDone >= lessons.length;

  function markDoneAndNext() {
    L.completeLesson(me.id, course.id, lesson.id);
    refresh();
    setStep(step + 1);
  }

  function submit() {
    const ordered = course.quiz.map((q, i) => answers[i]);
    const r = L.submitQuiz(me.id, course.id, ordered);
    setResult(r);
    refresh();
  }

  const answeredAll = course.quiz.every((q, i) => answers[i] != null);

  return (
    <Drawer open onClose={onClose} title={course.title}
      subtitle={course.code + ' · ' + course.category + ' · ' + course.minutes + ' minutes'} width={760}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Lesson rail — position and navigation in one row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {lessons.map((l, i) => {
            const done = enrol.lessonsComplete.indexOf(l.id) > -1;
            const active = !onQuiz && i === step;
            return (
              <button key={l.id} type="button" onClick={() => { setStep(i); setResult(null); }}
                title={l.title}
                style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-core)', fontSize: 11.5, fontWeight: 800,
                  border: '1px solid ' + (active ? 'rgba(0,229,212,.5)' : done ? 'rgba(0,229,212,.28)' : 'var(--border-dark)'),
                  background: active ? 'rgba(0,229,212,.18)' : done ? 'rgba(0,229,212,.07)' : 'rgba(255,255,255,.03)',
                  color: active || done ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)'
                }}>
                {done ? <Icon name="Check" size={12} /> : i + 1}
              </button>
            );
          })}
          <span style={{ width: 1, height: 22, background: 'var(--border-dark)', margin: '0 4px' }} />
          <button type="button" onClick={() => { setStep(lessons.length); setResult(null); }}
            disabled={!allLessonsDone && !enrol.passed}
            title={allLessonsDone || enrol.passed ? 'Assessment' : 'Complete the lessons first'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 8,
              cursor: (allLessonsDone || enrol.passed) ? 'pointer' : 'not-allowed',
              border: '1px solid ' + (onQuiz ? 'rgba(0,229,212,.5)' : 'var(--border-dark)'),
              background: onQuiz ? 'rgba(0,229,212,.18)' : 'rgba(255,255,255,.03)',
              color: (allLessonsDone || enrol.passed) ? (onQuiz ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.7)') : 'rgba(245,255,255,.3)',
              fontFamily: 'var(--font-core)', fontSize: 12, fontWeight: 700
            }}>
            <Icon name={enrol.passed ? 'Award' : 'ClipboardCheck'} size={13} />Assessment
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>
            {lessonsDone}/{lessons.length}
          </span>
        </div>

        {!onQuiz ? (
          <React.Fragment>
            <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, color: 'var(--nhr-turquoise)' }}>
                Lesson {step + 1} of {lessons.length}
              </span>
              <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>{lesson.title}</h3>
              {lesson.body.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-body-dark)', textWrap: 'pretty' }}>{para}</p>
              ))}
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" tone="dark" disabled={step === 0} onClick={() => setStep(step - 1)} iconLeft={<Icon name="ChevronLeft" size={15} />}>Previous</Button>
              {enrol.lessonsComplete.indexOf(lesson.id) > -1 ? (
                <Button onClick={() => setStep(step + 1)} iconLeft={<Icon name="ChevronRight" size={15} />}>
                  {step === lessons.length - 1 ? 'Go to Assessment' : 'Next Lesson'}
                </Button>
              ) : (
                <Button onClick={markDoneAndNext} iconLeft={<Icon name="Check" size={15} />}>
                  {step === lessons.length - 1 ? 'Finish Lessons' : 'Mark Complete & Continue'}
                </Button>
              )}
            </div>
          </React.Fragment>
        ) : result ? (
          <React.Fragment>
            <Card tone="dark" padding="var(--card-padding-lg)" style={{
              display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start',
              borderColor: result.passed ? 'rgba(0,229,212,.3)' : 'rgba(242,180,65,.3)',
              background: result.passed ? 'rgba(0,229,212,.05)' : 'rgba(242,180,65,.04)'
            }}>
              <Icon name={result.passed ? 'Award' : 'RotateCcw'} size={26} style={{ color: result.passed ? 'var(--nhr-turquoise)' : 'var(--nhr-warning)' }} />
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.passed ? 'var(--nhr-turquoise)' : 'var(--nhr-warning)' }}>
                {result.score}%
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                {result.passed ? 'Passed' : 'Not passed this time'}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
                {result.correct} of {result.total} correct. The pass mark is {L.PASS_MARK}%.
                {result.passed
                  ? ' A certificate has been issued and written to your training record, with an expiry date set from the course renewal period.'
                  : ' Review the lessons and try again — there is no limit on attempts, and your best score is kept.'}
              </span>
            </Card>

            {/* Per-question feedback, which is where the learning actually happens */}
            <DashboardCard title="Your answers" padding={16}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {course.quiz.map((q, i) => {
                  const mine = answers[i];
                  const right = mine === q.answer;
                  return (
                    <div key={q.id} style={{
                      display: 'flex', flexDirection: 'column', gap: 6, padding: 12,
                      border: '1px solid ' + (right ? 'rgba(0,229,212,.22)' : 'rgba(242,84,91,.24)'),
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <Icon name={right ? 'Check' : 'X'} size={14} style={{ flex: '0 0 auto', marginTop: 3, color: right ? 'var(--nhr-turquoise)' : 'var(--nhr-danger)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.5 }}>{q.q}</span>
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted-dark)', paddingLeft: 23 }}>
                        You answered: {q.options[mine]}
                        {!right && <React.Fragment><br />Correct answer: <strong style={{ color: 'var(--nhr-turquoise)' }}>{q.options[q.answer]}</strong></React.Fragment>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DashboardCard>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              {!result.passed && (
                <Button variant="secondary" tone="dark" onClick={() => { setAnswers({}); setResult(null); }} iconLeft={<Icon name="RotateCcw" size={15} />}>Try Again</Button>
              )}
              <Button onClick={onClose}>{result.passed ? 'Done' : 'Back to My Learning'}</Button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
              <Icon name="ClipboardCheck" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto' }} />
              <span style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                {course.quiz.length} questions, pass mark {L.PASS_MARK}%. Attempts are unlimited and your best score is kept.
                {enrol.attempts > 0 && ' Previous best: ' + enrol.bestScore + '% over ' + enrol.attempts + ' ' + (enrol.attempts === 1 ? 'attempt' : 'attempts') + '.'}
              </span>
            </Card>

            {course.quiz.map((q, i) => (
              <Card key={q.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: '#fff' }}>
                  {i + 1}. {q.q}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {q.options.map((opt, oi) => {
                    const picked = answers[i] === oi;
                    return (
                      <button key={oi} type="button" onClick={() => setAnswers(a => Object.assign({}, a, { [i]: oi }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px',
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                          border: '1px solid ' + (picked ? 'rgba(0,229,212,.4)' : 'var(--border-dark)'),
                          background: picked ? 'rgba(0,229,212,.08)' : 'rgba(255,255,255,.02)',
                          color: picked ? '#fff' : 'var(--text-body-dark)',
                          fontFamily: 'var(--font-core)', fontSize: 13.5, minHeight: 46,
                          transition: 'all var(--dur-base) var(--ease-out)'
                        }}>
                        <span style={{
                          width: 18, height: 18, flex: '0 0 auto', borderRadius: '50%',
                          border: '1px solid ' + (picked ? 'var(--nhr-turquoise)' : 'var(--border-dark)'),
                          background: picked ? 'var(--nhr-turquoise)' : 'transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                        }}>{picked && <Icon name="Check" size={11} style={{ color: '#000' }} />}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" tone="dark" onClick={() => setStep(lessons.length - 1)} iconLeft={<Icon name="ChevronLeft" size={15} />}>Back to Lessons</Button>
              <Button disabled={!answeredAll} onClick={submit} iconLeft={<Icon name="Check" size={15} />}>
                {answeredAll ? 'Submit Assessment' : 'Answer all ' + course.quiz.length + ' questions'}
              </Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Team progress ---------------- */
function TeamProgress({ data }) {
  const { employees, courses, S, R, L } = data;

  /* Learning progress per employee across the whole catalogue, read from both
     stores: assignment from training records, pass from enrolments. */
  const rows = employees.map(e => {
    const training = R.get(e).training || [];
    const assigned = courses.filter(c => training.some(t => t.course === c.title));
    const passed = courses.filter(c => L.enrolment(e.id, c.id).passed);
    const started = courses.filter(c => {
      const en = L.enrolment(e.id, c.id);
      return en.lessonsComplete.length > 0 && !en.passed;
    });
    const scores = courses.map(c => L.enrolment(e.id, c.id).bestScore).filter(s => s != null);
    return {
      id: e.id, employee: e, name: S.fullName(e), department: e.department,
      assigned: assigned.length, passed: passed.length, started: started.length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      pct: assigned.length ? Math.round(passed.length / assigned.length * 100) : (passed.length ? 100 : 0)
    };
  }).sort((a, b) => a.pct - b.pct);

  const totalAssigned = rows.reduce((n, r) => n + r.assigned, 0);
  const totalPassed = rows.reduce((n, r) => n + r.passed, 0);
  const allScores = rows.map(r => r.avgScore).filter(s => s != null);

  const courseRows = courses.map(c => {
    const enrolled = employees.filter(e => L.enrolment(e.id, c.id).attempts > 0 || L.enrolment(e.id, c.id).lessonsComplete.length > 0);
    const passed = employees.filter(e => L.enrolment(e.id, c.id).passed);
    const attempts = employees.reduce((n, e) => n + (L.enrolment(e.id, c.id).attempts || 0), 0);
    const scores = employees.map(e => L.enrolment(e.id, c.id).bestScore).filter(s => s != null);
    return {
      id: c.id, title: c.title,
      startedCount: enrolled.length, passedCount: passed.length, attempts,
      firstTime: passed.length && attempts ? Math.round(passed.length / attempts * 100) : null,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    };
  }).sort((a, b) => b.startedCount - a.startedCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Completion" value={totalAssigned ? Math.round(totalPassed / totalAssigned * 100) + '%' : '—'} caption={totalPassed + ' of ' + totalAssigned + ' assigned'} icon={<Icon name="ChartColumn" size={18} />} />
        <StatTile label="Passes" value={String(totalPassed)} caption="Across the catalogue" icon={<Icon name="Award" size={18} />} />
        <StatTile label="In progress" value={String(rows.reduce((n, r) => n + r.started, 0))} caption="Started, not passed" icon={<Icon name="Loader" size={18} />} />
        <StatTile label="Average score" value={allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) + '%' : '—'} caption={'Pass mark ' + L.PASS_MARK + '%'} icon={<Icon name="Target" size={18} />} />
      </div>

      <DashboardCard title="By employee" padding={16}
        action={<Button size="xs" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={13} />}
          onClick={() => window.downloadCsv('nhr-elearning-progress-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'name' }, { label: 'Department', key: 'dept' }, { label: 'Assigned', key: 'assigned' },
            { label: 'Passed', key: 'passed' }, { label: 'In progress', key: 'started' },
            { label: 'Completion %', key: 'pct' }, { label: 'Average score', key: 'avg' }],
            rows.map(r => ({
              name: r.name, dept: r.department, assigned: r.assigned, passed: r.passed,
              started: r.started, pct: r.pct, avg: r.avgScore == null ? '' : r.avgScore
            })))}>Export</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 13, border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
                <Avatar employee={r.employee} size={32} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{r.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>{r.employee.jobTitle} · {r.department}</span>
                </span>
                {[['Assigned', r.assigned], ['Passed', r.passed], ['Score', r.avgScore == null ? '—' : r.avgScore + '%']].map(([label, v]) => (
                  <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 58 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{v}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                  </span>
                ))}
                <Badge tone={r.pct >= 100 ? 'success' : r.pct >= 50 ? 'warning' : 'danger'}>{r.pct}%</Badge>
              </div>
              {r.assigned > 0 && <ProgressMeter label={r.passed + ' of ' + r.assigned + ' assigned courses passed'} value={r.pct} valueLabel={r.pct + '%'} />}
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="By course" padding={16} action={<Badge tone="dark">Most activity first</Badge>}>
        <DataTable compact columns={[
          { key: 'title', label: 'Course' },
          { key: 'startedCount', label: 'Started', mono: true, align: 'right' },
          { key: 'passedCount', label: 'Passed', mono: true, align: 'right' },
          { key: 'attempts', label: 'Attempts', mono: true, align: 'right' },
          { key: 'avgLabel', label: 'Avg score', mono: true, align: 'right' }
        ]} rows={courseRows.map(c => Object.assign({}, c, { avgLabel: c.avg == null ? '—' : c.avg + '%' }))} />
        <span style={{ display: 'block', marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-muted-dark)' }}>
          A course needing many attempts per pass usually means the questions are ambiguous rather than the learners
          inattentive. Worth reading the wording before drawing conclusions about people.
        </span>
      </DashboardCard>
    </div>
  );
}

/* ---------------- Certificates ---------------- */
function Certificates({ data }) {
  const { employees, courses, S, R, L } = data;
  const [who, setWho] = React.useState('All');

  const certs = [];
  employees.forEach(e => {
    (R.get(e).training || []).forEach(t => {
      if (t.status !== 'Complete' || !t.certificateId) return;
      const course = L.courseByTitle(t.course);
      const enrol = course ? L.enrolment(e.id, course.id) : null;
      const days = t.expiresAt ? Math.floor((new Date(t.expiresAt) - Date.now()) / window.EL_DAY) : null;
      certs.push({
        id: e.id + t.id, employee: e, employeeName: S.fullName(e), department: e.department,
        course: t.course, certificateId: t.certificateId,
        completedAt: t.completedAt, expiresAt: t.expiresAt, days,
        score: enrol && enrol.bestScore != null ? enrol.bestScore : null,
        viaELearning: !!(enrol && enrol.passed),
        expired: days != null && days < 0
      });
    });
  });
  certs.sort((a, b) => (a.completedAt || '') < (b.completedAt || '') ? 1 : -1);

  const list = certs.filter(c => who === 'All' || c.employee.id === who);
  const viaEL = certs.filter(c => c.viaELearning);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Certificates" value={String(certs.length)} caption="Issued and on record" icon={<Icon name="Award" size={18} />} />
        <StatTile label="Earned in eLearning" value={String(viaEL.length)} caption="Assessment passed here" icon={<Icon name="GraduationCap" size={18} />} />
        <StatTile label="Expired" value={String(certs.filter(c => c.expired).length)} caption="Need renewing" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Average pass score" value={viaEL.filter(c => c.score != null).length ? Math.round(viaEL.filter(c => c.score != null).reduce((n, c) => n + c.score, 0) / viaEL.filter(c => c.score != null).length) + '%' : '—'} caption="Where recorded" icon={<Icon name="Target" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={who} onChange={e => setWho(e.target.value)} aria-label="Employee" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)', maxWidth: 240
        }}>
          <option value="All">Everyone</option>
          {employees.map(e => <option key={e.id} value={e.id}>{S.fullName(e)}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-certificates-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Certificate', key: 'cert' }, { label: 'Employee', key: 'emp' }, { label: 'Department', key: 'dept' },
            { label: 'Course', key: 'course' }, { label: 'Completed', key: 'done' }, { label: 'Expires', key: 'exp' },
            { label: 'Score', key: 'score' }, { label: 'Source', key: 'src' }],
            certs.map(c => ({
              cert: c.certificateId, emp: c.employeeName, dept: c.department, course: c.course,
              done: c.completedAt || '', exp: c.expiresAt || '',
              score: c.score == null ? '' : c.score, src: c.viaELearning ? 'eLearning assessment' : 'Recorded manually'
            })))}>Export</Button>
      </Card>

      {list.length ? (
        <div className="el-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {list.map(c => (
            <Card key={c.id} tone="dark" padding={18} style={{
              display: 'flex', flexDirection: 'column', gap: 13,
              borderColor: c.expired ? 'rgba(242,84,91,.28)' : 'rgba(0,229,212,.2)',
              background: c.expired ? 'rgba(242,84,91,.03)' : 'rgba(0,229,212,.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Icon name="Award" size={22} style={{ color: c.expired ? 'var(--nhr-danger)' : 'var(--nhr-turquoise)' }} />
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted-dark)' }}>{c.certificateId}</span>
              </div>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{c.course}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-body-dark)' }}>{c.employeeName} · {c.department}</span>
              </span>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{c.completedAt ? window.shortDate(c.completedAt) : '—'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Completed</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.expired ? 'var(--nhr-danger)' : '#fff' }}>{c.expiresAt ? window.shortDate(c.expiresAt) : 'No expiry'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{c.expired ? Math.abs(c.days) + 'd expired' : 'Expires'}</span>
                </span>
                {c.score != null && (
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--nhr-turquoise)' }}>{c.score}%</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>Score</span>
                  </span>
                )}
              </div>
              <Badge tone={c.viaELearning ? 'success' : 'dark'}>{c.viaELearning ? 'Assessment passed' : 'Recorded manually'}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="Award" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No certificates yet</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>Passing an assessment issues a certificate and writes it to the employee record.</span>
        </Card>
      )}

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          These certificates record internal completion of NHR Solution course content. They are not accredited
          qualifications, and some roles require training delivered and certified by an approved provider — first aid at
          work and many plant or machinery tickets among them. Check the requirement before treating an internal
          certificate as sufficient.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function ELearningScreen() {
  const data = window.useLearningData();
  const [view, setView] = React.useState('My Learning');
  const [openCourse, setOpenCourse] = React.useState(null);
  const canManage = data.S.can('employees.write');

  const assigned = data.myCourses.filter(c => c.assigned && !c.done).length;

  /* Team-wide views are for managers and admins; a learner sees their own
     learning and the catalogue. */
  const allow = canManage
    ? ['My Learning', 'Catalogue', 'Team Progress', 'Certificates']
    : ['My Learning', 'Catalogue'];
  const active = allow.indexOf(view) > -1 ? view : 'My Learning';

  const body = {
    'My Learning': <window.MyLearning data={data} onOpen={setOpenCourse} />,
    'Catalogue': <window.CourseCatalogue data={data} onOpen={setOpenCourse} />,
    'Team Progress': <TeamProgress data={data} />,
    'Certificates': <Certificates data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>eLearning</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 600 }}>
            Courses you can actually take: lessons, an assessment, and a certificate on passing. A pass writes back to the training record, so compliance reflects real learning rather than a tick box.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Catalogue')} iconLeft={<Icon name="Library" size={15} />}>
            Catalogue ({data.courses.length})
          </Button>
          {assigned > 0 && (
            <Button size="sm" onClick={() => { setView('My Learning'); setOpenCourse(data.myCourses.filter(c => c.assigned && !c.done)[0].id); }} iconLeft={<Icon name="Play" size={15} />}>
              Continue Learning
            </Button>
          )}
        </div>
      </div>

      <window.ELearningSubnav view={active} onSelect={setView} counts={{ assigned }} allow={allow} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[active]}</div>
      {openCourse && <CoursePlayer data={data} courseId={openCourse} onClose={() => setOpenCourse(null)} />}
    </div>
  );
}

Object.assign(window, { ELearningScreen, CoursePlayer, TeamProgress, Certificates });
