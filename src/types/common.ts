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
  _decryptedWith?: string;  // Type of key used for decryption (ephemeral or standard)
  _keyInfo?: string;       // Information about the key used (e.g., last 6 digits)
  _isHtml?: boolean;      // Whether the content contains HTML that should be rendered
}

/**
 * Represents a user in the application
 */
export interface User {
  id: string;
  name: string;
  phoneColor: string;
  publicKey?: string; // Now optional since we store public keys in a separate table
  privateKey?: string; // Optional, as private keys should never be stored server-side in a real app
}

/**
 * Represents a conversation with members
 */
export interface Conversation {
  id: string;
  memberUserIds: string[];
  name?: string;
}

