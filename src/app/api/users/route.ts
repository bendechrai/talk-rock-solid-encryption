import { db } from '@/lib/database/in-memory-db';
import { NextResponse } from 'next/server';

/**
 * GET /api/users
 * Returns a list of all users in the system
 */
export async function GET() {
  try {
    const users = await db.getUsers();
    const publicKeys = await db.getPublicKeys();
    
    // Map public keys to users
    const publicKeyMap = publicKeys.reduce((map, entry) => {
      map[entry.userId] = entry.publicKey;
      return map;
    }, {} as Record<string, string>);
    
    // Return the users with their public keys (if available)
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      phoneColor: user.phoneColor,
      publicKey: publicKeyMap[user.id] || null,
    }));
    
    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
