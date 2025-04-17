import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function GET() {
  const publicKeysList = await db.getPublicKeys();
  
  // Convert to a map of userId -> publicKey for easier client-side use
  const keys: Record<string, string> = {};
  publicKeysList.forEach(item => {
    keys[item.userId] = item.publicKey;
  });
  
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const { userId, publicKey } = await request.json();
  
  if (!userId || !publicKey) {
    return NextResponse.json(
      { error: 'UserId and publicKey are required' },
      { status: 400 }
    );
  }
  
  const result = await db.addOrUpdatePublicKey(userId, publicKey);
  
  return NextResponse.json({ success: true, publicKey: result });
}
