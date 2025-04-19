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
  
  // Get public keys for the specified conversation
  const publicKeysList = await db.getPublicKeys(conversationId);
  
  // Convert to a map of userId -> publicKey for easier client-side use
  const keys: Record<string, string> = {};
  publicKeysList.forEach(item => {
    keys[item.userId] = item.publicKey;
  });
  
  return NextResponse.json({ keys });
}


