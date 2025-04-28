import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/in-memory-db";

// Helper function to extract conversationId from the URL
function getConversationIdFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  // Find the index of 'conversation' in the path
  const conversationIndex = pathParts.findIndex(
    (part) => part === "conversation"
  );
  if (conversationIndex !== -1 && conversationIndex + 1 < pathParts.length) {
    return pathParts[conversationIndex + 1];
  }
  return "";
}

export async function GET(request: NextRequest) {
  const conversationId = getConversationIdFromUrl(request.url);

  // Validate conversationId format (alphanumeric + hyphens only)
  if (!conversationId || !/^[a-zA-Z0-9-]+$/.test(conversationId)) {
    return NextResponse.json(
      { error: "Invalid conversation ID format" },
      { status: 400 }
    );
  }

  // Check if conversation exists
  const conversation = await db.getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Get userId filter from query params (optional)
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  // Get ephemeral keys for the conversation
  const ephemeralKeys = userId
    ? await db.getEphemeralKeysForConversationAndUser(conversationId, userId)
    : await db.getEphemeralKeysForConversation(conversationId);

  // Find the most recent key for each user
  const keys: Record<string, any> = {};
  ephemeralKeys.forEach((key) => {
    keys[key.userId] = key;
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const conversationId = getConversationIdFromUrl(request.url);

  // Validate conversationId format
  if (!conversationId || !/^[a-zA-Z0-9-]+$/.test(conversationId)) {
    return NextResponse.json(
      { error: "Invalid conversation ID format" },
      { status: 400 }
    );
  }

  try {
    const { userId, publicKey, expiresAt } = await request.json();

    // Validate required fields
    if (!userId || !publicKey) {
      return NextResponse.json(
        { error: "UserId and publicKey are required" },
        { status: 400 }
      );
    }

    // Add the ephemeral key
    const expiry = expiresAt ? new Date(expiresAt) : undefined;

    const keyId = await db.addEphemeralKey(
      userId,
      conversationId,
      publicKey,
      expiry
    );

    return NextResponse.json({ success: true, keyId });
  } catch (error) {
    console.error("Error adding ephemeral key:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}
