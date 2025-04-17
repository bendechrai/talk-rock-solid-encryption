'use client';

import { useState, useEffect } from 'react';
import { MessageList } from '@/components/common/MessageList';
import { MessageInput } from '@/components/common/MessageInput';
import { ChatProvider, useChat } from '@/lib/state/chat-context';
import { Message } from '@/types/common';
import { encryptSymmetric, decryptSymmetric, decryptWithServerKey, SERVER_KEY } from '@/lib/encryption/symmetric';
import { AdminPanel } from '@/components/common/AdminPanel';
import styles from './Demo2.module.css';

interface AttackDemoProps {
  isVisible: boolean;
  onClose: () => void;
}

function AttackDemo({ isVisible, onClose }: AttackDemoProps) {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  
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
    } else {
      // Reset state when closing
      setSelectedMessage(null);
      setDecryptedMessage(null);
    }
  }, [isVisible]);
  
  const handleSelectMessage = (content: string) => {
    setSelectedMessage(content);
    setDecryptedMessage(null); // Reset previous decryption
  };
  
  const handleDecrypt = async () => {
    if (!selectedMessage) return;
    
    try {
      const decrypted = await decryptWithServerKey(selectedMessage);
      setDecryptedMessage(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      setDecryptedMessage('(Decryption failed)');
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="attack-demo">
      <div className="attack-demo-header">
        <h3>Server-Side Encryption Attack Demo</h3>
        <button onClick={onClose}>Close</button>
      </div>
      
      <div className="attack-demo-content">
        <div className="attack-explanation">
          <h4>The Vulnerability</h4>
          <p>
            This demo shows how server-side encryption with a single key is vulnerable.
            If an attacker gains access to the server and obtains the encryption key,
            they can decrypt all messages.
          </p>
          <div className="server-key">
            <strong>Server Encryption Key:</strong> <code>{SERVER_KEY}</code>
          </div>
        </div>
        
        {isLoading ? (
          <p>Loading encrypted messages...</p>
        ) : (
          <div className="attack-steps">
            <div className="encrypted-messages">
              <h4>Step 1: Select an encrypted message from the database</h4>
              <div className="message-list">
                {dbContents?.messages
                  .filter((msg: any) => msg.conversationId === 'default')
                  .map((msg: any) => (
                    <div 
                      key={msg.id} 
                      className={`encrypted-message ${selectedMessage === msg.content ? 'selected' : ''}`}
                      onClick={() => handleSelectMessage(msg.content)}
                    >
                      <div><strong>ID:</strong> {msg.id}</div>
                      <div><strong>From:</strong> {msg.sender}</div>
                      <div className="encrypted-content">
                        <strong>Encrypted:</strong> <code>{msg.content.substring(0, 40)}...</code>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
            
            <div className="decryption-area">
              <h4>Step 2: Decrypt with the server key</h4>
              <button 
                onClick={handleDecrypt} 
                disabled={!selectedMessage}
                className="decrypt-button"
              >
                Decrypt Selected Message
              </button>
              
              {decryptedMessage && (
                <div className="decryption-result">
                  <h4>Decrypted Message:</h4>
                  <div className="decrypted-content">{decryptedMessage}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatApp() {
  const { messages, addMessage } = useChat();
  const [showAttackDemo, setShowAttackDemo] = useState(false);
  
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
  
  // Function to show attack demo
  const handleViewDatabase = async () => {
    setShowAttackDemo(true);
  };
  
  return (
    <div className="chat-app">
      <div className="demo-header">
        <h2>Symmetric Encryption Chat Demo</h2>
        <p className="demo-description">
          Messages are encrypted with AES-256-GCM using a single server-side key.
          While this protects against basic database leaks, it creates a false sense of security.
        </p>
        <div className="encryption-info">
          <strong>Encryption:</strong> AES-256-GCM with server-side key
          <button 
            className="attack-button" 
            onClick={() => setShowAttackDemo(true)}
          >
            Demonstrate Attack
          </button>
        </div>
      </div>
      
      <MessageList messages={messages} />
      <MessageInput onSendMessage={(content) => addMessage(content)} />
      
      <AdminPanel 
        onResetDatabase={handleResetDatabase}
        onViewDatabase={handleViewDatabase}
        demoVersion={2}
      />
      
      <AttackDemo 
        isVisible={showAttackDemo} 
        onClose={() => setShowAttackDemo(false)} 
      />
    </div>
  );
}

export default function Demo2() {
  // Extend the base chat with encryption processors
  const messageProcessor = {
    beforeSend: async (content: string) => {
      return await encryptSymmetric(content, SERVER_KEY);
    },
    afterReceive: async (messages: Message[]) => {
      return Promise.all(
        messages.map(async (msg) => {
          try {
            return {
              ...msg,
              content: await decryptSymmetric(msg.content, SERVER_KEY)
            };
          } catch (error) {
            return {
              ...msg,
              content: '(Encrypted message)'
            };
          }
        })
      );
    }
  };
  
  return (
    <ChatProvider 
      apiEndpoint="/api/messages-symmetric" 
      messageProcessor={messageProcessor}
    >
      <ChatApp />
    </ChatProvider>
  );
}
