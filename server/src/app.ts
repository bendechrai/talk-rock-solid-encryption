/**
 * The Whisper chat backend.
 *
 * The message endpoints exist in three versions, one per stage of the talk:
 *
 *   /api/v1  stores and returns plaintext.
 *   /api/v2  encrypts at rest with one server-side key, and decrypts for anyone who asks.
 *   /api/v3  stores and returns whatever the client sent. With end-to-end encryption that is
 *            ciphertext the server cannot read.
 *
 * None of the endpoints check who is asking. That is part of the demonstration, not an oversight.
 */
import { Hono } from 'hono';
import { decryptSymmetric, encryptSymmetric, isSymmetricBox, type StoredMessage } from '@whisper/shared';
import type { Database } from './db.ts';
import { createRemote } from './remote.ts';

/** In a real system this would at least live in an environment variable. It would still be one key for everything. */
export const SERVER_KEY = 'super-secret-encryption-key';

const MAX_CONTENT_LENGTH = 100_000;

async function decryptAtRest(message: StoredMessage): Promise<StoredMessage> {
  try {
    const box = JSON.parse(message.content);
    if (!isSymmetricBox(box)) return message;
    const plaintext = await decryptSymmetric(box, SERVER_KEY);
    return plaintext === null ? message : { ...message, content: plaintext };
  } catch {
    return message; // Not something this server encrypted; pass it through untouched.
  }
}

export function createApp(db: Database): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  // ---- Directory -------------------------------------------------------------------------

  app.get('/api/users', (c) => {
    const { users, publicKeys } = db.snapshot();
    return c.json({
      users: users.map((user) => ({
        ...user,
        publicKey: publicKeys.find((k) => k.userId === user.id)?.publicKey ?? null,
      })),
    });
  });

  app.get('/api/conversations', (c) => {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId is required' }, 400);
    return c.json({ conversations: db.conversationsFor(userId) });
  });

  app.get('/api/conversations/:id', (c) => {
    const conversation = db.conversation(c.req.param('id'));
    return conversation ? c.json({ conversation }) : c.json({ error: 'Conversation not found' }, 404);
  });

  // ---- Messages, one version per stage of the talk -----------------------------------------

  for (const version of ['v1', 'v2', 'v3'] as const) {
    app.get(`/api/${version}/conversations/:id/messages`, async (c) => {
      const id = c.req.param('id');
      if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
      const stored = db.messages(id);
      const messages = version === 'v2' ? await Promise.all(stored.map(decryptAtRest)) : stored;
      return c.json({ messages });
    });

    app.post(`/api/${version}/conversations/:id/messages`, async (c) => {
      const id = c.req.param('id');
      if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
      const body = await c.req.json().catch(() => null);
      const { sender, content } = body ?? {};
      if (typeof sender !== 'string' || !db.user(sender)) return c.json({ error: 'Unknown sender' }, 400);
      if (typeof content !== 'string' || content.length === 0) return c.json({ error: 'content is required' }, 400);
      if (content.length > MAX_CONTENT_LENGTH) return c.json({ error: 'Message too large' }, 413);

      const toStore = version === 'v2' ? JSON.stringify(await encryptSymmetric(content, SERVER_KEY)) : content;
      return c.json({ message: db.addMessage(id, sender, toStore) }, 201);
    });
  }

  /** Re-encrypting history for a new member means overwriting what is stored. */
  app.put('/api/v3/conversations/:id/messages', async (c) => {
    const id = c.req.param('id');
    if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
    const body = await c.req.json().catch(() => null);
    const updates = body?.messages;
    if (!Array.isArray(updates) || updates.some((u) => typeof u?.id !== 'string' || typeof u?.content !== 'string')) {
      return c.json({ error: 'messages must be a list of { id, content }' }, 400);
    }
    return c.json({ updated: db.replaceMessageContent(id, updates) });
  });

  // ---- Public keys -------------------------------------------------------------------------

  app.get('/api/conversations/:id/keys', (c) => {
    const id = c.req.param('id');
    if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
    return c.json({ keys: db.publicKeysFor(id) });
  });

  app.put('/api/users/:id/key', async (c) => {
    const userId = c.req.param('id');
    if (!db.user(userId)) return c.json({ error: 'User not found' }, 404);
    const body = await c.req.json().catch(() => null);
    const publicKey = body?.publicKey;
    if (typeof publicKey !== 'string' || !/^[0-9a-f]{64}$/.test(publicKey)) {
      return c.json({ error: 'publicKey must be 32 bytes of hex' }, 400);
    }
    db.setPublicKey(userId, publicKey);
    return c.json({ ok: true });
  });

  // Deleting is idempotent: asking to remove a key that is already gone is not an error.
  app.delete('/api/users/:id/key', (c) => c.json({ ok: true, removed: db.deletePublicKey(c.req.param('id')) }));

  // ---- Ephemeral (per-conversation) keys ---------------------------------------------------

  app.get('/api/conversations/:id/ephemeral-keys', (c) => {
    const id = c.req.param('id');
    if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
    return c.json({ keys: db.ephemeralKeysFor(id) });
  });

  app.put('/api/conversations/:id/ephemeral-keys/:userId', async (c) => {
    const { id, userId } = c.req.param();
    if (!db.conversation(id)) return c.json({ error: 'Conversation not found' }, 404);
    if (!db.user(userId)) return c.json({ error: 'User not found' }, 404);
    const body = await c.req.json().catch(() => null);
    const { publicKey, expiresAt } = body ?? {};
    if (typeof publicKey !== 'string' || !/^[0-9a-f]{64}$/.test(publicKey)) {
      return c.json({ error: 'publicKey must be 32 bytes of hex' }, 400);
    }
    if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt))) {
      return c.json({ error: 'expiresAt must be an ISO date' }, 400);
    }
    return c.json({ key: db.setEphemeralKey(userId, id, publicKey, expiresAt) });
  });

  app.put('/api/ephemeral-keys/:keyId/expiry', async (c) => {
    const body = await c.req.json().catch(() => null);
    const expiresAt = body?.expiresAt;
    if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt))) {
      return c.json({ error: 'expiresAt must be an ISO date' }, 400);
    }
    const key = db.setEphemeralExpiry(c.req.param('keyId'), expiresAt);
    return key ? c.json({ key }) : c.json({ error: 'Key not found' }, 404);
  });

  // The server only holds a person's newest key, so a device deleting an older one finds nothing here.
  app.delete('/api/ephemeral-keys/:keyId', (c) => c.json({ ok: true, removed: db.deleteEphemeralKey(c.req.param('keyId')) }));

  // ---- Admin: what the presenter uses to show the audience the server's view -----------------

  app.get('/api/admin/database', (c) => c.json(db.snapshot()));

  app.post('/api/admin/reset', (c) => {
    db.reset();
    return c.json({ ok: true });
  });

  app.put('/api/admin/conversations/:id/members', async (c) => {
    const body = await c.req.json().catch(() => null);
    const memberUserIds = body?.memberUserIds;
    if (!Array.isArray(memberUserIds) || memberUserIds.some((m) => typeof m !== 'string' || !db.user(m))) {
      return c.json({ error: 'memberUserIds must be a list of known user ids' }, 400);
    }
    const conversation = db.setMembers(c.req.param('id'), memberUserIds);
    return conversation ? c.json({ conversation }) : c.json({ error: 'Conversation not found' }, 404);
  });

  // ---- Presenter remote: relays slide position and next/back between the stage and a phone ----

  app.route('/api/remote', createRemote());

  return app;
}
