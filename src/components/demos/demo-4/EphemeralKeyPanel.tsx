import { useState, useEffect } from 'react';
import { getAllEphemeralKeys, deleteEphemeralKey, StoredEphemeralKey } from '@/lib/encryption/ephemeral';
import styles from './EphemeralKeyPanel.module.css';

interface User {
  id: string;
  name: string;
  phoneColor?: string;
}

export function EphemeralKeyPanel() {
  const [selectedUser, setSelectedUser] = useState<string>('1');
  const [ephemeralKeys, setEphemeralKeys] = useState<StoredEphemeralKey[]>([]);
  const [groupedKeys, setGroupedKeys] = useState<Record<string, StoredEphemeralKey[]>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load users once when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to load users');
        const data = await response.json();
        setUsers(data.users);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading users:', error);
        setIsLoading(false);
      }
    };
    
    loadUsers();
  }, []);
  
  // Fetch keys when user changes
  useEffect(() => {
    if (selectedUser) {
      loadKeys();
      
      // Poll for updates
      const interval = setInterval(loadKeys, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);
  
  function loadKeys() {
    const keys = getAllEphemeralKeys(selectedUser);
    setEphemeralKeys(keys);
    
    // Group keys by conversation
    const grouped: Record<string, StoredEphemeralKey[]> = {};
    keys.forEach(key => {
      if (!grouped[key.conversationId]) {
        grouped[key.conversationId] = [];
      }
      grouped[key.conversationId].push(key);
    });
    
    // Sort keys by creation time (newest first) in each group
    Object.keys(grouped).forEach(convId => {
      grouped[convId].sort((a, b) => b.createdAt - a.createdAt);
    });
    
    setGroupedKeys(grouped);
  }
  
  const handleDeleteKey = async (keyId: string) => {
    await deleteEphemeralKey(selectedUser, keyId);
    loadKeys();
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  // Helper to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Ephemeral Key Management</h3>
      
      {isLoading && <div className={styles.loading}>Loading key information...</div>}

      {false && <div className={styles.error}>Error placeholder</div>}

      {!isLoading && (
        <div className={styles.container}>
          <div className={styles.userList}>
            <h4>Users</h4>
            <div className={styles.userButtons}>
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`${styles.userButton} ${
                    selectedUser === user.id ? styles.active : ""
                  }`}
                  onClick={() => setSelectedUser(user.id)}
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.keyDetails}>
            {users.find(u => u.id === selectedUser) ? (
              <>
                <div className={styles.userHeader}>
                  <h4>{users.find(u => u.id === selectedUser)?.name || 'User'}'s Ephemeral Keys</h4>
                  <div className={styles.buttonGroup}>
                    {/* Action buttons would go here if needed */}
                  </div>
                </div>
                
                {Object.keys(groupedKeys).length === 0 ? (
                  <div className={styles.noKeys}>No ephemeral keys found</div>
                ) : (
                  <div className={styles.keyGroups}>
                    {Object.entries(groupedKeys).map(([conversationId, keys]) => (
                      <div key={conversationId} className={styles.conversationGroup}>
                        <h4>Conversation: {conversationId}</h4>
                        <div className={styles.keyList}>
                          {keys.map(key => (
                            <div key={key.id} className={styles.keyItem}>
                              <div className={styles.keyHeader}>
                                <span className={styles.keyTimestamp}>
                                  Created: {formatDate(key.createdAt)}
                                </span>
                                <div className={styles.keyActions}>
                                  <button 
                                    className={styles.copyButton} 
                                    onClick={() => copyToClipboard(key.privateKey)}
                                    title="Copy private key to clipboard"
                                  >
                                    📋 Copy Key
                                  </button>
                                  <button 
                                    className={styles.deleteButton} 
                                    onClick={() => handleDeleteKey(key.id)}
                                    title="Delete key"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className={styles.keyDetails}>
                                <div className={styles.keyField}>
                                  <span className={styles.keyLabel}>Public:</span>
                                  <code className={styles.keyValue}>{key.publicKey.substring(0, 16)}...{key.publicKey.substring(key.publicKey.length - 16)}</code>
                                </div>
                                <div className={`${styles.keyField} ${styles.privateKeyField}`}>
                                  <span className={styles.keyLabel}>Private:</span>
                                  <code className={styles.keyValue}>{key.privateKey.substring(0, 16)}...{key.privateKey.substring(key.privateKey.length - 16)}</code>
                                </div>
                                <div className={styles.keyMeta}>
                                  <span className={`${styles.expiryTag} ${new Date(key.expiresAt) > new Date() ? styles.active : styles.expired}`}>
                                    {new Date(key.expiresAt) > new Date() ? 'Active' : 'Expired'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noSelection}>
                Select a user to view ephemeral key details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
