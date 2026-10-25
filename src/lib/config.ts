export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Demo mode: emails are shown at /dev/outbox instead of sent. Only on when a demo
 * password also guards the whole app (see middleware), because the outbox holds
 * working log-in links. For fake data only.
 */
export function isDemo(): boolean {
  return process.env.DEMO_MODE === "1" && !!process.env.DEMO_PASSWORD;
}

/** Whether emails are shown at /dev/outbox: always locally, and in demo mode. */
export function showsOutbox(): boolean {
  return !isProduction() || isDemo();
}
