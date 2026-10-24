// Runs Darko's real app through the "done when" flow and saves what it hands to
// the other parts: the gap report, the taxonomy, the user and the email requests.
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const darko = resolve(process.env.DARKO_DIR);
const out = resolve(process.env.OUT_DIR);
mkdirSync(out, { recursive: true });

const record = (check, passed, detail = '') =>
  appendFileSync(join(out, 'results.jsonl'), JSON.stringify({ check, passed, detail }) + '\n');
const save = (name, data) => writeFileSync(join(out, name), JSON.stringify(data, null, 2));

const { createApp } = await import(pathToFileURL(join(darko, 'src/server.js')).href);
const { SKILLS } = await import(pathToFileURL(join(darko, 'src/assessment/taxonomy.js')).href);

const app = createApp({ dataDir: mkdtempSync(join(tmpdir(), 'ci-darko-')), log: false });
await new Promise((r) => app.server.listen(0, r));
const base = `http://localhost:${app.server.address().port}`;
let cookie = '';

const post = (path, form, withCookie = true) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(withCookie && cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(form),
  });
const get = (path) => fetch(base + path, { headers: cookie ? { Cookie: cookie } : {} });
const ratings = (category, value) =>
  Object.fromEntries(SKILLS.filter((s) => !category || s.category === category).map((s) => [s.id, String(value)]));

try {
  const res = await post('/start', { name: 'CI User', email: 'ci@example.com', currentRole: 'director', targetRole: 'vp' }, false);
  cookie = res.headers.get('set-cookie').split(';')[0];
  await post('/assess/c_level', ratings('c_level', 4));
  await post('/assess/soft', ratings('soft', 3));
  for (const [name, rel] of [['Rater One', 'manager'], ['Rater Two', 'peer'], ['Rater Three', 'direct_report']]) {
    await post('/invites', { raterName: name, raterEmail: `${name.replace(' ', '.').toLowerCase()}@example.com`, relationship: rel });
  }
  for (const invite of app.store.listInvites()) {
    await post(`/rate/${invite.token}`, { ...ratings(null, 3), 'strategic-thinking': '2' }, false);
  }

  const report = await (await get('/api/gap-report')).json();
  save('gap-report.json', report);
  save('darko-taxonomy.json', await (await get('/api/taxonomy')).json());
  save('darko-user.json', app.store.getUser(report.userId));
  save('darko-emails.json', app.outbox.list());

  record(
    "Darko's app: full flow produces a gap report with 360 results",
    report.othersVisible === true && report.items.length === SKILLS.length,
    `${report.items.length} skills, ${report.raters.completed} raters`,
  );
} catch (err) {
  record("Darko's app: full flow produces a gap report with 360 results", false, String(err));
} finally {
  app.server.close();
}
