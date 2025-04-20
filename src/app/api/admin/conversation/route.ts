import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function PUT(request: NextRequest) {
  try {
    const { conversationId, memberUserIds } = await request.json();
    
    // Get the conversation
    const conversation = await db.getConversationById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Update the conversation members
    conversation.memberUserIds = memberUserIds;
    
    // Save the updated conversation
    await db.updateConversation(conversation);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
