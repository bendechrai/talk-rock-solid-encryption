import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

// Helper function to extract conversationId from the URL
function getConversationIdFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  // Find the index of 'conversation' in the path
  const conversationIndex = pathParts.findIndex(part => part === 'conversation');
  if (conversationIndex !== -1 && conversationIndex + 1 < pathParts.length) {
    return pathParts[conversationIndex + 1];
  }
  return '';
}

export async function GET(request: NextRequest) {
  const conversationId = getConversationIdFromUrl(request.url);
  
  // Validate conversationId format (alphanumeric + hyphens only)
  if (!conversationId || !/^[a-zA-Z0-9-]+$/.test(conversationId)) {
    return NextResponse.json(
      { error: 'Invalid conversation ID format' },
      { status: 400 }
    );
  }
  
  // Check if conversation exists
  const conversation = await db.getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    );
  }
  
  // Get messages for the conversation
  let messages = await db.getMessages(conversationId);
  
  // Check if we need to decrypt messages (for Demo 2)
  const demoVersion = request.headers.get('X-Demo-Version');
  
  if (demoVersion === '2') {
    // Import the symmetric decryption utility
    const { decryptSymmetric } = await import('@/lib/encryption/symmetric');
    
    // Decrypt each message
    try {
      // Create a new array with decrypted messages
      const decryptedMessages = await Promise.all(
        messages.map(async (message) => {
          // Only try to decrypt if the content looks like it might be encrypted JSON
          if (message.content && message.content.startsWith('{') && message.content.endsWith('}')) {
            try {
              const decryptedContent = await decryptSymmetric(
                message.content,
                'super-secret-encryption-key'
              );
              
              return {
                ...message,
                content: decryptedContent,
                // Add a flag to indicate this was decrypted (useful for UI)
                _decrypted: true
              };
            } catch (error) {
              // If decryption fails, return the original message
              console.error('Failed to decrypt message:', error);
              return message;
            }
          }
          
          // If not encrypted, return as is
          return message;
        })
      );
      
      messages = decryptedMessages;
    } catch (error) {
      console.error('Error during message decryption:', error);
      // Continue with the original messages if there's an error
    }
  }
  
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const conversationId = getConversationIdFromUrl(request.url);
  
  // Validate conversationId format (alphanumeric + hyphens only)
  if (!conversationId || !/^[a-zA-Z0-9-]+$/.test(conversationId)) {
    return NextResponse.json(
      { error: 'Invalid conversation ID format' },
      { status: 400 }
    );
  }
  
  // Check if conversation exists
  const conversation = await db.getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    );
  }
  
  try {
    const { content, sender, encryptionType } = await request.json();
    
    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!sender) {
      return NextResponse.json(
        { error: 'Sender is required' },
        { status: 400 }
      );
    }
    
    // Validate content size (prevent DoS attacks)
    if (typeof content === 'string' && content.length > 100000) {
      return NextResponse.json(
        { error: 'Message content too large' },
        { status: 413 }
      );
    }
    
    // Validate encryption type if provided
    if (encryptionType && !['symmetric', 'asymmetric'].includes(encryptionType)) {
      return NextResponse.json(
        { error: 'Invalid encryption type' },
        { status: 400 }
      );
    }
    
    // Handle encryption based on the encryption type
    let finalContent = content;
    
    // For symmetric encryption (Demo 2), encrypt the content on the server side
    if (encryptionType === 'symmetric') {
      // Import the symmetric encryption utility
      const { encryptSymmetric } = await import('@/lib/encryption/symmetric');
      
      // Encrypt the content
      try {
        finalContent = await encryptSymmetric(content, 'super-secret-encryption-key');
      } catch (error) {
        console.error('Error encrypting message:', error);
        return NextResponse.json(
          { error: 'Encryption failed' },
          { status: 500 }
        );
      }
    }
    
    // For asymmetric encryption (Demo 3), the content should already be encrypted by the client
    // Store the content (either plaintext for Demo 1, encrypted for Demo 2/3)
    const message = await db.addMessage(finalContent, sender, conversationId);
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}
