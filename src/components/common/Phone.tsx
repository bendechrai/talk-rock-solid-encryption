'use client';

import { ReactNode, useEffect, useState } from 'react';
import styles from './Phone.module.css';

interface PhoneProps {
  children: ReactNode;
}

export function Phone({ children }: PhoneProps) {
  const [currentTime, setCurrentTime] = useState('');
  
  useEffect(() => {
    // Update time initially
    updateTime();
    
    // Update time every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);
  
  function updateTime() {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }
  
  return (
    <div className={styles.phone}>
      <div className={styles['phone-inner']}>
        <div className={styles['phone-top-bar']}>
          <div className={styles['phone-time']}>{currentTime}</div>
          <div className={styles['phone-notch']}>
            <div className={styles['phone-notch-line']}></div>
          </div>
          <div className={styles['phone-battery']}>
            <div className={styles['phone-battery-indicator']}></div>
          </div>
        </div>
        <div className={styles['phone-app-container']}>
          {children}
        </div>
        <div className={styles['phone-bottom-buttons']}>
          <div className={styles['phone-home-button']}></div>
        </div>
      </div>
    </div>
  );
}