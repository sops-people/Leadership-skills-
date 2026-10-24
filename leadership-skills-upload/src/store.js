import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

// Small JSON-file store so the assessment can run without a database.
// Swap for the real database once the platform task chooses one; the method names are the contract.
export function createStore(filePath) {
  let data = { users: {}, invites: {} };
  if (existsSync(filePath)) data = JSON.parse(readFileSync(filePath, 'utf8'));

  const save = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, filePath);
  };

  return {
    createUser({ name, email, currentRole, targetRole }) {
      const user = { id: randomUUID(), name, email, currentRole, targetRole, selfRatings: {}, selfCompletedAt: null, createdAt: new Date().toISOString() };
      data.users[user.id] = user;
      save();
      return user;
    },
    getUser: (id) => data.users[id] ?? null,
    updateUser(id, patch) {
      Object.assign(data.users[id], patch);
      save();
      return data.users[id];
    },

    createInvite({ userId, raterName, raterEmail, relationship }) {
      const invite = {
        token: randomBytes(16).toString('hex'),
        userId, raterName, raterEmail, relationship,
        createdAt: new Date().toISOString(),
        reminders: 0, lastRemindedAt: null,
        completedAt: null, ratings: {},
      };
      data.invites[invite.token] = invite;
      save();
      return invite;
    },
    getInvite: (token) => data.invites[token] ?? null,
    listInvites: (userId) => Object.values(data.invites).filter((i) => !userId || i.userId === userId),
    updateInvite(token, patch) {
      Object.assign(data.invites[token], patch);
      save();
      return data.invites[token];
    },
  };
}
