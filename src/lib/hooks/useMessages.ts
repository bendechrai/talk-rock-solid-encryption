import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/common';

// Define the message processor interface
interface MessageProcessor {
  beforeSend?: (content: string, conversationId?: string) => Promise<string>;
  afterReceive?: (messages: Message[]) => Promise<Message[]>;
}

interface UseMessagesOptions {
  conversationId: string | null;
  userId: string;
  demoVersion: 1 | 2 | 3;
  messageProcessor?: MessageProcessor;
  pollingInterval?: number;
}

export function useMessages({
  conversationId,
  userId,
  demoVersion,
  messageProcessor,
  pollingInterval = 5000
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages without affecting the input field's state
  const loadMessages = useCallback(async () => {
    if (!conversationId) return false;
    
    // Make sure we're using a valid conversation ID (not 'default')
    const validConversationId = conversationId === 'default' ? '1' : conversationId;

    try {
      // Don't set loading state for background refreshes
      const isBackgroundRefresh = !isLoading;
      
      // Only set loading state for user-initiated actions (like sending a message)
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      }
      
      const response = await fetch(
        `/api/conversation/${validConversationId}/message`,
        {
          headers: {
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": userId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Process messages if a processor is provided
      let processedMessages = data.messages;
      if (messageProcessor?.afterReceive) {
        try {
          processedMessages = await messageProcessor.afterReceive(data.messages);
        } catch (processingError) {
          console.error('Error processing received messages:', processingError);
          throw processingError;
        }
      }
      
      // Only update state if messages have actually changed
      // This reduces unnecessary re-renders
      if (JSON.stringify(processedMessages) !== JSON.stringify(messages)) {
        setMessages(processedMessages);
      }
      
      // Clear any previous errors
      setError(null);
      
      // Only update loading state if this was a user-initiated action
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
      
      return true; // Return a value to allow chaining with .then()
    } catch (error) {
      console.error("Error loading messages:", error);
      // Set error message
      setError(error instanceof Error ? error.message : 'Failed to load messages');
      // Only update loading state if we set it earlier
      if (isLoading) {
        setIsLoading(false);
      }
      return false;
    }
  }, [conversationId, demoVersion, isLoading, messages, userId, messageProcessor]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Process content before sending if a processor is provided
      let processedContent = content;
      if (messageProcessor?.beforeSend) {
        try {
          // Make sure we're using a valid conversation ID (not 'default')
          const validConversationId = conversationId === 'default' ? '1' : conversationId;
          processedContent = await messageProcessor.beforeSend(content, validConversationId);
        } catch (processingError) {
          console.error('Error processing message before send:', processingError);
          throw processingError;
        }
      }

      // Determine encryption type based on demo version
      let encryptionType;
      if (demoVersion === 2) {
        encryptionType = "symmetric";
      } else if (demoVersion === 3) {
        encryptionType = "asymmetric";
      }

      // Make sure we're using a valid conversation ID (not 'default')
      const validConversationId = conversationId === 'default' ? '1' : conversationId;
      
      const response = await fetch(
        `/api/conversation/${validConversationId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": userId,
          },
          body: JSON.stringify({
            content: processedContent,
            sender: userId,
            encryptionType,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      await loadMessages();
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      setIsLoading(false);
    }
  }, [conversationId, demoVersion, loadMessages, userId, messageProcessor]);

  // Set up polling for new messages
  useEffect(() => {
    if (!conversationId) return;

    // Initial load
    loadMessages();

    // Create a simplified message loading function that doesn't affect the input field
    const refreshMessages = () => {
      // Only poll if the component is still mounted and visible
      if (document.visibilityState === "visible") {
        // Always fetch messages in the background without affecting input field
        loadMessages().catch(err => {
          console.error('Background refresh error:', err);
        });
      }
    };

    // Handle visibility changes (refresh when tab becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshMessages();
      }
    };

    // Set up polling interval
    const intervalId = setInterval(refreshMessages, pollingInterval);

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, loadMessages, pollingInterval]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMessages,
    clearMessages: () => setMessages([])
  };
}
