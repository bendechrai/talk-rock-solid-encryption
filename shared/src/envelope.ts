/**
 * A multi-recipient message: the same plaintext sealed once per recipient.
 * The server stores the whole envelope and can open none of it.
 */
import { isSealedBox, openWithPrivateKey, sealForPublicKey, type SealedBox } from './asymmetric.ts';

export type KeyType = 'identity' | 'ephemeral';

export interface EnvelopeRecipient {
  userId: string;
  sealed: SealedBox;
  keyType: KeyType;
  /** For ephemeral keys: which key this copy was sealed with. */
  keyId?: string;
}

export interface Envelope {
  sender: string;
  recipients: EnvelopeRecipient[];
}

export interface RecipientKey {
  userId: string;
  publicKey: string;
  keyType: KeyType;
  keyId?: string;
}

export async function sealEnvelope(plaintext: string, sender: string, keys: RecipientKey[]): Promise<Envelope> {
  const recipients = await Promise.all(
    keys.map(async ({ userId, publicKey, keyType, keyId }) => ({
      userId,
      sealed: await sealForPublicKey(plaintext, publicKey),
      keyType,
      ...(keyId ? { keyId } : {}),
    })),
  );
  return { sender, recipients };
}

export function parseEnvelope(content: string): Envelope | null {
  try {
    const value = JSON.parse(content);
    if (
      typeof value === 'object' && value !== null && typeof value.sender === 'string' &&
      Array.isArray(value.recipients) && value.recipients.every((r: EnvelopeRecipient) => isSealedBox(r?.sealed))
    ) {
      return value as Envelope;
    }
    return null;
  } catch {
    return null;
  }
}

/** Try one private key against every copy in the envelope. Returns null if none of them open. */
export async function openEnvelope(envelope: Envelope, privateKey: string): Promise<string | null> {
  for (const recipient of envelope.recipients) {
    const plaintext = await openWithPrivateKey(recipient.sealed, privateKey);
    if (plaintext !== null) return plaintext;
  }
  return null;
}
