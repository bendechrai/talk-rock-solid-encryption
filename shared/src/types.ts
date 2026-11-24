/** Data model shared by the server and the presentation. */

export interface User {
  id: string;
  name: string;
}

export interface Conversation {
  id: string;
  name: string;
  memberUserIds: string[];
}

/** A message exactly as the server stores it. `content` is opaque to the server from API v3 on. */
export interface StoredMessage {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface PublicKeyEntry {
  userId: string;
  publicKey: string;
  createdAt: string;
}

export interface EphemeralKeyEntry {
  id: string;
  userId: string;
  conversationId: string;
  publicKey: string;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSnapshot {
  users: User[];
  conversations: Conversation[];
  messages: StoredMessage[];
  publicKeys: PublicKeyEntry[];
  ephemeralKeys: EphemeralKeyEntry[];
}

/** The cast. IDs are stable; the server seeds its database from this list. */
export const CAST: User[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'Eve' },
];

export const SEED_CONVERSATIONS: Conversation[] = [
  { id: '1', name: 'Alice & Bob', memberUserIds: ['1', '2'] },
  { id: '2', name: 'Alice & Charlie', memberUserIds: ['1', '3'] },
  { id: '3', name: 'Bob & Charlie', memberUserIds: ['2', '3'] },
  { id: '4', name: 'Group Chat', memberUserIds: ['1', '2', '3'] },
];
