import { db } from "../db";

/**
 * Deletes the user and, through onDelete: Cascade, everything that references them:
 * log-in links, emails about them, metric events. Darko and Sops: give your models a
 * userId relation with onDelete: Cascade and they are covered too.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db.user.delete({ where: { id: userId } });
}
