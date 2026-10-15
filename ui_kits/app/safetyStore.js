/* NHR Solution — health & safety store.

   Incidents, risk assessments and safety actions belong to the business rather
   than one employee, so they live here rather than in EmployeeRecords. The join
   to the rest of the platform is the person: every incident names an employee
   from EmployeeStore, and an injury that keeps someone off work is written to
   their absence record.

   RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences
   Regulations 2013) drives the reporting logic:
     - Death, specified injuries, dangerous occurrences and certain diagnosed
       diseases are reportable without delay, and by report within 10 days.
     - An injury keeping a worker off normal duties for MORE THAN 7 consecutive
       days (not counting the day of the accident) is reportable within 15 days.
     - An injury of more than 3 days must be RECORDED but is not reportable.
   Non-workers taken to hospital for treatment are also reportable.

   window.SafetyStore
*/
(function () {
  const KEY = 'nhr-safety-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  const INCIDENT_TYPES = ['Accident', 'Near miss', 'Dangerous occurrence', 'Work-related illness', 'Property damage', 'Violence or aggression'];
  const SEVERITIES = ['No injury', 'First aid only', 'Medical treatment', 'Over-3-day injury', 'Over-7-day injury', 'Specified injury', 'Fatality'];
  const CATEGORIES = ['Slip, trip or fall', 'Manual handling', 'Struck by object', 'Machinery', 'Vehicle', 'Electrical', 'Hazardous substance', 'Fire', 'Other'];

  /* Likelihood x severity, 1-5 each. The product is the risk rating; the bands
     below are the common 5x5 matrix used in UK workplace assessments. */
  function riskBand(score) {
    if (score >= 15) return 'Intolerable';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  }

  /* Whether an incident must be reported to the HSE, and why. Returns null when
     it is not reportable. */
  function riddor(incident) {
    const s = incident.severity;
    if (s === 'Fatality') return { reportable: true, deadline: 10, reason: 'A death arising from a work activity is reportable without delay.' };
    if (s === 'Specified injury') return { reportable: true, deadline: 10, reason: 'Specified injuries (fractures other than to fingers/thumbs/toes, amputations, loss of sight, crush injuries, serious burns, scalpings, loss of consciousness from head injury or asphyxia, and injuries from enclosed spaces) are reportable without delay.' };
    if (incident.type === 'Dangerous occurrence') return { reportable: true, deadline: 10, reason: 'Dangerous occurrences listed in RIDDOR Schedule 2 are reportable even where no one was hurt.' };
    if (incident.type === 'Work-related illness' && incident.diagnosed) return { reportable: true, deadline: 10, reason: 'A diagnosed occupational disease linked to work is reportable.' };
    if (s === 'Over-7-day injury') return { reportable: true, deadline: 15, reason: 'The worker was unable to perform their normal duties for more than 7 consecutive days, not counting the day of the accident.' };
    if (incident.hospitalisedNonWorker) return { reportable: true, deadline: 10, reason: 'A member of the public was taken directly to hospital for treatment arising from the incident.' };
    if (s === 'Over-3-day injury') return { reportable: false, mustRecord: true, reason: 'More than 3 days of incapacity must be recorded in the accident book, but is not reportable to the HSE.' };
    return null;
  }

  const SEED_ASSESSMENTS = [
    ['Warehouse racking and forklift operation', 'Warehouse', 'Manual handling', 4, 4, 'Banksman for all reversing manoeuvres; pedestrian walkways marked; annual FLT refresher', 2, 3],
    ['Office display screen equipment', 'Head office', 'Other', 2, 2, 'DSE self-assessment on induction; adjustable chairs and monitor risers available', 1, 2],
    ['Loading bay vehicle movements', 'Warehouse', 'Vehicle', 4, 5, 'Segregated pedestrian route; high-vis mandatory; keys held at reception during unloading', 2, 4],
    ['Cleaning chemicals storage (COSHH)', 'All sites', 'Hazardous substance', 3, 3, 'Locked store; safety data sheets held on file; decanting prohibited', 1, 3],
    ['Lone working — field sales', 'Field', 'Other', 3, 3, 'Check-in protocol; journey plan shared; escalation after 2 missed check-ins', 2, 3],
    ['Fire evacuation and means of escape', 'All sites', 'Fire', 2, 5, 'Monthly alarm test; quarterly drill; marshals on each floor; escape routes kept clear', 1, 5]
  ];

  const SEED_INCIDENTS = [
    ['Accident', 'Slip, trip or fall', 'Over-7-day injury', 'Warehouse', 'Slipped on spilled liquid near the bay 3 loading door and landed heavily on the left wrist.', 21, true],
    ['Near miss', 'Vehicle', 'No injury', 'Warehouse', 'Delivery lorry reversed toward the pedestrian door while a colleague was walking out. No contact.', 9, false],
    ['Accident', 'Manual handling', 'Over-3-day injury', 'Warehouse', 'Lower back strain lifting a pallet box from floor level without assistance.', 34, true],
    ['Near miss', 'Machinery', 'No injury', 'Warehouse', 'Guard found unsecured on the shrink wrapper. Machine taken out of service immediately.', 5, false],
    ['Accident', 'Slip, trip or fall', 'First aid only', 'Head office', 'Tripped on a trailing extension lead in the meeting room. Grazed knee, treated on site.', 16, false],
    ['Dangerous occurrence', 'Electrical', 'No injury', 'Warehouse', 'Distribution board arced and tripped the supply during a routine reset.', 47, false],
    ['Near miss', 'Hazardous substance', 'No injury', 'All sites', 'Cleaning chemical found decanted into an unlabelled bottle in the kitchen.', 12, false]
  ];

  function seed(employeeIds) {
    const now = Date.now();
    const pick = i => employeeIds.length ? employeeIds[i % employeeIds.length] : '';

    const assessments = SEED_ASSESSMENTS.map((a, i) => {
      const reviewed = iso(new Date(now - (40 + i * 75) * DAY));
      return {
        id: uid('ra'), reference: 'RA-' + String(201 + i),
        title: a[0], location: a[1], category: a[2],
        likelihood: a[3], severity: a[4],
        controls: a[5],
        residualLikelihood: a[6], residualSeverity: a[7],
        assessor: 'Priya Raman',
        reviewedAt: reviewed,
        /* Annual review is the working default; high-risk work is reviewed more
           often, which is why the interval is stored per assessment. */
        reviewEvery: a[3] * a[4] >= 15 ? 182 : 365,
        status: 'Active'
      };
    });

    const incidents = SEED_INCIDENTS.map((s, i) => {
      const when = iso(new Date(now - s[5] * DAY));
      const base = {
        id: uid('inc'), reference: 'INC-' + String(3301 + i),
        type: s[0], category: s[1], severity: s[2], location: s[3],
        description: s[4], date: when,
        employeeId: pick(i), reportedBy: 'Priya Raman', reportedAt: when,
        daysOff: s[2] === 'Over-7-day injury' ? 11 : s[2] === 'Over-3-day injury' ? 5 : 0,
        diagnosed: false, hospitalisedNonWorker: false,
        investigation: s[6]
          ? { status: 'Complete', findings: 'Immediate cause identified and controls updated.', by: 'Priya Raman', at: iso(new Date(now - (s[5] - 3) * DAY)) }
          : { status: 'Open', findings: '', by: '', at: '' },
        riddorReported: false, riddorReportedAt: '',
        actions: []
      };
      /* Every incident spawns at least one corrective action, because an
         incident without an action is just a record of something going wrong. */
      base.actions = [{
        id: uid('act'),
        title: s[0] === 'Near miss' ? 'Brief the team on the near miss at the next toolbox talk' : 'Review the risk assessment covering this activity',
        owner: 'Priya Raman',
        due: iso(new Date(now - s[5] * DAY + 14 * DAY)),
        status: s[6] ? 'Complete' : 'Open',
        completedAt: s[6] ? iso(new Date(now - (s[5] - 6) * DAY)) : ''
      }];
      return base;
    });

    const data = { assessments, incidents };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.incidents && raw.incidents.length) return raw;
    } catch (e) { /* fall through */ }
    const ids = (window.EmployeeStore ? window.EmployeeStore.list({}) : []).map(e => e.id);
    return seed(ids);
  }
  function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); notify(); return data; }

  const SafetyStore = {
    INCIDENT_TYPES, SEVERITIES, CATEGORIES, riskBand, riddor,

    incidents() { return read().incidents.slice(); },
    assessments() { return read().assessments.slice(); },
    incident(id) { return read().incidents.find(i => i.id === id) || null; },
    assessment(id) { return read().assessments.find(a => a.id === id) || null; },

    addIncident(draft) {
      const data = read();
      const refs = data.incidents.map(i => Number(String(i.reference).replace(/\D/g, '')) || 0);
      const row = Object.assign({
        id: uid('inc'),
        reference: 'INC-' + String(Math.max.apply(null, refs.concat([3300])) + 1),
        reportedAt: iso(new Date()), daysOff: 0,
        diagnosed: false, hospitalisedNonWorker: false,
        investigation: { status: 'Open', findings: '', by: '', at: '' },
        riddorReported: false, riddorReportedAt: '', actions: []
      }, draft);
      data.incidents.unshift(row);
      write(data);
      return row;
    },
    updateIncident(id, patch) {
      const data = read();
      data.incidents = data.incidents.map(i => i.id === id ? Object.assign({}, i, patch) : i);
      write(data);
      return data.incidents.find(i => i.id === id);
    },
    removeIncident(id) {
      const data = read();
      data.incidents = data.incidents.filter(i => i.id !== id);
      write(data);
      return true;
    },

    addAction(incidentId, action) {
      const inc = SafetyStore.incident(incidentId);
      if (!inc) return null;
      const actions = (inc.actions || []).concat([Object.assign({ id: uid('act'), status: 'Open', completedAt: '' }, action)]);
      return SafetyStore.updateIncident(incidentId, { actions });
    },
    completeAction(incidentId, actionId) {
      const inc = SafetyStore.incident(incidentId);
      if (!inc) return null;
      const actions = (inc.actions || []).map(a => a.id === actionId
        ? Object.assign({}, a, { status: 'Complete', completedAt: iso(new Date()) }) : a);
      return SafetyStore.updateIncident(incidentId, { actions });
    },

    addAssessment(draft) {
      const data = read();
      const refs = data.assessments.map(a => Number(String(a.reference).replace(/\D/g, '')) || 0);
      const row = Object.assign({
        id: uid('ra'),
        reference: 'RA-' + String(Math.max.apply(null, refs.concat([200])) + 1),
        reviewedAt: iso(new Date()), reviewEvery: 365, status: 'Active'
      }, draft);
      data.assessments.unshift(row);
      write(data);
      return row;
    },
    updateAssessment(id, patch) {
      const data = read();
      data.assessments = data.assessments.map(a => a.id === id ? Object.assign({}, a, patch) : a);
      write(data);
      return data.assessments.find(a => a.id === id);
    },
    reviewAssessment(id, by) {
      return SafetyStore.updateAssessment(id, { reviewedAt: iso(new Date()), assessor: by || 'You' });
    },
    removeAssessment(id) {
      const data = read();
      data.assessments = data.assessments.filter(a => a.id !== id);
      write(data);
      return true;
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.SafetyStore = SafetyStore;
})();
