export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Demo mode: emails are shown at /dev/outbox instead of sent. Each browser sees only
 * the emails of accounts it created (see demo-accounts.ts), because the outbox holds
 * working log-in links. An optional DEMO_PASSWORD also guards the whole app (see
 * middleware). For fake data only.
 */
export function isDemo(): boolean {
  return process.env.DEMO_MODE === "1";
}

/** Whether emails are shown at /dev/outbox: always locally, and in demo mode. */
export function showsOutbox(): boolean {
  return !isProduction() || isDemo();
}
