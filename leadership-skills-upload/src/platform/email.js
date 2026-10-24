import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Stand-in for the platform task's email service. Uses the shared "email request" shape
// ({ to, template, data, links }) and writes each message to an outbox folder instead of sending it.
export function createOutbox(dir, { log = true } = {}) {
  mkdirSync(dir, { recursive: true });
  return {
    send(request) {
      const sentAt = new Date().toISOString();
      const file = `${sentAt.replace(/[:.]/g, '-')}-${request.template}-${Math.random().toString(36).slice(2, 7)}.json`;
      writeFileSync(join(dir, file), JSON.stringify({ ...request, sentAt }, null, 2));
      if (log) console.log(`[email] ${request.template} → ${request.to}: ${Object.values(request.links ?? {}).join(' ')}`);
    },
    list() {
      return readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse()
        .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
    },
  };
}
