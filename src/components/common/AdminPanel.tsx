"use client";

import { useRef, useState } from "react";
import styles from "./AdminPanel.module.css";
import Draggable from "react-draggable";
import { DatabaseViewer, DatabaseViewerRef } from "./DatabaseViewer";
import ApiQueryPanel from "./ApiQueryPanel";
import { AdminCogButton } from "../presentation/AdminCogButton";
import { JsonPrettifierPanel } from "../demos/demo-3/JsonPrettifierPanel";

interface AdminPanelProps {
  demoVersion: number;
  children?: React.ReactNode;
}

export function AdminPanel({ demoVersion, children }: AdminPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const databaseViewerRef = useRef<DatabaseViewerRef>(null);
  const nodeRef = useRef(null);

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

            <DatabaseViewer ref={databaseViewerRef} demoVersion={demoVersion} />
            <ApiQueryPanel demoVersion={demoVersion} />
            <JsonPrettifierPanel />

            {children && children}
          </div>
        </Draggable>
      )}
    </div>
  );
}
