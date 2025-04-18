'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat } from '@/lib/state/chat-context';
import { AdminPanel } from '@/components/common/AdminPanel';
import { Phone } from '@/components/common/Phone';
import { phoneStyles } from '@/components/common/phoneStyles';
import styles from './Demo1.module.css';



// Main chat application component
function ChatApp() {
  const { messages, addMessage, loadMessages } = useChat();
  const [conversationId, setConversationId] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to handle URL parameter change
  const handleConversationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConversationId(e.target.value);
  };
  
  // Function to reset database without page reload
  const handleResetDatabase = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      
      // Refresh messages instead of reloading the page
      await loadMessages();
      setIsLoading(false);
    } catch (error) {
      console.error('Error resetting database:', error);
      setIsLoading(false);
    }
  };
  
  // Function to view database - just returns a resolved promise
  // The actual data fetching is handled by the DatabaseViewer component
  const handleViewDatabase = async () => {
    return Promise.resolve();
  };
  
  return (
    <div className={styles.chatApp}>
      <div className={styles.conversationSelector}>
        <label htmlFor="conversation-id">Conversation ID:</label>
        <select 
          id="conversation-id" 
          value={conversationId} 
          onChange={handleConversationChange}
        >
          <option value="default">Default Conversation</option>
          <option value="private">Private Conversation</option>
          <option value="secret">Secret Conversation</option>
        </select>
      </div>
      
      <Phone>
        <div className={phoneStyles.phoneChatApp}>
          <MessageList messages={messages} />
          <MessageInput onSendMessage={(content) => addMessage(content)} />
        </div>
      </Phone>
      
      <AdminPanel 
        onResetDatabase={handleResetDatabase}
        onViewDatabase={handleViewDatabase}
        demoVersion={1}
      />

    </div>
  );
}

// Export default component
export default function Demo1() {
  const [conversationId, setConversationId] = useState('default');
  
  // Check for conversation ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const convId = urlParams.get('conversationId');
    if (convId) {
      setConversationId(convId);
    }
  }, []);
  
  return (
    <ChatProvider apiEndpoint={`/api/messages?conversationId=${conversationId}`}>
      <ChatApp />
    </ChatProvider>
  );
}
