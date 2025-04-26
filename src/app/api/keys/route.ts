import { NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

/**
 * GET /api/keys
 * Returns all public keys stored in the database
 */
export async function GET() {
  try {
    // Get all public keys from the database
    const keys = await db.getPublicKeys();
    
    return NextResponse.json({ keys }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public keys' },
      { status: 500 }
    );
  }
}
