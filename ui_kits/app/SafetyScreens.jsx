/* Health & Safety — incident log, report dialog, risk assessments, actions, shell. */
const { Button, Badge, Card, IconButton, DashboardCard, StatTile, ProgressMeter, DataTable, BarChart } = window.NHRSolutionDesignSystem_0db691;

/* ---------------- Incident log ---------------- */
function IncidentLog({ data }) {
  const { incidents, S, HS, refresh } = data;
  const canWrite = S.can('employees.write');
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState('All');
  const [filter, setFilter] = React.useState('All');
  const [open, setOpen] = React.useState(null);
  const [reporting, setReporting] = React.useState(false);

  const list = incidents
    .filter(i => type === 'All' || i.type === type)
    .filter(i => filter === 'All'
      || (filter === 'RIDDOR' ? i.riddorDue
        : filter === 'Open investigation' ? i.investigation.status !== 'Complete'
          : true))
    .filter(i => !q || (i.description + ' ' + i.reference + ' ' + i.employeeName + ' ' + i.location).toLowerCase().includes(q.toLowerCase()));

  const riddorDue = incidents.filter(i => i.riddorDue);
  const openInv = incidents.filter(i => i.investigation.status !== 'Complete');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Incidents" value={String(incidents.length)} caption="All recorded" icon={<Icon name="TriangleAlert" size={18} />} />
        <StatTile label="RIDDOR outstanding" value={String(riddorDue.length)} caption={incidents.filter(i => i.riddorOverdue).length + ' past deadline'} icon={<Icon name="Send" size={18} />} />
        <StatTile label="Open investigations" value={String(openInv.length)} caption="Not yet concluded" icon={<Icon name="Search" size={18} />} />
        <StatTile label="Near misses" value={String(incidents.filter(i => i.type === 'Near miss').length)} caption="Warning without harm" icon={<Icon name="Eye" size={18} />} />
      </div>

      <Card tone="dark" padding={16} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flex: 1, minWidth: 185, display: 'flex' }}>
          <Icon name="Search" size={16} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted-dark)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search incidents…" aria-label="Search incidents"
            style={{ width: '100%', fontFamily: 'var(--font-core)', fontSize: 13.5, color: '#fff', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-btn)', padding: '11px 13px 11px 36px', outline: 'none' }} />
        </span>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Type" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {['All'].concat(HS.INCIDENT_TYPES).map(o => <option key={o} value={o}>{o === 'All' ? 'All types' : o}</option>)}
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Show" style={{
          background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-btn)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-core)'
        }}>
          {['All', 'RIDDOR', 'Open investigation'].map(o => <option key={o} value={o}>{o === 'All' ? 'Everything' : o}</option>)}
        </select>
        <Button size="sm" variant="secondary" tone="dark" iconLeft={<Icon name="Download" size={15} />}
          onClick={() => window.downloadCsv('nhr-incidents-' + new Date().toISOString().slice(0, 10) + '.csv',
            [{ label: 'Reference', key: 'ref' }, { label: 'Date', key: 'date' }, { label: 'Type', key: 'type' },
            { label: 'Category', key: 'cat' }, { label: 'Severity', key: 'sev' }, { label: 'Location', key: 'loc' },
            { label: 'Person', key: 'emp' }, { label: 'Days off', key: 'off' }, { label: 'RIDDOR reportable', key: 'rid' },
            { label: 'Reported', key: 'sent' }, { label: 'Investigation', key: 'inv' }, { label: 'Description', key: 'desc' }],
            incidents.map(i => ({
              ref: i.reference, date: i.date, type: i.type, cat: i.category, sev: i.severity,
              loc: i.location, emp: i.employeeName, off: i.daysOff || '',
              rid: i.riddor && i.riddor.reportable ? 'Yes' : (i.riddor && i.riddor.mustRecord ? 'Record only' : 'No'),
              sent: i.riddorReported ? i.riddorReportedAt : '', inv: i.investigation.status, desc: i.description
            })))}>Export</Button>
        {/* Anyone can report. Gating incident reporting behind admin rights is
            how near misses stop being reported at all. */}
        <Button size="sm" onClick={() => setReporting(true)} iconLeft={<Icon name="Plus" size={16} />}>Report Incident</Button>
      </Card>

      {list.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(i => {
            const rid = i.riddor;
            const urgent = i.riddorOverdue;
            return (
              <Card key={i.id} tone="dark" padding={16} style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                borderColor: urgent ? 'rgba(242,84,91,.34)' : i.riddorDue ? 'rgba(242,84,91,.24)' : undefined,
                background: urgent ? 'rgba(242,84,91,.04)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{
                    width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i.type === 'Near miss' ? 'rgba(242,180,65,.10)' : 'rgba(242,84,91,.10)',
                    border: '1px solid ' + (i.type === 'Near miss' ? 'rgba(242,180,65,.26)' : 'rgba(242,84,91,.24)'),
                    color: i.type === 'Near miss' ? 'var(--nhr-warning)' : 'var(--nhr-danger)'
                  }}><Icon name={i.type === 'Near miss' ? 'Eye' : i.type === 'Dangerous occurrence' ? 'Zap' : 'TriangleAlert'} size={17} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 200 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{i.reference} · {i.category}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted-dark)' }}>
                      {window.shortDate(i.date)} · {i.location} · {i.employeeName}
                      {i.daysOff ? ' · ' + i.daysOff + ' days off' : ''}
                    </span>
                  </span>
                  <Badge tone={window.SEV_TONE[i.severity] || 'dark'}>{i.severity}</Badge>
                  {rid && rid.reportable && (
                    <Badge tone={i.riddorReported ? 'success' : 'danger'}>
                      {i.riddorReported ? 'RIDDOR sent' : urgent ? 'RIDDOR overdue' : 'RIDDOR due'}
                    </Badge>
                  )}
                  {rid && rid.mustRecord && <Badge tone="warning">Record only</Badge>}
                  <Badge tone={i.investigation.status === 'Complete' ? 'success' : 'warning'}>{i.investigation.status}</Badge>
                  <Button size="xs" variant="secondary" tone="dark" onClick={() => setOpen(open === i.id ? null : i.id)}>
                    {open === i.id ? 'Close' : 'Open'}
                  </Button>
                </div>

                <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-body-dark)' }}>{i.description}</span>

                {rid && (
                  <span style={{
                    display: 'flex', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 'var(--radius-md)',
                    background: rid.reportable ? 'rgba(242,84,91,.06)' : 'rgba(242,180,65,.05)',
                    border: '1px solid ' + (rid.reportable ? 'rgba(242,84,91,.2)' : 'rgba(242,180,65,.2)'),
                    fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-body-dark)'
                  }}>
                    <Icon name={rid.reportable ? 'TriangleAlert' : 'Info'} size={14} style={{ flex: '0 0 auto', marginTop: 2, color: rid.reportable ? 'var(--nhr-danger)' : 'var(--nhr-warning)' }} />
                    <span>
                      <strong style={{ color: '#fff' }}>{rid.reportable ? 'RIDDOR reportable' : 'Must be recorded'} — </strong>
                      {rid.reason}
                      {rid.reportable && !i.riddorReported && ' Report within ' + rid.deadline + ' days of the incident (day ' + i.daysSince + ' now).'}
                      {i.riddorReported && ' Marked as reported on ' + window.shortDate(i.riddorReportedAt) + '.'}
                    </span>
                  </span>
                )}

                {open === i.id && (
                  <IncidentDetail incident={i} data={data} onClose={() => setOpen(null)} />
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="ShieldCheck" size={20} style={{ color: 'var(--nhr-turquoise)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nothing matches those filters</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>Clear the filters, or report an incident to start the log.</span>
        </Card>
      )}

      {reporting && <ReportIncidentDialog data={data} onClose={() => setReporting(false)} />}
    </div>
  );
}

/* ---------------- Incident detail (inline) ---------------- */
function IncidentDetail({ incident, data, onClose }) {
  const { S, HS, refresh } = data;
  const canWrite = S.can('employees.write');
  const [findings, setFindings] = React.useState(incident.investigation.findings || '');
  const [action, setAction] = React.useState({ title: '', owner: '', due: '' });
  const i = incident;

  function concludeInvestigation() {
    HS.updateIncident(i.id, {
      investigation: {
        status: 'Complete', findings: findings || 'Investigation concluded.',
        by: S.session.name, at: new Date().toISOString().slice(0, 10)
      }
    });
    if (i.employeeId) S.logActivity(i.employeeId, 'Safety investigation concluded for ' + i.reference);
    refresh();
  }

  function markReported() {
    HS.updateIncident(i.id, { riddorReported: true, riddorReportedAt: new Date().toISOString().slice(0, 10) });
    refresh();
  }

  function addAction() {
    if (!action.title.trim()) return;
    HS.addAction(i.id, {
      title: action.title, owner: action.owner || S.session.name,
      due: action.due || new Date(Date.now() + 14 * window.HS_DAY).toISOString().slice(0, 10)
    });
    setAction({ title: '', owner: '', due: '' });
    refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 13, borderTop: '1px solid var(--border-dark)' }}>
      <DataTable compact columns={[{ key: 'k', label: 'Detail' }, { key: 'v', label: '' }]} rows={[
        { id: 't', k: 'Type', v: i.type },
        { id: 'd', k: 'Date', v: window.shortDate(i.date) + ' (' + i.daysSince + ' days ago)' },
        { id: 'p', k: 'Person involved', v: i.employee ? i.employeeName + ' · ' + i.department : 'Not recorded' },
        { id: 'r', k: 'Reported by', v: i.reportedBy },
        { id: 'o', k: 'Days unable to work', v: i.daysOff ? String(i.daysOff) : 'None' },
        { id: 'i', k: 'Investigation', v: i.investigation.status === 'Complete' ? 'Concluded ' + window.shortDate(i.investigation.at) + ' by ' + i.investigation.by : 'Open' }
      ]} />

      {i.investigation.status === 'Complete' && i.investigation.findings && (
        <Notice icon="Search">{i.investigation.findings}</Notice>
      )}

      {canWrite && i.riddor && i.riddor.reportable && !i.riddorReported && (
        <Card tone="dark" padding={14} style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', borderColor: 'rgba(242,84,91,.26)' }}>
          <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body-dark)' }}>
            Submit the report on the HSE website, then record it here. This prototype does not submit anything to the HSE.
          </span>
          <Button size="sm" onClick={markReported} iconLeft={<Icon name="Check" size={15} />}>Mark RIDDOR Reported</Button>
        </Card>
      )}

      {canWrite && i.investigation.status !== 'Complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <TextareaField label="Investigation findings" rows={2} value={findings} onChange={setFindings}
            placeholder="Immediate cause, underlying cause, and what has changed as a result." />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" onClick={concludeInvestigation}>Conclude Investigation</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Corrective actions ({(i.actions || []).length})</span>
        {(i.actions || []).map(a => {
          const overdue = a.status !== 'Complete' && a.due && new Date(a.due) < Date.now();
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 11,
              border: '1px solid ' + (overdue ? 'rgba(242,84,91,.26)' : 'var(--border-dark)'),
              borderRadius: 'var(--radius-md)'
            }}>
              <Icon name={a.status === 'Complete' ? 'CircleCheck' : 'Circle'} size={15}
                style={{ flex: '0 0 auto', color: a.status === 'Complete' ? 'var(--nhr-turquoise)' : 'var(--text-muted-dark)' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: a.status === 'Complete' ? 'var(--text-muted-dark)' : '#fff', fontWeight: 600 }}>{a.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted-dark)' }}>
                  {a.owner} · due {window.shortDate(a.due)}{a.completedAt ? ' · done ' + window.shortDate(a.completedAt) : ''}
                </span>
              </span>
              {overdue && <Badge tone="danger">Overdue</Badge>}
              {canWrite && a.status !== 'Complete' && (
                <Button size="xs" onClick={() => { HS.completeAction(i.id, a.id); refresh(); }}>Done</Button>
              )}
            </div>
          );
        })}
        {canWrite && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <span style={{ flex: 2, minWidth: 180 }}>
              <TextField label="New action" value={action.title} onChange={v => setAction(p => Object.assign({}, p, { title: v }))}
                placeholder="Replace the damaged guard and re-brief operators" />
            </span>
            <span style={{ flex: 1, minWidth: 130 }}>
              <TextField label="Due" type="date" value={action.due} onChange={v => setAction(p => Object.assign({}, p, { due: v }))} />
            </span>
            <Button size="sm" disabled={!action.title.trim()} onClick={addAction}>Add Action</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Report incident ---------------- */
function ReportIncidentDialog({ data, onClose }) {
  const { S, HS, refresh } = data;
  const employees = S.list({});
  const [form, setForm] = React.useState({
    type: 'Accident', category: 'Slip, trip or fall', severity: 'First aid only',
    location: '', employeeId: '', date: new Date().toISOString().slice(0, 10),
    description: '', daysOff: '0', diagnosed: false, hospitalisedNonWorker: false,
    logAbsence: true
  });
  const [error, setError] = React.useState('');

  /* Severity is derived from days off where the reporter enters them, because
     the RIDDOR thresholds are day counts, not opinions. */
  const days = Number(form.daysOff) || 0;
  const derivedSeverity = days > 7 ? 'Over-7-day injury' : days > 3 ? 'Over-3-day injury' : form.severity;
  const preview = HS.riddor(Object.assign({}, form, { severity: derivedSeverity }));

  function submit() {
    if (!form.description.trim()) return setError('Describe what happened.');
    if (!form.location.trim()) return setError('Enter where it happened.');
    const inc = HS.addIncident(Object.assign({}, form, {
      severity: derivedSeverity, daysOff: days,
      reportedBy: S.session.name
    }));
    if (form.employeeId) {
      S.logActivity(form.employeeId, 'Safety incident recorded: ' + inc.reference + ' — ' + form.category);
      /* An injury keeping someone off work is an absence as well as an
         incident; recording it once should do both. */
      if (form.logAbsence && days > 0 && window.EmployeeRecords) {
        const start = new Date(form.date);
        window.EmployeeRecords.add(form.employeeId, 'absences', {
          startDate: form.date,
          endDate: new Date(start.getTime() + (days - 1) * window.HS_DAY).toISOString().slice(0, 10),
          days, reason: 'Injury',
          selfCertified: days <= 7, fitNote: days > 7,
          returnToWork: { completed: false, date: '', by: '', notes: '' },
          note: 'Workplace injury — incident ' + inc.reference
        });
        S.logActivity(form.employeeId, 'Absence recorded from incident ' + inc.reference + ' — ' + days + ' days');
      }
    }
    refresh(); onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Report Incident"
      subtitle="Records the incident and works out whether it is RIDDOR reportable." width={660}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGrid cols={2}>
          <SelectField label="Type" value={form.type} onChange={v => setForm(p => Object.assign({}, p, { type: v }))} options={HS.INCIDENT_TYPES} />
          <SelectField label="Category" value={form.category} onChange={v => setForm(p => Object.assign({}, p, { category: v }))} options={HS.CATEGORIES} />
          <TextField label="Date" type="date" value={form.date} onChange={v => setForm(p => Object.assign({}, p, { date: v }))} />
          <TextField label="Location" required value={form.location} onChange={v => setForm(p => Object.assign({}, p, { location: v }))} placeholder="Warehouse — bay 3" />
          <SelectField label="Person involved" span={2} value={form.employeeId} placeholder="Select an employee…"
            onChange={v => setForm(p => Object.assign({}, p, { employeeId: v }))}
            options={employees.map(e => ({ value: e.id, label: S.fullName(e) + ' · ' + e.department }))} />
          <TextareaField label="What happened" required span={2} rows={3} value={form.description} onChange={v => setForm(p => Object.assign({}, p, { description: v }))}
            placeholder="Factual account: what the person was doing, what happened, and what the immediate outcome was." />
          <SelectField label="Severity" value={form.severity} onChange={v => setForm(p => Object.assign({}, p, { severity: v }))} options={HS.SEVERITIES} />
          <TextField label="Days unable to do normal work" value={form.daysOff} onChange={v => setForm(p => Object.assign({}, p, { daysOff: v }))} mono
            hint="Not counting the day of the accident." />
          <SelectField label="Member of the public taken to hospital" span={2}
            value={form.hospitalisedNonWorker ? 'Yes' : 'No'}
            onChange={v => setForm(p => Object.assign({}, p, { hospitalisedNonWorker: v === 'Yes' }))}
            options={['No', 'Yes']} />
          {form.type === 'Work-related illness' && (
            <SelectField label="Diagnosed by a doctor as work-related" span={2}
              value={form.diagnosed ? 'Yes' : 'No'}
              onChange={v => setForm(p => Object.assign({}, p, { diagnosed: v === 'Yes' }))}
              options={['No', 'Yes']} />
          )}
          {days > 0 && form.employeeId && (
            <SelectField label="Also record as sickness absence" span={2}
              value={form.logAbsence ? 'Yes — add to their absence record' : 'No'}
              onChange={v => setForm(p => Object.assign({}, p, { logAbsence: /^Yes/.test(v) }))}
              options={['Yes — add to their absence record', 'No']} />
          )}
        </FormGrid>

        {days > 3 && derivedSeverity !== form.severity && (
          <Notice icon="Info">
            {days} days off sets the severity to <strong style={{ color: '#fff' }}>{derivedSeverity}</strong> — the RIDDOR
            thresholds are day counts, so the entry is derived rather than chosen.
          </Notice>
        )}
        {preview ? (
          <Notice icon="TriangleAlert" tone={preview.reportable ? 'warn' : undefined}>
            <strong style={{ color: '#fff' }}>{preview.reportable ? 'RIDDOR reportable' : 'Must be recorded'} — </strong>
            {preview.reason}
            {preview.reportable && ' Report to the HSE within ' + preview.deadline + ' days.'}
          </Notice>
        ) : (
          <Notice icon="Info">On the details entered this is not RIDDOR reportable, but it still belongs in the accident book.</Notice>
        )}
        {error && <Notice icon="TriangleAlert" tone="warn">{error}</Notice>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" tone="dark" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} iconLeft={<Icon name="Plus" size={16} />}>Record Incident</Button>
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { IncidentLog, IncidentDetail, ReportIncidentDialog });
