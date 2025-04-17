'use client';

import { x25519 } from '@noble/curves/ed25519';
import { bufferToBase64, base64ToBuffer } from './symmetric';

/**
 * Converts a hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a public/private key pair using X25519
 * @returns Object containing public and private keys as hex strings
 */
export async function generateKeys() {
  // Generate a random private key
  const privateKey = x25519.utils.randomPrivateKey();
  // Derive the public key from the private key
  const publicKey = x25519.getPublicKey(privateKey);
  
  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(privateKey)
  };
}

/**
 * Generates an ephemeral key pair for perfect forward secrecy
 * @returns Object containing ephemeral public and private keys
 */
export async function generateEphemeralKeys() {
  return generateKeys();
}

/**
 * Derives a shared secret using X25519 Diffie-Hellman key exchange
 * @param privateKey The local private key (hex string)
 * @param publicKey The remote public key (hex string)
 * @returns Shared secret as ArrayBuffer
 */
export async function deriveSharedSecret(privateKey: string, publicKey: string): Promise<ArrayBuffer> {
  const privateKeyBytes = hexToBytes(privateKey);
  const publicKeyBytes = hexToBytes(publicKey);
  
  // Perform Diffie-Hellman key exchange
  const sharedSecretBytes = x25519.getSharedSecret(privateKeyBytes, publicKeyBytes);
  // Convert to proper ArrayBuffer
  const sharedSecret = new Uint8Array(sharedSecretBytes).buffer;
  
  return sharedSecret;
}

/**
 * Encrypts a message with a recipient's public key using X25519
 * @param text The plain text to encrypt
 * @param recipientPublicKey The recipient's public key (hex string)
 * @param senderPrivateKey The sender's private key (hex string)
 * @returns Encrypted message with ephemeral public key
 */
export async function encryptWithPublicKey(text: string, recipientPublicKey: string, senderPrivateKey?: string) {
  try {
    // Generate ephemeral keys for perfect forward secrecy
    const ephemeralKeys = await generateEphemeralKeys();
    
    // Use the provided sender private key or the ephemeral one
    const privateKey = senderPrivateKey || ephemeralKeys.privateKey;
    
    // Derive shared secret using DH
    const sharedSecret = await deriveSharedSecret(privateKey, recipientPublicKey);
    
    // Use the shared secret to derive an AES key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('X25519-Salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt the message with the derived key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer },
      aesKey,
      encoder.encode(text)
    );
    
    // Return the encrypted data along with the ephemeral public key and IV
    return JSON.stringify({
      ephemeralPublicKey: ephemeralKeys.publicKey,
      iv: bufferToBase64(iv.buffer),
      ciphertext: bufferToBase64(encryptedData)
    });
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts a message with the user's private key
 * @param encryptedMessage The encrypted message JSON string
 * @param privateKey The user's private key (hex string)
 * @returns Decrypted plain text
 */
export async function decryptWithPrivateKey(encryptedMessage: string, privateKey: string) {
  try {
    // Parse the encrypted message
    const { ephemeralPublicKey, iv, ciphertext } = JSON.parse(encryptedMessage);
    
    // Derive shared secret using DH
    const sharedSecret = await deriveSharedSecret(privateKey, ephemeralPublicKey);
    
    // Use the shared secret to derive an AES key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('X25519-Salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the message
    const ivBuffer = base64ToBuffer(iv);
    const ciphertextBuffer = base64ToBuffer(ciphertext);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      aesKey,
      ciphertextBuffer
    );
    
    // Convert the decrypted buffer back to a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '(Unable to decrypt message)';
  }
}
