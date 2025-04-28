import React from 'react';
import styles from './Header.module.css';
import { UserSelector } from './UserSelector';

interface HeaderProps {
  userId: string;
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onChangeUser?: (userId: string) => void;
}

export function Header({ userId, title, showBackButton, onBack, onChangeUser }: HeaderProps) {
  return (
    <div className={styles.header}>
      {showBackButton && (
        <button className={styles.backButton} onClick={onBack}>
          ←
        </button>
      )}
      
      <div className={styles.title}>
        {title}
      </div>
      
      <div className={styles.userControls}>
        {onChangeUser && (
          <UserSelector
            currentUserId={userId}
            onUserChange={onChangeUser}
          />
        )}
      </div>
    </div>
  );
}
