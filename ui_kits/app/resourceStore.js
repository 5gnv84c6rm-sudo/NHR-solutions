/* NHR Solution — resources store.

   The resource centre inside the platform, not a blog. Three kinds of thing:

   - GUIDES: practical explainers on the HR situations the platform touches.
   - TEMPLATES: policy and letter documents that can be issued straight into
     the Documents module, which is the integration that makes this more than
     a reading list. A template issued as a company policy appears in Documents
     with a sign-off requirement, so reading and acting are the same action.
   - UPDATES: dated notes on legislative change, each carrying an effective
     date so nobody applies a rule before it is in force.

   Every item states its review date. HR guidance goes stale quietly, and an
   out-of-date template is worse than no template because it looks authoritative.

   window.ResourceStore
*/
(function () {
  const KEY = 'nhr-resources-v1';
  const DAY = 864e5;
  const subs = [];
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) { /* detached */ } }); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 9); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  const CATEGORIES = ['Absence', 'Leave', 'Performance', 'Recruitment', 'Health & Safety', 'Pay', 'Policy', 'Wellbeing'];

  const GUIDES = [
    {
      title: 'Running a return-to-work conversation',
      category: 'Absence', minutes: 6, module: 'Absence',
      summary: 'What the conversation is for, what to ask, and the line between support and investigation.',
      body: 'A return-to-work conversation is the single most effective absence control there is, and it works for a reason that has nothing to do with deterrence: it is often the only time anyone asks whether something at work is contributing.\n\nHold it on the first day back, every time, including for one-day absences. Consistency is what makes it routine rather than an accusation. Keep it short — ten minutes is usually enough.\n\nCover four things: that they are well enough to be back, whether anything at work contributed, whether any adjustment would help, and what they missed while away. Record that it happened and any adjustment agreed. Do not record clinical detail you do not need; "back pain, lifting duties reduced for two weeks" is enough, and the diagnosis is not your business.\n\nWhere a pattern emerges, the trigger is a conversation, not a sanction. Bradford scores and trigger points identify who to talk to. They do not establish that absence is unreasonable, and treating a score as evidence is how employers end up defending disability discrimination claims.'
    },
    {
      title: 'Holiday entitlement for irregular hours workers',
      category: 'Leave', minutes: 7, module: 'Leave',
      summary: 'How the 12.07% accrual method works, who it applies to, and where rolled-up holiday pay now stands.',
      body: 'For leave years beginning on or after 1 April 2024, holiday entitlement for irregular hours and part-year workers accrues at 12.07% of hours worked in each pay period. The figure comes from the statutory 5.6 weeks divided by the remaining 46.4 working weeks of the year.\n\nThe method applies to irregular hours and part-year workers only. A worker on fixed part-time hours accrues 5.6 weeks of their normal working week in the ordinary way, and applying 12.07% to them will usually underpay.\n\nRolled-up holiday pay — paying an uplift with each payslip instead of paying at the time leave is taken — is permitted again for these two categories, at 12.07% of pay, shown as a separate line. It is not permitted for other workers.\n\nThe practical trap is the leave year start date. The rules apply from the first leave year beginning on or after 1 April 2024, so an employer whose leave year runs January to December moved to them in January 2025, not in April 2024.'
    },
    {
      title: 'Probation reviews that are worth holding',
      category: 'Performance', minutes: 5, module: 'Performance',
      summary: 'Why most probation periods lapse by default, and the structure that prevents it.',
      body: 'A probation period exists so both sides can decide, with information, whether the appointment works. In practice most lapse silently: the date passes, nobody schedules anything, and the employee is confirmed by default.\n\nThe fix is scheduling the review when the offer is made, not when the period is nearly over. A review booked in advance happens; one that depends on someone noticing a date does not.\n\nHold at least one conversation at the midpoint. A concern raised at week four can be fixed. The same concern raised at week eleven is an ambush, and it is difficult to defend as fair.\n\nBe specific about what "meeting the standard" means for the role before the person starts. Vague probation criteria produce decisions that feel arbitrary to the employee and are hard to justify afterwards — and note that unfair dismissal protection and notice entitlements do not disappear simply because someone is labelled as on probation.'
    },
    {
      title: 'Writing a job advert that does not discriminate',
      category: 'Recruitment', minutes: 6, module: 'Recruitment',
      summary: 'Where indirect discrimination creeps into adverts, and the criteria test worth applying.',
      body: 'Most discriminatory adverts are not hostile. They are careless — requirements written from a picture of the last person who did the job rather than from what the job needs.\n\nApply one test to every criterion: could someone do this job well without it? "Degree educated" for a role learned on the job, "five years\' experience" where two would do, "energetic" and "recent graduate" as proxies for age. Each narrows the field on grounds unrelated to performance, and each is indirect discrimination unless you can objectively justify it.\n\nSeparate essential from desirable honestly. A long essential list deters candidates who would have been good — the effect is well documented and falls unevenly.\n\nState the salary. Pay secrecy sustains pay gaps, and asking for salary history carries them between employers. Ask what the candidate expects the role to pay instead, or better, publish the range and skip the question.'
    },
    {
      title: 'What must be reported under RIDDOR',
      category: 'Health & Safety', minutes: 7, module: 'Health & Safety',
      summary: 'The reportable categories, the deadlines, and the over-3 and over-7 day distinction.',
      body: 'RIDDOR requires certain workplace incidents to be reported to the HSE. The categories that matter most often are: deaths, specified injuries, over-7-day injuries, certain diagnosed occupational diseases, dangerous occurrences, and non-workers taken directly to hospital for treatment.\n\nSpecified injuries include fractures other than to fingers, thumbs and toes; amputations; permanent loss or reduction of sight; crush injuries to the head or torso; serious burns; scalpings requiring hospital treatment; loss of consciousness from head injury or asphyxia; and injuries from working in an enclosed space. These are reportable without delay, and by report within 10 days.\n\nThe day-count distinction trips people up. More than 3 consecutive days of incapacity must be RECORDED. More than 7 must be REPORTED, within 15 days. Neither count includes the day of the accident, and both count calendar days including days the person would not have worked anyway.\n\nThe deadline runs from the date of the incident, not from the date someone realised it was reportable.'
    },
    {
      title: 'Handling a pay query without making it worse',
      category: 'Pay', minutes: 5, module: 'Payroll',
      summary: 'Why pay errors escalate fast, and the sequence that contains them.',
      body: 'A pay error is not an administrative issue to the person affected. It is rent, and it escalates faster than any other complaint in HR.\n\nAcknowledge within the day, even before you know the answer. Silence is read as dispute. Say when you will come back, and do.\n\nEstablish whether the person has been underpaid or overpaid before discussing recovery of anything. An underpayment should be corrected by supplementary payment as soon as practicable, not held to the next cycle.\n\nRecovering an overpayment needs care. An employer can generally recover a genuine overpayment of wages, but doing so without discussion damages trust and, where the employee has changed their position in reliance on the money, recovery can be resisted. Agree a schedule in writing rather than deducting unilaterally.\n\nFinally, fix the cause. A recurring pay error in the same place is a process fault, and the second occurrence costs far more goodwill than the first.'
    }
  ];

  /* Templates are the ones that can be issued into Documents. Body is the
     document text with {{placeholders}} the issuer completes. */
  const TEMPLATES = [
    {
      title: 'Sickness absence policy', category: 'Policy', kind: 'Policy', signOff: true,
      summary: 'Reporting requirements, self-certification, fit notes, return-to-work and trigger points.',
      body: 'SICKNESS ABSENCE POLICY\n\n1. Purpose\nThis policy sets out what {{company}} expects when an employee is unable to attend work through illness, and what employees can expect from us.\n\n2. Reporting an absence\nTell your manager as early as possible and no later than {{reportBy}} on the first day of absence. Contact should be by telephone wherever possible. Text or email is acceptable only where a call is not practicable.\n\n3. Self-certification\nAbsence of 7 calendar days or fewer is self-certified. You will be asked to complete a self-certification form on your return.\n\n4. Fit notes\nAbsence beyond 7 calendar days requires a statement of fitness for work from a healthcare professional, covering the period from day 8 onward.\n\n5. Return-to-work discussion\nA short discussion will be held on your first day back, for every absence. Its purpose is to confirm you are fit to return, identify anything at work that may have contributed, and agree any adjustment.\n\n6. Trigger points\nAbsence patterns are monitored using the Bradford Factor. Reaching a trigger point prompts a supportive conversation. It is not in itself a disciplinary matter.\n\n7. Sick pay\nStatutory Sick Pay is payable subject to the qualifying conditions. {{companySickPay}}\n\n8. Disability\nWhere absence relates to a disability, we will consider reasonable adjustments, and disability-related absence may be discounted from trigger calculations.'
    },
    {
      title: 'Return-to-work interview form', category: 'Absence', kind: 'Form', signOff: false,
      summary: 'Structured record of the conversation, with space for adjustments agreed.',
      body: 'RETURN-TO-WORK DISCUSSION\n\nEmployee: {{employee}}\nManager: {{manager}}\nDate of discussion: {{date}}\nAbsence dates: {{absenceDates}}   Working days lost: {{days}}\n\n1. Are you fit to return to your normal duties?\n\n2. Did anything at work contribute to the absence?\n\n3. Is any adjustment needed, temporary or permanent?\n\n4. Updates the employee missed while absent:\n\n5. Adjustments agreed and review date:\n\nRecord only what is necessary. Clinical detail beyond what is needed to manage the return should not be recorded here.\n\nSigned (employee): ____________________\nSigned (manager): ____________________'
    },
    {
      title: 'Flexible working request outcome letter', category: 'Policy', kind: 'Letter', signOff: false,
      summary: 'Decision letter covering approval, modified approval or refusal with statutory grounds.',
      body: '{{date}}\n\nDear {{employee}},\n\nFLEXIBLE WORKING REQUEST — OUTCOME\n\nThank you for your request of {{requestDate}} to change your working arrangements. I am writing to confirm the outcome following our discussion on {{meetingDate}}.\n\n[APPROVED] I am pleased to confirm your request is approved with effect from {{startDate}}. This is a permanent change to your terms and conditions unless stated otherwise.\n\n[REFUSED] I am sorry to confirm that we are unable to agree to your request. The statutory ground on which the request is refused is: {{ground}}.\n\nThe permitted grounds are: burden of additional costs; detrimental effect on ability to meet customer demand; inability to reorganise work among existing staff; inability to recruit additional staff; detrimental impact on quality; detrimental impact on performance; insufficiency of work during the periods you propose to work; planned structural changes.\n\nYou may appeal this decision by writing to {{appealTo}} within {{appealDays}} days.\n\nYours sincerely,\n{{manager}}'
    },
    {
      title: 'Disciplinary invitation letter', category: 'Policy', kind: 'Letter', signOff: false,
      summary: 'Invitation meeting the ACAS Code, with the right to be accompanied stated.',
      body: '{{date}}\n\nDear {{employee}},\n\nINVITATION TO A DISCIPLINARY HEARING\n\nI am writing to invite you to a disciplinary hearing on {{meetingDate}} at {{time}}, to be held at {{location}}.\n\nThe purpose of the hearing is to consider the following allegation(s):\n{{allegations}}\n\nThe evidence to be considered is enclosed with this letter.\n\nYou have the right to be accompanied at the hearing by a trade union representative or a work colleague. Please let me know in advance who will accompany you.\n\nA possible outcome of this hearing is {{possibleOutcome}}.\n\nIf you are unable to attend, please tell me as soon as possible so an alternative time can be arranged.\n\nYours sincerely,\n{{manager}}\n\nNote for the issuer: the ACAS Code of Practice requires the employee to be told of the allegation and the possible consequences in advance, given the evidence, allowed to be accompanied, and given the right of appeal. An unreasonable failure to follow the Code can increase a tribunal award by up to 25%.'
    },
    {
      title: 'Health and safety policy statement', category: 'Health & Safety', kind: 'Policy', signOff: true,
      summary: 'The written statement required of employers with five or more employees.',
      body: 'HEALTH AND SAFETY POLICY STATEMENT\n\n{{company}} is committed to providing a safe and healthy working environment for all employees, contractors and visitors.\n\nWe will:\n- assess risks to health and safety and act on what the assessments find;\n- provide and maintain safe plant, equipment and systems of work;\n- provide information, instruction, training and supervision;\n- consult employees on matters affecting their health and safety;\n- investigate incidents and near misses and act on the findings;\n- review this policy annually and whenever circumstances change materially.\n\nOverall responsibility for health and safety rests with {{responsiblePerson}}. Day-to-day responsibility for implementation rests with line managers. Every employee has a duty to take reasonable care for their own safety and that of others affected by their acts or omissions, and to report hazards and incidents promptly.\n\nSigned: {{signatory}}    Date: {{date}}    Review date: {{reviewDate}}\n\nNote: employers with five or more employees must record their health and safety policy in writing.'
    },
    {
      title: 'Reasonable adjustments record', category: 'Wellbeing', kind: 'Form', signOff: false,
      summary: 'Records what was agreed and when it is reviewed, without recording a diagnosis.',
      body: 'REASONABLE ADJUSTMENTS RECORD\n\nEmployee: {{employee}}\nManager: {{manager}}\nDate agreed: {{date}}    Review date: {{reviewDate}}\n\nAdjustment(s) agreed:\n{{adjustments}}\n\nHow the adjustment will be kept in place when the manager, team or location changes:\n{{continuity}}\n\nWhat the employee should do if the adjustment stops working:\n{{escalation}}\n\nThis record deliberately does not capture a diagnosis or clinical detail. The duty is to make the adjustment, not to hold medical information about it. Where a diagnosis has been shared, keep it separately and restrict access.\n\nSigned (employee): ____________________\nSigned (manager): ____________________'
    }
  ];

  const UPDATES = [
    {
      title: 'Holiday accrual for irregular hours workers',
      effective: '2024-04-01', category: 'Leave',
      body: 'Holiday entitlement for irregular hours and part-year workers accrues at 12.07% of hours worked, for leave years beginning on or after 1 April 2024. Rolled-up holiday pay is permitted for these categories at the same rate, shown separately on the payslip.',
      action: 'Check which of your workers are irregular hours or part-year, and confirm your leave year start date — the change applied from the first leave year beginning on or after that date.'
    },
    {
      title: 'Flexible working becomes a day-one right',
      effective: '2024-04-06', category: 'Policy',
      body: 'The right to request flexible working applies from the first day of employment. Employees may make two requests in any 12-month period, the employer must consult before refusing, and the decision period is two months.',
      action: 'Update your flexible working policy and the decision letter template if either still refers to 26 weeks of service or a three-month decision period.'
    },
    {
      title: 'Carer\'s leave',
      effective: '2024-04-06', category: 'Leave',
      body: 'Employees have a day-one right to one week of unpaid leave in any 12-month period to provide or arrange care for a dependant with a long-term care need.',
      action: 'Add carer\'s leave to your leave policy and to the leave types available for booking.'
    },
    {
      title: 'Duty to prevent sexual harassment',
      effective: '2024-10-26', category: 'Policy',
      body: 'Employers have a positive duty to take reasonable steps to prevent sexual harassment of employees in the course of employment. A tribunal may increase compensation in a successful sexual harassment claim by up to 25% where the duty has not been met.',
      action: 'Record the preventative steps taken — risk assessment, policy, training, reporting route. The duty is anticipatory, so evidence of steps taken before any incident is what counts.'
    }
  ];

  function seed() {
    const now = Date.now();
    const data = {
      guides: GUIDES.map((g, i) => Object.assign({
        id: uid('gd'), published: iso(new Date(now - (20 + i * 28) * DAY)),
        reviewed: iso(new Date(now - (20 + i * 28) * DAY)), reviewEvery: 365
      }, g)),
      templates: TEMPLATES.map((t, i) => Object.assign({
        id: uid('tp'), version: '1.' + i,
        reviewed: iso(new Date(now - (35 + i * 24) * DAY)), reviewEvery: 365
      }, t)),
      updates: UPDATES.map(u => Object.assign({ id: uid('up') }, u)),
      saved: [],
      issued: []
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.guides && raw.guides.length) { raw.saved = raw.saved || []; raw.issued = raw.issued || []; return raw; }
    } catch (e) { /* fall through */ }
    return seed();
  }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); notify(); return d; }

  function withReview(item) {
    const next = new Date(new Date(item.reviewed).getTime() + (Number(item.reviewEvery) || 365) * DAY);
    const days = Math.floor((next - Date.now()) / DAY);
    return Object.assign({}, item, {
      nextReview: next.toISOString().slice(0, 10),
      daysToReview: days,
      stale: days < 0
    });
  }

  const ResourceStore = {
    CATEGORIES,
    guides() { return read().guides.map(withReview); },
    templates() { return read().templates.map(withReview); },
    updates() {
      return read().updates.map(u => Object.assign({}, u, {
        inForce: new Date(u.effective) <= Date.now(),
        daysUntil: Math.floor((new Date(u.effective) - Date.now()) / DAY)
      })).sort((a, b) => a.effective < b.effective ? 1 : -1);
    },
    guide(id) { const g = read().guides.find(x => x.id === id); return g ? withReview(g) : null; },
    template(id) { const t = read().templates.find(x => x.id === id); return t ? withReview(t) : null; },

    saved() { return read().saved.slice(); },
    toggleSave(id) {
      const d = read();
      d.saved = d.saved.indexOf(id) > -1 ? d.saved.filter(x => x !== id) : d.saved.concat([id]);
      write(d);
      return d.saved;
    },
    isSaved(id) { return read().saved.indexOf(id) > -1; },

    markReviewed(kind, id, by) {
      const d = read();
      const list = kind === 'guide' ? d.guides : d.templates;
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return null;
      list[i] = Object.assign({}, list[i], { reviewed: iso(new Date()), reviewedBy: by || 'You' });
      write(d);
      return list[i];
    },

    /* The integration that matters: a template issued becomes a real company
       policy in the Documents module, with an acknowledgement requirement
       where the template calls for one. Category is mapped onto the Documents
       module's own vocabulary rather than inventing a parallel one. */
    issue(templateId, by, audience) {
      const t = ResourceStore.template(templateId);
      if (!t || !window.PolicyStore) return null;
      const CAT = {
        'Policy': 'HR policy', 'Health & Safety': 'Health & Safety', 'Absence': 'HR policy',
        'Wellbeing': 'HR policy', 'Pay': 'Finance', 'Leave': 'HR policy',
        'Performance': 'HR policy', 'Recruitment': 'HR policy'
      };
      const policy = window.PolicyStore.add({
        name: t.title, category: CAT[t.category] || 'HR policy',
        audience: audience || 'All staff', version: t.version, owner: by || 'HR',
        reviewDue: iso(new Date(Date.now() + 365 * DAY)),
        requiresAck: !!t.signOff, acknowledgedBy: []
      });
      const d = read();
      d.issued.unshift({ id: uid('is'), templateId, policyId: policy.id, title: t.title, at: iso(new Date()), by: by || 'You', signOff: !!t.signOff });
      write(d);
      return policy;
    },
    issued() { return read().issued.slice(); },

    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }
  };

  window.ResourceStore = ResourceStore;
})();
