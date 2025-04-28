"use client";

import {
  generateKeys,
  encryptWithPublicKey,
  decryptWithPrivateKey,
} from "./asymmetric";

/**
 * Interface for stored ephemeral keys in localStorage
 */
export interface StoredEphemeralKey {
  id: string;
  privateKey: string;
  publicKey: string;
  conversationId: string;
  createdAt: number; // timestamp
  expiresAt: number; // timestamp
}

/**
 * Generates an ephemeral key pair for a specific user and conversation
 * @param userId The user ID
 * @param conversationId The conversation ID
 * @returns The generated ephemeral key pair object
 */
export async function generateEphemeralKeyPair(
  userId: string,
  conversationId: string
) {
  // Generate new key pair
  const { publicKey, privateKey } = await generateKeys();

  // Get current time
  const now = Date.now();
  const expiresAt = now + 1000 * 60; // 1 minute validity for demo purposes
  // Note: In production systems, key lifetimes would be balanced between security and practicality

  // Create key object
  const keyObject: StoredEphemeralKey = {
    id: crypto.randomUUID(),
    privateKey,
    publicKey,
    conversationId,
    createdAt: now,
    expiresAt,
  };

  // Save to localStorage
  const existingKeys: StoredEphemeralKey[] = JSON.parse(
    localStorage.getItem(`chatEphemeralKeys_${userId}`) || "[]"
  );

  existingKeys.push(keyObject);
  localStorage.setItem(
    `chatEphemeralKeys_${userId}`,
    JSON.stringify(existingKeys)
  );

  // Send public key to server using the conversation-based API
  try {
    const response = await fetch(
      `/api/conversation/${conversationId}/ephemeral-keys`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          publicKey,
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      }
    );

    if (!response.ok) {
      console.error(`Failed to save ephemeral key: ${response.status}`);
      const data = await response.json().catch(() => ({}));
      throw new Error(`Server error: ${data.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Error saving ephemeral key:", error);
    // Still return the key object even if server save fails
    // This allows local encryption to work even if the server is unavailable
  }

  return keyObject;
}

/**
 * Get the current active ephemeral key for a user and conversation
 * @param userId The user ID
 * @param conversationId The conversation ID
 * @returns The current active ephemeral key or null if none exists
 */
export function getCurrentEphemeralKey(
  userId: string,
  conversationId: string
): StoredEphemeralKey | null {
  const now = Date.now();
  const keys: StoredEphemeralKey[] = JSON.parse(
    localStorage.getItem(`chatEphemeralKeys_${userId}`) || "[]"
  );

  // Find the most recent valid key for this conversation
  return (
    keys
      .filter((k) => k.conversationId === conversationId && k.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)[0] || null
  );
}

/**
 * Get all ephemeral keys for a user
 * @param userId The user ID
 * @returns Array of all stored ephemeral keys
 */
export function getAllEphemeralKeys(userId: string): StoredEphemeralKey[] {
  return JSON.parse(
    localStorage.getItem(`chatEphemeralKeys_${userId}`) || "[]"
  );
}

/**
 * Get all ephemeral keys for a user and conversation
 * @param userId The user ID
 * @param conversationId The conversation ID
 * @returns Array of ephemeral keys for the specified conversation
 */
export function getEphemeralKeysForConversation(
  userId: string,
  conversationId: string
): StoredEphemeralKey[] {
  const keys = getAllEphemeralKeys(userId);
  return keys.filter((key) => key.conversationId === conversationId);
}

/**
 * Delete an ephemeral key
 * @param userId The user ID
 * @param keyId The key ID to delete
 * @returns Promise resolving to true if deletion was successful
 */
export async function deleteEphemeralKey(
  userId: string,
  keyId: string
): Promise<boolean> {
  const keys: StoredEphemeralKey[] = JSON.parse(
    localStorage.getItem(`chatEphemeralKeys_${userId}`) || "[]"
  );

  const keyToDelete = keys.find((k) => k.id === keyId);
  if (!keyToDelete) return false;

  const updatedKeys = keys.filter((k) => k.id !== keyId);
  localStorage.setItem(
    `chatEphemeralKeys_${userId}`,
    JSON.stringify(updatedKeys)
  );

  // Also delete from server
  try {
    const response = await fetch(
      `/api/conversation/${keyToDelete.conversationId}/ephemeral-keys/${keyId}`,
      {
        method: "DELETE",
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Failed to delete ephemeral key from server:", error);
    return false;
  }
}

/**
 * Encrypt a message with ephemeral keys for all recipients
 * @param content Message content
 * @param recipientIds Array of recipient user IDs
 * @param conversationId The conversation ID
 * @param userId The sender's user ID
 * @returns Encrypted message with metadata
 */
export async function encryptWithEphemeralKeys(
  content: string,
  recipientIds: string[],
  conversationId: string,
  userId: string
) {
  // Get current ephemeral key or generate one if it doesn't exist
  let senderEphemeralKey = getCurrentEphemeralKey(userId, conversationId);
  if (!senderEphemeralKey) {
    senderEphemeralKey = await generateEphemeralKeyPair(userId, conversationId);
  }

  // Get ephemeral keys for all recipients
  const response = await fetch(
    `/api/conversation/${conversationId}/ephemeral-keys`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ephemeral keys: ${response.status}`);
  }

  const data = await response.json();
  const ephemeralKeys = data.keys || {};

  // Encrypt for each recipient
  const encryptedForRecipients = await Promise.all(
    recipientIds.map(async (recipientId) => {
      try {
        // Check if recipient has an ephemeral key
        const recipientKey = ephemeralKeys[recipientId];

        if (recipientKey && recipientKey.publicKey) {
          // Encrypt with ephemeral key
          const encrypted = await encryptWithPublicKey(
            content,
            recipientKey.publicKey
          );
          return {
            userId: recipientId,
            encrypted,
            keyType: "ephemeral",
            keyId: recipientKey.id,
          };
        } else {
          console.warn(`No ephemeral key found for user ${recipientId}`);
          return {
            userId: recipientId,
            encrypted: null,
            keyType: "missing",
            error: "No ephemeral key available",
          };
        }
      } catch (error) {
        console.error(`Encryption failed for user ${recipientId}:`, error);
        return null;
      }
    })
  );

  // Check for recipients without ephemeral keys
  const missingKeys = encryptedForRecipients
    .filter((item) => item?.keyType === "missing")
    .map((item) => item?.userId);
  const validEncryptions = encryptedForRecipients.filter(
    (item) => item !== null && item.keyType === "ephemeral"
  );

  if (validEncryptions.length === 0) {
    throw new Error("No recipients have ephemeral keys available");
  }

  // Return the encrypted data with metadata
  return JSON.stringify({
    sender: userId,
    recipients: validEncryptions,
    timestamp: new Date().toISOString(),
    conversationId,
    usedEphemeralKey: true,
    missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
  });
}

/**
 * Try to decrypt a message using available ephemeral and standard keys
 * @param message The encrypted message
 * @param userId The recipient user ID
 * @returns Decrypted message content or error message
 */
export async function decryptWithAvailableKeys(
  encryptedContent: string,
  userId: string
): Promise<{ content: string; keyType?: string; keyInfo?: string; isExpired?: boolean }> {
  try {
    // Handle case where content is not a string or is empty
    if (!encryptedContent || typeof encryptedContent !== "string") {
      return { content: encryptedContent || "(Empty message)" };
    }

    // Parse the encrypted message
    let encryptedData: any;
    try {
      encryptedData = JSON.parse(encryptedContent);
    } catch (error) {
      // Not JSON, just return the original content (plaintext message)
      return { content: encryptedContent };
    }

    // Check if parsed data is empty or not an object
    if (!encryptedData || typeof encryptedData !== "object") {
      return { content: encryptedContent };
    }

    // Check if this is a message with recipients array
    if (encryptedData?.recipients && Array.isArray(encryptedData.recipients)) {
      const { sender, recipients } = encryptedData;

      // Find our encrypted message
      const myMessage = recipients.find((r: any) => r.userId === userId);

      if (myMessage && myMessage.encrypted) {
        // Check if this was encrypted with an ephemeral key
        const keyType = myMessage.keyType || "standard";

        if (keyType === "ephemeral") {
          // Try to decrypt with ephemeral keys
          const ephemeralKeys = getAllEphemeralKeys(userId);

          // First try the specific key if we have the ID
          if (myMessage.keyId) {
            const specificKey = ephemeralKeys.find(
              (k) => k.id === myMessage.keyId
            );
            if (specificKey) {
              try {
                const decrypted = await decryptWithPrivateKey(
                  myMessage.encrypted,
                  specificKey.privateKey
                );

                if (decrypted && decrypted !== "(Unable to decrypt message)") {
                  // Get the last 6 characters of the key ID for display
                  const keyInfo = "Ephemeral Key (" + specificKey.id.slice(-6) + ")";
                  // Check if the key is expired
                  const isExpired = specificKey.expiresAt < Date.now();
                  return { content: decrypted, keyType: "ephemeral", keyInfo, isExpired };
                }
              } catch (error) {
                // Silently continue to try other keys
              }
            }
          }

          // Try all other ephemeral keys
          for (const key of ephemeralKeys) {
            try {
              const decrypted = await decryptWithPrivateKey(
                myMessage.encrypted,
                key.privateKey
              );

              if (decrypted && decrypted !== "(Unable to decrypt message)") {
                // Get the last 6 characters of the key ID for display
                const keyInfo = "Ephemeral Key (" + key.id.slice(-6) + ")";
                // Check if the key is expired
                const isExpired = key.expiresAt < Date.now();
                return { content: decrypted, keyType: "ephemeral", keyInfo, isExpired };
              }
            } catch (error) {
              // Silently continue to the next key
            }
          }
        }

        // Fall back to long-term key
        const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);
        if (privateKey) {
          try {
            const decrypted = await decryptWithPrivateKey(
              myMessage.encrypted,
              privateKey
            );

            if (decrypted && decrypted !== "(Unable to decrypt message)") {
              // For standard keys, use a generic identifier
              const keyInfo = "User Key (" + privateKey.slice(-6) + ")";
              return { content: decrypted, keyType: "standard", keyInfo };
            }
          } catch (error) {
            // Fall through to error
          }
        }

        return { content: "(Could not decrypt message)" };
      }

      return { content: "(Message not intended for you)" };
    }

    // Try standard decryption as fallback
    if (encryptedData && typeof encryptedData === "object") {
      // Check if this might be a demo-3 style encryption
      const hasValidStructure =
        encryptedData.publicKey || // Direct encryption format
        (encryptedData.iv && encryptedData.ciphertext); // Standard encryption format

      if (hasValidStructure) {
        const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);
        if (privateKey) {
          try {
            // Wrap in try/catch as the structure might be different
            const decrypted = await decryptWithPrivateKey(
              JSON.stringify(encryptedData),
              privateKey
            );

            if (decrypted && decrypted !== "(Unable to decrypt message)") {
              // For standard keys, use a generic identifier
              const keyInfo = "User Key (" + privateKey.slice(-6) + ")";
              return { content: decrypted, keyType: "standard", keyInfo };
            }
          } catch (err) {
            // For educational demo purposes, we'll silently continue
          }
        }
      }
    }
    
    return { content: "(Could not decrypt message)" };
  } catch (error) {
    console.error("Decryption error:", error);
    return { content: "(Decryption error)" };
  }
}
