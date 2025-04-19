'use client';

import { ReactNode, useEffect, useState } from 'react';
import styles from './Phone.module.css';
import { ChatApp } from './ChatApp';

type PhoneColor = 'default' | 'silver' | 'gold' | 'rose' | 'blue' | 'red' | 'titanium';

interface PhoneProps {
  userId: string;
  demoVersion: 1 | 2 | 3;
  initialColor?: PhoneColor;
  children?: ReactNode;
}

export function Phone({ 
  userId, 
  demoVersion, 
  initialColor = 'default',
  children
}: PhoneProps) {
  const [color, setColor] = useState<PhoneColor>(initialColor);
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
  
  // Determine the CSS class based on the color prop
  // For CSS modules, we need to use a different approach for combining classes
  const phoneClass = `${styles.phone} ${color !== 'default' ? styles[color] || '' : ''}`;

  return (
    <div className={phoneClass}>
      {/* Add 3D bevel effect elements */}
      <div className={styles['phone-bevel-top']}></div>
      <div className={styles['phone-bevel-bottom']}></div>
      <div className={styles['phone-bevel-left']}></div>
      <div className={styles['phone-bevel-right']}></div>

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
          {children || (
            <ChatApp
              userId={userId}
              demoVersion={demoVersion}
              onChangePhoneColor={setColor}
              initialColor={initialColor}
            />
          )}
        </div>
        <div className={styles['phone-bottom-buttons']}>
          <div className={styles['phone-home-button']}></div>
        </div>
      </div>
    </div>
  );
}