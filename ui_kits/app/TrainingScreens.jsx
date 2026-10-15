/* Training — compliance matrix, course library, renewals and the screen shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Compliance matrix ---------------- */
function TrainingCompliance({ data }) {
  const { employees, records, gaps, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [dept, setDept] = React.useState('All');
  const [only, setOnly] = React.useState('Gaps only');

  const courses = Object.keys(window.MANDATORY);
  const scoped = employees.filter(e => dept === 'All' || e.department === dept);

  /* One row per employee, one cell per mandatory course. Cells are the derived
     status, or 'Not assigned' where no record exists. */
  const rows = scoped.map(e => {
    const cells = courses.map(course => {
      if (!window.isMandatoryFor(course, e.department)) return { course, state: 'n/a' };
      const rec = records.find(r => r.employeeKey === e.id && r.course === course);
      if (!rec) return { course, state: 'Not assigned' };
      return { course, state: rec.liveStatus, rec };
    });
    const outstanding = cells.filter(c => c.state === 'Not assigned' || c.state === 'Expired' || c.state === 'Not started' || c.state === 'In progress').length;
    return { employee: e, name: S.fullName(e), department: e.department, cells, outstanding };
  }).filter(r => only === 'Everyone' || r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  function assignMissing(employeeId, course) {
    const conf = window.MANDATORY[course];
    R.add(employeeId, 'training', {
      course, category: /Fire|Manual|First Aid/.test(course) ? 'Health & Safety' : /GDPR|Equality|Safeguard/.test(course) ? 'Compliance' : 'Technology',
      minutes: 60, progress: 0, status: 'Not started',
      assignedAt: new Date().toISOString().slice(0, 10),
      dueAt: new Date(Date.now() + 30 * window.TRN_DAY).toISOString().slice(0, 10),
      completedAt: '', certificateId: '', expiresAt: '',
      renewEvery: conf ? conf.renewEvery : 365
    });
    S.logActivity(employeeId, 'Training assigned: ' + course);
    refresh();
  }

  const cellStyle = state => {
    const map = {
      'Complete': ['rgba(0,229,212,.12)', 'rgba(0,229,212,.3)', 'var(--nhr-turquoise)'],
      'Expiring soon': ['rgba(242,180,65,.14)', 'rgba(242,180,65,.32)', 'var(--nhr-warning)'],
      'In progress': ['rgba(242,180,65,.10)', 'rgba(242,180,65,.26)', 'var(--nhr-warning)'],
      'Expired': ['rgba(242,84,91,.14)', 'rgba(242,84,91,.32)', 'var(--nhr-danger)'],
      'Not started': ['rgba(255,255,255,.04)', 'var(--border-dark)', 'var(--text-muted-dark)'],
      'Not assigned': ['rgba(242,84,91,.07)', 'rgba(242,84,91,.22)', 'var(--nhr-danger)'],
      'n/a': ['transparent', 'transparent', 'rgba(245,255,255,.18)']
    };
    const [bg, bd, fg] = map[state] || map['n/a'];
    return { background: bg, border: '1px solid ' + bd, color: fg };
  };

  const glyph = { 'Complete': 'Check', 'Expiring soon': 'Clock', 'In progress': 'Loader', 'Expired': 'X', 'Not started': 'Minus', 'Not assigned': 'Plus', 'n/a': 'Slash' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Employees with gaps" value={String(rows.filter(r => r.outstanding > 0).length)} caption="Outstanding mandatory training" icon={<Icon name="CircleAlert" size={18} />} />
        <StatTile label="Never assigned" value={String(gaps.length)} caption="Required but no record" icon={<Icon name="FileX" size={18} />} />
        <StatTile label="Expired" value={String(records.filter(r => r.liveStatus === 'Expired').length)} caption="Needs renewing" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Mandatory courses" value={String(courses.length)} caption="Defined in one place" icon={<Icon name="ShieldCheck" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          <option value="All">All departments</option>
          {S.DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Gaps only', 'Everyone'].map(k => (
            <button key={k} type="button" onClick={() => setOnly(k)} style={{
              padding: '9px 13px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (only === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: only === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: only === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: only === k ? 700 : 600
            }}>{k}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-training-compliance-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'name' }, { label: 'Department', key: 'dept' }]
              .concat(courses.map(c => ({ label: c, key: c }))),
            employees.map(e => {
              const row = { name: S.fullName(e), dept: e.department };
              courses.forEach(course => {
                if (!window.isMandatoryFor(course, e.department)) { row[course] = 'Not required'; return; }
                const rec = records.find(r => r.employeeKey === e.id && r.course === course);
                row[course] = rec ? rec.liveStatus : 'Not assigned';
              });
              return row;
            }))}>Export Matrix</Button>
      </Card>

      <Card tone="dark" padding={0} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', fontFamily: 'var(--font-core)' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-dark-2, #0D1111)', textAlign: 'left', padding: '13px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)' }}>Employee</th>
              {courses.map(c => (
                <th key={c} title={c} style={{ padding: '13px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)', borderLeft: '1px solid var(--border-dark)', minWidth: 86, verticalAlign: 'bottom', lineHeight: 1.3 }}>
                  {c.replace(' and ', ' & ').split(' ').slice(0, 3).join(' ')}
                </th>
              ))}
              <th style={{ padding: '13px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted-dark)', borderBottom: '1px solid var(--border-dark)', borderLeft: '1px solid var(--border-dark)' }}>GAPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.employee.id}>
                <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-dark-2, #0D1111)', padding: '10px 14px', borderBottom: '1px solid var(--border-dark)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar employee={r.employee} size={28} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>{r.department}</span>
                    </span>
                  </span>
                </td>
                {r.cells.map(c => (
                  <td key={c.course} style={{ padding: 7, textAlign: 'center', borderBottom: '1px solid var(--border-dark)', borderLeft: '1px solid var(--border-dark)' }}>
                    {c.state === 'n/a' ? (
                      <span title="Not required for this department" style={{ fontSize: 13, color: 'rgba(245,255,255,.16)' }}>—</span>
                    ) : c.state === 'Not assigned' && canWrite ? (
                      <button type="button" title={'Assign ' + c.course} onClick={() => assignMissing(r.employee.id, c.course)}
                        style={Object.assign({
                          width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                        }, cellStyle(c.state))}>
                        <Icon name="Plus" size={12} />
                      </button>
                    ) : (
                      <span title={c.course + ': ' + c.state} style={Object.assign({
                        width: 26, height: 26, borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                      }, cellStyle(c.state))}>
                        <Icon name={glyph[c.state] || 'Minus'} size={12} />
                      </span>
                    )}
                  </td>
                ))}
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid var(--border-dark)', borderLeft: '1px solid var(--border-dark)' }}>
                  <Badge tone={r.outstanding === 0 ? 'success' : r.outstanding > 2 ? 'danger' : 'warning'}>{r.outstanding}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['Complete', 'Check'], ['Expiring soon', 'Clock'], ['In progress', 'Loader'], ['Expired', 'X'], ['Not started', 'Minus'], ['Not assigned', 'Plus']].map(([state, g]) => (
          <span key={state} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-body-dark)' }}>
            <span style={Object.assign({ width: 22, height: 22, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, cellStyle(state))}>
              <Icon name={g} size={11} />
            </span>
            {state}
          </span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>— not required for that department</span>
      </Card>
    </div>
  );
}

/* ---------------- Course library ---------------- */
function CourseLibrary({ data }) {
  const { records, employees, courseNames, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [assigning, setAssigning] = React.useState(null);
  const [q, setQ] = React.useState('');

  const rows = courseNames.map(course => {
    const recs = records.filter(r => r.course === course);
    const conf = window.MANDATORY[course];
    const eligible = conf ? employees.filter(e => window.isMandatoryFor(course, e.department)) : [];
    const complete = recs.filter(r => r.liveStatus === 'Complete' || r.liveStatus === 'Expiring soon').length;
    return {
      id: course, course,
      category: recs[0] ? recs[0].category : 'Compliance',
      mandatory: !!conf,
      scope: conf ? (conf.scope === 'all' ? 'Everyone' : conf.scope.join(', ')) : 'Optional',
      renewEvery: conf ? conf.renewEvery : null,
      assigned: recs.length, complete,
      required: eligible.length,
      pct: eligible.length ? Math.round(complete / eligible.length * 100) : (recs.length ? Math.round(complete / recs.length * 100) : 0)
    };
  }).filter(r => !q || r.course.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.mandatory - a.mandatory) || a.pct - b.pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Courses" value={String(courseNames.length)} caption={Object.keys(window.MANDATORY).length + ' mandatory'} icon={<Icon name="GraduationCap" size={18} />} />
        <StatTile label="Assignments" value={String(records.length)} caption="Across all employees" icon={<Icon name="Files" size={18} />} />
        <StatTile label="Completions" value={String(records.filter(r => r.status === 'Complete').length)} caption="Certificate issued" icon={<Icon name="Award" size={18} />} />
        <StatTile label="Learning hours" value={String(Math.round(records.filter(r => r.status === 'Complete').reduce((n, r) => n + (Number(r.minutes) || 0), 0) / 60))} caption="Completed course time" icon={<Icon name="Clock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 190, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses…" aria-label="Search courses"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        {canWrite && <Button size="sm" onClick={() => setAssigning('any')} iconLeft={<Icon name="Plus" size={16} />}>Assign Course</Button>}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(r => (
          <Card key={r.id} tone="dark" padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{
                width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,229,212,.08)', border: '1px solid rgba(0,229,212,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nhr-turquoise)'
              }}><Icon name={r.category === 'Health & Safety' ? 'HardHat' : r.category === 'Technology' ? 'Shield' : 'Scale'} size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 190 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{r.course}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                  {r.category} · {r.mandatory ? 'Required: ' + r.scope : 'Optional'}
                  {r.renewEvery ? ' · renews every ' + Math.round(r.renewEvery / 365 * 10) / 10 + (r.renewEvery >= 365 ? ' years' : ' days') : ''}
                </span>
              </span>
              {[['Assigned', r.assigned], ['Complete', r.complete], ['Required', r.mandatory ? r.required : '—']].map(([label, n]) => (
                <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fff' }}>{n}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-dark)' }}>{label}</span>
                </span>
              ))}
              {r.mandatory && <Badge tone={r.pct >= 100 ? 'success' : r.pct >= 70 ? 'warning' : 'danger'}>{r.pct}%</Badge>}
              {canWrite && <Button size="xs" variant="secondary" tone="dark" onClick={() => setAssigning(r.course)}>Assign</Button>}
            </div>
            {r.mandatory && <ProgressMeter label={r.complete + ' of ' + r.required + ' required employees up to date'} value={r.pct} valueLabel={r.pct + '%'} />}
          </Card>
        ))}
      </div>

      {assigning && <AssignCourseDialog data={data} course={assigning === 'any' ? '' : assigning} onClose={() => setAssigning(null)} />}
    </div>
  );
}

/* ---------------- Assign course ---------------- */
function AssignCourseDialog({ data, course, onClose }) {
  const { employees, records, courseNames, S, R, refresh } = data;
  const [form, setForm] = React.useState({
    course: course || courseNames[0] || '', mode: 'Selected employees',
    department: S.DEPARTMENTS[0], employeeId: '',
    dueAt: new Date(Date.now() + 30 * window.TRN_DAY).toISOString().slice(0, 10)
  });
  const [error, setError] = React.useState('');

  const conf = window.MANDATORY[form.course];
  /* Who would receive it, and who already has it — assigning a duplicate is the
     most common way these lists get noisy. */
  const targets = form.mode === 'Whole department'
    ? employees.filter(e => e.department === form.department)
    : form.mode === 'Everyone required'
      ? employees.filter(e => window.isMandatoryFor(form.course, e.department))
      : (form.employeeId ? [S.get(form.employeeId)].filter(Boolean) : []);
  const already = targets.filter(e => records.some(r => r.employeeKey === e.id && r.course === form.course));
  const willAssign = targets.filter(e => !already.some(a => a.id === e.id));

  function submit() {
    if (!form.course) return setError('Choose a course.');
    if (!willAssign.length) return setError(already.length ? 'Everyone selected already has this course on record.' : 'No one is selected.');
    willAssign.forEach(e => {
      R.add(e.id, 'training', {
        course: form.course,
        category: /Fire|Manual|First Aid/.test(form.course) ? 'Health & Safety' : /GDPR|Equality|Safeguard/.test(form.course) ? 'Compliance' : 'Technology',
        minutes: 60, progress: 0, status: 'Not started',
        assignedAt: new Date().toISOString().slice(0, 10), dueAt: form.dueAt,
        completedAt: '', certificateId: '', expiresAt: '',
        renewEvery: conf ? conf.renewEvery : 365
      });
      S.logActivity(e.id, 'Training assigned: ' + form.course + ' (due ' + window.shortDate(form.dueAt) + ')');
    });
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Assign Course"
      subtitle="Adds the course to each employee record with a due date." width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Course" required span={2} value={form.course} onChange={v => setForm(p => Object.assign({}, p, { course: v }))} options={courseNames} />
          <SelectField label="Assign to" span={2} value={form.mode} onChange={v => setForm(p => Object.assign({}, p, { mode: v }))}
            options={['Selected employees', 'Whole department', 'Everyone required']} />
          {form.mode === 'Whole department' && (
            <SelectField label="Department" span={2} value={form.department} onChange={v => setForm(p => Object.assign({}, p, { department: v }))} options={S.DEPARTMENTS} />
          )}
          {form.mode === 'Selected employees' && (
            <SelectField label="Employee" required span={2} value={form.employeeId} placeholder="Select an employee…"
              onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
              options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          )}
          <TextField label="Due date" type="date" value={form.dueAt} onChange={v => setForm(p => Object.assign({}, p, { dueAt: v }))} />
        </FormGrid>

        {conf && (
          <Notice icon="ShieldCheck">
            {form.course} is mandatory for {conf.scope === 'all' ? 'everyone' : conf.scope.join(' and ')} and renews every{' '}
            {Math.round(conf.renewEvery / 365 * 10) / 10} years, so completing it sets an expiry date automatically.
          </Notice>
        )}
        {targets.length > 0 && (
          <Notice icon={already.length ? 'TriangleAlert' : 'Info'} tone={already.length && !willAssign.length ? 'warn' : undefined}>
            {willAssign.length} {willAssign.length === 1 ? 'employee' : 'employees'} will be assigned this course.
            {already.length > 0 && ' ' + already.length + ' already ' + (already.length === 1 ? 'has' : 'have') + ' it on record and will be skipped.'}
          </Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>
            Assign{willAssign.length ? ' to ' + willAssign.length : ''}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------- Renewals ---------------- */
function TrainingRenewals({ data }) {
  const { records, S, R, refresh } = data;
  const canWrite = S.can('employees.write');
  const [show, setShow] = React.useState('Due');

  const expired = records.filter(r => r.liveStatus === 'Expired');
  const expiring = records.filter(r => r.liveStatus === 'Expiring soon');
  const outstanding = records.filter(r => r.status !== 'Complete');
  const overdueWork = outstanding.filter(r => r.dueAt && new Date(r.dueAt) < Date.now());

  const due = expired.concat(expiring).sort((a, b) => (a.daysToExpiry || 0) - (b.daysToExpiry || 0));
  const list = show === 'Due' ? due : outstanding.sort((a, b) => (a.dueAt || '9999') < (b.dueAt || '9999') ? -1 : 1);

  /* Completing a renewal resets the certificate and pushes the expiry out by
     the course's renewal period, so the record stays truthful. */
  function complete(r) {
    const conf = window.MANDATORY[r.course];
    const period = Number(r.renewEvery) || (conf ? conf.renewEvery : 365);
    const today = new Date();
    R.update(r.employeeKey, 'training', r.id, {
      status: 'Complete', progress: 100,
      completedAt: today.toISOString().slice(0, 10),
      certificateId: 'CERT-' + String(50000 + Math.floor(Math.random() * 9999)),
      expiresAt: new Date(today.getTime() + period * window.TRN_DAY).toISOString().slice(0, 10)
    });
    S.logActivity(r.employeeKey, 'Training completed: ' + r.course +
      ' — valid until ' + window.shortDate(new Date(today.getTime() + period * window.TRN_DAY).toISOString().slice(0, 10)));
    refresh();
  }

  function reassign(r) {
    R.update(r.employeeKey, 'training', r.id, {
      status: 'Not started', progress: 0, completedAt: '', certificateId: '', expiresAt: '',
      assignedAt: new Date().toISOString().slice(0, 10),
      dueAt: new Date(Date.now() + 30 * window.TRN_DAY).toISOString().slice(0, 10)
    });
    S.logActivity(r.employeeKey, 'Training reassigned for renewal: ' + r.course);
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Expired" value={String(expired.length)} caption="No longer valid" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="Expiring soon" value={String(expiring.length)} caption={'Within ' + window.EXPIRY_WARNING_DAYS + ' days'} icon={<Icon name="CalendarClock" size={18} />} />
        <StatTile label="Not yet complete" value={String(outstanding.length)} caption="Assigned, unfinished" icon={<Icon name="Loader" size={18} />} />
        <StatTile label="Past due date" value={String(overdueWork.length)} caption="Overdue assignments" icon={<Icon name="Clock" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Due', due.length], ['Outstanding', outstanding.length]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setShow(k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px',
              borderRadius: 'var(--radius-btn)', cursor: 'pointer',
              border: '1px solid ' + (show === k ? 'rgba(0,229,212,.35)' : 'var(--border-dark)'),
              background: show === k ? 'rgba(0,229,212,.10)' : 'transparent',
              color: show === k ? 'var(--nhr-turquoise)' : 'rgba(245,255,255,.62)',
              fontFamily: 'var(--font-core)', fontSize: 13, fontWeight: show === k ? 700 : 600
            }}>{k === 'Due' ? 'Renewals due' : 'Outstanding'}<Badge tone="dark">{n}</Badge></button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-training-renewals-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Employee', key: 'emp' }, { label: 'Department', key: 'dept' }, { label: 'Course', key: 'course' },
            { label: 'Status', key: 'st' }, { label: 'Completed', key: 'done' }, { label: 'Expires', key: 'exp' },
            { label: 'Days to expiry', key: 'days' }, { label: 'Certificate', key: 'cert' }],
            due.concat(outstanding).map(r => ({
              emp: r.employeeName, dept: r.department, course: r.course, st: r.liveStatus,
              done: r.completedAt || '', exp: r.expiresAt || '',
              days: r.daysToExpiry == null ? '' : r.daysToExpiry, cert: r.certificateId || ''
            })))}>Export</Button>
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(r => {
            const bad = r.liveStatus === 'Expired';
            const warn = r.liveStatus === 'Expiring soon';
            const overdue = r.status !== 'Complete' && r.dueAt && new Date(r.dueAt) < Date.now();
            return (
              <Card key={r.employeeKey + r.id} tone="dark" padding={16} style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                borderColor: bad ? 'rgba(242,84,91,.28)' : warn || overdue ? 'rgba(242,180,65,.26)' : undefined
              }}>
                <Avatar employee={r.employee} size={38} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 175 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.course}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                    {r.employeeName} · {r.department}{r.mandatory ? ' · mandatory' : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 96 }}>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: bad ? 'var(--nhr-danger)' : '#fff' }}>
                    {r.expiresAt ? window.shortDate(r.expiresAt) : r.dueAt ? 'Due ' + window.shortDate(r.dueAt) : '—'}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted-dark)' }}>
                    {r.daysToExpiry != null
                      ? (r.daysToExpiry < 0 ? Math.abs(r.daysToExpiry) + ' days expired' : r.daysToExpiry + ' days left')
                      : overdue ? 'Past due' : 'No expiry'}
                  </span>
                </span>
                {r.certificateId ? <Badge tone="dark">{r.certificateId}</Badge> : null}
                <Badge tone={window.TRN_TONE[r.liveStatus] || 'dark'}>{r.liveStatus}</Badge>
                {canWrite && (
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.status !== 'Complete'
                      ? <Button size="xs" onClick={() => complete(r)} iconLeft={<Icon name="Check" size={13} />}>Mark Complete</Button>
                      : <Button size="xs" variant="secondary" tone="dark" onClick={() => reassign(r)}>Reassign</Button>}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="CircleCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing due</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>No certificates are expired or expiring in the next {window.EXPIRY_WARNING_DAYS} days.</span>
        </Card>
      )}

      <Card tone="dark" padding={18} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="Info" size={18} style={{ color: 'var(--nhr-turquoise)', flex: '0 0 auto', marginTop: 2 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body-dark)' }}>
          Renewal periods here are illustrative defaults. Real requirements vary by course, awarding body and sector —
          first aid certificates run three years with annual refresher guidance, and some sectors set their own intervals.
          Check each course against its provider and your own risk assessment before relying on these dates.
        </span>
      </Card>
    </div>
  );
}

/* ---------------- Screen shell ---------------- */
function TrainingScreen() {
  const data = window.useTrainingData();
  const [view, setView] = React.useState('Overview');
  const [assigning, setAssigning] = React.useState(false);
  const canWrite = data.S.can('employees.write');

  const renewals = data.records.filter(r => r.liveStatus === 'Expired' || r.liveStatus === 'Expiring soon').length;

  const body = {
    'Overview': <window.TrainingOverview data={data} onView={setView} />,
    'Compliance': <TrainingCompliance data={data} />,
    'Courses': <CourseLibrary data={data} />,
    'Renewals': <TrainingRenewals data={data} />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>Training</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body-dark)', maxWidth: 580 }}>
            Mandatory training compliance across the business, with expiry tracking and a matrix of who is missing what. Assignments write straight to the employee record.
          </p>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" tone="dark" size="sm" onClick={() => setView('Renewals')} iconLeft={<Icon name="CalendarClock" size={15} />}>
              Renewals{renewals > 0 ? ' (' + renewals + ')' : ''}
            </Button>
            <Button size="sm" onClick={() => setAssigning(true)} iconLeft={<Icon name="Plus" size={16} />}>Assign Course</Button>
          </div>
        )}
      </div>

      <window.TrainingSubnav view={view} onSelect={setView} counts={{ gaps: data.gaps.length, renewals }} />
      {window.RoleSwitcher ? <window.RoleSwitcher /> : null}
      <div>{body[view]}</div>
      {assigning && <AssignCourseDialog data={data} course="" onClose={() => setAssigning(false)} />}
    </div>
  );
}

Object.assign(window, { TrainingScreen, TrainingCompliance, CourseLibrary, AssignCourseDialog, TrainingRenewals });
