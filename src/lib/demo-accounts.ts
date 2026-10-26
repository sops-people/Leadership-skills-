import { cookies } from "next/headers";
import {
  DEMO_ACCOUNTS_COOKIE,
  createDemoAccountsToken,
  readDemoAccountsToken,
  sessionCookieOptions,
} from "./session";

/** Ids of the accounts created in this browser (demo mode). */
export async function demoAccountIds(): Promise<string[]> {
  const store = await cookies();
  return readDemoAccountsToken(store.get(DEMO_ACCOUNTS_COOKIE)?.value);
}

/** Remembers a newly created account, so this browser's outbox shows its emails. */
export async function rememberDemoAccount(userId: string): Promise<void> {
  const ids = (await demoAccountIds()).filter((id) => id !== userId);
  const store = await cookies();
  store.set(DEMO_ACCOUNTS_COOKIE, await createDemoAccountsToken([...ids, userId]), sessionCookieOptions);
}
