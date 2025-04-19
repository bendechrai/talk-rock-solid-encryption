import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = params;
  
  // Validate conversationId format (alphanumeric + hyphens only)
  if (!/^[a-zA-Z0-9-]+$/.test(conversationId)) {
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


