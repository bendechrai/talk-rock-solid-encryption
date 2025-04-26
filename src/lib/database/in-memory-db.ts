/**
 * In-memory database with file persistence for demo purposes
 * This simulates a real database but keeps everything in memory
 * with periodic saves to a JSON file for persistence across restarts
 */

import { Message, User, Conversation } from "@/types/common";
import fs from 'fs';
import path from 'path';

// Define the path to the persistence file
const DB_FILE_PATH = path.join(process.cwd(), 'db-data.json');

// Define the structure for a public key entry
interface PublicKeyEntry {
  userId: string;
  publicKey: string;
  createdAt: Date;
}

interface DatabaseState {
  messages: Message[];
  users: User[];
  conversations: Conversation[];
  publicKeys: PublicKeyEntry[];
  messageIdCounter: number;
}

class InMemoryDatabase {
  private messages: Message[] = [];
  private users: User[] = [];
  private conversations: Conversation[] = [];
  private publicKeys: PublicKeyEntry[] = [];
  private messageIdCounter = 0;

  constructor() {
    // Try to load data from file, or initialize with default data if file doesn't exist
    this.loadFromFileOrInitialize();
  }
  
  /**
   * Load database state from file if it exists, otherwise initialize with default data
   */
  private loadFromFileOrInitialize() {
    try {
      // Check if the database file exists
      if (fs.existsSync(DB_FILE_PATH)) {
        // Read and parse the file
        const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
        const dbState: DatabaseState = JSON.parse(data);
        
        // Convert ISO date strings back to Date objects for messages
        this.messages = dbState.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        this.users = dbState.users;
        this.conversations = dbState.conversations;
        
        // Handle public keys, converting string dates to Date objects
        this.publicKeys = dbState.publicKeys ? dbState.publicKeys.map(key => ({
          ...key,
          createdAt: new Date(key.createdAt)
        })) : [];
        
        this.messageIdCounter = dbState.messageIdCounter;
        
        console.log('Database loaded from file');
      } else {
        // File doesn't exist, initialize with default data
        this.initializeDefaultData();
        console.log('Database initialized with default data');
      }
    } catch (error) {
      console.error('Error loading database from file:', error);
      // Fall back to default data if there's an error
      this.initializeDefaultData();
    }
  }
  
  /**
   * Initialize database with default data
   */
  private initializeDefaultData() {
    // Add default users
    this.users = [
      { id: '1', name: 'Alice', phoneColor: '#ff9999' },
      { id: '2', name: 'Bob', phoneColor: '#99ccff' },
      { id: '3', name: 'Charlie', phoneColor: '#99ff99' },
      { id: '4', name: 'Diana', phoneColor: '#ffcc99' }
    ];
    
    // Add default conversations
    this.conversations = [
      { id: '1', memberUserIds: ['1', '2'], name: 'Alice & Bob' },
      { id: '2', memberUserIds: ['1', '3'], name: 'Alice & Charlie' },
      { id: '3', memberUserIds: ['2', '3'], name: 'Bob & Charlie' },
      { id: '4', memberUserIds: ['1', '2', '3'], name: 'Group Chat' },
    ];
    
    // Initialize public keys
    this.publicKeys = [];
    
    // Initialize messages
    this.messages = [];
    
    // Initialize message ID counter
    this.messageIdCounter = 0;
    
    // Save the default data to file
    this.saveToFile();
  }
  
  /**
   * Save the current database state to a file
   */
  private saveToFile() {
    try {
      const dbState: DatabaseState = {
        messages: this.messages,
        users: this.users,
        conversations: this.conversations,
        publicKeys: this.publicKeys,
        messageIdCounter: this.messageIdCounter
      };
      
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbState, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving database to file:', error);
    }
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async addUser(user: User): Promise<User> {
    this.users.push(user);
    this.saveToFile(); // Save changes to file
    return user;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === userId);
  }

  // Public key operations
  async getPublicKeys(
    conversationId?: string
  ): Promise<{ userId: string; publicKey: string }[]> {
    // If no conversationId is provided, return all public keys (for admin purposes)
    if (!conversationId) {
      return this.publicKeys.map((entry) => ({
        userId: entry.userId,
        publicKey: entry.publicKey,
      }));
    }

    // Otherwise, return public keys for users in the specified conversation
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) return [];

    return this.publicKeys
      .filter((entry) => conversation.memberUserIds.includes(entry.userId))
      .map((entry) => ({
        userId: entry.userId,
        publicKey: entry.publicKey,
      }));
  }

  async setPublicKey(userId: string, publicKey: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // Check if there's an existing entry for this user
    const existingIndex = this.publicKeys.findIndex(entry => entry.userId === userId);
    
    if (existingIndex >= 0) {
      // Update existing entry
      this.publicKeys[existingIndex] = {
        userId,
        publicKey,
        createdAt: new Date()
      };
    } else {
      // Add new entry
      this.publicKeys.push({
        userId,
        publicKey,
        createdAt: new Date()
      });
    }
    
    this.saveToFile();
    return true;
  }

  async getPublicKeyForUser(userId: string): Promise<string | null> {
    const entry = this.publicKeys.find(entry => entry.userId === userId);
    return entry ? entry.publicKey : null;
  }

  async deletePublicKey(userId: string): Promise<boolean> {
    const initialLength = this.publicKeys.length;
    this.publicKeys = this.publicKeys.filter(key => key.userId !== userId);
    
    // If the length changed, we removed a key
    const success = initialLength !== this.publicKeys.length;
    
    if (success) {
      this.saveToFile();
    }
    
    return success;
  }

  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    return [...this.conversations];
  }

  async addConversation(conversation: Conversation): Promise<Conversation> {
    this.conversations.push(conversation);
    this.saveToFile(); // Save changes to file
    return conversation;
  }

  async updateConversation(conversation: Conversation): Promise<Conversation> {
    const index = this.conversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
      this.conversations[index] = conversation;
      this.saveToFile(); // Save changes to file
    }
    return conversation;
  }

  async getConversationById(
    conversationId: string
  ): Promise<Conversation | undefined> {
    return this.conversations.find((c) => c.id === conversationId);
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    return this.conversations.filter((conversation) =>
      conversation.memberUserIds.includes(userId)
    );
  }

  // Message operations
  async getMessages(conversationId: string = "1"): Promise<Message[]> {
    return this.messages
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getAllMessages(): Promise<Message[]> {
    return [...this.messages];
  }

  async addMessage(
    content: string,
    sender: string,
    conversationId: string = "1"
  ): Promise<Message> {
    const newMessage: Message = {
      id: String(++this.messageIdCounter),
      content,
      sender,
      timestamp: new Date(),
      conversationId,
    };

    this.messages.push(newMessage);
    this.saveToFile(); // Save changes to file
    return newMessage;
  }

  // Admin operations
  resetDatabase() {
    this.users = [
      {
        id: "1",
        name: "Alice",
        phoneColor: "rose",
        publicKey: "",
        privateKey: "",
      },
      {
        id: "2",
        name: "Bob",
        phoneColor: "blue",
        publicKey: "",
        privateKey: "",
      },
      {
        id: "3",
        name: "Charlie",
        phoneColor: "gold",
        publicKey: "",
        privateKey: "",
      },
      {
        id: "4",
        name: "Eve",
        phoneColor: "titanium",
        publicKey: "",
        privateKey: "",
      },
    ];
    this.conversations = [
      { id: "1", memberUserIds: ["1", "2"], name: "Alice & Bob" },
      { id: "2", memberUserIds: ["1", "3"], name: "Alice & Charlie" },
      { id: "3", memberUserIds: ["2", "3"], name: "Bob & Charlie" },
      { id: "4", memberUserIds: ["1", "2", "3"], name: "Group Chat" },
    ];
    this.messages = [];
    this.messageIdCounter = 0;
    
    // Save the reset state to file
    this.saveToFile();
  }
}

// Create a singleton instance
export const db = new InMemoryDatabase();
