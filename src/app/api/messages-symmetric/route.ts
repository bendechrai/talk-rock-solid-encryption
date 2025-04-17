import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

// In a real application, this would be stored securely in environment variables
// For demo purposes, we're hardcoding it
const SERVER_KEY = 'super-secret-server-encryption-key-for-demo-2';

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
  
  // In this demo, the content is already encrypted by the client
  // The server just stores it as-is
  const message = await db.addMessage(content, sender || 'User', conversationId);
  
  return NextResponse.json({ message });
}
