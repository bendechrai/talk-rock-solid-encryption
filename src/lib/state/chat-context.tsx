'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Message } from '@/types/common';

interface ChatContextProps {
  messages: Message[];
  addMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
}

interface MessageProcessor {
  beforeSend: (content: string) => Promise<string>;
  afterReceive: (messages: Message[]) => Promise<Message[]>;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export function ChatProvider({ 
  children,
  apiEndpoint = '/api/messages',
  messageProcessor = {
    beforeSend: async (content: string) => content,
    afterReceive: async (messages: Message[]) => messages
  }
}: { 
  children: ReactNode;
  apiEndpoint?: string;
  messageProcessor?: MessageProcessor;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Load messages from the API
  const loadMessages = async () => {
    try {
      // Extract conversationId from the apiEndpoint if it exists
      const conversationId = extractConversationId(apiEndpoint);
      
      // Construct the proper API URL
      const apiUrl = constructApiUrl(apiEndpoint, conversationId);
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        const processedMessages = await messageProcessor.afterReceive(data.messages);
        setMessages(processedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Helper function to extract conversationId from apiEndpoint
  const extractConversationId = (endpoint: string): string => {
    let conversationId = 'default';
    try {
      // Check if endpoint contains a query parameter for conversationId (old format)
      if (endpoint.includes('?')) {
        const url = new URL(endpoint, window.location.origin);
        const urlConversationId = url.searchParams.get('conversationId');
        if (urlConversationId) {
          conversationId = urlConversationId;
        }
      }
      // Otherwise, check if it's using the new format with path parameter
      else if (endpoint.includes('/conversation/')) {
        const parts = endpoint.split('/');
        const conversationIdIndex = parts.findIndex(part => part === 'conversation') + 1;
        if (conversationIdIndex < parts.length) {
          conversationId = parts[conversationIdIndex];
        }
      }
    } catch (error) {
      console.warn('Could not parse apiEndpoint for conversationId:', error);
    }
    return conversationId;
  };
  
  // Helper function to construct the proper API URL
  const constructApiUrl = (endpoint: string, conversationId: string): string => {
    // Check if endpoint is using the old format with query parameters
    if (endpoint.includes('?')) {
      // Convert old format to new format
      const baseEndpoint = endpoint.split('?')[0];
      const type = baseEndpoint.split('/').pop() || 'messages';
      
      if (type === 'messages') {
        return `/api/conversation/${conversationId}/message`;
      } else if (type === 'keys') {
        return `/api/conversation/${conversationId}/keys`;
      } else if (type === 'messages-symmetric' || type === 'messages-asymmetric') {
        return `/api/conversation/${conversationId}/message`;
      }
    }
    
    // If it's already using the new format or we can't determine the format, return as is
    return endpoint;
  };
  
  // Add a new message
  const addMessage = async (content: string) => {
    try {
      const processedContent = await messageProcessor.beforeSend(content);
      
      // Extract conversationId from the apiEndpoint
      const conversationId = extractConversationId(apiEndpoint);
      
      // Determine encryption type based on apiEndpoint
      let encryptionType = undefined;
      if (apiEndpoint.includes('messages-symmetric')) {
        encryptionType = 'symmetric';
      } else if (apiEndpoint.includes('messages-asymmetric')) {
        encryptionType = 'asymmetric';
      }
      
      // Construct the proper API URL
      const apiUrl = constructApiUrl(apiEndpoint, conversationId);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: processedContent, 
          sender: 'User',
          encryptionType
        })
      });
      
      if (response.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Initial load and polling setup
  useEffect(() => {
    loadMessages();
    
    // Set up polling for new messages
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [apiEndpoint]);
  
  return (
    <ChatContext.Provider value={{ messages, addMessage, loadMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
