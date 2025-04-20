import { useState, useEffect } from 'react';
import styles from './UserSelector.module.css';

interface UserSelectorProps {
  currentUserId: string;
  onUserChange: (userId: string) => void;
}

interface SimpleUser {
  id: string;
  name: string;
}

export function UserSelector({ currentUserId, onUserChange }: UserSelectorProps) {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Define predefined users for the demo
    // This avoids API calls and ensures consistent behavior
    setUsers([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
      { id: '4', name: 'Eve' }
    ]);
  }, []);

  const handleUserSelect = (userId: string) => {
    onUserChange(userId);
    setIsOpen(false);
  };

  return (
    <div className={styles.userSelector} onClick={(e) => e.stopPropagation()}>
      <div 
        className={styles.currentUser} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.userIcon}>👤</span>
        <span className={styles.dropdownIcon}>{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className={styles.dropdown}>
          {users.map(user => (
            <div 
              key={user.id} 
              className={`${styles.userOption} ${user.id === currentUserId ? styles.active : ''}`}
              onClick={() => handleUserSelect(user.id)}
            >
              {user.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
