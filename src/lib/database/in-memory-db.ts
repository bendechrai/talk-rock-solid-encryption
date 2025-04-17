/**
 * In-memory database for demo purposes
 * This simulates a real database but keeps everything in memory
 */

import { Message, PublicKey } from '@/types/common';

class InMemoryDatabase {
  private messages: Message[] = [];
  private publicKeys: PublicKey[] = [];
  private messageIdCounter = 0;
  
  constructor() {
    // Initialize with some sample data
    this.resetDatabase();
  }
  
  // Message operations
  async getMessages(conversationId: string = 'default'): Promise<Message[]> {
    return this.messages
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async getAllMessages(): Promise<Message[]> {
    return [...this.messages];
  }
  
  async addMessage(content: string, sender: string, conversationId: string = 'default'): Promise<Message> {
    const newMessage: Message = {
      id: String(++this.messageIdCounter),
      content,
      sender,
      timestamp: new Date(),
      conversationId
    };
    
    this.messages.push(newMessage);
    return newMessage;
  }
  
  // Public key operations
  async getPublicKeys(): Promise<PublicKey[]> {
    return [...this.publicKeys];
  }
  
  async addOrUpdatePublicKey(userId: string, publicKey: string): Promise<PublicKey> {
    const existingIndex = this.publicKeys.findIndex(pk => pk.userId === userId);
    
    if (existingIndex >= 0) {
      this.publicKeys[existingIndex].publicKey = publicKey;
      return this.publicKeys[existingIndex];
    } else {
      const newPublicKey = { userId, publicKey };
      this.publicKeys.push(newPublicKey);
      return newPublicKey;
    }
  }
  
  // Admin operations
  resetDatabase() {
    this.messages = [
      {
        id: '1',
        content: 'Hello, this is a test message',
        sender: 'System',
        timestamp: new Date(Date.now() - 3600000),
        conversationId: 'default'
      },
      {
        id: '2',
        content: 'Welcome to the chat demo!',
        sender: 'System',
        timestamp: new Date(Date.now() - 1800000),
        conversationId: 'default'
      },
      {
        id: '3',
        content: 'This is a private conversation',
        sender: 'Alice',
        timestamp: new Date(Date.now() - 900000),
        conversationId: 'private'
      }
    ];
    
    this.publicKeys = [];
    this.messageIdCounter = 3;
  }
}

// Create a singleton instance
export const db = new InMemoryDatabase();
