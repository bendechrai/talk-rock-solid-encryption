# Building Rock-Solid Encrypted Applications: Architectural Design

## Project Overview

This document outlines the architecture for a Next.js application that combines a presentation slideshow with integrated, progressive demos on encryption techniques. The application:

- Presents a slideshow accessible at localhost:3000
- Allows seamless navigation between regular slides and interactive demos
- Maintains shared state between demos
- Supports multiple demos that build upon each other (basic chat → symmetric encryption → asymmetric encryption)
- Includes an in-memory database for simplified demonstration without external dependencies
- Provides admin panels for database inspection and management
- Demonstrates security vulnerabilities and encryption techniques

## Repository Structure

```
talk-rock-solid-encryption/
├── PRESO.md                  # Presentation script/narrative
├── README.md                 # Project documentation
├── ARCHITECTURE.md           # This architecture document
├── .gitignore                # Git ignore file
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── next.config.ts            # Next.js configuration
├── public/                   # Static assets
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Main entry point
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Global styles
│   │   ├── slides/           # Slide routes
│   │   │   └── [slideId]/    # Dynamic slide routes
│   │   └── api/              # API routes
│   │       ├── messages/     # Basic message API (Demo 1)
│   │       │   └── route.ts
│   │       ├── messages-symmetric/  # Symmetric encryption API (Demo 2)
│   │       │   └── route.ts
│   │       ├── messages-asymmetric/ # Asymmetric encryption API (Demo 3)
│   │       │   └── route.ts
│   │       ├── keys/         # Public key storage API (Demo 3)
│   │       │   └── route.ts
│   │       └── admin/        # Admin operations API
│   │           └── route.ts
│   ├── components/
│   │   ├── common/           # Shared components
│   │   │   ├── AdminPanel.tsx       # Admin control panel
│   │   │   ├── AdminPanel.module.css
│   │   │   ├── MessageList.tsx      # Chat message display
│   │   │   ├── MessageList.module.css
│   │   │   ├── MessageInput.tsx     # Chat message input
│   │   │   └── MessageInput.module.css
│   │   ├── demos/            # Demo implementations
│   │   │   ├── demo-1/       # Basic chat (plaintext)
│   │   │   │   ├── Demo1.tsx
│   │   │   │   └── Demo1.module.css
│   │   │   ├── demo-2/       # Symmetric encryption
│   │   │   │   ├── Demo2.tsx
│   │   │   │   └── Demo2.module.css
│   │   │   └── demo-3/       # Asymmetric encryption
│   │   │       ├── Demo3.tsx
│   │   │       └── Demo3.module.css
│   │   └── slides/           # Slide components
│   │   │   ├── RevealWrapper.tsx    # Main Reveal.js integration component
│   │   │   ├── SlideContent.tsx     # Slide content renderer
│   │   │   └── SlideComponents.tsx  # Individual slide type components
│   │   ├── common/
│   │   │   ├── ChatInterface.tsx    # Base chat UI
│   │   │   ├── MessageList.tsx      # Messages display
│   │   │   └── MessageInput.tsx     # Input form
│   │   └── demos/
│   │       ├── demo-1/              # Basic chat
│   │       │   └── Demo1.tsx        # Basic chat implementation
│   │       ├── demo-2/              # Symmetric encryption
│   │       │   └── Demo2.tsx        # Chat with symmetric encryption
│   │       └── demo-3/              # Asymmetric encryption
│   │           └── Demo3.tsx        # Chat with asymmetric encryption
│   ├── lib/                      # Shared utilities
│   │   ├── slide-data.ts         # Slide content and metadata
│   │   ├── encryption/           # Encryption utilities
│   │   │   ├── symmetric.ts      # Symmetric encryption (AES-256-GCM)
│   │   │   └── asymmetric.ts     # Asymmetric encryption (X25519)
│   │   ├── database/             # Database implementation
│   │   │   └── in-memory-db.ts   # In-memory database service
│   │   ├── api/                  # API client utilities
│   │   └── state/                # State management
│   │       ├── slide-context.tsx # Slide navigation state
│   │       └── chat-context.tsx  # Chat state management
│   └── styles/
│       ├── globals.css              # Global styles
│       ├── SlideShow.module.css     # Slideshow-specific styles
│       └── Chat.module.css          # Chat UI styles
```

## Key Components

### Slide System

The slide system is built around the `slide-data.ts` file which defines the structure and content of the presentation:

```typescript
// src/lib/slide-data.ts
export type SlideType = 'content' | 'demo';

export type SlideComponentType = 'title' | 'bullets' | 'image' | 'code' | 'custom';

export interface SlideComponentData {
  type: SlideComponentType;
  props: Record<string, any>;
}

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  content?: string | SlideComponentData;
  demoId?: string;
  notes?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  subslides?: Slide[];
}

export const slides: Slide[] = [
  // Regular slides and demo slides defined here
];
```

### Reveal.js Integration

The presentation uses Reveal.js for slide navigation and transitions, integrated with Next.js routing:

```typescript
// src/components/slides/RevealWrapper.tsx
export default function RevealWrapper({
  slides,
  currentSlideId,
}: RevealWrapperProps) {
  // Reveal.js initialization and slide management
  // ...
}
```

The `RevealWrapper` component handles:

1. **Initialization**: Dynamically imports and initializes Reveal.js on the client side
2. **Slide Navigation**: Synchronizes Reveal.js navigation with Next.js routing
3. **Background Management**: Uses Reveal.js's native data attributes for background images and colors
4. **Event Handling**: Manages keyboard events and slide transitions

### Slide Content Rendering

The `SlideContent` component renders the content of each slide based on its type:

```typescript
// src/components/slides/SlideContent.tsx
export default function SlideContent({ slide }: SlideContentProps) {
  // Render slide content based on type (content or demo)
  // ...
}
```

This component:

1. **Content Rendering**: Renders different types of slide content (title, bullets, images, code)
2. **Demo Integration**: Dynamically loads and renders demo components when needed
3. **HTML Support**: Supports rendering raw HTML content for flexible slide layouts

### API Routes

The application includes several API routes to support the different demo implementations:

#### Basic Messages API (Demo 1)

```typescript
// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET(request: NextRequest) {
  // Get conversation ID from query params, default to 'default'
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId') || 'default';
  
  const messages = await db.getMessages(conversationId);
  
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const { content, sender, conversationId = 'default' } = await request.json();
  
  if (!content) {
    return NextResponse.json(
      { error: 'Content is required' },
      { status: 400 }
    );
  }
  
  const message = await db.addMessage(content, sender || 'User', conversationId);
  
  return NextResponse.json({ message });
}
```

#### Symmetric Encryption API (Demo 2)

```typescript
// src/app/api/messages-symmetric/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET(request: NextRequest) {
  // Get conversation ID from query params, default to 'default'
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId') || 'default';
  
  const messages = await db.getMessages(conversationId);
  
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const { content, sender, conversationId = 'default' } = await request.json();
  
  // In this demo, the content is already encrypted by the client
  // The server just stores it as-is
  const message = await db.addMessage(content, sender || 'User', conversationId);
  
  return NextResponse.json({ message });
}
```

#### Public Key Management API (Demo 3)

```typescript
// src/app/api/keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET() {
  const publicKeysList = await db.getPublicKeys();
  
  // Convert to a map of userId -> publicKey for easier client-side use
  const keys: Record<string, string> = {};
  publicKeysList.forEach(item => {
    keys[item.userId] = item.publicKey;
  });
  
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const { userId, publicKey } = await request.json();
  
  if (!userId || !publicKey) {
    return NextResponse.json(
      { error: 'UserId and publicKey are required' },
      { status: 400 }
    );
  }
  
  const result = await db.addOrUpdatePublicKey(userId, publicKey);
  
  return NextResponse.json({ success: true, publicKey: result });
}
```

#### Admin API

```typescript
// src/app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET() {
  // Get all messages for admin view
  const messages = await db.getAllMessages();
  const publicKeys = await db.getPublicKeys();
  
  return NextResponse.json({ messages, publicKeys });
}

export async function POST(request: NextRequest) {
  const { action } = await request.json();
  
  if (action === 'reset') {
    db.resetDatabase();
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  }
  
  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}
```### In-Memory Database

Instead of using PostgreSQL with Prisma, we've implemented an in-memory database to simplify the demo setup:

```typescript
// src/lib/database/in-memory-db.ts
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string;
}

export interface PublicKey {
  userId: string;
  publicKey: string;
}

class InMemoryDatabase {
  private messages: Message[] = [];
  private publicKeys: PublicKey[] = [];
  private messageIdCounter = 0;
  
  // Initialize with sample data
  constructor() {
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
    // Initialize with some sample data
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
```

### Demo Components

The application includes three progressive demos that showcase different encryption approaches:

#### Demo 1: Basic Chat (Plaintext)

The first demo shows a basic chat application with plaintext messages and demonstrates database vulnerabilities:

```typescript
// src/components/demos/demo-1/Demo1.tsx
export default function Demo1() {
  const [conversationId, setConversationId] = useState('default');
  
  // Check for conversation ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const convId = urlParams.get('conversationId');
    if (convId) {
      setConversationId(convId);
    }
  }, []);
  
  return (
    <ChatProvider apiEndpoint={`/api/messages?conversationId=${conversationId}`}>
      <ChatApp />
    </ChatProvider>
  );
}
```

#### Demo 2: Symmetric Encryption

The second demo implements AES-256-GCM encryption with a single server key:

```typescript
// src/components/demos/demo-2/Demo2.tsx
export default function Demo2() {
  // Extend the base chat with encryption processors
  const messageProcessor = {
    beforeSend: async (content: string) => {
      return await encryptSymmetric(content, SERVER_KEY);
    },
    afterReceive: async (messages: Message[]) => {
      return Promise.all(
        messages.map(async (msg) => {
          try {
            return {
              ...msg,
              content: await decryptSymmetric(msg.content, SERVER_KEY)
            };
          } catch (error) {
            return {
              ...msg,
              content: '(Encrypted message)'
            };
          }
        })
      );
    }
  };
  
  return (
    <ChatProvider 
      apiEndpoint="/api/messages-symmetric" 
      messageProcessor={messageProcessor}
    >
      <ChatApp />
    </ChatProvider>
  );
}
```

#### Demo 3: Asymmetric Encryption

The third demo implements end-to-end encryption with X25519 and Perfect Forward Secrecy:

```typescript
// src/components/demos/demo-3/Demo3.tsx
export default function Demo3() {
  const messageProcessor = {
    beforeSend: async (content: string) => {
      // Generate ephemeral keys for perfect forward secrecy
      const ephemeralKeys = await generateEphemeralKeys();
      
      // Encrypt the message with each recipient's public key
      const encryptedForRecipients = await Promise.all(
        Object.entries(publicKeys).map(async ([userId, publicKey]) => {
          const encrypted = await encryptWithPublicKey(
            content, 
            publicKey as string, 
            ephemeralKeys.privateKey
          );
          return { userId, encrypted };
        })
      );
      
      return JSON.stringify({
        sender: myUserId,
        recipients: encryptedForRecipients,
        timestamp: new Date().toISOString()
      });
    },
    afterReceive: async (messages: Message[]) => {
      // Decrypt messages with our private key
      // ...
    }
  };
  
  return (
    <ChatProvider 
      apiEndpoint="/api/messages-asymmetric" 
      messageProcessor={messageProcessor}
    >
      <ChatApp />
    </ChatProvider>
  );
}
      }
    });
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' }, 
      { status: 500 }
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message content' }, 
        { status: 400 }
      );
    }
    
    // Encrypt the message before storing
    const encrypted = await encryptSymmetric(content, ENCRYPTION_KEY);
    
    const message = await db.messageSymmetric.create({
      data: {
        content: encrypted,
        sender: 'User',
        timestamp: new Date()
      }
    });
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating encrypted message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' }, 
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/messages-asymmetric/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/database/prisma';

export async function GET() {
  try {
    const messages = await db.messageAsymmetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    
    // Return the messages with their encrypted payloads
    // Decryption will happen on the client side with the user's private key
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching e2e encrypted messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message content' }, 
        { status: 400 }
      );
    }
    
    // Store the encrypted message (which contains encrypted copies for each recipient)
    const message = await db.messageAsymmetric.create({
      data: {
        content,
        sender: 'System', // The actual sender ID is inside the encrypted payload
        timestamp: new Date()
      }
    });
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating e2e encrypted message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' }, 
      { status: 500 }
    );
  }
}
```

### Encryption Implementation

#### Symmetric Encryption (AES-256-GCM)

We use the Web Crypto API to implement AES-256-GCM encryption for secure symmetric encryption:

```typescript
// src/lib/encryption/symmetric.ts
import { hexToBytes, bytesToHex } from './utils';

// Server-side encryption key (for demo purposes only)
export const SERVER_KEY = 'super-secret-server-key-for-demo-purposes-only';

/**
 * Derives an encryption key from a password string
 * @param password The password to derive the key from
 * @returns A CryptoKey object for AES-GCM
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  // Convert the password to a buffer
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import the password as a raw key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Use a salt and derive the actual encryption key
  const salt = encoder.encode('salt-for-demo-only');
  
  // Derive the actual encryption key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts text using AES-256-GCM symmetric encryption
 * @param text The plain text to encrypt
 * @param password The encryption password
 * @returns Encrypted data as a hex string
 */
export async function encryptSymmetric(text: string, password: string): Promise<string> {
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive the encryption key from the password
  const key = await deriveKey(password);
  
  // Encrypt the data with AES-256-GCM
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  
  // Combine IV and encrypted data into a single array
  const result = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  result.set(iv);
  result.set(new Uint8Array(encryptedData), iv.length);
  
  // Convert to hex string for storage
  return bytesToHex(result);
}

/**
 * Decrypts text that was encrypted with AES-256-GCM
 * @param encryptedHex The encrypted data as a hex string
 * @param password The decryption password
 * @returns The decrypted plain text
 */
export async function decryptSymmetric(encryptedHex: string, password: string): Promise<string> {
  // Convert from hex to bytes
  const encryptedBytes = hexToBytes(encryptedHex);
  
  // Extract the IV (first 12 bytes)
  const iv = encryptedBytes.slice(0, 12);
  
  // Extract the encrypted data (everything after the IV)
  const encryptedData = encryptedBytes.slice(12);
  
  // Derive the decryption key from the password
  const key = await deriveKey(password);
  
  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  // Convert the decrypted data to a string
  return new TextDecoder().decode(decryptedData);
}
```

#### Asymmetric Encryption (X25519)

We use the @noble/curves library to implement X25519 key exchange and encryption for end-to-end encryption:

```typescript
// src/lib/encryption/asymmetric.ts
import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from './utils';

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
 * Generates ephemeral keys for perfect forward secrecy
 * @returns Object containing ephemeral public and private keys
 */
export async function generateEphemeralKeys() {
  return generateKeys();
}

/**
 * Derives a shared secret using X25519 key exchange
 * @param privateKeyHex Our private key as hex string
 * @param publicKeyHex Their public key as hex string
 * @returns The shared secret as a Uint8Array
 */
function deriveSharedSecret(privateKeyHex: string, publicKeyHex: string): Uint8Array {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKey = hexToBytes(publicKeyHex);
  
  // Perform the X25519 key exchange
  return x25519.getSharedSecret(privateKey, publicKey);
}

/**
 * Encrypts a message for a recipient using their public key
 * @param message The message to encrypt
 * @param recipientPublicKeyHex The recipient's public key as hex string
 * @param ephemeralPrivateKeyHex Optional ephemeral private key for perfect forward secrecy
 * @returns The encrypted message as a hex string
 */
export async function encryptWithPublicKey(
  message: string,
  recipientPublicKeyHex: string,
  ephemeralPrivateKeyHex?: string
): Promise<string> {
  // If no ephemeral key is provided, generate one
  let senderPrivateKeyHex = ephemeralPrivateKeyHex;
  let senderPublicKeyHex: string;
  
  if (!senderPrivateKeyHex) {
    const ephemeralKeys = await generateEphemeralKeys();
    senderPrivateKeyHex = ephemeralKeys.privateKey;
    senderPublicKeyHex = ephemeralKeys.publicKey;
  } else {
    // Derive the public key from the provided private key
    const publicKey = x25519.getPublicKey(hexToBytes(senderPrivateKeyHex));
    senderPublicKeyHex = bytesToHex(publicKey);
  }
  
  // Derive the shared secret
  const sharedSecret = deriveSharedSecret(senderPrivateKeyHex, recipientPublicKeyHex);
  
  // Use the shared secret to encrypt the message with AES-GCM
  const encryptedMessage = await encryptWithSharedSecret(message, sharedSecret);
  
  // Return the sender's public key and the encrypted message
  return JSON.stringify({
    senderPublicKey: senderPublicKeyHex,
    encryptedMessage
  });
}

/**
 * Decrypts a message using our private key
 * @param encryptedMessageJson The encrypted message JSON string
 * @param privateKeyHex Our private key as hex string
 * @returns The decrypted message
 */
export async function decryptWithPrivateKey(
  encryptedMessageJson: string,
  privateKeyHex: string
): Promise<string> {
  // Parse the encrypted message
  const { senderPublicKey, encryptedMessage } = JSON.parse(encryptedMessageJson);
  
  // Derive the shared secret
  const sharedSecret = deriveSharedSecret(privateKeyHex, senderPublicKey);
  
  // Decrypt the message using the shared secret
  return decryptWithSharedSecret(encryptedMessage, sharedSecret);
}
```

```typescript
// src/app/api/keys/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/database/prisma';

export async function GET() {
  try {
    const publicKeys = await db.publicKey.findMany();
    
    // Convert to a userId -> publicKey map
    const keysMap = publicKeys.reduce((acc, curr) => {
      acc[curr.userId] = curr.publicKey;
      return acc;
    }, {} as Record<string, string>);
    
    return NextResponse.json({ keys: keysMap });
  } catch (error) {
    console.error('Error fetching public keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public keys' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, publicKey } = await request.json();
    
    if (!userId || !publicKey) {
      return NextResponse.json(
        { error: 'User ID and public key are required' }, 
        { status: 400 }
      );
    }
    
    // Upsert the public key (create if not exists, update if exists)
    const key = await db.publicKey.upsert({
      where: { userId },
      update: { publicKey },
      create: { userId, publicKey }
    });
    
    return NextResponse.json({ key });
  } catch (error) {
    console.error('Error storing public key:', error);
    return NextResponse.json(
      { error: 'Failed to store public key' }, 
      { status: 500 }
    );
  }
}
```

### 8. App Router Pages

```typescript
// src/app/page.tsx

import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the first slide
  redirect('/slides/1');
}
```

```typescript
// src/app/slides/[slideId]/page.tsx

import { notFound } from 'next/navigation';
import { SlideProvider } from '@/lib/state/slide-context';
import SlideShow from '@/components/slides/SlideShow';
import { getSlideById } from '@/lib/slides/slide-data';

interface SlidePageProps {
  params: { slideId: string };
}

export default function SlidePage({ params }: SlidePageProps) {
  const { slideId } = params;
  const slide = getSlideById(slideId);
  
  if (!slide) {
    return notFound();
  }
  
  return (
    <main>
      <SlideProvider initialSlideId={slideId}>
        <SlideShow initialSlideId={slideId} />
      </SlideProvider>
    </main>
  );
}
```

```typescript
// src/app/demos/[demoId]/page.tsx

import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from '@/styles/SlideShow.module.css';

interface DemoPageProps {
  params: { demoId: string };
}

export default function DemoPage({ params }: DemoPageProps) {
  const { demoId } = params;
  
  // Use dynamic import for the demo component
  const DemoComponent = dynamic(
    () => import(`@/components/demos/${demoId}/Demo${demoId.split('-')[1]}`).then(
      // Pass the standalone prop to the demo component
      (mod) => ({ default: (props: any) => <mod.default {...props} standalone={true} /> })
    ),
    {
      loading: () => <div className={styles.loading}>Loading demo...</div>,
      ssr: false
    }
  );
  
  return (
    <main className={styles.standaloneDemoPage}>
      <div className={styles.demoHeader}>
        <h1>Standalone Demo: {demoId}</h1>
      </div>
      <DemoComponent />
    </main>
  );
}

```

### Database Schema

Instead of using Prisma with PostgreSQL, we've implemented an in-memory database with TypeScript interfaces:

```typescript
// src/lib/database/in-memory-db.ts

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string; // Added to support multiple conversations
}

export interface PublicKey {
  userId: string;
  publicKey: string;
}

class InMemoryDatabase {
  private messages: Message[] = [];
  private publicKeys: PublicKey[] = [];
  private messageIdCounter = 0;
  
  // Message operations
  async getMessages(conversationId: string = 'default'): Promise<Message[]> {...}
  async getAllMessages(): Promise<Message[]> {...}
  async addMessage(content: string, sender: string, conversationId: string = 'default'): Promise<Message> {...}
  
  // Public key operations
  async getPublicKeys(): Promise<PublicKey[]> {...}
  async addOrUpdatePublicKey(userId: string, publicKey: string): Promise<PublicKey> {...}
  
  // Admin operations
  resetDatabase() {...}
}

// Create a singleton instance
export const db = new InMemoryDatabase();
```

This in-memory database implementation provides the following benefits:

1. **Simplicity**: No need to set up an external database for demos
2. **Portability**: The application is self-contained and can run anywhere
3. **Reset Capability**: The database can be easily reset between demos
4. **Conversation Support**: Added support for multiple conversations to demonstrate database vulnerabilities

The database maintains two main collections:

1. **Messages**: Stores chat messages with their content (plaintext or encrypted), sender, timestamp, and conversation ID
2. **Public Keys**: Stores user public keys for the asymmetric encryption demo

### Environment Variables

```env
# .env.example

# Next.js Environment
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/slideshow_demo?schema=public"

# Encryption Keys (for Demo 2)
SYMMETRIC_KEY="your-very-secure-symmetric-key-here"
NEXT_PUBLIC_DEMO_SYMMETRIC_KEY="demo-key-for-client-side-example-only"

# Port Configuration
PORT=3000
```

## Implementation Guide

### Setting Up the Project

1. Create a new Next.js project with TypeScript:

```bash
npx create-next-app@latest slideshow-demo-monorepo --typescript
cd slideshow-demo-monorepo
```

2. Install necessary dependencies:

```bash
npm install prisma @prisma/client crypto-js
npm install -D typescript @types/node @types/react @types/crypto-js
```

3. Initialize Prisma:

```bash
npx prisma init
```

4. Configure the database schema as defined above and run:

```bash
npx prisma migrate dev --name init
```

5. Create the folder structure as outlined in the repository structure.

### Progressive Development Approach

1. Implement the base slideshow functionality first:
   - Create the slide data structure
   - Implement the slide navigation
   - Build the slide content renderer

2. Implement the base chat functionality (Demo 1):
   - Create the database models
   - Implement the API routes
   - Build the UI components

3. Add symmetric encryption (Demo 2):
   - Implement the encryption utilities
   - Create the API endpoints
   - Extend the chat components

4. Add asymmetric encryption (Demo 3):
   - Implement key generation and storage
   - Build encryption/decryption utilities
   - Create the API endpoints
   - Extend the chat components

### Testing the Application

1. Start the development server:

```bash
npm run dev
```

2. Navigate to `http://localhost:3000` to see the first slide.

3. Test direct demo access:
   - `http://localhost:3000/demos/demo-1`
   - `http://localhost:3000/demos/demo-2`
   - `http://localhost:3000/demos/demo-3`

4. For multi-user testing of Demo 3:
   - Open the demo in multiple browser windows or devices
   - Each instance will generate its own key pair
   - Messages should be encrypted for all participants

## Considerations and Next Steps

### Security Considerations

- The symmetric key in Demo 2 should be stored securely in environment variables and never exposed to the client
- In Demo 3, proper validation of keys and encrypted content should be implemented
- Consider adding proper user authentication for a production version
- Avoid storing private keys in localStorage for a real-world application; consider more secure storage options

### Performance Optimizations

- Implement pagination for message loading with larger datasets
- Add caching for public key retrieval
- Optimize the encryption process for large messages or multiple recipients

### Feature Enhancements

- Add slide transitions and animations
- Implement presenter mode with notes view
- Add user authentication and custom user profiles
- Support for sharing demos via URL with current state
- Add offline support with service workers

## Deployment

For local presentations, you can run the application locally with:

```bash
npm run build
npm start
```

For sharing with the audience via GitHub:
1. Document the setup process in the README
2. Include instructions for running the application locally
3. Consider adding a demo video or screenshots

## Conclusion

This architecture provides a solid foundation for a Next.js application that combines a slideshow with progressive, interactive demos. The design allows for code reuse between demos while maintaining a clear separation of concerns. The shared state management ensures that the user experience is seamless when navigating between slides and demos.

By following this architecture, you can create an engaging presentation that not only explains concepts but also demonstrates them in action, all within a single application.

export const slides: Slide[] = [
  {
    id: '1',
    title: 'Introduction',
    type: 'content',
    content: '<h1>Secure Chat Application</h1><p>A demonstration of progressive security enhancements</p>',
    transitionEffect: 'fade'
  },
  // More regular slides...
  {
    id: '10',
    title: 'Demo 1: Basic Chat',
    type: 'demo',
    demoId: 'demo-1',
    notes: 'This demonstrates a basic chat application with no encryption',
    transitionEffect: 'slide'
  },
  // More slides...
  {
    id: '15',
    title: 'Demo 2: Symmetric Encryption',
    type: 'demo',
    demoId: 'demo-2',
    notes: 'This demonstrates chat with server-side symmetric encryption',
    transitionEffect: 'slide'
  },
  // More slides...
  {
    id: '20',
    title: 'Demo 3: End-to-End Encryption',
    type: 'demo',
    demoId: 'demo-3',
    notes: 'This demonstrates chat with client-side asymmetric encryption',
    transitionEffect: 'slide'
  }
];

export function getSlideIds(): string[] {
  return slides.map(slide => slide.id);
}

export function getSlideById(id: string): Slide | undefined {
  return slides.find(slide => slide.id === id);
}

export function getNextSlideId(currentId: string): string | null {
  const currentIndex = slides.findIndex(slide => slide.id === currentId);
  if (currentIndex === -1 || currentIndex === slides.length - 1) return null;
  return slides[currentIndex + 1].id;
}

export function getPrevSlideId(currentId: string): string | null {
  const currentIndex = slides.findIndex(slide => slide.id === currentId);
  if (currentIndex <= 0) return null;
  return slides[currentIndex - 1].id;
}
```

### 2. Shared State Management

```typescript
// src/lib/state/chat-context.tsx

'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
}

interface MessageProcessor {
  beforeSend: (content: string) => Promise<string>;
  afterReceive: (messages: Message[]) => Promise<Message[]>;
}

interface ChatContextProps {
  messages: Message[];
  addMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const defaultMessageProcessor: MessageProcessor = {
  beforeSend: async (content: string) => content,
  afterReceive: async (messages: Message[]) => messages
};

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export interface ChatProviderProps {
  children: ReactNode;
  apiEndpoint: string;
  messageProcessor?: MessageProcessor;
  pollingInterval?: number;
}

export function ChatProvider({
  children,
  apiEndpoint,
  messageProcessor = defaultMessageProcessor,
  pollingInterval = 3000
}: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`Error fetching messages: ${response.status}`);
      }
      
      const data = await response.json();
      const processedMessages = await messageProcessor.afterReceive(data.messages);
      setMessages(processedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const processedContent = await messageProcessor.beforeSend(content);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: processedContent })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
      }
      
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    
    const interval = setInterval(loadMessages, pollingInterval);
    return () => clearInterval(interval);
  }, [apiEndpoint, pollingInterval]);

  return (
    <ChatContext.Provider value={{ messages, addMessage, loadMessages, isLoading, error }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
```

```typescript
// src/lib/state/slide-context.tsx

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSlideById, getNextSlideId, getPrevSlideId } from '@/lib/slides/slide-data';

interface SlideContextProps {
  currentSlideId: string;
  goToNextSlide: () => void;
  goToPrevSlide: () => void;
  goToSlide: (id: string) => void;
}

const SlideContext = createContext<SlideContextProps | undefined>(undefined);

export function SlideProvider({ children, initialSlideId }: { children: ReactNode; initialSlideId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [currentSlideId, setCurrentSlideId] = useState(initialSlideId);
  
  const goToSlide = (id: string) => {
    const slide = getSlideById(id);
    if (slide) {
      router.push(`/slides/${id}`);
      setCurrentSlideId(id);
    }
  };
  
  const goToNextSlide = () => {
    const nextId = getNextSlideId(currentSlideId);
    if (nextId) {
      goToSlide(nextId);
    }
  };
  
  const goToPrevSlide = () => {
    const prevId = getPrevSlideId(currentSlideId);
    if (prevId) {
      goToSlide(prevId);
    }
  };
  
  return (
    <SlideContext.Provider value={{ currentSlideId, goToNextSlide, goToPrevSlide, goToSlide }}>
      {children}
    </SlideContext.Provider>
  );
}

export function useSlides() {
  const context = useContext(SlideContext);
  if (!context) {
    throw new Error('useSlides must be used within a SlideProvider');
  }
  return context;
}
```

### 3. Encryption Utilities

```typescript
// src/lib/encryption/symmetric.ts

import CryptoJS from 'crypto-js';

/**
 * Encrypts text using AES symmetric encryption
 * @param text The plain text to encrypt
 * @param key The encryption key
 * @returns The encrypted text as a string
 */
export async function encryptSymmetric(text: string, key: string): Promise<string> {
  return CryptoJS.AES.encrypt(text, key).toString();
}

/**
 * Decrypts AES encrypted text
 * @param ciphertext The encrypted text
 * @param key The decryption key
 * @returns The decrypted plain text
 */
export async function decryptSymmetric(ciphertext: string, key: string): Promise<string> {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

```typescript
// src/lib/encryption/asymmetric.ts

// Note: In a real implementation, you would use a library like 'crypto' in Node.js
// or Web Crypto API in the browser. This is a simplified example.

/**
 * Generates an RSA key pair
 * @returns Object containing public and private key as strings
 */
export async function generateKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  // Using Web Crypto API for modern browsers
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  // Export the keys to JWK format
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  
  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk)
  };
}

/**
 * Encrypts text with a public key
 * @param text The plain text to encrypt
 * @param publicKeyStr The public key as a JWK string
 * @returns The encrypted text as a base64 string
 */
export async function encryptWithPublicKey(text: string, publicKeyStr: string): Promise<string> {
  const publicKeyJwk = JSON.parse(publicKeyStr);
  
  // Import the public key
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
  
  // Encode the text
  const encodedText = new TextEncoder().encode(text);
  
  // Encrypt the text
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encodedText
  );
  
  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
}

/**
 * Decrypts text with a private key
 * @param encryptedBase64 The encrypted text as a base64 string
 * @param privateKeyStr The private key as a JWK string
 * @returns The decrypted plain text
 */
export async function decryptWithPrivateKey(encryptedBase64: string, privateKeyStr: string): Promise<string> {
  const privateKeyJwk = JSON.parse(privateKeyStr);
  
  // Import the private key
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
  
  // Convert base64 to array buffer
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // Decrypt the data
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBytes
  );
  
  // Decode the decrypted data
  return new TextDecoder().decode(decryptedBuffer);
}
```

### 4. Common UI Components

```typescript
// src/components/common/MessageList.tsx

'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/state/chat-context';
import styles from '@/styles/Chat.module.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className={styles.messagesContainer}>
      {messages.length === 0 ? (
        <div className={styles.emptyState}>No messages yet. Start a conversation!</div>
      ) : (
        messages.map(message => (
          <div key={message.id} className={`${styles.message} ${message.sender === 'User' ? styles.outgoing : styles.incoming}`}>
            <div className={styles.messageSender}>{message.sender}</div>
            <div className={styles.messageContent}>{message.content}</div>
            <div className={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

```typescript
// src/components/common/MessageInput.tsx

'use client';

import { useState, FormEvent } from 'react';
import styles from '@/styles/Chat.module.css';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export function MessageInput({ onSendMessage, isLoading = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading) {
      try {
        await onSendMessage(message.trim());
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={styles.messageForm}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isLoading}
        className={styles.messageInput}
      />
      <button 
        type="submit" 
        disabled={isLoading || !message.trim()} 
        className={styles.sendButton}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### 5. Demo Components

```typescript
// src/components/demos/demo-1/Demo1.tsx

'use client';

import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat } from '@/lib/state/chat-context';
import styles from '@/styles/Chat.module.css';

function ChatApp() {
  const { messages, addMessage, isLoading, error } = useChat();
  
  return (
    <div className={styles.chatApp}>
      <h2>Basic Chat Demo</h2>
      <p>This demonstrates a simple chat application with no encryption.</p>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.chatContainer}>
        <MessageList messages={messages} />
        <MessageInput onSendMessage={addMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default function Demo1({ standalone = false }: { standalone?: boolean }) {
  return (
    <div className={standalone ? styles.standalonePage : styles.demoContainer}>
      <ChatProvider apiEndpoint="/api/messages">
        <ChatApp />
      </ChatProvider>
    </div>
  );
}
```

```typescript
// src/components/demos/demo-2/Demo2.tsx

'use client';

import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat, Message } from '@/lib/state/chat-context';
import { encryptSymmetric, decryptSymmetric } from '@/lib/encryption/symmetric';
import styles from '@/styles/Chat.module.css';

function ChatApp() {
  const { messages, addMessage, isLoading, error } = useChat();
  
  return (
    <div className={styles.chatApp}>
      <h2>Symmetric Encryption Chat Demo</h2>
      <p>Messages are encrypted with AES using a symmetric key from the server's .env file.</p>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.chatContainer}>
        <MessageList messages={messages} />
        <MessageInput onSendMessage={addMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default function Demo2({ standalone = false }: { standalone?: boolean }) {
  // Note: In real implementation, environment variables should never be exposed to the client
  // This is a simplified example for demonstration purposes only
  const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_DEMO_SYMMETRIC_KEY || 'default-key';
  
  // Configure message processors for encryption/decryption
  const messageProcessor = {
    beforeSend: async (content: string) => {
      return await encryptSymmetric(content, ENCRYPTION_KEY);
    },
    afterReceive: async (messages: Message[]) => {
      return Promise.all(
        messages.map(async (msg) => ({
          ...msg,
          content: await decryptSymmetric(msg.content, ENCRYPTION_KEY)
        }))
      );
    }
  };
  
  return (
    <div className={standalone ? styles.standalonePage : styles.demoContainer}>
      <ChatProvider 
        apiEndpoint="/api/messages-symmetric"
        messageProcessor={messageProcessor}
      >
        <ChatApp />
      </ChatProvider>
    </div>
  );
}
```

```typescript
// src/components/demos/demo-3/Demo3.tsx

'use client';

import { useState, useEffect } from 'react';
import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat, Message } from '@/lib/state/chat-context';
import { generateKeyPair, encryptWithPublicKey, decryptWithPrivateKey } from '@/lib/encryption/asymmetric';
import styles from '@/styles/Chat.module.css';

// Interface for message with encrypted content for each recipient
interface EncryptedMessage {
  userId: string;
  encryptedContent: string;
}

function ChatApp() {
  const { messages, addMessage, isLoading, error } = useChat();
  const [publicKeys, setPublicKeys] = useState<Record<string, string>>({});
  const [keyStatus, setKeyStatus] = useState<'initializing' | 'generating' | 'ready'>('initializing');
  const [userId, setUserId] = useState<string>('');
  
  // Generate or load key pair on component mount
  useEffect(() => {
    async function setupKeys() {
      try {
        // Generate a unique user ID if not already set
        const storedUserId = localStorage.getItem('chatUserId');
        const newUserId = storedUserId || `user-${Date.now().toString(36)}`;
        if (!storedUserId) {
          localStorage.setItem('chatUserId', newUserId);
        }
        setUserId(newUserId);
        
        // Check if we already have keys in localStorage
        const privateKey = localStorage.getItem(`privateKey-${newUserId}`);
        const publicKey = localStorage.getItem(`publicKey-${newUserId}`);
        
        if (!privateKey || !publicKey) {
          setKeyStatus('generating');
          // Generate new key pair
          const keys = await generateKeyPair();
          localStorage.setItem(`privateKey-${newUserId}`, keys.privateKey);
          localStorage.setItem(`publicKey-${newUserId}`, keys.publicKey);
          
          // Send public key to server
          await fetch('/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUserId, publicKey: keys.publicKey })
          });
        }
        
        setKeyStatus('ready');
      } catch (error) {
        console.error('Error setting up encryption keys:', error);
        setKeyStatus('initializing');
      }
    }
    
    setupKeys();
  }, []);
  
  // Load all public keys from server
  useEffect(() => {
    async function loadPublicKeys() {
      try {
        const response = await fetch('/api/keys');
        if (response.ok) {
          const data = await response.json();
          setPublicKeys(data.keys);
        }
      } catch (error) {
        console.error('Error loading public keys:', error);
      }
    }
    
    if (keyStatus === 'ready') {
      loadPublicKeys();
      const interval = setInterval(loadPublicKeys, 10000);
      return () => clearInterval(interval);
    }
  }, [keyStatus]);
  
  return (
    <div className={styles.chatApp}>
      <h2>End-to-End Encrypted Chat Demo</h2>
      <p>Messages are encrypted with asymmetric keys unique to each user.</p>
      
      <div className={styles.keyStatus}>
        <strong>Key Status:</strong> {keyStatus}
        {keyStatus === 'ready' && (
          <span> • {Object.keys(publicKeys).length} users with public keys available</span>
        )}
      </div>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.chatContainer}>
        <MessageList messages={messages} />
        <MessageInput 
          onSendMessage={addMessage} 
          isLoading={isLoading || keyStatus !== 'ready'} 
        />
      </div>
    </div>
  );
}

export default function Demo3({ standalone = false }: { standalone?: boolean }) {
  // Message processors for E2E encryption
  const messageProcessor = {
    beforeSend: async (content: string) => {
      // Get our user ID
      const userId = localStorage.getItem('chatUserId');
      if (!userId) throw new Error('User ID not found');
      
      // Fetch all public keys
      const response = await fetch('/api/keys');
      const data = await response.json();
      const publicKeys = data.keys;
      
      if (Object.keys(publicKeys).length === 0) {
        throw new Error('No recipients available');
      }
      
      // Encrypt the message with each recipient's public key
      const encryptedMessages: EncryptedMessage[] = await Promise.all(
        Object.entries(publicKeys).map(async ([recipientId, publicKey]) => {
          const encryptedContent = await encryptWithPublicKey(content, publicKey);
          return { userId: recipientId, encryptedContent };
        })
      );
      
      // Return the encrypted data for all recipients
      return JSON.stringify({
        senderId: userId,
        timestamp: new Date().toISOString(),
        encryptedMessages
      });
    },
    afterReceive: async (messages: Message[]) => {
      const userId = localStorage.getItem('chatUserId');
      const privateKey = localStorage.getItem(`privateKey-${userId}`);
      
      if (!userId || !privateKey) {
        return messages.map(msg => ({
          ...msg,
          content: '(Encryption keys not available)'
        }));
      }
      
      return Promise.all(
        messages.map(async (msg) => {
          try {
            // Parse the encrypted content
            const { senderId, encryptedMessages } = JSON.parse(msg.content);
            
            // Find our encrypted message
            const myMessage = encryptedMessages.find(
              (m: EncryptedMessage) => m.userId === userId
            );
            
            if (myMessage) {
              // Decrypt with our private key
              const decrypted = await decryptWithPrivateKey(
                myMessage.encryptedContent, 
                privateKey
              );
              
              return { 
                ...msg, 
                content: decrypted,
                sender: senderId // Use the sender ID from the encrypted message
              };
            }
            
            return { ...msg, content: '(Cannot decrypt this message)' };
          } catch (e) {
            console.error('Error decrypting message:', e);
            return { ...msg, content: '(Invalid encrypted message)' };
          }
        })
      );
    }
  };
  
  return (
    <div className={standalone ? styles.standalonePage : styles.demoContainer}>
      <ChatProvider 
        apiEndpoint="/api/messages-asymmetric"
        messageProcessor={messageProcessor}
      >
        <ChatApp />
      </ChatProvider>
    </div>
  );
}
```

### 6. Slideshow Components

```typescript
// src/components/slides/SlideShow.tsx

'use client';

import { useEffect } from 'react';
import { useSlides } from '@/lib/state/slide-context';
import SlideContent from './SlideContent';
import SlideNavigation from './SlideNavigation';
import SlideProgress from './SlideProgress';
import { getSlideById, getSlideIds } from '@/lib/slides/slide-data';
import styles from '@/styles/SlideShow.module.css';

interface SlideShowProps {
  initialSlideId: string;
}

export default function SlideShow({ initialSlideId }: SlideShowProps) {
  const { currentSlideId, goToNextSlide, goToPrevSlide } = useSlides();
  const slide = getSlideById(currentSlideId);
  const slideIds = getSlideIds();
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevSlide();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide]);
  
  if (!slide) {
    return <div>Slide not found</div>;
  }
  
  return (
    <div className={styles.slideShowContainer}>
      <SlideContent slide={slide} />
      <SlideNavigation 
        currentSlideId={currentSlideId} 
        onNext={goToNextSlide} 
        onPrev={goToPrevSlide} 
      />
      <SlideProgress 
        currentIndex={slideIds.indexOf(currentSlideId)} 
        totalSlides={slideIds.length} 
      />
    </div>
  );
}
```

```typescript
// src/components/slides/SlideContent.tsx

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Slide } from '@/lib/slides/slide-data';
import styles from '@/styles/SlideShow.module.css';

interface SlideContentProps {
  slide: Slide;
}

export default function SlideContent({ slide }: SlideContentProps) {
  // Use dynamic import for demo components
  const Demo1 = dynamic(() => import('@/components/demos/demo-1/Demo1'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 1...</div>
  });
  
  const Demo2 = dynamic(() => import('@/components/demos/demo-2/Demo2'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 2...</div>
  });
  
  const Demo3 = dynamic(() => import('@/components/demos/demo-3/Demo3'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 3...</div>
  });
    ? dynamic(() => import(`@/components/demos/${slide.demoId}/Demo${slide.demoId.split('-')[1]}`), {
        loading: () => <div className={styles.loading}>Loading demo...</div>,
        ssr: false
      })
    : null;
  
  // Handle transition effects
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [slide.id]);
  
  return (
    <div className={`${styles.slideContent} ${isTransitioning ? styles.transitioning : ''} ${
      slide.transitionEffect ? styles[`transition${slide.transitionEffect}`] : ''
    }`}>
      {slide.type === 'content' ? (
        <div 
          className={styles.contentSlide} 
          dangerouslySetInnerHTML={{ __html: typeof slide.content === 'string' ? slide.content : '' }}
        />
      ) : (
        <div className={styles.demoSlide}>
          <h1 className={styles.demoTitle}>{slide.title}</h1>
          {DemoComponent && <DemoComponent />}
        </div>
      )}
    </div>
  );
}
```

```typescript
// src/components/slides/SlideNavigation.tsx

'use client';

import Link from 'next/link';
import { getNextSlideId, getPrevSlideId } from '@/lib/slides/slide-data';
import styles from '@/styles/SlideShow.module.css';

interface SlideNavigationProps {
  currentSlideId: string;
  onNext: () => void;
  onPrev: () => void;
}

export default function SlideNavigation({ 
  currentSlideId, 
  onNext, 
  onPrev 
}: SlideNavigationProps) {
  const nextSlideId = getNextSlideId(currentSlideId);
  const prevSlideId = getPrevSlideId(currentSlideId);
  
  return (
    <div className={styles.navigation}>
      <button 
        onClick={onPrev}
        disabled={!prevSlideId}
        className={styles.navButton}
        aria-label="Previous slide"
      >
        ←
      </button>
      
      <span className={styles.slideNumber}>Slide {currentSlideId}</span>
      
      <button 
        onClick={onNext}
        disabled={!nextSlideId}
        className={styles.navButton}
        aria-label="Next slide"
      >
        →
      </button>
    </div>
  );
}
```

```typescript
// src/components/slides/SlideProgress.tsx

export default function SlideProgress({ 
  currentIndex, 
  totalSlides 
}: { 
  currentIndex: number; 
  totalSlides: number 
}) {
  const progress = Math.round((currentIndex / (totalSlides - 1)) * 100);
  
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={styles.progressText}>
        {currentIndex + 1} / {totalSlides}
      </div>
    </div>
  );
}
```