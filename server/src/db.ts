/**
 * The whole database is one JSON file. That is deliberate: during the talk the audience needs to
 * see exactly what the server stores, and a file you can open is the plainest way to show it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CAST, SEED_CONVERSATIONS,
  type Conversation, type DatabaseSnapshot, type EphemeralKeyEntry, type StoredMessage,
} from '@whisper/shared';

function seed(): DatabaseSnapshot {
  return {
    users: structuredClone(CAST),
    conversations: structuredClone(SEED_CONVERSATIONS),
    messages: [],
    publicKeys: [],
    ephemeralKeys: [],
  };
}

export class Database {
  private state: DatabaseSnapshot;

  /** Pass no path for a database that lives only in memory (used by tests). */
  constructor(private readonly path?: string) {
    this.state = this.load();
  }

  private load(): DatabaseSnapshot {
    if (this.path && existsSync(this.path)) {
      try {
        return { ...seed(), ...JSON.parse(readFileSync(this.path, 'utf8')) };
      } catch (error) {
        console.error(`Could not read ${this.path}; starting from a fresh database.`, error);
      }
    }
    return seed();
  }

  private save(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.state, null, 2));
  }

  snapshot(): DatabaseSnapshot {
    return structuredClone(this.state);
  }

  reset(): void {
    this.state = seed();
    this.save();
  }

  user(id: string) {
    return this.state.users.find((u) => u.id === id);
  }

  conversation(id: string): Conversation | undefined {
    return this.state.conversations.find((c) => c.id === id);
  }

  conversationsFor(userId: string): Conversation[] {
    return this.state.conversations.filter((c) => c.memberUserIds.includes(userId));
  }

  setMembers(conversationId: string, memberUserIds: string[]): Conversation | undefined {
    const conversation = this.conversation(conversationId);
    if (!conversation) return undefined;
    conversation.memberUserIds = memberUserIds;
    this.save();
    return conversation;
  }

  messages(conversationId: string): StoredMessage[] {
    return this.state.messages.filter((m) => m.conversationId === conversationId);
  }

  addMessage(conversationId: string, sender: string, content: string): StoredMessage {
    const lastId = this.state.messages.reduce((max, m) => Math.max(max, Number(m.id)), 0);
    const message: StoredMessage = {
      id: String(lastId + 1),
      conversationId,
      sender,
      content,
      timestamp: new Date().toISOString(),
    };
    this.state.messages.push(message);
    this.save();
    return message;
  }

  /** Replace the stored content of existing messages (used when history is re-encrypted for a new member). */
  replaceMessageContent(conversationId: string, updates: { id: string; content: string }[]): number {
    let changed = 0;
    for (const { id, content } of updates) {
      const message = this.state.messages.find((m) => m.id === id && m.conversationId === conversationId);
      if (message) {
        message.content = content;
        changed++;
      }
    }
    if (changed) this.save();
    return changed;
  }

  publicKeysFor(conversationId: string) {
    const conversation = this.conversation(conversationId);
    if (!conversation) return [];
    return this.state.publicKeys.filter((k) => conversation.memberUserIds.includes(k.userId));
  }

  setPublicKey(userId: string, publicKey: string): void {
    this.state.publicKeys = this.state.publicKeys.filter((k) => k.userId !== userId);
    this.state.publicKeys.push({ userId, publicKey, createdAt: new Date().toISOString() });
    this.save();
  }

  deletePublicKey(userId: string): boolean {
    const before = this.state.publicKeys.length;
    this.state.publicKeys = this.state.publicKeys.filter((k) => k.userId !== userId);
    this.save();
    return this.state.publicKeys.length !== before;
  }

  /** The server only ever needs a user's newest ephemeral key per conversation, so it keeps just that one. */
  setEphemeralKey(userId: string, conversationId: string, publicKey: string, expiresAt: string): EphemeralKeyEntry {
    this.state.ephemeralKeys = this.state.ephemeralKeys.filter(
      (k) => !(k.userId === userId && k.conversationId === conversationId),
    );
    const entry: EphemeralKeyEntry = {
      id: crypto.randomUUID(),
      userId,
      conversationId,
      publicKey,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    this.state.ephemeralKeys.push(entry);
    this.save();
    return entry;
  }

  ephemeralKeysFor(conversationId: string): EphemeralKeyEntry[] {
    return this.state.ephemeralKeys.filter((k) => k.conversationId === conversationId);
  }

  setEphemeralExpiry(id: string, expiresAt: string): EphemeralKeyEntry | undefined {
    const key = this.state.ephemeralKeys.find((k) => k.id === id);
    if (!key) return undefined;
    key.expiresAt = expiresAt;
    this.save();
    return key;
  }

  deleteEphemeralKey(id: string): boolean {
    const before = this.state.ephemeralKeys.length;
    this.state.ephemeralKeys = this.state.ephemeralKeys.filter((k) => k.id !== id);
    this.save();
    return this.state.ephemeralKeys.length !== before;
  }
}
