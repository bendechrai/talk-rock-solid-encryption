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
