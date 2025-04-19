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
  const messages = await db.getMessages(conversationId);
  
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
    
    // The content is already encrypted by the client based on the encryptionType
    // The server just stores it as-is
    const message = await db.addMessage(content, sender, conversationId);
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}
