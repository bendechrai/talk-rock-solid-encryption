import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/in-memory-db';

// Simple test endpoint to create ephemeral keys directly
export async function GET(request: NextRequest) {
  // Generate test data
  const userId = '1';
  const conversationId = '1_2';
  const publicKey = 'test_public_key_' + Date.now().toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour validity
  
  try {
    // Try to add an ephemeral key
    const keyId = await db.addEphemeralKey(
      userId, 
      conversationId, 
      publicKey, 
      expiresAt
    );
    
    // Get all ephemeral keys to verify
    const ephemeralKeys = await db.getEphemeralKeysForConversation(conversationId);
    
    // For debugging, get the DB file content
    const fs = require('fs');
    let dbFileContent = '{}';
    try {
      dbFileContent = fs.readFileSync('./db-data.json', 'utf8');
    } catch (err) {
      console.error('Error reading file:', err);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test key created successfully', 
      keyId,
      allKeys: ephemeralKeys,
      dbFileContent: dbFileContent
    });
  } catch (error) {
    console.error('Error in test-ephemeral endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
