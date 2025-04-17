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
