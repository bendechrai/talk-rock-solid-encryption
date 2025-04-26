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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const publicKey = await db.getPublicKeyForUser(userId);
    if (!publicKey) {
      return NextResponse.json({ error: 'No public key available for this user' }, { status: 404 });
    }

    return NextResponse.json({ publicKey });
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

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Delete the public key for the specified user
    const success = await db.deletePublicKey(userId);
    
    if (!success) {
      return NextResponse.json({ error: 'Public key not found for user' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting public key:', error);
    return NextResponse.json({ error: 'Failed to delete public key' }, { status: 500 });
  }
}
