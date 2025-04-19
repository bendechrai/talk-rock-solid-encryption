import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function POST(request: NextRequest) {
  try {
    const { userId, publicKey } = await request.json();
    
    // Validate required fields
    if (!userId || !publicKey) {
      return NextResponse.json(
        { error: 'UserId and publicKey are required' },
        { status: 400 }
      );
    }
    
    // Validate userId format (alphanumeric only)
    if (!/^[a-zA-Z0-9]+$/.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Validate publicKey format and length
    if (typeof publicKey !== 'string' || publicKey.length < 32 || publicKey.length > 2048) {
      return NextResponse.json(
        { error: 'Invalid public key format or length' },
        { status: 400 }
      );
    }
    
    const success = await db.setPublicKey(userId, publicKey);
    
    if (!success) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing public key:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Get userId from query parameters
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (userId) {
    // Get public key for a specific user
    const user = await db.getUserById(userId);
    if (!user || !user.publicKey) {
      return NextResponse.json(
        { error: 'User or public key not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ publicKey: user.publicKey });
  } else {
    // Get all public keys
    const publicKeysList = await db.getPublicKeys();
    
    // Convert to a map of userId -> publicKey for easier client-side use
    const keys: Record<string, string> = {};
    publicKeysList.forEach(item => {
      keys[item.userId] = item.publicKey;
    });
    
    return NextResponse.json({ keys });
  }
}
