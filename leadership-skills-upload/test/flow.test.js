// End-to-end check of the task's "done when": a user rates themselves, invites 3 people,
// they respond, and the gap report shows role gaps and blind spots.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';
import { SKILLS } from '../src/assessment/taxonomy.js';
import { remindPending, AUTO_REMINDER } from '../src/assessment/invites.js';

let app, base, dataDir;
let cookie = '';

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'leadership-test-'));
  app = createApp({ dataDir, log: false });
  await new Promise((r) => app.server.listen(0, r));
  base = `http://localhost:${app.server.address().port}`;
});
after(() => {
  app.server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const post = (path, form, withCookie = true) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(withCookie && cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(form),
  });
const get = (path, withCookie = true) => fetch(base + path, { redirect: 'manual', headers: withCookie && cookie ? { Cookie: cookie } : {} });
const ratingsFor = (category, value) => Object.fromEntries(SKILLS.filter((s) => !category || s.category === category).map((s) => [s.id, String(value)]));

test('user can rate themselves, invite 3 people and get a ranked gap report', async () => {
  // Sign up
  let res = await post('/start', { name: 'Darko Rumenjak', email: 'darko@example.com', currentRole: 'director', targetRole: 'vp' }, false);
  assert.equal(res.status, 303);
  cookie = res.headers.get('set-cookie').split(';')[0];

  // Self-assessment: an incomplete step is rejected and keeps the answers given
  res = await post('/assess/c_level', { 'strategic-thinking': '4' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Rate the 10 skills/);

  res = await post('/assess/c_level', ratingsFor('c_level', 4));
  assert.equal(res.headers.get('location'), '/assess/soft');
  res = await post('/assess/soft', ratingsFor('soft', 3));
  assert.equal(res.headers.get('location'), '/invites');

  // Report before any 360: role gaps only
  let html = await (await get('/report')).text();
  assert.match(html, /Showing role gaps only/);

  // Invite 3 raters; inviting yourself or the same person twice is refused
  assert.equal((await post('/invites', { raterName: 'Me', raterEmail: 'darko@example.com', relationship: 'peer' })).status, 400);
  for (const [name, rel] of [['Sops', 'manager'], ['Maria', 'peer'], ['Alex', 'direct_report']]) {
    res = await post('/invites', { raterName: name, raterEmail: `${name.toLowerCase()}@example.com`, relationship: rel });
    assert.equal(res.status, 303);
  }
  assert.equal((await post('/invites', { raterName: 'Sops', raterEmail: 'sops@example.com', relationship: 'peer' })).status, 400);

  const invites = app.store.listInvites();
  assert.equal(invites.length, 3);
  assert.equal(app.outbox.list().filter((e) => e.template === 'rater-invite').length, 3);

  // Reminders: manual reminder reaches all 3; automatic waits 3 days
  res = await post('/invites/remind', {});
  assert.match(res.headers.get('location'), /n=3/);
  const later = Date.now() + 4 * 24 * 60 * 60 * 1000;
  assert.equal(remindPending({ store: app.store, outbox: app.outbox, baseUrl: base, rules: AUTO_REMINDER, now: later }), 3);

  // Raters respond: everyone rates strategic thinking 2 (user said 4), the rest 3
  for (const [n, invite] of invites.entries()) {
    const page = await get(`/rate/${invite.token}`, false);
    assert.match(await page.text(), /How does Darko Rumenjak lead\?/);
    const ratings = { ...ratingsFor(null, 3), 'strategic-thinking': '2' };
    if (n === 0) ratings.negotiation = 'n/a';
    res = await post(`/rate/${invite.token}`, ratings, false);
    assert.equal(res.status, 200);

    // After 2 responses, 360 results are still hidden
    if (n === 1) assert.equal((await (await get('/api/gap-report')).json()).othersVisible, false);
  }
  assert.match(await (await get(`/rate/${invites[0].token}`, false)).text(), /already responded/);

  // Gap report: ranked, with role gaps and blind spots
  const report = await (await get('/api/gap-report')).json();
  assert.equal(report.othersVisible, true);
  assert.equal(report.raters.completed, 3);
  const top = report.items[0];
  assert.equal(top.skillId, 'strategic-thinking');
  assert.equal(top.roleGap, 0);
  assert.equal(top.blindSpot, 2);
  assert.equal(top.priority, 6);
  assert.ok(report.items.every((i, k) => k === 0 || report.items[k - 1].priority >= i.priority), 'sorted by priority');
  assert.equal(report.items.find((i) => i.skillId === 'negotiation').othersAvg, null, 'only 2 of 3 rated negotiation');
  assert.ok(!JSON.stringify(report).includes('sops@example.com'), 'no rater identity in report');

  html = await (await get('/report')).text();
  assert.match(html, /Where to focus/);
  assert.match(html, /Blind spots/);
  assert.match(html, /Strategic thinking &amp; vision-setting <span class="bad">\(\+2\)/);
});

test('pages need a signed-in user and rater links must be valid', async () => {
  assert.equal((await get('/report', false)).status, 303);
  assert.equal((await get('/api/gap-report', false)).status, 401);
  assert.equal((await get(`/rate/${'0'.repeat(32)}`, false)).status, 404);
});
