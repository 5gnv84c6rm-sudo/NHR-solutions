/* NHR Solution — eLearning content store.

   The Training module owns compliance: who needs what, and when it expires.
   This store owns the *content* — the lessons and quiz questions that make a
   course completable inside the platform, plus each learner's position in it.

   The two meet at completion. When a learner passes a course here, the matching
   record in EmployeeRecords 'training' is marked Complete with a certificate
   and an expiry date, so the compliance matrix updates from real learning
   rather than someone ticking a box.

   window.LearningStore
*/
(function () {
  const KEY = 'nhr-elearning-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  /* Pass mark for every assessment. 80% is the common standard for mandatory
     workplace training — high enough to mean something, low enough that one
     misread question does not fail a competent learner. */
  const PASS_MARK = 80;

  /* Course content. Each course matches a course name used by the Training
     module, so the two sides line up without a mapping table. */
  const CATALOGUE = [
    {
      title: 'Fire Safety Awareness', category: 'Health & Safety', minutes: 35,
      summary: 'How fire starts and spreads, what to do when the alarm sounds, and the part everyone plays in keeping escape routes usable.',
      lessons: [
        { title: 'How fire starts and spreads', body: 'Fire needs three things: fuel, oxygen and a source of ignition. Remove any one of them and there is no fire. This is why housekeeping matters more than equipment — a corridor used for storage is fuel stacked against an escape route.\n\nSmoke, not flame, is what kills most people in building fires. It fills a space from the ceiling down and disables visibility within a couple of minutes, which is why doors held open by wedges defeat the design of the building.' },
        { title: 'Your responsibilities', body: 'Every employee has a duty to take reasonable care for their own safety and that of others. In practice that means: knowing your nearest two escape routes, not propping fire doors open, reporting blocked exits and damaged equipment, and knowing where your assembly point is.\n\nYou are not expected to fight a fire. Tackling a small fire with an extinguisher is a judgement call for trained staff only, and only where it does not put you between the fire and your exit.' },
        { title: 'When the alarm sounds', body: 'Leave immediately by the nearest safe route. Do not collect belongings. Do not use lifts. Close doors behind you where you can do so without delay — each closed door buys the building time.\n\nReport to the assembly point and stay there so the roll call is accurate. Do not re-enter for any reason until the fire marshal or fire service confirms it is safe.' },
        { title: 'Extinguishers and equipment', body: 'Water and foam for wood, paper and textiles. Carbon dioxide for electrical equipment. Dry powder for flammable liquids and gases. Wet chemical for cooking oils.\n\nUsing the wrong type can make a fire worse — water on live electrics or on a chip pan is actively dangerous. If you cannot identify the fire type with confidence, leave it and evacuate.' }
      ],
      quiz: [
        { q: 'What are the three things a fire needs?', options: ['Fuel, oxygen and ignition', 'Heat, smoke and fuel', 'Oxygen, water and heat', 'Fuel, wind and ignition'], answer: 0 },
        { q: 'What causes most deaths in building fires?', options: ['Flames', 'Smoke inhalation', 'Structural collapse', 'Burns to the hands'], answer: 1 },
        { q: 'The alarm sounds and your laptop is on your desk. What do you do?', options: ['Take it — it holds company data', 'Leave immediately without it', 'Wait to see if it is a drill', 'Use the lift to save time'], answer: 1 },
        { q: 'Which extinguisher type is used on electrical equipment?', options: ['Water', 'Foam', 'Carbon dioxide', 'Wet chemical'], answer: 2 },
        { q: 'A fire door is wedged open for ventilation. What is the correct response?', options: ['Leave it, someone has a reason', 'Remove the wedge and report it', 'Prop the next one open too', 'Only act if a manager asks'], answer: 1 }
      ]
    },
    {
      title: 'Manual Handling', category: 'Health & Safety', minutes: 40,
      summary: 'Why back injuries happen, how to assess a lift before you start, and when not to lift at all.',
      lessons: [
        { title: 'Why manual handling causes injury', body: 'Manual handling accounts for a large share of workplace injuries, and back injuries in particular are cumulative. A single awkward lift rarely causes the damage; hundreds of them do. That is why technique matters even for loads that feel manageable.\n\nThe risk rises sharply with three things: distance from the body, twisting while loaded, and repetition. A 10kg box held at arm\'s length puts several times more load through the spine than the same box held close.' },
        { title: 'Assess before you lift', body: 'Employers must avoid hazardous manual handling where reasonably practicable, assess what cannot be avoided, and reduce the risk. As the person lifting, run a quick assessment every time: how heavy, how far, what route, is it stable, do I need help.\n\nIf the answer to any of those is uncertain, stop. Getting a trolley or a second pair of hands takes a minute. A back injury takes months.' },
        { title: 'Safer lifting technique', body: 'Plan the lift and clear the route. Stand close to the load with feet apart and one foot slightly forward for balance. Bend the knees, not the back, and keep the load close to your waist with the heaviest side toward you.\n\nLift smoothly — no jerking. Move your feet to turn rather than twisting your spine. Put the load down and then adjust its position if needed, rather than fine-tuning while holding it.' },
        { title: 'When not to lift', body: 'Do not lift if the load is beyond your capability, if you cannot see over or around it, if the route is blocked or slippery, or if you have an existing injury that lifting could aggravate.\n\nThere is no legal maximum weight for a person to lift — guideline figures exist, but they assume an ideal posture and reduce sharply as the load moves away from the body. The test is whether the risk has been reduced so far as is reasonably practicable, not whether you came under a number.' }
      ],
      quiz: [
        { q: 'Which factor increases spinal load the most?', options: ['Lifting slowly', 'Holding the load away from the body', 'Wearing gloves', 'Lifting with a colleague'], answer: 1 },
        { q: 'What is the first duty on an employer for hazardous manual handling?', options: ['Provide back belts', 'Avoid it where reasonably practicable', 'Train everyone annually', 'Record the weight of every load'], answer: 1 },
        { q: 'You need to turn while carrying a box. What should you do?', options: ['Twist at the waist', 'Move your feet to turn', 'Lean back and pivot', 'Turn your head first'], answer: 1 },
        { q: 'Is there a legal maximum weight one person may lift?', options: ['Yes, 25kg', 'Yes, 20kg for women', 'No — guideline figures exist but no legal limit', 'Yes, set by each employer'], answer: 2 },
        { q: 'The route to the store room is wet. What is the correct action?', options: ['Carry on carefully', 'Stop, make the route safe or find another', 'Take smaller loads', 'Ask someone to watch you'], answer: 1 }
      ]
    },
    {
      title: 'GDPR and Data Protection', category: 'Compliance', minutes: 45,
      summary: 'What counts as personal data, the principles that govern using it, and what to do in the first hour of a suspected breach.',
      lessons: [
        { title: 'What counts as personal data', body: 'Personal data is any information relating to an identified or identifiable living person. That is broader than most people assume: a work email address, a staff number, a photograph, an IP address and a note of someone\'s shift preference are all personal data.\n\nSpecial category data — health, ethnicity, religion, sexual orientation, trade union membership, biometrics, genetics and political opinion — carries stricter conditions. Sickness absence reasons and occupational health reports fall in here, which is why they are held separately from ordinary HR records.' },
        { title: 'The principles', body: 'Personal data must be processed lawfully, fairly and transparently; collected for specified purposes; limited to what is necessary; accurate; kept no longer than needed; and held securely. The controller is accountable for demonstrating all of it.\n\nData minimisation is the principle most often broken in practice. Copying a whole spreadsheet when you needed three rows, or keeping candidate CVs indefinitely "in case a role comes up", both fail it.' },
        { title: 'Individual rights', body: 'People have the right to be informed, to access their data, to have inaccuracies corrected, to erasure in some circumstances, to restrict or object to processing, and to data portability. A subject access request can be made verbally or in writing, to anyone in the organisation.\n\nThe response deadline is one month, extendable by two further months for complex requests. The clock starts when the request is received by anyone — not when it reaches the right desk. That is why recognising one matters more than knowing how to answer it.' },
        { title: 'Breaches: the first hour', body: 'A personal data breach is any security incident leading to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data. An email to the wrong recipient is a breach. So is a lost unencrypted USB stick.\n\nReport it internally immediately — do not attempt to assess severity yourself and do not delay while you investigate. Where a breach risks people\'s rights and freedoms it must be reported to the ICO within 72 hours of the organisation becoming aware, so the internal clock is much shorter than that.' }
      ],
      quiz: [
        { q: 'Which of these is NOT personal data on its own?', options: ['A work email address', 'A staff number', 'Annual company turnover', 'A photograph of an employee'], answer: 2 },
        { q: 'Sickness absence reasons are classed as:', options: ['Ordinary personal data', 'Special category data', 'Not personal data', 'Confidential business data'], answer: 1 },
        { q: 'How long does an organisation have to respond to a subject access request?', options: ['72 hours', 'One month, extendable', 'Two weeks', 'Six weeks'], answer: 1 },
        { q: 'You email a spreadsheet of staff details to the wrong person. This is:', options: ['Not a breach if you recall it', 'A breach — report immediately', 'Only a breach if they open it', 'A breach only if it was special category data'], answer: 1 },
        { q: 'What is the ICO reporting deadline for a notifiable breach?', options: ['24 hours', '48 hours', '72 hours of becoming aware', 'One month'], answer: 2 }
      ]
    },
    {
      title: 'Equality, Diversity and Inclusion', category: 'Compliance', minutes: 40,
      summary: 'The nine protected characteristics, the forms discrimination takes, and the duty to make reasonable adjustments.',
      lessons: [
        { title: 'The protected characteristics', body: 'The Equality Act 2010 protects nine characteristics: age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, and sexual orientation.\n\nProtection applies at every stage of employment — advertising, recruitment, terms, promotion, training, dismissal and after employment ends, for example in references.' },
        { title: 'Forms of discrimination', body: 'Direct discrimination is treating someone worse because of a protected characteristic. Indirect discrimination is a policy that applies to everyone but puts a group at a disadvantage without objective justification — a requirement for full-time hours only, for instance.\n\nHarassment is unwanted conduct related to a characteristic that violates dignity or creates an intimidating, hostile, degrading, humiliating or offensive environment. Victimisation is treating someone badly because they raised a concern or supported someone else\'s. Intent is not a defence to any of them.' },
        { title: 'Reasonable adjustments', body: 'Where a disabled person is placed at a substantial disadvantage, the employer has a duty to make reasonable adjustments. This is an active duty, not a response to a request — if you could reasonably be expected to know, it applies.\n\nAdjustments are often small and cheap: changed hours, a different chair, written instructions instead of verbal, a phased return, or moving a workstation. What is reasonable depends on effectiveness, practicality, cost and the size of the organisation.' },
        { title: 'Inclusive behaviour day to day', body: 'Most exclusion at work is not a policy failure. It is meetings booked outside someone\'s working pattern, banter that lands differently than intended, or decisions made informally among people who already agree.\n\nIf you manage people, the practical test is whether someone who disagrees with you, or who is not in the room by default, could raise something and be heard. Recruitment criteria that are not genuinely needed for the role are one of the most common sources of indirect discrimination.' }
      ],
      quiz: [
        { q: 'How many protected characteristics does the Equality Act 2010 set out?', options: ['Seven', 'Eight', 'Nine', 'Twelve'], answer: 2 },
        { q: 'A policy applying to everyone that disadvantages one group without justification is:', options: ['Direct discrimination', 'Indirect discrimination', 'Harassment', 'Victimisation'], answer: 1 },
        { q: 'Treating someone badly because they supported a colleague\'s complaint is:', options: ['Harassment', 'Direct discrimination', 'Victimisation', 'Not covered'], answer: 2 },
        { q: 'When does the duty to make reasonable adjustments arise?', options: ['Only when formally requested', 'When the employer knows or could reasonably be expected to know', 'Only after a diagnosis is provided', 'Only for physical disabilities'], answer: 1 },
        { q: 'Is intent a defence to harassment?', options: ['Yes, if no offence was meant', 'Yes, if it was banter', 'No — the effect is what matters', 'Only for first offences'], answer: 2 }
      ]
    },
    {
      title: 'Cyber Security Basics', category: 'Technology', minutes: 30,
      summary: 'Phishing, passwords and the handful of habits that prevent most real-world compromises.',
      lessons: [
        { title: 'How attacks actually start', body: 'The overwhelming majority of successful attacks begin with a person, not a system: a convincing email, a reused password exposed in an unrelated breach, or a phone call from someone claiming to be IT.\n\nAttackers are not usually targeting you personally. They are running the same approach across thousands of addresses and waiting for one person having a busy day.' },
        { title: 'Recognising phishing', body: 'The reliable signals are situational rather than visual. Unexpected urgency, a request that bypasses normal process, a payment or password request, and an instruction not to check with anyone else.\n\nModern phishing has correct spelling, real logos and plausible display names. Hover the sender address and any link before acting, and verify through a channel you already trust — a saved number, not the one in the message. Finance requests that change bank details should always be verified by voice.' },
        { title: 'Passwords and multi-factor authentication', body: 'Length beats complexity. Three random words are stronger and more memorable than a short string of substituted characters. The critical rule is never to reuse a password between work and anywhere else, because breaches elsewhere become your problem.\n\nMulti-factor authentication stops most credential attacks outright. If you receive an approval prompt you did not trigger, deny it and report it — that means someone already has your password.' },
        { title: 'Everyday habits', body: 'Lock your screen when you step away. Do not plug in USB devices you did not buy. Install updates when prompted rather than deferring indefinitely — most exploited flaws already had a patch available.\n\nIf you think you have clicked something you should not have, report it straight away. The damage from a fast report is almost always recoverable; the damage from a quiet one usually is not.' }
      ],
      quiz: [
        { q: 'How do most successful attacks begin?', options: ['Software flaws', 'Targeting a person', 'Physical break-in', 'Network scanning'], answer: 1 },
        { q: 'Which is the most reliable phishing signal?', options: ['Spelling mistakes', 'A foreign sender', 'Unexpected urgency and process bypass', 'An attachment'], answer: 2 },
        { q: 'What makes a password strong?', options: ['Symbol substitution', 'Length', 'Changing it monthly', 'Using a pet name'], answer: 1 },
        { q: 'You get an MFA prompt you did not trigger. What do you do?', options: ['Approve it, it is probably a glitch', 'Ignore it', 'Deny it and report it', 'Wait for it to expire'], answer: 2 },
        { q: 'You clicked a suspicious link. What is the best action?', options: ['Say nothing and watch for problems', 'Report it immediately', 'Run a scan and decide later', 'Change your password only'], answer: 1 }
      ]
    }
  ];

  function seed() {
    const courses = CATALOGUE.map((c, i) => ({
      id: uid('crs'), code: 'CRS-' + String(101 + i),
      title: c.title, category: c.category, minutes: c.minutes, summary: c.summary,
      lessons: c.lessons.map((l, k) => Object.assign({ id: uid('les'), order: k + 1 }, l)),
      quiz: c.quiz.map(q => Object.assign({ id: uid('qz') }, q)),
      published: true
    }));
    const data = { courses, enrolments: {} };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.courses && raw.courses.length) {
        raw.enrolments = raw.enrolments || {};
        return raw;
      }
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); notify(); return data; }

  function key(employeeId, courseId) { return employeeId + '::' + courseId; }

  const LearningStore = {
    PASS_MARK,

    courses() { return read().courses.slice(); },
    course(id) { return read().courses.find(c => c.id === id) || null; },
    courseByTitle(title) { return read().courses.find(c => c.title === title) || null; },

    /* A learner's position in a course: which lessons are done, best score,
       whether they passed, and how many attempts it took. */
    enrolment(employeeId, courseId) {
      const data = read();
      return data.enrolments[key(employeeId, courseId)] || {
        lessonsComplete: [], attempts: 0, bestScore: null, passed: false,
        startedAt: '', completedAt: ''
      };
    },
    setEnrolment(employeeId, courseId, patch) {
      const data = read();
      const k = key(employeeId, courseId);
      data.enrolments[k] = Object.assign({}, LearningStore.enrolment(employeeId, courseId), patch);
      write(data);
      return data.enrolments[k];
    },
    completeLesson(employeeId, courseId, lessonId) {
      const cur = LearningStore.enrolment(employeeId, courseId);
      if (cur.lessonsComplete.indexOf(lessonId) > -1) return cur;
      return LearningStore.setEnrolment(employeeId, courseId, {
        lessonsComplete: cur.lessonsComplete.concat([lessonId]),
        startedAt: cur.startedAt || iso(new Date())
      });
    },

    /* Marks an attempt. Passing writes back to the employee's training record,
       which is what makes the compliance matrix reflect real learning. */
    submitQuiz(employeeId, courseId, answers) {
      const course = LearningStore.course(courseId);
      if (!course) return null;
      const correct = course.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
      const score = Math.round(correct / course.quiz.length * 100);
      const passed = score >= PASS_MARK;
      const cur = LearningStore.enrolment(employeeId, courseId);
      const result = LearningStore.setEnrolment(employeeId, courseId, {
        attempts: (cur.attempts || 0) + 1,
        bestScore: cur.bestScore == null ? score : Math.max(cur.bestScore, score),
        passed: cur.passed || passed,
        completedAt: (cur.passed || passed) ? (cur.completedAt || iso(new Date())) : ''
      });

      if (passed) LearningStore.syncToTraining(employeeId, course);

      return { score, correct, total: course.quiz.length, passed, enrolment: result };
    },

    /* Writes a pass into EmployeeRecords 'training'. Updates the existing
       assigned record where there is one so the assignment is closed rather
       than duplicated; otherwise adds a record for a course taken voluntarily. */
    syncToTraining(employeeId, course) {
      const R = window.EmployeeRecords, S = window.EmployeeStore;
      if (!R || !S) return null;
      const conf = (window.MANDATORY || {})[course.title];
      const period = conf ? conf.renewEvery : 365;
      const today = new Date();
      const patch = {
        status: 'Complete', progress: 100,
        completedAt: iso(today),
        certificateId: 'CERT-' + String(60000 + Math.floor(Math.random() * 9999)),
        expiresAt: iso(new Date(today.getTime() + period * DAY)),
        renewEvery: period
      };
      const existing = (R.get(S.get(employeeId)).training || []).find(t => t.course === course.title);
      if (existing) {
        R.update(employeeId, 'training', existing.id, patch);
      } else {
        R.add(employeeId, 'training', Object.assign({
          course: course.title, category: course.category, minutes: course.minutes,
          assignedAt: iso(today), dueAt: iso(today)
        }, patch));
      }
      S.logActivity(employeeId, 'Course passed in eLearning: ' + course.title +
        ' — certificate issued, valid until ' + iso(new Date(today.getTime() + period * DAY)));
      return patch;
    },

    resetAttempt(employeeId, courseId) {
      return LearningStore.setEnrolment(employeeId, courseId, { passed: false, completedAt: '' });
    },

    addCourse(draft) {
      const data = read();
      const codes = data.courses.map(c => Number(String(c.code).replace(/\D/g, '')) || 0);
      const row = Object.assign({
        id: uid('crs'), code: 'CRS-' + String(Math.max.apply(null, codes.concat([100])) + 1),
        lessons: [], quiz: [], published: false, minutes: 30
      }, draft);
      data.courses.unshift(row);
      write(data);
      return row;
    },
    updateCourse(id, patch) {
      const data = read();
      data.courses = data.courses.map(c => c.id === id ? Object.assign({}, c, patch) : c);
      write(data);
      return data.courses.find(c => c.id === id);
    },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.LearningStore = LearningStore;
})();
