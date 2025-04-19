import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET(request: NextRequest) {
  // Extract the user ID from the request headers
  const userId = request.headers.get('X-User-Id');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  // Get all conversations where the user is a member
  const conversations = await db.getConversationsForUser(userId);
  
  return NextResponse.json({ conversations });
}
