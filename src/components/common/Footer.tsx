import React, { ReactNode } from 'react';
import styles from './Footer.module.css';

interface FooterProps {
  children: ReactNode;
}

export function Footer({ children }: FooterProps) {
  return (
    <div className={styles.footer}>
      {children}
    </div>
  );
}
