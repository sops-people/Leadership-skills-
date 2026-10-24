import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createStore } from './store.js';
import { createOutbox } from './platform/email.js';
import { layout, esc, startPage } from './platform/layout.js';
import { SKILLS, CATEGORIES, ROLES, CURRENT_ROLES } from './assessment/taxonomy.js';
import { RATING_SCALE, parseRating } from './assessment/scale.js';
import { buildGapReport, MIN_RATERS } from './assessment/scoring.js';
import { RELATIONSHIPS, sendInvite, remindPending, MANUAL_REMINDER, AUTO_REMINDER } from './assessment/invites.js';
import * as views from './assessment/views.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = readFileSync(join(ROOT, 'public', 'styles.css'));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const send = (res, status, body, type = 'text/html; charset=utf-8', headers = {}) => {
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(body);
};
const redirect = (res, location, headers = {}) => send(res, 303, '', 'text/plain', { Location: location, ...headers });
const json = (res, status, body) => send(res, status, JSON.stringify(body, null, 2), 'application/json');

async function readForm(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw Object.assign(new Error('Form too large'), { status: 413 });
  }
  return Object.fromEntries(new URLSearchParams(body));
}

const cookies = (req) => Object.fromEntries((req.headers.cookie ?? '').split(';').filter(Boolean).map((c) => c.trim().split('=').map(decodeURIComponent)));

// Reads 1–5 (or "not observed") ratings for the given skills from a submitted form.
function readRatings(form, skills, opts) {
  const ratings = {};
  const missing = [];
  for (const s of skills) {
    const r = parseRating(form[s.id], opts);
    if (r === null) missing.push(s.id);
    else ratings[s.id] = r;
  }
  return { ratings, missing };
}

export function createApp({ dataDir = join(ROOT, 'data'), baseUrl = process.env.BASE_URL, log = true } = {}) {
  const store = createStore(join(dataDir, 'db.json'));
  const outbox = createOutbox(join(dataDir, 'outbox'), { log });
  const urlFor = (req) => baseUrl ?? `http://${req.headers.host}`;

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method;
    const user = store.getUser(cookies(req).uid);
    let m;

    if (path === '/styles.css') return send(res, 200, STYLES, 'text/css');

    // --- Stand-in sign-up (replaced by the platform task's accounts) ---
    if (path === '/' && method === 'GET') {
      if (!user) return send(res, 200, startPage());
      return send(res, 200, views.homePage({ user, invites: store.listInvites(user.id) }));
    }
    if (path === '/start' && method === 'POST') {
      const f = await readForm(req);
      const name = (f.name ?? '').trim();
      const email = (f.email ?? '').trim();
      if (!name || !EMAIL_RE.test(email) || !ROLES.some((r) => r.id === f.targetRole) || !CURRENT_ROLES.some((r) => r.id === f.currentRole)) {
        return send(res, 400, startPage({ error: 'Enter your name, a valid email and both roles.', values: f }));
      }
      const created = store.createUser({ name, email, currentRole: f.currentRole, targetRole: f.targetRole });
      return redirect(res, '/assess', { 'Set-Cookie': `uid=${created.id}; Path=/; HttpOnly; SameSite=Lax` });
    }
    if (path === '/logout' && method === 'POST') {
      return redirect(res, '/', { 'Set-Cookie': 'uid=; Path=/; Max-Age=0' });
    }

    // --- Rater survey (public, reached by private link) ---
    if ((m = path.match(/^\/rate\/([a-f0-9]{32})$/))) {
      const invite = store.getInvite(m[1]);
      const subject = invite && store.getUser(invite.userId);
      if (!invite || !subject) return send(res, 404, layout({ title: 'Link not found', body: '<section class="narrow"><h1>This link is not valid</h1><p class="muted">Check that you copied the whole link from your email.</p></section>' }));
      if (invite.completedAt) return send(res, 200, views.raterDonePage({ user: subject, already: true }));
      if (method === 'GET') return send(res, 200, views.raterPage({ invite, user: subject }));
      if (method === 'POST') {
        const form = await readForm(req);
        const { ratings, missing } = readRatings(form, SKILLS, { allowNotObserved: true });
        if (missing.length) return send(res, 400, views.raterPage({ invite, user: subject, values: form, missing }));
        store.updateInvite(invite.token, { ratings, completedAt: new Date().toISOString() });
        return send(res, 200, views.raterDonePage({ user: subject }));
      }
    }

    // --- Read-only data for other parts of the app ---
    if (path === '/api/taxonomy' && method === 'GET') {
      return json(res, 200, { roles: ROLES, categories: CATEGORIES, ratingScale: RATING_SCALE, minRaters: MIN_RATERS, skills: SKILLS });
    }

    // --- Development helper: see emails that would have been sent ---
    if (path === '/dev/outbox' && method === 'GET' && process.env.NODE_ENV !== 'production') {
      const mails = outbox.list();
      return send(res, 200, layout({
        title: 'Outbox',
        user,
        body: `<section class="stack"><p class="eyebrow">Development only</p><h1>Email outbox</h1>
<p class="muted">Emails are not really sent yet. Each one is saved here; open a survey link to act as that rater.</p>
${mails.length ? `<ul class="people">${mails.map((e) => `<li><span><strong>${esc(e.template)}</strong> to ${esc(e.to)}</span><span class="muted">${esc(e.sentAt)}</span>${Object.values(e.links ?? {}).map((l) => `<a href="${esc(l)}">${esc(l)}</a>`).join('')}</li>`).join('')}</ul>` : '<p>No emails yet.</p>'}
</section>`,
      }));
    }

    // --- Everything below needs a signed-in user ---
    if (!user) return path.startsWith('/api/') ? json(res, 401, { error: 'Not signed in' }) : redirect(res, '/');

    if (path === '/assess' && method === 'GET') return send(res, 200, views.assessIntroPage({ user }));

    if ((m = path.match(/^\/assess\/([a-z_]+)$/)) && CATEGORIES.some((c) => c.id === m[1])) {
      const categoryId = m[1];
      if (method === 'GET') return send(res, 200, views.assessStepPage({ user, categoryId, values: user.selfRatings }));
      if (method === 'POST') {
        const form = await readForm(req);
        const { ratings, missing } = readRatings(form, SKILLS.filter((s) => s.category === categoryId));
        // Keep what was answered even if the step is incomplete, so nothing is lost.
        const selfRatings = { ...user.selfRatings, ...ratings };
        store.updateUser(user.id, { selfRatings });
        if (missing.length) return send(res, 400, views.assessStepPage({ user, categoryId, values: { ...selfRatings, ...form }, missing }));

        const next = CATEGORIES[CATEGORIES.findIndex((c) => c.id === categoryId) + 1];
        if (next) return redirect(res, `/assess/${next.id}`);
        const firstMissing = CATEGORIES.find((c) => SKILLS.some((s) => s.category === c.id && !Number.isInteger(selfRatings[s.id])));
        if (firstMissing) return redirect(res, `/assess/${firstMissing.id}`);
        if (!user.selfCompletedAt) store.updateUser(user.id, { selfCompletedAt: new Date().toISOString() });
        return redirect(res, store.listInvites(user.id).length ? '/report' : '/invites');
      }
    }

    if (path === '/invites' && method === 'GET') {
      const notice = { sent: 'Invite sent.', reminded: `Reminder sent to ${url.searchParams.get('n')} people.`, none: 'Everyone who hasn’t responded was reminded in the last 24 hours. Try again tomorrow.' }[url.searchParams.get('msg')];
      return send(res, 200, views.invitesPage({ user, invites: store.listInvites(user.id), notice }));
    }
    if (path === '/invites' && method === 'POST') {
      const f = await readForm(req);
      const raterName = (f.raterName ?? '').trim();
      const raterEmail = (f.raterEmail ?? '').trim().toLowerCase();
      const invites = store.listInvites(user.id);
      let error;
      if (!raterName || !EMAIL_RE.test(raterEmail)) error = 'Enter the person’s name and a valid email.';
      else if (raterEmail === user.email.toLowerCase()) error = 'You can’t invite yourself. Your own ratings come from the self-assessment.';
      else if (invites.some((i) => i.raterEmail === raterEmail)) error = `${raterEmail} has already been invited.`;
      else if (!RELATIONSHIPS.some((r) => r.id === f.relationship)) error = 'Choose how this person works with you.';
      if (error) return send(res, 400, views.invitesPage({ user, invites, error, values: f }));
      sendInvite({ store, outbox, baseUrl: urlFor(req), user, raterName, raterEmail, relationship: f.relationship });
      return redirect(res, '/invites?msg=sent');
    }
    if (path === '/invites/remind' && method === 'POST') {
      const n = remindPending({ store, outbox, baseUrl: urlFor(req), userId: user.id, rules: MANUAL_REMINDER });
      return redirect(res, n ? `/invites?msg=reminded&n=${n}` : '/invites?msg=none');
    }

    if (path === '/report' && method === 'GET') {
      const report = buildGapReport({ user, selfRatings: user.selfRatings, raterResponses: store.listInvites(user.id) });
      return send(res, 200, views.reportPage({ user, report }));
    }
    // Gap report for the learning-path task. Never includes individual rater answers.
    if (path === '/api/gap-report' && method === 'GET') {
      return json(res, 200, buildGapReport({ user, selfRatings: user.selfRatings, raterResponses: store.listInvites(user.id) }));
    }

    return send(res, 404, layout({ title: 'Not found', user, body: '<section class="narrow"><h1>Page not found</h1><p><a href="/">Go home</a></p></section>' }));
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) send(res, err.status ?? 500, 'Something went wrong. Please try again.', 'text/plain');
    });
  });

  return { server, store, outbox, remindAll: (url) => remindPending({ store, outbox, baseUrl: url, rules: AUTO_REMINDER }) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const app = createApp();
  app.server.listen(port, () => {
    const base = process.env.BASE_URL ?? `http://localhost:${port}`;
    console.log(`Leadership Skills running at ${base}`);
    console.log(`Emails are saved instead of sent; see ${base}/dev/outbox`);
    setInterval(() => app.remindAll(base), 60 * 60 * 1000).unref();
  });
}
