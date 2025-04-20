import { db } from '@/lib/database/in-memory-db';
import { NextResponse } from 'next/server';

/**
 * GET /api/users
 * Returns a list of all users in the system
 */
export async function GET() {
  try {
    const users = await db.getUsers();
    
    // Return the users without their private keys for security
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      phoneColor: user.phoneColor,
      publicKey: user.publicKey,
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
