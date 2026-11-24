/**
 * What a phone does to a message before sending it and after receiving it. There is one protocol
 * per stage of the talk; everything else about the phone stays the same.
 */
import {
  isSymmetricBox, openWithPrivateKey, parseEnvelope, sealEnvelope, type RecipientKey, type StoredMessage,
} from '@whisper/shared';
import { castById } from '../theme.ts';
import { api, type ApiVersion } from './api.ts';
import { keystore } from './keystore.ts';

export type Readability = 'plain' | 'decrypted' | 'not-for-you' | 'unreadable';

export interface DisplayMessage {
  id: string;
  sender: string;
  timestamp: string;
  text: string;
  status: Readability;
  /** For decrypted messages: which kind of key opened it, and a short name for that key. */
  keyKind?: 'identity' | 'ephemeral';
  keyHint?: string;
  /** The conversation key that opened it has since expired. */
  keyExpired?: boolean;
}

export interface Outgoing {
  content: string;
  /** Something the sender should know, such as a member who will not be able to read this. */
  warning?: string;
}

export interface Protocol {
  version: ApiVersion;
  /** Does the phone need an identity key pair before it can chat? */
  needsIdentity: boolean;
  /** Does the phone need a key for each conversation as well? */
  needsConversationKey: boolean;
  /** Turn what the user typed into what gets sent to the server. */
  outgoing(text: string, sender: string, conversationId: string): Promise<Outgoing>;
  /** Turn what the server returned into what the phone shows. */
  incoming(message: StoredMessage, reader: string): Promise<DisplayMessage>;
}

function base(message: StoredMessage): Pick<DisplayMessage, 'id' | 'sender' | 'timestamp'> {
  return { id: message.id, sender: message.sender, timestamp: message.timestamp };
}

function looksServerEncrypted(content: string): boolean {
  try {
    return isSymmetricBox(JSON.parse(content));
  } catch {
    return false;
  }
}

/** Open the reader's copy of an envelope with whichever of this device's keys it was sealed to. */
async function openMine(message: StoredMessage, reader: string): Promise<DisplayMessage> {
  const envelope = parseEnvelope(message.content);
  if (!envelope) {
    // Left over from an earlier stage: server-side ciphertext we cannot open, or plain text.
    return looksServerEncrypted(message.content)
      ? { ...base(message), text: 'Server-encrypted', status: 'unreadable' }
      : { ...base(message), text: message.content, status: 'plain' };
  }
  const mine = envelope.recipients.find((recipient) => recipient.userId === reader);
  if (!mine) return { ...base(message), text: 'Not for you', status: 'not-for-you' };

  if (mine.keyType === 'ephemeral') {
    const key = keystore.ephemeral(reader).find((k) => k.id === mine.keyId);
    const text = key ? await openWithPrivateKey(mine.sealed, key.privateKey) : null;
    if (!key || text === null) return { ...base(message), text: 'Key is gone', status: 'unreadable' };
    return {
      ...base(message), text, status: 'decrypted', keyKind: 'ephemeral', keyHint: key.id.slice(-4), keyExpired: key.expiresAt <= Date.now(),
    };
  }

  const identity = keystore.identity(reader);
  const text = identity ? await openWithPrivateKey(mine.sealed, identity.privateKey) : null;
  if (!identity || text === null) return { ...base(message), text: 'Can’t decrypt', status: 'unreadable' };
  return { ...base(message), text, status: 'decrypted', keyKind: 'identity', keyHint: identity.publicKey.slice(-4) };
}

/** Stage 1: nothing is encrypted anywhere. */
export const plaintext: Protocol = {
  version: 'v1',
  needsIdentity: false,
  needsConversationKey: false,
  outgoing: async (text) => ({ content: text }),
  incoming: async (message) => ({ ...base(message), text: message.content, status: 'plain' }),
};

/** Stage 2: the phone still sends plaintext; the server encrypts at rest and decrypts on the way out. */
export const serverSide: Protocol = {
  version: 'v2',
  needsIdentity: false,
  needsConversationKey: false,
  outgoing: async (text) => ({ content: text }),
  incoming: async (message) => ({ ...base(message), text: message.content, status: 'plain' }),
};

/** Stage 3: the phone seals one copy per conversation member, and opens only its own copy. */
export const endToEnd: Protocol = {
  version: 'v3',
  needsIdentity: true,
  needsConversationKey: false,

  async outgoing(text, sender, conversationId) {
    const keys = await api.conversationKeys(conversationId);
    if (keys.length === 0) throw new Error('Nobody here has published a public key');
    const envelope = await sealEnvelope(
      text,
      sender,
      keys.map(({ userId, publicKey }) => ({ userId, publicKey, keyType: 'identity' as const })),
    );
    return { content: JSON.stringify(envelope) };
  },

  incoming: openMine,
};

/**
 * Stage 4: identity keys only say who a device is. Messages are sealed to short-lived keys that
 * belong to one conversation, so a stolen key opens one conversation for a short time.
 */
export const ephemeral: Protocol = {
  version: 'v3',
  needsIdentity: true,
  needsConversationKey: true,

  async outgoing(text, sender, conversationId) {
    // Rotation happens here: a device notices its key has expired when it next sends.
    if (!keystore.currentEphemeral(sender, conversationId)) await keystore.generateEphemeral(sender, conversationId);

    const [conversation, published] = await Promise.all([
      api.conversation(conversationId),
      api.ephemeralKeys(conversationId),
    ]);
    // The server offers each member's newest key even if it has expired; it has nothing newer.
    const keys: RecipientKey[] = published
      .filter((key) => conversation.memberUserIds.includes(key.userId))
      .map((key) => ({ userId: key.userId, publicKey: key.publicKey, keyType: 'ephemeral' as const, keyId: key.id }));
    const envelope = await sealEnvelope(text, sender, keys);

    const missing = conversation.memberUserIds.filter((id) => !keys.some((key) => key.userId === id));
    const names = missing.map((id) => castById[id]?.name ?? id).join(' and ');
    return {
      content: JSON.stringify(envelope),
      warning: missing.length ? `${names} ${missing.length === 1 ? 'has' : 'have'} no key for this chat yet` : undefined,
    };
  },

  incoming: openMine,
};
