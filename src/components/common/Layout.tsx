import React, { ReactNode } from 'react';
import styles from './Layout.module.css';

interface LayoutProps {
  header: ReactNode;
  content: ReactNode;
  footer?: ReactNode; // Footer is optional
}

export function Layout({ header, content, footer }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>{header}</header>
      <main className={styles.content}>{content}</main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  );
}
