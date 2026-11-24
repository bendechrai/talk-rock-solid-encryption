/**
 * Each character's device keeps its private keys here, in the browser's local storage.
 * Private keys are never sent to the server; only the public halves are published.
 */
import { useSyncExternalStore } from 'react';
import { generateKeyPair, type KeyPair } from '@whisper/shared';
import { api } from './api.ts';

const IDENTITY = 'whisper:identity:';
const EPHEMERAL = 'whisper:ephemeral:';
const CHANGED = 'whisper:keys-changed';

/** How long a conversation key lasts. A minute is short enough to watch one expire on stage. */
export const EPHEMERAL_LIFETIME_MS = 60_000;

/** A short-lived key pair for one conversation. `id` matches the server's record of the public half. */
export interface EphemeralKey extends KeyPair {
  id: string;
  conversationId: string;
  createdAt: number;
  expiresAt: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function announce(): void {
  window.dispatchEvent(new Event(CHANGED));
}

function writeEphemeral(userId: string, keys: EphemeralKey[]): void {
  localStorage.setItem(EPHEMERAL + userId, JSON.stringify(keys));
  announce();
}

export const keystore = {
  identity: (userId: string) => readJson<KeyPair | null>(IDENTITY + userId, null),

  async generateIdentity(userId: string): Promise<KeyPair> {
    const pair = generateKeyPair();
    localStorage.setItem(IDENTITY + userId, JSON.stringify(pair));
    await api.publishKey(userId, pair.publicKey);
    announce();
    return pair;
  },

  async deleteIdentity(userId: string): Promise<void> {
    localStorage.removeItem(IDENTITY + userId);
    await api.withdrawKey(userId);
    announce();
  },

  /** Every conversation key this device still holds, expired ones included, oldest first. */
  ephemeral: (userId: string) => readJson<EphemeralKey[]>(EPHEMERAL + userId, []),

  /** The newest key for a conversation that has not expired, if there is one. */
  currentEphemeral(userId: string, conversationId: string): EphemeralKey | undefined {
    const now = Date.now();
    return keystore.ephemeral(userId).filter((k) => k.conversationId === conversationId && k.expiresAt > now).at(-1);
  },

  /** Make a new conversation key and tell the server, which replaces the previous public key. */
  async generateEphemeral(userId: string, conversationId: string): Promise<EphemeralKey> {
    const pair = generateKeyPair();
    const now = Date.now();
    const expiresAt = now + EPHEMERAL_LIFETIME_MS;
    const published = await api.publishEphemeralKey(conversationId, userId, pair.publicKey, new Date(expiresAt).toISOString());
    const key: EphemeralKey = { ...pair, id: published.id, conversationId, createdAt: now, expiresAt };
    writeEphemeral(userId, [...keystore.ephemeral(userId), key]);
    return key;
  },

  /** Forget a private key. Anything sealed to it can never be opened on this device again. */
  async deleteEphemeral(userId: string, keyId: string): Promise<void> {
    writeEphemeral(userId, keystore.ephemeral(userId).filter((k) => k.id !== keyId));
    await api.withdrawEphemeralKey(keyId);
  },

  /** Presenter's shortcut: make a key expire now rather than waiting out the minute. */
  async expireEphemeral(userId: string, keyId: string): Promise<void> {
    const now = Date.now() - 1;
    writeEphemeral(userId, keystore.ephemeral(userId).map((k) => (k.id === keyId ? { ...k, expiresAt: now } : k)));
    await api.setEphemeralExpiry(keyId, new Date(now).toISOString());
  },

  clearAll(): void {
    Object.keys(localStorage).filter((key) => key.startsWith('whisper:')).forEach((key) => localStorage.removeItem(key));
    announce();
  },
};

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** A character's identity key pair on this device, kept up to date as keys are generated or deleted. */
export function useIdentity(userId: string): KeyPair | null {
  // The snapshot is the stored JSON string so that React can compare it cheaply.
  const stored = useSyncExternalStore(subscribe, () => localStorage.getItem(IDENTITY + userId));
  return stored ? (JSON.parse(stored) as KeyPair) : null;
}

/** A character's conversation keys on this device, expired ones included. */
export function useEphemeral(userId: string): EphemeralKey[] {
  const stored = useSyncExternalStore(subscribe, () => localStorage.getItem(EPHEMERAL + userId));
  return stored ? (JSON.parse(stored) as EphemeralKey[]) : [];
}
