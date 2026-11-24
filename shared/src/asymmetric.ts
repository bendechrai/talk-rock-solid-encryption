/**
 * Public/private key encryption (X25519).
 *
 * To seal a message for a recipient we make a one-off key pair, run Diffie-Hellman between the
 * one-off private key and the recipient's public key, and use the resulting shared secret as an
 * AES-256-GCM key. The one-off public key travels with the ciphertext so the recipient can redo
 * the same Diffie-Hellman with their private key. Only the recipient's private key opens the box.
 */
import { x25519 } from '@noble/curves/ed25519.js';
import { base64ToBytes, buf, bytesToBase64, bytesToHex, hexToBytes } from './bytes.ts';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SealedBox {
  /** The sender's one-off public key (hex). */
  publicKey: string;
  iv: string;
  ciphertext: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Generate a random private key, then derive its public key. Both are hex strings. */
export function generateKeyPair(): KeyPair {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey: bytesToHex(publicKey), privateKey: bytesToHex(privateKey) };
}

async function sharedAesKey(privateKey: string, publicKey: string, usage: KeyUsage): Promise<CryptoKey> {
  const sharedSecret = x25519.getSharedSecret(hexToBytes(privateKey), hexToBytes(publicKey));
  const material = await crypto.subtle.importKey('raw', buf(sharedSecret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: encoder.encode('whisper/sealed-box/v1') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

export async function sealForPublicKey(plaintext: string, recipientPublicKey: string): Promise<SealedBox> {
  const oneOff = generateKeyPair();
  const key = await sharedAesKey(oneOff.privateKey, recipientPublicKey, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return { publicKey: oneOff.publicKey, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

/** Returns null when this private key cannot open the box. */
export async function openWithPrivateKey(box: SealedBox, privateKey: string): Promise<string | null> {
  try {
    const key = await sharedAesKey(privateKey, box.publicKey, 'decrypt');
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

export function isSealedBox(value: unknown): value is SealedBox {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as SealedBox).publicKey === 'string' &&
    typeof (value as SealedBox).iv === 'string' &&
    typeof (value as SealedBox).ciphertext === 'string'
  );
}
