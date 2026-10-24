import { ROLES, CURRENT_ROLES } from '../assessment/taxonomy.js';

// Shared page shell and the stand-in sign-up page. The platform task replaces sign-up with real accounts.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

export function layout({ title, user, body, nav = true }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Leadership Skills</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/">Leadership Skills</a>
  ${nav && user ? `<nav>
    <a href="/assess">Self-assessment</a>
    <a href="/invites">360 feedback</a>
    <a href="/report">Gap report</a>
  </nav>
  <form method="post" action="/logout"><button class="link">Sign out ${esc(user.name)}</button></form>` : ''}
</header>
<main>
${body}
</main>
</body>
</html>`;
}

const options = (list, selected) => list.map((r) => `<option value="${r.id}"${r.id === selected ? ' selected' : ''}>${esc(r.name)}</option>`).join('');

export function startPage({ error, values = {} } = {}) {
  return layout({
    title: 'Get started',
    nav: false,
    body: `
<section class="narrow stack">
  <p class="eyebrow">Find your leadership gaps</p>
  <h1>Get started</h1>
  <p class="muted">Tell us who you are and which role you are working towards. Your gap report compares you with the expected level for that role.</p>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="/start" class="stack card">
    <label for="name">Your name<input id="name" name="name" required value="${esc(values.name)}" autocomplete="name"></label>
    <label for="email">Email<input id="email" name="email" type="email" required value="${esc(values.email)}" autocomplete="email"></label>
    <label for="currentRole">Current role<select id="currentRole" name="currentRole" required>${options(CURRENT_ROLES, values.currentRole ?? 'director')}</select></label>
    <label for="targetRole">Target role<select id="targetRole" name="targetRole" required>${options(ROLES, values.targetRole ?? 'vp')}</select></label>
    <button class="primary">Continue</button>
  </form>
</section>`,
  });
}
