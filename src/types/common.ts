/**
 * Shared type definitions for the application
 */

/**
 * Represents a chat message in the application
 */
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string;
}

/**
 * Represents a user's public key
 */
export interface PublicKey {
  userId: string;
  publicKey: string;
}
