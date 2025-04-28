import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string, keyId: string } }
) {
  const { keyId } = params;
  
  if (!keyId) {
    return NextResponse.json(
      { error: 'Key ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const success = await db.deleteEphemeralKey(keyId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ephemeral key:', error);
    return NextResponse.json(
      { error: 'Failed to delete key' },
      { status: 500 }
    );
  }
}
