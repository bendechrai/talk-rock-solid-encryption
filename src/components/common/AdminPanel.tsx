"use client";

import { useState, useRef } from "react";
import styles from "./AdminPanel.module.css";
import { AdminCogButton } from "../presentation/AdminCogButton";
import { DatabaseViewer, DatabaseViewerRef } from "./DatabaseViewer";

interface AdminPanelProps {
  onResetDatabase: () => Promise<void>;
  onViewDatabase: () => Promise<void>;
  demoVersion: number;
  onSwitchDemo?: (demoNumber: number) => void;
  children?: React.ReactNode;
}

export function AdminPanel({
  onResetDatabase,
  onViewDatabase,
  demoVersion,
  onSwitchDemo,
  children,
}: AdminPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDatabaseVisible, setIsDatabaseVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const databaseViewerRef = useRef<DatabaseViewerRef>(null);

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset the database?")) {
      setIsLoading(true);
      await onResetDatabase();
      setIsLoading(false);
    }
  };

  const handleViewDatabase = async () => {
    setIsLoading(true);
    await onViewDatabase();
    setIsLoading(false);
    // Toggle the visibility of database viewer when View Database is clicked
    setIsDatabaseVisible(prev => !prev);
    
    // Refresh database contents if becoming visible
    if (!isDatabaseVisible && databaseViewerRef.current) {
      databaseViewerRef.current.fetchDatabaseContents();
    }
  };

  return (
    <div className={styles["admin-panel"]}>
      <div
        className={styles["admin-menu"]}
        onClick={() => setIsVisible(!isVisible)}
      >
        <AdminCogButton onClick={() => setIsVisible((v) => !v)} />
      </div>

      <div
        className={`${styles["admin-content"]} ${
          isVisible ? styles["expanded"] : styles["collapsed"]
        }`}
      >
        <h3>Admin (Demo {demoVersion})</h3>

        <div className={styles["admin-actions"]}>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className={styles["danger-button"]}
            aria-label="Reset Database"
          >
            {isLoading ? "Processing..." : "Reset Database"}
          </button>
          <button
            onClick={handleViewDatabase}
            disabled={isLoading}
            aria-label={isDatabaseVisible ? "Hide Database Contents" : "View Database Contents"}
          >
            {isLoading ? "Loading..." : isDatabaseVisible ? "Hide Database Contents" : "View Database Contents"}
          </button>
        </div>

        {children && children}

        <DatabaseViewer 
          ref={databaseViewerRef}
          isVisible={isDatabaseVisible}
          onClose={() => setIsDatabaseVisible(false)}
        />
      </div>
    </div>
  );
}
