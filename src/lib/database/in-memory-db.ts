/**
 * In-memory database for demo purposes
 * This simulates a real database but keeps everything in memory
 */

import { Message, User, Conversation } from '@/types/common';

class InMemoryDatabase {
  private messages: Message[] = [];

  private users: User[] = [];
  private conversations: Conversation[] = [];
  private messageIdCounter = 0;
  
  constructor() {
    // Initialize with some sample data
    this.resetDatabase();
  }
  
  // User operations
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async addUser(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return this.users.find(u => u.id === userId);
  }

  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    return [...this.conversations];
  }

  async addConversation(conversation: Conversation): Promise<Conversation> {
    this.conversations.push(conversation);
    return conversation;
  }

  async getConversationById(conversationId: string): Promise<Conversation | undefined> {
    return this.conversations.find(c => c.id === conversationId);
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
  

  // Admin operations
  resetDatabase() {
    this.users = [
      { id: '1', name: 'Alice', phoneColor: 'rose', publicKey: '', privateKey: '' },
      { id: '2', name: 'Bob', phoneColor: 'blue', publicKey: '', privateKey: '' },
      { id: '3', name: 'Charlie', phoneColor: 'gold', publicKey: '', privateKey: '' },
      { id: '4', name: 'Eve', phoneColor: 'titanium', publicKey: '', privateKey: '' }
    ];
    this.conversations = [
      { id: '1', memberUserIds: ['1', '2'], name: 'Alice & Bob' },
      { id: '2', memberUserIds: ['1', '3'], name: 'Alice & Charlie' },
      { id: '3', memberUserIds: ['2', '3'], name: 'Bob & Charlie' },
      { id: '4', memberUserIds: ['1', '2', '3'], name: 'Group Chat' }
    ];
    this.messages = [];
    this.messageIdCounter = 0;
  }
}

// Create a singleton instance
export const db = new InMemoryDatabase();
