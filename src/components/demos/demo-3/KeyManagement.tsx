'use client';

import { useState, useEffect } from 'react';
import styles from './KeyManagement.module.css';
import { generateKeys } from '@/lib/encryption/asymmetric';
import { useToast } from '@/components/common/Toast';

interface KeyManagementProps {
  demoVersion: number;
}

interface UserKeyInfo {
  userId: string;
  name: string;
  publicKey: string;
  privateKey?: string;
  keyStatus: 'none' | 'generating' | 'generated' | 'loaded' | 'error';
  lastUpdated?: string;
}

export function KeyManagement({ demoVersion }: KeyManagementProps) {
  const [users, setUsers] = useState<Record<string, UserKeyInfo>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all users and their key information
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch users from the API
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Failed to load users');
      const usersData = await usersResponse.json();
      
      // Fetch public keys from the API
      const keysResponse = await fetch('/api/keys');
      if (!keysResponse.ok) throw new Error('Failed to load keys');
      const keysData = await keysResponse.json();
      
      // Combine user data with key information
      const userKeyMap: Record<string, UserKeyInfo> = {};
      
      // Process all users
      usersData.users.forEach((user: any) => {
        const userId = user.id;
        
        // Find the public key for this user from the array of public keys
        const keyEntry = keysData.keys.find((key: any) => key.userId === userId);
        const publicKey = keyEntry ? keyEntry.publicKey : '';
        
        // Get private key from localStorage if available
        const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);
        
        userKeyMap[userId] = {
          userId,
          name: user.name,
          publicKey,
          privateKey: privateKey || undefined,
          keyStatus: privateKey && publicKey ? 'loaded' : publicKey ? 'generated' : 'none',
          lastUpdated: keyEntry && keyEntry.createdAt ? new Date(keyEntry.createdAt).toISOString() : new Date().toISOString()
        };
      });
      
      setUsers(userKeyMap);
      
      // Select the first user if none is selected
      if (!selectedUserId && Object.keys(userKeyMap).length > 0) {
        setSelectedUserId(Object.keys(userKeyMap)[0]);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading user key information:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };
  
  // Regenerate keys for a user
  const regenerateKeys = async (userId: string) => {
    try {
      // Update state to show generating status
      setUsers(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          keyStatus: 'generating'
        }
      }));
      
      // Generate new key pair
      const keys = await generateKeys();
      
      // Store private key in localStorage with user-specific key
      localStorage.setItem(`chatPrivateKey_${userId}`, keys.privateKey);
      
      // Send public key to server
      const response = await fetch('/api/user/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, publicKey: keys.publicKey })
      });
      
      if (!response.ok) throw new Error('Failed to save public key');
      
      // Reload user data to get the latest keys
      await loadUsers();
      
      console.log(`Keys regenerated successfully for user ${userId}`);
    } catch (err) {
      console.error(`Error regenerating keys for user ${userId}:`, err);
      
      // Update state to show error
      setUsers(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          keyStatus: 'error'
        }
      }));
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  // Reset keys for a user (delete both private and public keys)
  const resetKeys = async (userId: string) => {
    try {
      // Remove private key from localStorage
      localStorage.removeItem(`chatPrivateKey_${userId}`);
      
      // Delete public key from server
      await fetch(`/api/user/keys?userId=${userId}`, {
        method: "DELETE",
      });
      
      // Reload user data to reflect the changes
      await loadUsers();
      
      showToast(`Keys reset successfully for user ${userId}`, 'success');
    } catch (err) {
      console.error(`Error resetting keys for user ${userId}:`, err);
      showToast(`Failed to reset keys: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  // Load user data on component mount only
  useEffect(() => {
    loadUsers();
    // No interval for automatic refresh
  }, []);
  
  // Get the selected user's key info
  const selectedUser = selectedUserId ? users[selectedUserId] : null;
  
  // Format a key for display (truncate long keys)
  const formatKey = (key: string) => {
    if (!key) return 'No key available';
    return `${key.substring(0, 20)}...${key.substring(key.length - 8)}`;
  };
  
  // Get status badge class based on key status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'generated': return styles.statusSuccess;
      case 'loaded': return styles.statusSuccess;
      case 'generating': return styles.statusWarning;
      case 'error': return styles.statusError;
      default: return styles.statusNeutral;
    }
  };
  
  return (
    <div className={styles.keyManagement}>
      <h3 className={styles.title}>Key Management</h3>
      
      {isLoading && <div className={styles.loading}>Loading key information...</div>}
      
      {error && <div className={styles.error}>{error}</div>}
      
      {!isLoading && !error && (
        <div className={styles.container}>
          <div className={styles.userList}>
            <h4>Users</h4>
            <ul>
              {Object.values(users).map(user => (
                <li 
                  key={user.userId}
                  className={`${styles.userItem} ${selectedUserId === user.userId ? styles.selected : ''}`}
                  onClick={() => setSelectedUserId(user.userId)}
                >
                  <div className={styles.userName}>{user.name}</div>
                  <div className={`${styles.statusBadge} ${getStatusBadgeClass(user.keyStatus)}`}>
                    {user.keyStatus}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.keyDetails}>
            {selectedUser ? (
              <>
                <div className={styles.userHeader}>
                  <h4>{selectedUser.name}'s' Keys</h4>
                  <div className={styles.buttonGroup}>
                    <button 
                      className={styles.regenerateButton}
                      onClick={() => regenerateKeys(selectedUser.userId)}
                      disabled={selectedUser.keyStatus === 'generating'}
                    >
                      {selectedUser.keyStatus === 'generating' ? 'Generating...' : 'Regenerate Keys'}
                    </button>
                    <button 
                      className={styles.resetButton}
                      onClick={() => resetKeys(selectedUser.userId)}
                      disabled={selectedUser.keyStatus === 'generating' || selectedUser.keyStatus === 'none'}
                    >
                      Reset Keys
                    </button>
                  </div>
                </div>
                
                <div className={styles.keyInfo}>
                  <div className={styles.keySection}>
                    <h5>
                      Public Key
                      <span className={styles.keyBadge}>Shared with others</span>
                    </h5>
                    <div className={styles.keyValue}>
                      {selectedUser.publicKey ? (
                        <code>{formatKey(selectedUser.publicKey)}</code>
                      ) : (
                        <span className={styles.noKey}>No public key available</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.keySection}>
                    <h5>
                      Private Key
                      <span className={`${styles.keyBadge} ${styles.secretBadge}`}>Kept secret</span>
                      <button 
                        className={styles.toggleButton}
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        {showPrivateKey ? 'Hide' : 'Show'}
                      </button>
                    </h5>
                    <div className={styles.keyValue}>
                      {selectedUser.privateKey ? (
                        showPrivateKey ? (
                          <code>{formatKey(selectedUser.privateKey)}</code>
                        ) : (
                          <code className={styles.hiddenKey}>••••••••••••••••••••••••••••••••</code>
                        )
                      ) : (
                        <span className={styles.noKey}>No private key available</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.keyMeta}>
                    <div className={styles.lastUpdated}>
                      <strong>Last Updated:</strong> {new Date(selectedUser.lastUpdated || '').toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.noSelection}>Select a user to view key details</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
