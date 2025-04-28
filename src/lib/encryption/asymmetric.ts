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
  console.log(`[Asymmetric] Deriving shared secret with private key: ${privateKey.substring(0, 10)}... and public key: ${publicKey.substring(0, 10)}...`);
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
    
    console.log('[Asymmetric] Converting hex strings to byte arrays...');
    const privateKeyBytes = hexToBytes(privateKey);
    const publicKeyBytes = hexToBytes(publicKey);
    
    console.log(`[Asymmetric] Private key bytes length: ${privateKeyBytes.length}, Public key bytes length: ${publicKeyBytes.length}`);
    
    // Perform Diffie-Hellman key exchange
    console.log('[Asymmetric] Performing X25519 key exchange...');
    const sharedSecretBytes = x25519.getSharedSecret(privateKeyBytes, publicKeyBytes);
    // Convert to proper ArrayBuffer
    const sharedSecret = new Uint8Array(sharedSecretBytes).buffer;
    
    console.log(`[Asymmetric] Shared secret derived successfully, length: ${sharedSecret.byteLength}`);
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
  console.log(`[Asymmetric] Encrypting message for recipient with public key: ${recipientPublicKey.substring(0, 10)}...`);
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
    console.log('[Asymmetric] Generating new key pair for encryption...');
    const { publicKey, privateKey } = await generateKeys();
    console.log(`[Asymmetric] Generated key pair. Public key: ${publicKey.substring(0, 10)}...`);
    
    try {
      // Derive shared secret using DH
      console.log('[Asymmetric] Deriving shared secret...');
      const sharedSecret = await deriveSharedSecret(privateKey, recipientPublicKey);
      console.log('[Asymmetric] Successfully derived shared secret');
      
      // Use the shared secret to derive an AES key
      const encoder = new TextEncoder();
      console.log('[Asymmetric] Importing key material...');
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      console.log('[Asymmetric] Deriving AES key...');
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
      console.log('[Asymmetric] Encrypting message...');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer },
        aesKey,
        encoder.encode(text)
      );
      
      // Return the encrypted data
      const ivBase64 = bufferToBase64(iv.buffer);
      const ciphertextBase64 = bufferToBase64(encryptedData);
      
      console.log('[Asymmetric] Encryption successful. Creating result JSON...');
      const result = JSON.stringify({
        publicKey: publicKey,  // We send our public key so recipient can derive the same shared secret
        iv: ivBase64,
        ciphertext: ciphertextBase64
      });
      
      console.log(`[Asymmetric] Encryption complete. Result length: ${result.length}`);
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
  console.log(`[Asymmetric] Decrypting message with private key: ${privateKey.substring(0, 10)}...`);
  console.log(`[Asymmetric] Encrypted message length: ${encryptedMessage.length}`);
  try {
    // Parse the encrypted message
    console.log('[Asymmetric] Parsing encrypted message JSON...');
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(encryptedMessage);
      console.log('[Asymmetric] Successfully parsed message JSON');
    } catch (parseError) {
      console.error('[Asymmetric] Failed to parse encrypted message JSON:', parseError);
      console.log(`[Asymmetric] Message preview: ${encryptedMessage.substring(0, 50)}...`);
      throw new Error('Invalid encrypted message format');
    }
    
    const { publicKey, iv, ciphertext } = parsedMessage;
    
    // Validate required fields
    if (!publicKey || !iv || !ciphertext) {
      console.error('[Asymmetric] Missing required fields in encrypted message:', { 
        hasPublicKey: !!publicKey,
        hasIv: !!iv,
        hasCiphertext: !!ciphertext
      });
      throw new Error('Missing required fields in encrypted message');
    }
    
    console.log(`[Asymmetric] Sender's public key: ${publicKey.substring(0, 10)}...`);
    
    // Derive shared secret using DH
    console.log('[Asymmetric] Deriving shared secret for decryption...');
    const sharedSecret = await deriveSharedSecret(privateKey, publicKey);
    console.log('[Asymmetric] Successfully derived shared secret');
    
    // Use the shared secret to derive an AES key
    const encoder = new TextEncoder();
    console.log('[Asymmetric] Importing key material...');
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    console.log('[Asymmetric] Deriving AES key...');
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
    console.log('[Asymmetric] Converting base64 to buffers...');
    const ivBuffer = base64ToBuffer(iv);
    const ciphertextBuffer = base64ToBuffer(ciphertext);
    
    console.log('[Asymmetric] Decrypting message...');
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      aesKey,
      ciphertextBuffer
    );
    
    // Convert the decrypted buffer back to a string
    console.log('[Asymmetric] Decoding result...');
    const decoder = new TextDecoder();
    const result = decoder.decode(decryptedBuffer);
    console.log(`[Asymmetric] Decryption successful. Result: ${result.substring(0, 20)}...`);
    return result;
  } catch (error) {
    console.error('[Asymmetric] Decryption failed:', error);
    return '(Unable to decrypt message)';
  }
}
