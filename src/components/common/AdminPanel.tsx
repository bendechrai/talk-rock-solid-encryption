"use client";

import { useState, useRef } from "react";
import styles from "./AdminPanel.module.css";
import { AdminCogButton } from "../presentation/AdminCogButton";
import { DatabaseViewer, DatabaseViewerRef } from "./DatabaseViewer";
import Draggable from "react-draggable";

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
  const nodeRef = useRef(null);

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
    setIsDatabaseVisible((prev) => !prev);

    // Refresh database contents if becoming visible
    if (!isDatabaseVisible && databaseViewerRef.current) {
      databaseViewerRef.current.fetchDatabaseContents();
    }
  };

  return (
    <div className={styles["admin-panel"]}>
      <div className={styles["admin-menu"]}>
        <AdminCogButton onClick={() => setIsVisible((v) => !v)} />
      </div>

      {isVisible && (
        <Draggable handle=".handle" nodeRef={nodeRef} bounds="body">
          <div ref={nodeRef} className={styles["admin-content"]}>
            <h3 className={`${styles["admin-header"]} handle`}>
              Admin (Demo {demoVersion})
            </h3>

            <DatabaseViewer
              ref={databaseViewerRef}
              onClose={() => setIsDatabaseVisible(false)}
            />
            <div className={styles["admin-actions"]}>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className={styles["danger-button"]}
                aria-label="Reset Database"
              >
                {isLoading ? "Processing..." : "Reset Database"}
              </button>
            </div>

            {children && children}
          </div>
        </Draggable>
      )}
    </div>
  );
}
