/**
 * Symmetric encryption: one key both encrypts and decrypts (AES-256-GCM).
 * This is what the server does to messages at rest in API v2.
 */
import { base64ToBytes, buf, bytesToBase64 } from './bytes.ts';

export interface SymmetricBox {
  iv: string;
  ciphertext: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    // A fixed salt keeps the demo deterministic per passphrase. A real system uses a random one.
    { name: 'PBKDF2', salt: encoder.encode('whisper-demo-salt'), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSymmetric(plaintext: string, passphrase: string): Promise<SymmetricBox> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

/** Returns null when the key is wrong or the box has been tampered with. */
export async function decryptSymmetric(box: SymmetricBox, passphrase: string): Promise<string | null> {
  try {
    const key = await deriveKey(passphrase);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: buf(base64ToBytes(box.iv)) },
      key,
      buf(base64ToBytes(box.ciphertext)),
    );
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

export function isSymmetricBox(value: unknown): value is SymmetricBox {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as SymmetricBox).iv === 'string' &&
    typeof (value as SymmetricBox).ciphertext === 'string' &&
    !('publicKey' in value)
  );
}
