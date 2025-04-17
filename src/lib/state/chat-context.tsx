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
      const response = await fetch(apiEndpoint);
      if (response.ok) {
        const data = await response.json();
        const processedMessages = await messageProcessor.afterReceive(data.messages);
        setMessages(processedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Add a new message
  const addMessage = async (content: string) => {
    try {
      const processedContent = await messageProcessor.beforeSend(content);
      
      // Extract conversationId from the apiEndpoint if it exists in the query params
      let conversationId = 'default';
      try {
        const url = new URL(apiEndpoint, window.location.origin);
        const urlConversationId = url.searchParams.get('conversationId');
        if (urlConversationId) {
          conversationId = urlConversationId;
        }
      } catch (error) {
        // If parsing fails, use default conversationId
        console.warn('Could not parse apiEndpoint for conversationId:', error);
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: processedContent, 
          sender: 'User',
          conversationId
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
