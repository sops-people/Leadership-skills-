// Fills the local database with the sample users and enough metric events for
// `npm run metrics` to show real numbers. Safe to re-run.
import { PrismaClient, type User } from "@prisma/client";
import { SAMPLE_USERS } from "../src/shared/sample-data";
import type { EventName, EventProps } from "../src/shared/events";

const db = new PrismaClient();

async function main() {
  await db.event.deleteMany({ where: { user: { email: { in: SAMPLE_USERS.map((u) => u.email) } } } });

  const users: User[] = [];
  for (const sample of SAMPLE_USERS) {
    users.push(await db.user.upsert({ where: { email: sample.email }, update: sample, create: sample }));
  }
  const [alex, sam, jo] = users;

  const event = <N extends EventName>(name: N, userId: string, props: EventProps[N], daysAgo: number) => ({
    name,
    userId,
    props: JSON.stringify(props),
    createdAt: new Date(Date.now() - daysAgo * 86_400_000),
  });

  await db.event.createMany({
    data: [
      ...users.map((u) => event("signed-up", u.id, {}, 100)),
      ...users.map((u) => event("onboarding-completed", u.id, { currentRole: u.currentRole!, targetRole: u.targetRole! }, 100)),
      event("self-assessment-completed", alex.id, { assessmentId: "a1" }, 99),
      event("self-assessment-completed", sam.id, { assessmentId: "a2" }, 98),
      event("gap-report-created", alex.id, { reportId: "r1", cycle: 1, gaps: { "communication-storytelling": 2, "financial-acumen": 1 } }, 95),
      event("gap-report-created", alex.id, { reportId: "r2", cycle: 2, gaps: { "communication-storytelling": 1, "financial-acumen": 0.5 } }, 5),
      event("360-cycle-closed", alex.id, { cycle: 1, pairs: [{ skillId: "communication-storytelling", self: 4, others: 2.8 }] }, 94),
      event("360-cycle-closed", alex.id, { cycle: 2, pairs: [{ skillId: "communication-storytelling", self: 3.5, others: 3.1 }] }, 4),
      event("path-created", alex.id, { pathId: "p1", itemCount: 4 }, 94),
      event("item-status-changed", alex.id, { pathId: "p1", itemId: "i1", status: "improved" }, 60),
      event("item-status-changed", alex.id, { pathId: "p1", itemId: "i2", status: "in-progress" }, 30),
    ],
  });

  console.log(`Seeded ${users.length} users: ${users.map((u) => u.email).join(", ")} (jo has not assessed yet: ${jo.email})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
