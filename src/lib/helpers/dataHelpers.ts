/**
 * Helper functions for fetching and formatting user and conversation data
 */

/**
 * Fetch user data from the API
 */
export async function fetchUserData(userId: string, demoVersion: number) {
  try {
    // Since we don't have a specific user endpoint, we'll use the users endpoint
    // and find the user we need
    const users = await fetchAllUsers(demoVersion);
    return users.find(user => user.id === userId) || null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

/**
 * Fetch all users from the API
 */
export async function fetchAllUsers(demoVersion: number) {
  try {
    const response = await fetch(`/api/users`, {
      headers: {
        "X-Demo-Version": demoVersion.toString(),
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.users;
    }
    return [];
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

/**
 * Fetch conversation data from the API
 */
export async function fetchConversationData(conversationId: string, userId: string, demoVersion: number) {
  try {
    const response = await fetch(`/api/conversation/${conversationId}`, {
      headers: {
        "X-Demo-Version": demoVersion.toString(),
        "X-User-Id": userId,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.conversation;
    }
    return null;
  } catch (error) {
    console.error("Error fetching conversation data:", error);
    return null;
  }
}

/**
 * Fetch all conversations for a user from the API
 */
export async function fetchUserConversations(userId: string, demoVersion: number) {
  try {
    const response = await fetch("/api/conversation", {
      headers: {
        "X-Demo-Version": demoVersion.toString(),
        "X-User-Id": userId,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.conversations || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    return [];
  }
}
