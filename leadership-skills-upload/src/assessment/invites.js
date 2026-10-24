// 360 invites and reminders.

export const RELATIONSHIPS = [
  { id: 'manager', name: 'Manager' },
  { id: 'peer', name: 'Peer' },
  { id: 'direct_report', name: 'Direct report' },
  { id: 'other', name: 'Other' },
];

const DAY = 24 * 60 * 60 * 1000;

// Automatic reminders: first one 3 days after the invite, then every 3 days, at most 2.
export const AUTO_REMINDER = { minAgeMs: 3 * DAY, cooldownMs: 3 * DAY, maxReminders: 2 };
// "Remind now" button: no waiting period, but at most once a day per rater.
export const MANUAL_REMINDER = { minAgeMs: 0, cooldownMs: DAY, maxReminders: 5 };

export const raterLink = (baseUrl, invite) => `${baseUrl}/rate/${invite.token}`;

export function sendInvite({ store, outbox, baseUrl, user, raterName, raterEmail, relationship }) {
  const invite = store.createInvite({ userId: user.id, raterName, raterEmail, relationship });
  outbox.send({
    to: raterEmail,
    template: 'rater-invite',
    data: { raterName, userName: user.name },
    links: { survey: raterLink(baseUrl, invite) },
  });
  return invite;
}

// Sends reminders to raters who have not responded. Returns how many were sent.
// Pass userId to limit to one user's raters (the "Remind now" button).
export function remindPending({ store, outbox, baseUrl, userId, now = Date.now(), rules = AUTO_REMINDER }) {
  let sent = 0;
  for (const invite of store.listInvites(userId)) {
    if (invite.completedAt || invite.reminders >= rules.maxReminders) continue;
    if (now - Date.parse(invite.createdAt) < rules.minAgeMs) continue;
    if (invite.lastRemindedAt && now - Date.parse(invite.lastRemindedAt) < rules.cooldownMs) continue;

    const user = store.getUser(invite.userId);
    outbox.send({
      to: invite.raterEmail,
      template: 'rater-reminder',
      data: { raterName: invite.raterName, userName: user?.name },
      links: { survey: raterLink(baseUrl, invite) },
    });
    store.updateInvite(invite.token, { reminders: invite.reminders + 1, lastRemindedAt: new Date(now).toISOString() });
    sent++;
  }
  return sent;
}
