import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET() {
  // Get all data for admin view
  const messages = await db.getAllMessages();
  const publicKeys = await db.getPublicKeys();
  const users = await db.getUsers();
  const conversations = await db.getConversations();
  
  return NextResponse.json({ messages, publicKeys, users, conversations });
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
