/**
 * What a phone does to a message before sending it and after receiving it. There is one protocol
 * per stage of the talk; everything else about the phone stays the same.
 */
import { isSymmetricBox, openWithPrivateKey, parseEnvelope, sealEnvelope, type StoredMessage } from '@whisper/shared';
import { api, type ApiVersion } from './api.ts';
import { keystore } from './keystore.ts';

export type Readability = 'plain' | 'decrypted' | 'not-for-you' | 'unreadable';

export interface DisplayMessage {
  id: string;
  sender: string;
  timestamp: string;
  text: string;
  status: Readability;
  /** Which key opened it, as the last characters of the public key. */
  keyHint?: string;
}

export interface Protocol {
  version: ApiVersion;
  /** Does the phone need an identity key pair before it can chat? */
  needsIdentity: boolean;
  /** Turn what the user typed into what gets sent to the server. */
  outgoing(text: string, sender: string, conversationId: string): Promise<string>;
  /** Turn what the server returned into what the phone shows. */
  incoming(message: StoredMessage, reader: string): Promise<DisplayMessage>;
}

function base(message: StoredMessage): Pick<DisplayMessage, 'id' | 'sender' | 'timestamp'> {
  return { id: message.id, sender: message.sender, timestamp: message.timestamp };
}

function looksEncrypted(content: string): boolean {
  try {
    return isSymmetricBox(JSON.parse(content));
  } catch {
    return false;
  }
}

/** Stage 1: nothing is encrypted anywhere. */
export const plaintext: Protocol = {
  version: 'v1',
  needsIdentity: false,
  outgoing: async (text) => text,
  incoming: async (message) => ({ ...base(message), text: message.content, status: 'plain' }),
};

/** Stage 2: the phone still sends plaintext; the server encrypts at rest and decrypts on the way out. */
export const serverSide: Protocol = {
  version: 'v2',
  needsIdentity: false,
  outgoing: async (text) => text,
  incoming: async (message) => ({ ...base(message), text: message.content, status: 'plain' }),
};

/** Stage 3: the phone seals one copy per conversation member, and opens only its own copy. */
export const endToEnd: Protocol = {
  version: 'v3',
  needsIdentity: true,

  async outgoing(text, sender, conversationId) {
    const keys = await api.conversationKeys(conversationId);
    if (keys.length === 0) throw new Error('Nobody in this conversation has published a public key');
    const envelope = await sealEnvelope(
      text,
      sender,
      keys.map(({ userId, publicKey }) => ({ userId, publicKey, keyType: 'identity' as const })),
    );
    return JSON.stringify(envelope);
  },

  async incoming(message, reader) {
    const envelope = parseEnvelope(message.content);
    if (!envelope) {
      // Left over from an earlier stage: either server-side ciphertext we cannot open, or plaintext.
      return looksEncrypted(message.content)
        ? { ...base(message), text: 'Can’t decrypt: the server encrypted this one', status: 'unreadable' }
        : { ...base(message), text: message.content, status: 'plain' };
    }
    const mine = envelope.recipients.find((recipient) => recipient.userId === reader);
    if (!mine) return { ...base(message), text: 'Not encrypted for you', status: 'not-for-you' };

    const identity = keystore.identity(reader);
    const text = identity ? await openWithPrivateKey(mine.sealed, identity.privateKey) : null;
    if (text === null || !identity) return { ...base(message), text: 'Can’t decrypt with this device’s key', status: 'unreadable' };
    return { ...base(message), text, status: 'decrypted', keyHint: identity.publicKey.slice(-4) };
  },
};
