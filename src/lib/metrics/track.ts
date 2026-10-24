import { db } from "../db";
import type { EventName, EventProps, StoredEvent } from "@/shared/events";

/**
 * Records a success-metric event. Never throws: a metrics failure must not break
 * what the user is doing.
 */
export async function track<N extends EventName>(name: N, userId: string | null, props: EventProps[N]) {
  try {
    await db.event.create({ data: { name, userId, props: JSON.stringify(props) } });
  } catch (err) {
    console.error(`[metrics] failed to record ${name}`, err);
  }
}

export async function loadEvents(): Promise<StoredEvent[]> {
  const rows = await db.event.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((row) => ({
    name: row.name as EventName,
    userId: row.userId,
    props: JSON.parse(row.props),
    createdAt: row.createdAt,
  }));
}
