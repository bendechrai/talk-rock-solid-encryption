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
 * Derives a shared secret using X25519 Diffie-Hellman key exchange
 * @param privateKey The local private key (hex string)
 * @param publicKey The remote public key (hex string)
 * @returns Shared secret as ArrayBuffer
 */
export async function deriveSharedSecret(privateKey: string, publicKey: string): Promise<ArrayBuffer> {
  try {
    // Validate inputs
    if (!privateKey || privateKey.length < 32) {
      console.error(`[Asymmetric] Invalid private key length: ${privateKey ? privateKey.length : 0}`);
      throw new Error(`Invalid private key length: ${privateKey ? privateKey.length : 0}`);
    }
    
    if (!publicKey || publicKey.length < 32) {
      console.error(`[Asymmetric] Invalid public key length: ${publicKey ? publicKey.length : 0}`);
      throw new Error(`Invalid public key length: ${publicKey ? publicKey.length : 0}`);
    }
    
    const privateKeyBytes = hexToBytes(privateKey);
    const publicKeyBytes = hexToBytes(publicKey);
    
    // Perform Diffie-Hellman key exchange
    const sharedSecretBytes = x25519.getSharedSecret(privateKeyBytes, publicKeyBytes);
    // Convert to proper ArrayBuffer
    const sharedSecret = new Uint8Array(sharedSecretBytes).buffer;
    
    return sharedSecret;
  } catch (error) {
    console.error('[Asymmetric] Failed to derive shared secret:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Encrypts a message with a recipient's public key using X25519
 * @param text The plain text to encrypt
 * @param recipientPublicKey The recipient's public key (hex string)
 * @returns Encrypted message
 */
export async function encryptWithPublicKey(text: string, recipientPublicKey: string) {
  try {
    // Validate the public key before proceeding
    if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
      console.error('[Asymmetric] Invalid recipient public key: empty or not a string');
      throw new Error('Invalid recipient public key: key is empty or not a string');
    }
    
    if (recipientPublicKey.length < 32) {
      console.error(`[Asymmetric] Invalid recipient public key length: ${recipientPublicKey.length}`);
      throw new Error(`Invalid recipient public key length: ${recipientPublicKey.length} (expected at least 32)`);
    }
    
    // Generate a private key for this encryption
    const { publicKey, privateKey } = await generateKeys();
    
    try {
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
      
      // Return the encrypted data
      const ivBase64 = bufferToBase64(iv.buffer);
      const ciphertextBase64 = bufferToBase64(encryptedData);
      
      const result = JSON.stringify({
        publicKey: publicKey,  // We send our public key so recipient can derive the same shared secret
        iv: ivBase64,
        ciphertext: ciphertextBase64
      });
      
      return result;
    } catch (dhError) {
      console.error('[Asymmetric] Diffie-Hellman key exchange failed:', dhError);
      throw new Error(`Key exchange failed: ${dhError.message}`);
    }
  } catch (error) {
    console.error('[Asymmetric] Encryption failed:', error);
    throw new Error(`Encryption failed: ${error.message}`);
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
    let parsedMessage: any;
    try {
      parsedMessage = JSON.parse(encryptedMessage);
    } catch (parseError) {
      console.error('[Asymmetric] Failed to parse encrypted message JSON:', parseError);
      console.log(`[Asymmetric] Message preview: ${encryptedMessage.substring(0, 50)}...`);
      throw new Error('Invalid encrypted message format');
    }
    
    const { publicKey, iv, ciphertext } = parsedMessage;
    
    // Validate required fields
    if (!publicKey || !iv || !ciphertext) {
      return '(Unable to decrypt message)';
    }
    
    // Derive shared secret using DH
    const sharedSecret = await deriveSharedSecret(privateKey, publicKey);
    
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
    const result = decoder.decode(decryptedBuffer);
    return result;
  } catch (error) {
    // Only log detailed errors for unexpected failures
    // For expected failures (like wrong key), just log a debug message
    if (error instanceof Error && error.message && !error.message.includes('decrypt')) {
      console.error('[Asymmetric] Decryption failed with unexpected error:', error);
    } else {
      // This is likely an expected failure when trying multiple keys
      console.debug('[Asymmetric] Decryption attempt failed - possibly wrong key');
    }
    return '(Unable to decrypt message)';
  }
}
