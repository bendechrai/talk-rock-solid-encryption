/**
 * Symmetric encryption utilities using AES-256-GCM
 * This implementation matches the description in the presentation
 */

// Server encryption key - in a real app, this would be in environment variables
export const SERVER_KEY = 'super-secret-encryption-key';

/**
 * Convert ArrayBuffer to Base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive an encryption key from a password string
 */
export async function deriveKey(password: string): Promise<CryptoKey> {
  // Convert the password string to a buffer
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import the password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Use PBKDF2 to derive a proper encryption key
  const salt = encoder.encode('AES-GCM-Salt');  // In a real app, use a random salt
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts text using AES-256-GCM symmetric encryption
 * @param text The plain text to encrypt
 * @param password The encryption password
 * @returns Object containing encrypted data and IV
 */
export async function encryptSymmetric(text: string, password: string): Promise<string> {
  try {
    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive the encryption key from the password
    const key = await deriveKey(password);
    
    // Encrypt the data
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer },
      key,
      data
    );
    
    // Format the result as a JSON string containing the IV and ciphertext
    const result = {
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(encryptedData)
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM symmetric encryption
 * @param encryptedText The encrypted text (JSON string with iv and ciphertext)
 * @param password The encryption password
 * @returns Decrypted plain text
 */
export async function decryptSymmetric(encryptedText: string, password: string): Promise<string> {
  try {
    // Check if the input is valid JSON before attempting to parse
    let parsedData;
    try {
      parsedData = JSON.parse(encryptedText);
    } catch (parseError) {
      console.warn('Failed to parse encrypted text as JSON:', parseError);
      // If it's not valid JSON, it's likely not an encrypted message
      // Return the original text instead of throwing an error
      return encryptedText;
    }
    
    // Verify the parsed data has the expected structure
    if (!parsedData || !parsedData.iv || !parsedData.ciphertext) {
      console.warn('Encrypted data does not have the expected structure:', parsedData);
      return encryptedText;
    }
    
    const { iv, ciphertext } = parsedData;
    
    // Convert base64 strings back to buffers
    const ivBuffer = base64ToBuffer(iv);
    const ciphertextBuffer = base64ToBuffer(ciphertext);
    
    // Derive the encryption key from the password
    const key = await deriveKey(password);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      ciphertextBuffer
    );
    
    // Convert the decrypted buffer back to a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '(Decryption failed)';
  }
}

/**
 * Demo attack tool - decrypts a message using the server key
 * This demonstrates the vulnerability of server-side encryption
 */
export async function decryptWithServerKey(encryptedText: string): Promise<string> {
  return await decryptSymmetric(encryptedText, SERVER_KEY);
}
