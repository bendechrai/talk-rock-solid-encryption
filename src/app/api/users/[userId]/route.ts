import { db } from '@/lib/database/in-memory-db';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: {
    userId: string;
  };
}

/**
 * GET /api/users/[userId]
 * Returns details for a specific user
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = params;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return the user without their private key for security
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      phoneColor: user.phoneColor,
      publicKey: user.publicKey,
    };
    
    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
