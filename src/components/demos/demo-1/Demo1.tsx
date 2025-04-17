'use client';

import { useState, useEffect } from 'react';
import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat } from '@/lib/state/chat-context';
import { AdminPanel } from '@/components/common/AdminPanel';
import styles from './Demo1.module.css';

interface DatabaseViewerProps {
  isVisible: boolean;
  onClose: () => void;
}

function DatabaseViewer({ isVisible, onClose }: DatabaseViewerProps) {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      fetch('/api/admin')
        .then(response => response.json())
        .then(data => {
          setDbContents(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching database:', error);
          setIsLoading(false);
        });
    }
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div className="database-viewer">
      <div className="database-viewer-header">
        <h3>Database Contents</h3>
        <button onClick={onClose}>Close</button>
      </div>
      
      {isLoading ? (
        <p>Loading database contents...</p>
      ) : (
        <div className="database-viewer-content">
          <h4>Messages Table</h4>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Conversation ID</th>
                <th>Sender</th>
                <th>Content</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {dbContents?.messages.map((msg: any) => (
                <tr key={msg.id}>
                  <td>{msg.id}</td>
                  <td>{msg.conversationId}</td>
                  <td>{msg.sender}</td>
                  <td className="content-cell">{msg.content}</td>
                  <td>{new Date(msg.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChatApp() {
  const { messages, addMessage } = useChat();
  const [conversationId, setConversationId] = useState('default');
  const [showDbViewer, setShowDbViewer] = useState(false);
  
  // Function to handle URL parameter change
  const handleConversationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConversationId(e.target.value);
  };
  
  // Function to reset database
  const handleResetDatabase = async () => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
    
    // Reload messages
    window.location.reload();
  };
  
  // Function to view database
  const handleViewDatabase = async () => {
    setShowDbViewer(true);
  };
  
  return (
    <div className="chat-app">
      <div className="demo-header">
        <h2>Basic Chat Demo</h2>
        <p className="demo-description">
          This demo shows a basic chat application with plaintext messages stored in a database.
          Notice how changing the conversation ID allows access to different conversations.
        </p>
        
        <div className="conversation-selector">
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
      </div>
      
      <MessageList messages={messages} />
      <MessageInput onSendMessage={(content) => addMessage(content)} />
      
      <AdminPanel 
        onResetDatabase={handleResetDatabase}
        onViewDatabase={handleViewDatabase}
        demoVersion={1}
      />
      
      <DatabaseViewer 
        isVisible={showDbViewer} 
        onClose={() => setShowDbViewer(false)} 
      />
    </div>
  );
}

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
