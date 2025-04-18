import React from 'react';
import styles from "./AdminCogButton.module.css";

interface AdminCogButtonProps {
  onClick: () => void;
  title?: string;
}

export function AdminCogButton({ onClick, title = 'Admin Panel' }: AdminCogButtonProps) {
  return (
    <button
      className={styles["admin-cog-btn"]}
      onClick={onClick}
      title={title}
      aria-label={title}
      type="button"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.5" />
        <g opacity="0.5">
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 12.5V12a1.65 1.65 0 0 0-1.51-1 2 2 0 1 1 0-4A1.65 1.65 0 0 0 3 8V7.5a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 4.6c.44.18.84.43 1.18.76l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.18.44.43.84.76 1.18l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 12.5v.09a1.65 1.65 0 0 0-1.6 2.41z" />
        </g>
      </svg>
    </button>
  );
}
