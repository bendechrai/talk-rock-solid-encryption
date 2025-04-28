import { UserSelector } from './UserSelector';
import styles from './ChatApp.module.css';

interface PhoneHeaderProps {
  userId: string;
  userName: string;
  onChangeUser?: (userId: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function PhoneHeader({
  userId,
  userName,
  onChangeUser,
  showBackButton = false,
  onBack
}: PhoneHeaderProps) {
  return (
    <div className={styles.phoneHeader}>
      {showBackButton && (
        <button className={styles.backButton} onClick={onBack}>
          ←
        </button>
      )}
      <span className={styles.userInfo}>
        <span>{userName}</span>
        {onChangeUser && (
          <UserSelector
            currentUserId={userId}
            onUserChange={onChangeUser}
          />
        )}
      </span>
    </div>
  );
}
