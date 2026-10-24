// Checks what Darko's and Sops's code produce against the shared formats in
// Maria's part (src/shared). Run from Maria's checkout: npx tsx ../ci/integration/check_maria.mts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const maria = process.env.MARIA_DIR!;
const out = process.env.OUT_DIR!;

const record = (check: string, passed: boolean, detail = "") =>
  appendFileSync(join(out, "results.jsonl"), JSON.stringify({ check, passed, detail }) + "\n");

const load = async (rel: string) => import(pathToFileURL(join(maria, rel)).href);
const readJson = (name: string) => JSON.parse(readFileSync(join(out, name), "utf8"));

async function run(check: string, fn: () => string | void | Promise<string | void>) {
  try {
    record(check, true, (await fn()) ?? "");
  } catch (err) {
    record(check, false, err instanceof Error ? err.message : String(err));
  }
}

const { emailRequestInputSchema } = await load("src/shared/formats.ts");
const { ROLES } = await load("src/shared/roles.ts");
const { SAMPLE_SKILLS } = await load("src/shared/sample-data.ts");

function checkEmails(requests: unknown[], who: string) {
  if (!requests.length) throw new Error(`no email requests from ${who} to check`);
  for (const request of requests) {
    const parsed = emailRequestInputSchema.safeParse(request);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      throw new Error(`${JSON.stringify(request).slice(0, 160)} → ${problems.join("; ")}`);
    }
  }
  return `${requests.length} requests valid`;
}

await run("Email requests: Darko's match the shared Email request format", () =>
  checkEmails(readJson("darko-emails.json"), "Darko"),
);

await run("Email requests: Sops's match the shared Email request format", () => {
  const file = join(out, "sops-emails.jsonl");
  const lines = existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean) : [];
  return checkEmails(lines.map((l) => JSON.parse(l)), "Sops");
});

await run("Role names: Darko's user vs the shared role list", () => {
  const user = readJson("darko-user.json");
  const bad = [user.currentRole, user.targetRole].filter((r) => !ROLES.includes(r));
  if (bad.length) throw new Error(`Darko stores ${bad.map((r) => JSON.stringify(r)).join(", ")}; shared list is ${ROLES.join(", ")}`);
  return `${user.currentRole} → ${user.targetRole}`;
});

await run("Skill ids: Maria's sample data vs Darko's taxonomy", () => {
  const darkoIds = new Set(readJson("darko-taxonomy.json").skills.map((s: { id: string }) => s.id));
  const missing = SAMPLE_SKILLS.map((s: { skillId: string }) => s.skillId).filter((id: string) => !darkoIds.has(id));
  if (missing.length) throw new Error(`not in Darko's taxonomy: ${missing.join(", ")}`);
  return `all ${SAMPLE_SKILLS.length} match`;
});
