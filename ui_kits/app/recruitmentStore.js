/* NHR Solution — recruitment store.

   Vacancies and candidates belong to the business rather than an employee, so
   they live here rather than in EmployeeRecords. The hire step is the join to
   the rest of the platform: it calls EmployeeStore.create, so a hired candidate
   becomes a real employee record with their name, role, department and start
   date already filled in.

   window.RecruitmentStore = { vacancies, candidates, addVacancy, updateVacancy,
     closeVacancy, addCandidate, moveCandidate, rateCandidate, addNote,
     scheduleInterview, hire, reject, remove, subscribe }
*/
(function () {
  const KEY = 'nhr-recruitment-v1';
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  function stamp() { return new Date().toISOString(); }

  /* The pipeline is ordered — a candidate moves forward, and the stage index
     drives the funnel view. 'Offer' is the last active stage; Hired and
     Rejected are terminal. */
  const STAGES = ['Applied', 'Screening', 'Interview', 'Second interview', 'Offer'];
  const TERMINAL = ['Hired', 'Rejected', 'Withdrawn'];
  const SOURCES = ['Company website', 'Job board', 'Agency', 'Referral', 'LinkedIn', 'Speculative'];
  const RTW_OPTIONS = ['Not yet checked', 'Right to work confirmed', 'Visa sponsorship needed', 'Share code provided'];

  const SEED_VACANCIES = [
    ['Warehouse Operative', 'Warehouse', 'Manchester', 'Full-time', 26000, 3, 'Open'],
    ['Payroll Administrator', 'Finance', 'Leeds', 'Full-time', 31000, 1, 'Open'],
    ['Support Team Leader', 'Support', 'Remote', 'Full-time', 38500, 1, 'Open'],
    ['HR Coordinator', 'People', 'Manchester', 'Part-time', 27500, 1, 'Draft'],
    ['Field Sales Executive', 'Sales', 'Birmingham', 'Full-time', 34000, 2, 'Closed']
  ];

  const SEED_CANDIDATES = [
    ['Marcus', 'Bell', 0, 'Offer', 'Referral', 4, 'Right to work confirmed'],
    ['Sofia', 'Almeida', 0, 'Second interview', 'Job board', 4, 'Right to work confirmed'],
    ['Dominic', 'Hart', 0, 'Interview', 'Company website', 3, 'Not yet checked'],
    ['Yusuf', 'Karim', 0, 'Screening', 'Agency', 3, 'Share code provided'],
    ['Grace', 'Whitfield', 0, 'Applied', 'LinkedIn', 0, 'Not yet checked'],
    ['Leah', 'Donnelly', 1, 'Interview', 'Job board', 4, 'Right to work confirmed'],
    ['Nathan', 'Okoro', 1, 'Screening', 'Referral', 3, 'Right to work confirmed'],
    ['Priti', 'Shah', 1, 'Applied', 'Company website', 0, 'Not yet checked'],
    ['Callum', 'Reid', 2, 'Offer', 'LinkedIn', 5, 'Right to work confirmed'],
    ['Elena', 'Vasquez', 2, 'Interview', 'Agency', 4, 'Visa sponsorship needed'],
    ['Tom', 'Ashby', 2, 'Applied', 'Job board', 0, 'Not yet checked'],
    ['Rachel', 'Finn', 2, 'Rejected', 'Speculative', 2, 'Not yet checked']
  ];

  function seed() {
    const now = Date.now();
    const vacancies = SEED_VACANCIES.map((v, i) => ({
      id: uid('vac'), reference: 'VAC-' + String(1041 + i),
      title: v[0], department: v[1], location: v[2], employmentType: v[3],
      salary: v[4], openings: v[5], status: v[6],
      hiringManager: 'Priya Raman',
      postedAt: iso(new Date(now - (12 + i * 9) * 864e5)),
      closingAt: iso(new Date(now + (28 - i * 5) * 864e5)),
      description: 'Placeholder role description — replace with the real advert before posting.'
    }));
    const candidates = SEED_CANDIDATES.map((c, i) => {
      const vac = vacancies[c[2]];
      const applied = iso(new Date(now - (3 + i * 4) * 864e5));
      return {
        id: uid('can'), vacancyId: vac.id,
        firstName: c[0], lastName: c[1],
        email: (c[0] + '.' + c[1]).toLowerCase() + '@example.com',
        phone: '07700 9001' + String(10 + i),
        stage: c[3], source: c[4], rating: c[5], rightToWork: c[6],
        appliedAt: applied,
        movedAt: iso(new Date(now - (1 + i) * 864e5)),
        interviews: c[3] === 'Interview' || c[3] === 'Second interview' || c[3] === 'Offer'
          ? [{ id: uid('int'), date: iso(new Date(now + (2 + i) * 864e5)), type: 'Competency interview', interviewer: 'Priya Raman', notes: '' }]
          : [],
        notes: c[5] >= 4
          ? [{ id: uid('nt'), at: stamp(), by: 'Priya Raman', text: 'Strong relevant experience, good fit for the team.' }]
          : [],
        offer: c[3] === 'Offer' ? { salary: vac.salary, startDate: iso(new Date(now + 30 * 864e5)), sentAt: iso(new Date(now - 2 * 864e5)), accepted: false } : null,
        rejectedReason: c[3] === 'Rejected' ? 'Did not meet the essential criteria' : '',
        hiredEmployeeId: ''
      };
    });
    const data = { vacancies, candidates };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.vacancies && raw.vacancies.length) return raw;
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); notify(); return data; }

  const RecruitmentStore = {
    STAGES, TERMINAL, SOURCES, RTW_OPTIONS,

    vacancies() { return read().vacancies.slice(); },
    candidates() { return read().candidates.slice(); },
    vacancy(id) { return read().vacancies.find(v => v.id === id) || null; },
    candidate(id) { return read().candidates.find(c => c.id === id) || null; },

    addVacancy(draft) {
      const data = read();
      const refs = data.vacancies.map(v => Number(String(v.reference).replace(/\D/g, '')) || 0);
      const row = Object.assign({
        id: uid('vac'),
        reference: 'VAC-' + String(Math.max.apply(null, refs.concat([1040])) + 1),
        status: 'Open', openings: 1, hiringManager: '',
        postedAt: iso(new Date()), description: ''
      }, draft);
      data.vacancies.unshift(row);
      write(data);
      return row;
    },
    updateVacancy(id, patch) {
      const data = read();
      data.vacancies = data.vacancies.map(v => v.id === id ? Object.assign({}, v, patch) : v);
      write(data);
      return data.vacancies.find(v => v.id === id);
    },
    removeVacancy(id) {
      const data = read();
      data.vacancies = data.vacancies.filter(v => v.id !== id);
      data.candidates = data.candidates.filter(c => c.vacancyId !== id);
      write(data);
      return true;
    },

    addCandidate(draft) {
      const data = read();
      const row = Object.assign({
        id: uid('can'), stage: 'Applied', rating: 0,
        rightToWork: 'Not yet checked',
        appliedAt: iso(new Date()), movedAt: iso(new Date()),
        interviews: [], notes: [], offer: null, rejectedReason: '', hiredEmployeeId: ''
      }, draft);
      data.candidates.unshift(row);
      write(data);
      return row;
    },
    updateCandidate(id, patch) {
      const data = read();
      data.candidates = data.candidates.map(c => c.id === id ? Object.assign({}, c, patch) : c);
      write(data);
      return data.candidates.find(c => c.id === id);
    },
    moveCandidate(id, stage) {
      return RecruitmentStore.updateCandidate(id, { stage, movedAt: iso(new Date()) });
    },
    addNote(id, text, by) {
      const c = RecruitmentStore.candidate(id);
      if (!c) return null;
      const notes = (c.notes || []).concat([{ id: uid('nt'), at: stamp(), by: by || 'You', text }]);
      return RecruitmentStore.updateCandidate(id, { notes });
    },
    scheduleInterview(id, interview) {
      const c = RecruitmentStore.candidate(id);
      if (!c) return null;
      const interviews = (c.interviews || []).concat([Object.assign({ id: uid('int') }, interview)]);
      return RecruitmentStore.updateCandidate(id, { interviews });
    },

    /* Creates the employee record and links it back to the candidate. The
       candidate keeps their history; the employee starts clean on Probation. */
    hire(id, details) {
      const c = RecruitmentStore.candidate(id);
      if (!c) return null;
      const vac = RecruitmentStore.vacancy(c.vacancyId);
      const S = window.EmployeeStore;
      const employee = S.create({
        firstName: c.firstName, lastName: c.lastName,
        email: c.email, phone: c.phone,
        jobTitle: (details && details.jobTitle) || (vac ? vac.title : ''),
        department: (details && details.department) || (vac ? vac.department : ''),
        location: (details && details.location) || (vac ? vac.location : ''),
        employmentType: (details && details.employmentType) || (vac ? vac.employmentType : 'Full-time'),
        startDate: (details && details.startDate) || (c.offer && c.offer.startDate) || iso(new Date()),
        status: 'Probation',
        rightToWorkStatus: /confirmed|share code/i.test(c.rightToWork) ? 'Verified' : 'Pending',
        payroll: Object.assign({}, S.blank().payroll, {
          salary: (details && details.salary) || (c.offer && c.offer.salary) || (vac ? vac.salary : 0)
        })
      });
      S.logActivity(employee.id, 'Record created from recruitment — hired for ' + (vac ? vac.title : 'a vacancy') +
        ' (candidate ' + c.firstName + ' ' + c.lastName + ')');
      RecruitmentStore.updateCandidate(id, { stage: 'Hired', hiredEmployeeId: employee.id, movedAt: iso(new Date()) });
      /* One fewer opening; close the vacancy when they are all filled. */
      if (vac) {
        const remaining = Math.max(0, (Number(vac.openings) || 1) - 1);
        RecruitmentStore.updateVacancy(vac.id, { openings: remaining, status: remaining === 0 ? 'Filled' : vac.status });
      }
      return employee;
    },

    reject(id, reason) {
      return RecruitmentStore.updateCandidate(id, { stage: 'Rejected', rejectedReason: reason || '', movedAt: iso(new Date()) });
    },
    removeCandidate(id) {
      const data = read();
      data.candidates = data.candidates.filter(c => c.id !== id);
      write(data);
      return true;
    },

    /* Time from application to the current stage, and average time to hire. */
    timeToHire() {
      const hired = read().candidates.filter(c => c.stage === 'Hired');
      if (!hired.length) return null;
      const days = hired.map(c => Math.max(0, Math.floor((new Date(c.movedAt) - new Date(c.appliedAt)) / 864e5)));
      return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; },
    reset() { localStorage.removeItem(KEY); notify(); }
  };

  window.RecruitmentStore = RecruitmentStore;
})();
