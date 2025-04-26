'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/types/common';
import { 
  generateKeys, 
  generateEphemeralKeys,
  encryptWithPublicKey, 
  decryptWithPrivateKey 
} from '@/lib/encryption/asymmetric';
import { AdminPanel } from '@/components/common/AdminPanel';
import { Phone } from '@/components/common/Phone';
import { phoneStyles } from '@/components/common/phoneStyles';
import styles from './Demo3.module.css';
import { DatabaseViewer } from '@/components/common/DatabaseViewer';
import { ChatApp } from '@/components/common/ChatApp';

interface KeyInfoProps {
  userId: string;
  keyStatus: string;
  publicKey: string;
  privateKey: string;
  publicKeysCount: number;
  onRegenerateKeys: () => Promise<void>;
}

function KeyInfo({ 
  userId, 
  keyStatus, 
  publicKey, 
  privateKey, 
  publicKeysCount,
  onRegenerateKeys
}: KeyInfoProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  return (
    <div className="key-info">
      <div className="key-status">
        <div className="status-indicator">
          <span className={`status-dot ${keyStatus === 'loaded' || keyStatus === 'generated' ? 'active' : 'inactive'}`}></span>
          <span>Key Status: {keyStatus}</span>
        </div>
        <button 
          className="regenerate-button" 
          onClick={onRegenerateKeys}
        >
          Regenerate Keys
        </button>
      </div>
      
      <div className="user-id">
        <strong>Your ID:</strong> {userId}
      </div>
      
      <div className="key-details">
        <div className="public-key">
          <div className="key-header">
            <strong>Your Public Key</strong> 
            <span className="key-badge">Shared with others</span>
          </div>
          <div className="key-value">
            <code>{publicKey.substring(0, 32)}...{publicKey.substring(publicKey.length - 8)}</code>
          </div>
        </div>
        
        <div className="private-key">
          <div className="key-header">
            <strong>Your Private Key</strong> 
            <span className="key-badge secure">Kept secret</span>
            <button 
              className="toggle-key-button" 
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="key-value">
            {showPrivateKey ? (
              <code>{privateKey.substring(0, 32)}...{privateKey.substring(privateKey.length - 8)}</code>
            ) : (
              <code>••••••••••••••••••••••••••••••••</code>
            )}
          </div>
        </div>
      </div>
      
      <div className="network-info">
        <div className="public-keys-count">
          <strong>Public Keys Available:</strong> {publicKeysCount}
        </div>
        <div className="pfs-info">
          <span className="pfs-badge">Perfect Forward Secrecy Enabled</span>
          <span className="info-tooltip">
            Using ephemeral keys for each message
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatApp() {
  const { messages, addMessage } = useChat();
  const [publicKeys, setPublicKeys] = useState<Record<string, string>>({});
  const [keyStatus, setKeyStatus] = useState('initializing');
  const [userId, setUserId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [showDbViewer, setShowDbViewer] = useState(false);
  
  // Load or generate keys on component mount
  useEffect(() => {
    setupKeys();
  }, []);
  
  async function setupKeys() {
    // Generate a unique user ID if we don't have one
    const existingUserId = localStorage.getItem('chatUserId');
    const newUserId = existingUserId || Math.random().toString(36).substring(2, 15);
    
    if (!existingUserId) {
      localStorage.setItem('chatUserId', newUserId);
    }
    
    setUserId(newUserId);
    
    // Check if we already have keys in localStorage
    const storedPrivateKey = localStorage.getItem('chatPrivateKey');
    const storedPublicKey = localStorage.getItem('chatPublicKey');
    
    if (!storedPrivateKey || !storedPublicKey) {
      await generateNewKeys(newUserId);
    } else {
      // Use existing keys
      setPrivateKey(storedPrivateKey);
      setPublicKey(storedPublicKey);
      
      // Send existing public key to server
      await fetch(`/api/user/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId, publicKey: storedPublicKey })
      });
      
      setKeyStatus('loaded');
    }
  }
  
  async function generateNewKeys(userId: string) {
    setKeyStatus('generating');
    
    try {
      // Generate new key pair
      const keys = await generateKeys();
      
      // Store keys
      localStorage.setItem('chatPrivateKey', keys.privateKey);
      localStorage.setItem('chatPublicKey', keys.publicKey);
      
      setPrivateKey(keys.privateKey);
      setPublicKey(keys.publicKey);
      
      // Send public key to server
      await fetch(`/api/user/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, publicKey: keys.publicKey })
      });
      
      setKeyStatus('generated');
    } catch (error) {
      console.error('Error generating keys:', error);
      setKeyStatus('error');
    }
  }
  
  // Load all public keys from server
  const loadPublicKeys = async () => {
    const response = await fetch('/api/user/keys');
    if (response.ok) {
      const data = await response.json();
      setPublicKeys(data.keys);
    }
  };

  useEffect(() => {
    if (userId) {
      loadPublicKeys();
      const interval = setInterval(loadPublicKeys, 5000);
      return () => clearInterval(interval);
    }
  }, [userId]);
  

  
  return (
    <div className="chat-app">
      <KeyInfo 
        userId={userId}
        keyStatus={keyStatus}
        publicKey={publicKey}
        privateKey={privateKey}
        publicKeysCount={Object.keys(publicKeys).length}
        onRegenerateKeys={() => generateNewKeys(userId)}
      />
      
      <Phone userId={userId} demoVersion={3}>
        <div className={phoneStyles.phoneChatApp}>
          <MessageList messages={messages} currentUser={userId} />
          <MessageInput onSendMessage={(content) => addMessage(content)} />
        </div>
      </Phone>
      
      <AdminPanel 
        demoVersion={3}
      />

    </div>
  );
}

export default function Demo3() {
  const [currentUsers, setCurrentUsers] = useState({
    user1: '1',
    user2: '2'
  });


  const messageProcessor = {
    beforeSend: async (content: string) => {
      try {
        // Get our user ID
        const myUserId = localStorage.getItem('chatUserId');
        if (!myUserId) throw new Error('User ID not found');
        
        // Fetch all public keys
        const response = await fetch('/api/keys');
        const data = await response.json();
        const publicKeys = data.keys;
        
        if (Object.keys(publicKeys).length === 0) {
          throw new Error('No recipients available');
        }
        
        // Generate ephemeral keys for perfect forward secrecy
        const ephemeralKeys = await generateEphemeralKeys();
        
        // Encrypt the message with each recipient's public key
        const encryptedForRecipients = await Promise.all(
          Object.entries(publicKeys).map(async ([userId, publicKey]) => {
            // For each recipient, encrypt the message using their public key and our ephemeral private key
            const encrypted = await encryptWithPublicKey(
              content, 
              publicKey as string, 
              ephemeralKeys.privateKey
            );
            return { userId, encrypted };
          })
        );
        
        // Return the encrypted data for all recipients
        return JSON.stringify({
          sender: myUserId,
          recipients: encryptedForRecipients,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Encryption error:', error);
        throw error;
      }
    },
    afterReceive: async (messages: Message[]) => {
      const myUserId = localStorage.getItem('chatUserId');
      const privateKey = localStorage.getItem('chatPrivateKey');
      
      if (!myUserId || !privateKey) return messages;
      
      return Promise.all(
        messages.map(async (msg) => {
          try {
            // Check if the content is valid JSON before parsing
            let encryptedData;
            try {
              encryptedData = JSON.parse(msg.content);
            } catch (parseError) {
              console.warn('Failed to parse message content as JSON:', parseError);
              // Return the original message if it's not valid JSON
              return msg;
            }
            
            // Check if the parsed data has the expected structure
            if (!encryptedData || !encryptedData.recipients) {
              console.warn('Message does not have expected encrypted structure:', encryptedData);
              return msg;
            }
            
            const { sender, recipients } = encryptedData;
            
            // Find our encrypted message
            const myMessage = recipients.find((r: any) => r.userId === myUserId);
            
            if (myMessage) {
              // Decrypt with our private key
              const decrypted = await decryptWithPrivateKey(myMessage.encrypted, privateKey);
              return { 
                ...msg, 
                content: decrypted,
                sender: sender || msg.sender // Use the sender from the encrypted data if available
              };
            }
            
            return { ...msg, content: '(Message not intended for you)' };
          } catch (e) {
            console.error('Decryption error:', e);
            // If the message isn't in the expected format, return it as is
            return { ...msg, content: '(Unable to decrypt message)' };
          }
        })
      );
    }
  };
  


  return (
    <div className={styles.demoContainer}>
      <div className={styles.phonesContainer}>
        <Phone
          initialColor="rose"
          userId={currentUsers.user1}
          demoVersion={3}
          onChangeUser={(userId) => setCurrentUsers(prev => ({ ...prev, user1: userId }))}
          messageProcessor={messageProcessor}
        />
      </div>
      
      <div className={styles.adminPanel}>
        <AdminPanel demoVersion={3} />
      </div>
    </div>
  );
}