/**
 * Each character's device keeps its private keys here, in the browser's local storage.
 * Private keys are never sent to the server; only `api.publishKey` shares the public half.
 */
import { useSyncExternalStore } from 'react';
import { generateKeyPair, type KeyPair } from '@whisper/shared';
import { api } from './api.ts';

const PREFIX = 'whisper:identity:';
const CHANGED = 'whisper:keys-changed';

function read(userId: string): KeyPair | null {
  try {
    const stored = localStorage.getItem(PREFIX + userId);
    return stored ? (JSON.parse(stored) as KeyPair) : null;
  } catch {
    return null;
  }
}

function announce(): void {
  window.dispatchEvent(new Event(CHANGED));
}

export const keystore = {
  identity: read,

  async generateIdentity(userId: string): Promise<KeyPair> {
    const pair = generateKeyPair();
    localStorage.setItem(PREFIX + userId, JSON.stringify(pair));
    await api.publishKey(userId, pair.publicKey);
    announce();
    return pair;
  },

  async deleteIdentity(userId: string): Promise<void> {
    localStorage.removeItem(PREFIX + userId);
    await api.withdrawKey(userId);
    announce();
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
  const stored = useSyncExternalStore(subscribe, () => localStorage.getItem(PREFIX + userId));
  return stored ? (JSON.parse(stored) as KeyPair) : null;
}
