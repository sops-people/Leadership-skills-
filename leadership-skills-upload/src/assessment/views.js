import { SKILLS, CATEGORIES, IMPORTANCE_LABELS, roleName } from './taxonomy.js';
import { RATING_SCALE, NOT_OBSERVED, selfQuestion, raterQuestion } from './scale.js';
import { RELATIONSHIPS } from './invites.js';
import { MIN_RATERS } from './scoring.js';
import { layout, esc } from '../platform/layout.js';

const categoryName = (id) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
const relationshipName = (id) => RELATIONSHIPS.find((r) => r.id === id)?.name ?? id;
const signed = (n) => (n > 0 ? `+${n}` : String(n));

function scaleLegend() {
  return `<dl class="scale">
  ${RATING_SCALE.map((s) => `<div><dt><span class="num">${s.value}</span> ${esc(s.label)}</dt><dd>${esc(s.description)}</dd></div>`).join('')}
</dl>`;
}

// One skill with a row of 1–5 radio buttons (plus "Not observed" for raters).
function ratingField(skill, question, value, { allowNotObserved = false, missing = false } = {}) {
  const choices = [...RATING_SCALE.map((s) => ({ value: String(s.value), label: `${s.value}`, title: s.label }))];
  if (allowNotObserved) choices.push({ value: NOT_OBSERVED, label: 'Not observed', title: 'I have not seen this in action' });
  return `<fieldset class="skill${missing ? ' missing' : ''}" id="skill-${skill.id}">
  <legend>${esc(skill.name)}</legend>
  <p class="question">${esc(question)}</p>
  <details><summary>Example behaviours</summary><ul>${skill.behaviours.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></details>
  <div class="choices" role="radiogroup" aria-label="${esc(skill.name)}">
    ${choices.map((c) => `<label class="choice${c.value === NOT_OBSERVED ? ' na' : ''}" title="${esc(c.title)}">
      <input type="radio" name="${skill.id}" value="${c.value}"${String(value) === c.value ? ' checked' : ''}>
      <span>${esc(c.label)}</span><small>${c.value === NOT_OBSERVED ? '' : esc(c.title)}</small>
    </label>`).join('')}
  </div>
  ${missing ? '<p class="error">Choose a rating for this skill.</p>' : ''}
</fieldset>`;
}

export function homePage({ user, invites }) {
  const done = invites.filter((i) => i.completedAt).length;
  const steps = [
    {
      title: 'Rate yourself',
      text: `Rate yourself on all ${SKILLS.length} skills. Takes about 10 minutes.`,
      status: user.selfCompletedAt ? 'Done' : 'To do',
      href: '/assess',
      action: user.selfCompletedAt ? 'Review answers' : 'Start',
    },
    {
      title: 'Invite 360 raters',
      text: `Invite at least ${MIN_RATERS} people. Their answers stay anonymous and are only shown once ${MIN_RATERS} have responded.`,
      status: `${done} of ${invites.length} responded`,
      href: '/invites',
      action: invites.length ? 'Manage invites' : 'Invite people',
    },
    {
      title: 'Read your gap report',
      text: 'See where you are below the bar for your target role, and where others see you differently.',
      status: user.selfCompletedAt ? (done >= MIN_RATERS ? 'Ready' : 'Role gaps ready') : 'Needs self-assessment',
      href: '/report',
      action: 'Open report',
    },
  ];
  return layout({
    title: 'Home',
    user,
    body: `
<section class="stack">
  <p class="eyebrow">${esc(roleName(user.currentRole))} → ${esc(roleName(user.targetRole))}</p>
  <h1>Hi ${esc(user.name)}</h1>
  <ol class="steps">
    ${steps.map((s) => `<li class="card stack-sm">
      <h2>${esc(s.title)}</h2>
      <p class="muted">${esc(s.text)}</p>
      <p class="status">${esc(s.status)}</p>
      <a class="button" href="${s.href}">${esc(s.action)}</a>
    </li>`).join('')}
  </ol>
</section>`,
  });
}

export function assessIntroPage({ user }) {
  return layout({
    title: 'Self-assessment',
    user,
    body: `
<section class="narrow stack">
  <p class="eyebrow">Self-assessment</p>
  <h1>Rate yourself honestly</h1>
  <p class="muted">You will rate ${SKILLS.length} skills in ${CATEGORIES.length} steps. Rate what you actually do today, not what you intend to do. Your ratings are compared with the expected level for ${esc(roleName(user.targetRole))} and with how others rate you.</p>
  <h2>The rating scale</h2>
  ${scaleLegend()}
  <a class="button primary" href="/assess/${CATEGORIES[0].id}">Start with ${esc(categoryName(CATEGORIES[0].id))}</a>
</section>`,
  });
}

export function assessStepPage({ user, categoryId, values, missing = [] }) {
  const index = CATEGORIES.findIndex((c) => c.id === categoryId);
  const skills = SKILLS.filter((s) => s.category === categoryId);
  const last = index === CATEGORIES.length - 1;
  return layout({
    title: categoryName(categoryId),
    user,
    body: `
<section class="narrow stack">
  <p class="eyebrow">Step ${index + 1} of ${CATEGORIES.length}</p>
  <h1>${esc(categoryName(categoryId))}</h1>
  <details class="card"><summary>What the numbers mean</summary>${scaleLegend()}</details>
  ${missing.length ? `<p class="error" role="alert">Rate the ${missing.length} skill${missing.length > 1 ? 's' : ''} marked below to continue.</p>` : ''}
  <form method="post" action="/assess/${categoryId}" class="stack">
    ${skills.map((s) => ratingField(s, selfQuestion(s), values[s.id], { missing: missing.includes(s.id) })).join('')}
    <div class="row">
      ${index > 0 ? `<a class="button" href="/assess/${CATEGORIES[index - 1].id}">Back</a>` : ''}
      <button class="primary">${last ? 'Finish self-assessment' : `Save and continue to ${esc(categoryName(CATEGORIES[index + 1].id))}`}</button>
    </div>
  </form>
</section>`,
  });
}

export function invitesPage({ user, invites, notice, error, values = {} }) {
  const done = invites.filter((i) => i.completedAt).length;
  const needed = Math.max(MIN_RATERS - done, 0);
  return layout({
    title: '360 feedback',
    user,
    body: `
<section class="narrow stack">
  <p class="eyebrow">360 feedback</p>
  <h1>Invite people to rate you</h1>
  <p class="muted">Pick people who see your work regularly: your manager, peers and direct reports. Each person gets a private link. You never see individual answers; averages appear in your report once at least ${MIN_RATERS} people have responded.</p>
  ${notice ? `<p class="notice" role="status">${esc(notice)}</p>` : ''}
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}

  <div class="card stack-sm">
    <p class="big-status"><strong>${done}</strong> of ${invites.length} responded</p>
    <p class="muted">${needed ? `${needed} more response${needed > 1 ? 's' : ''} needed before 360 results appear.` : '360 results are visible in your gap report.'}</p>
    ${invites.length > done ? `<form method="post" action="/invites/remind"><button>Remind people who haven’t responded</button></form>` : ''}
  </div>

  <form method="post" action="/invites" class="card stack">
    <h2>Add a rater</h2>
    <div class="grid-2">
      <label for="raterName">Name<input id="raterName" name="raterName" required value="${esc(values.raterName)}"></label>
      <label for="raterEmail">Email<input id="raterEmail" name="raterEmail" type="email" required value="${esc(values.raterEmail)}"></label>
    </div>
    <label for="relationship">How they work with you<select id="relationship" name="relationship">${RELATIONSHIPS.map((r) => `<option value="${r.id}"${r.id === values.relationship ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
    <button class="primary">Send invite</button>
  </form>

  ${invites.length ? `<div class="stack-sm">
    <h2>Invited</h2>
    <p class="muted">To protect anonymity, this list does not show who has responded.</p>
    <ul class="people">${invites.map((i) => `<li><span>${esc(i.raterName)}</span><span class="muted">${esc(relationshipName(i.relationship))} · ${esc(i.raterEmail)}</span></li>`).join('')}</ul>
  </div>` : ''}
</section>`,
  });
}

export function raterPage({ invite, user, values = {}, missing = [] }) {
  const first = user.name.split(' ')[0];
  return layout({
    title: `Feedback for ${user.name}`,
    nav: false,
    body: `
<section class="narrow stack">
  <p class="eyebrow">360 feedback</p>
  <h1>How does ${esc(user.name)} lead?</h1>
  <p class="muted">Hi ${esc(invite.raterName)}. ${esc(user.name)} asked for your honest view of ${SKILLS.length} leadership skills. Your answers are anonymous: ${esc(first)} only sees averages across at least ${MIN_RATERS} people. Choose “Not observed” for anything you have not seen in action.</p>
  <details class="card"><summary>What the numbers mean</summary>${scaleLegend()}</details>
  ${missing.length ? `<p class="error" role="alert">Answer the ${missing.length} skill${missing.length > 1 ? 's' : ''} marked below. “Not observed” counts as an answer.</p>` : ''}
  <form method="post" action="/rate/${invite.token}" class="stack">
    ${CATEGORIES.map((c) => `<h2>${esc(c.name)}</h2>
    ${SKILLS.filter((s) => s.category === c.id).map((s) => ratingField(s, raterQuestion(s, first), values[s.id], { allowNotObserved: true, missing: missing.includes(s.id) })).join('')}`).join('')}
    <button class="primary">Submit feedback</button>
  </form>
</section>`,
  });
}

export function raterDonePage({ user, already = false }) {
  return layout({
    title: 'Thank you',
    nav: false,
    body: `
<section class="narrow stack">
  <h1>${already ? 'You have already responded' : 'Thank you'}</h1>
  <p class="muted">${already ? 'Your feedback was already recorded.' : `Your feedback for ${esc(user.name)} has been recorded.`} It will only be shown as part of an average with at least ${MIN_RATERS} other people’s answers.</p>
</section>`,
  });
}

// A 1–5 track showing the role bar, the self rating and others' average.
function track(item) {
  const pos = (v) => `${((v - 1) / 4) * 100}%`;
  return `<div class="track" aria-hidden="true">
  <span class="bar" style="left:${pos(item.bar)}"></span>
  ${item.self !== null ? `<span class="dot self" style="left:${pos(item.self)}"></span>` : ''}
  ${item.othersAvg !== null ? `<span class="dot others" style="left:${pos(item.othersAvg)}"></span>` : ''}
</div>`;
}

function gapCell(n, kind) {
  if (n === null) return '<td class="num muted">–</td>';
  const tone = kind === 'role' ? (n > 0 ? 'bad' : 'good') : n >= 0.5 ? 'bad' : n <= -0.5 ? 'good' : '';
  return `<td class="num ${tone}">${signed(n)}</td>`;
}

export function reportPage({ user, report }) {
  const role = roleName(report.targetRole);
  if (!report.selfComplete) {
    return layout({
      title: 'Gap report',
      user,
      body: `<section class="narrow stack"><h1>Gap report</h1><p class="muted">Finish your self-assessment first. The report compares your own ratings with the bar for ${esc(role)}.</p><a class="button primary" href="/assess">Go to self-assessment</a></section>`,
    });
  }

  const top = report.items.filter((i) => i.priority > 0).slice(0, 3);
  const blindSpots = report.items.filter((i) => i.blindSpot !== null && i.blindSpot >= 0.5).sort((a, b) => b.blindSpot - a.blindSpot);
  const strengths = report.items.filter((i) => i.blindSpot !== null && i.blindSpot <= -0.5).sort((a, b) => a.blindSpot - b.blindSpot);
  const { completed, needed } = report.raters;

  return layout({
    title: 'Gap report',
    user,
    body: `
<section class="stack">
  <p class="eyebrow">Gap report · target role ${esc(role)}</p>
  <h1>Where to focus</h1>
  ${report.othersVisible
    ? `<p class="notice">Based on your self-assessment and ${completed} anonymous 360 responses.</p>`
    : `<p class="notice">Showing role gaps only. Blind spots appear once ${needed} more ${needed > 1 ? 'people respond' : 'person responds'} to your 360 invite (${completed} of ${MIN_RATERS} so far). <a href="/invites">Manage invites</a></p>`}

  ${top.length ? `<ol class="top3">${top.map((i) => `<li class="card stack-sm">
    <p class="eyebrow">${esc(categoryName(i.category))}</p>
    <h2>${esc(i.name)}</h2>
    <p class="muted">Bar ${i.bar} · you ${i.self}${i.othersAvg !== null ? ` · others ${i.othersAvg}` : ''} · ${esc(IMPORTANCE_LABELS[i.importance])} for ${esc(role)}</p>
  </li>`).join('')}</ol>` : `<p class="card">You meet or exceed the bar for ${esc(role)} on every skill${report.othersVisible ? ', and others agree' : ''}.</p>`}

  <div class="legend" aria-hidden="true"><span><i class="bar"></i>Bar for ${esc(role)}</span><span><i class="dot self"></i>You</span><span><i class="dot others"></i>Others’ average</span></div>
  <div class="table-scroll">
    <table class="report">
      <thead><tr>
        <th>#</th><th>Skill</th><th>1 – 5</th>
        <th class="num">Bar</th><th class="num">You</th><th class="num">Others</th>
        <th class="num" title="Bar minus your rating">Role gap</th>
        <th class="num" title="Your rating minus others' average">Blind spot</th>
        <th class="num" title="Importance × gap size">Priority</th>
      </tr></thead>
      <tbody>
      ${report.items.map((i, n) => `<tr>
        <td class="num muted">${n + 1}</td>
        <td><strong>${esc(i.name)}</strong><br><small class="muted">${esc(categoryName(i.category))} · ${esc(IMPORTANCE_LABELS[i.importance])}</small></td>
        <td>${track(i)}</td>
        <td class="num">${i.bar}</td>
        <td class="num">${i.self}</td>
        <td class="num">${i.othersAvg ?? `<span class="muted" title="Shown once ${MIN_RATERS} people have rated this skill">hidden</span>`}</td>
        ${gapCell(i.roleGap, 'role')}
        ${gapCell(i.blindSpot, 'blind')}
        <td class="num"><strong>${i.priority}</strong></td>
      </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="grid-2">
    <div class="card stack-sm">
      <h2>Blind spots</h2>
      <p class="muted">Others rate you at least half a point lower than you rate yourself.</p>
      ${!report.othersVisible ? '<p class="muted">Waiting for 360 responses.</p>'
        : blindSpots.length ? `<ul>${blindSpots.map((i) => `<li>${esc(i.name)} <span class="bad">(${signed(i.blindSpot)})</span></li>`).join('')}</ul>` : '<p>None. Others see you much as you see yourself.</p>'}
    </div>
    <div class="card stack-sm">
      <h2>Hidden strengths</h2>
      <p class="muted">Others rate you at least half a point higher than you rate yourself.</p>
      ${!report.othersVisible ? '<p class="muted">Waiting for 360 responses.</p>'
        : strengths.length ? `<ul>${strengths.map((i) => `<li>${esc(i.name)} <span class="good">(${signed(i.blindSpot)})</span></li>`).join('')}</ul>` : '<p>None found.</p>'}
    </div>
  </div>

  <details class="card"><summary>How this report is calculated</summary>
    <ul>
      <li><strong>Role gap</strong> = bar for ${esc(role)} − your rating. Positive means you are below the bar.</li>
      <li><strong>Blind spot</strong> = your rating − others’ average. Positive means others see you lower than you see yourself.</li>
      <li><strong>Priority</strong> = importance for ${esc(role)} (1–3) × gap size, where gap size = positive role gap + positive blind spot.</li>
      <li>Others’ average for a skill is only shown once at least ${MIN_RATERS} people have rated it. “Not observed” answers are left out.</li>
    </ul>
  </details>
</section>`,
  });
}
