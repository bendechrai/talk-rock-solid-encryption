import React, { ReactNode } from 'react';
import styles from './Content.module.css';

interface ContentProps {
  children: ReactNode;
}

export function Content({ children }: ContentProps) {
  return (
    <div className={styles.content}>
      {children}
    </div>
  );
}
