"use client";

import { useState, useEffect } from "react";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import styles from "./Demo1.module.css";

// Export default component
export default function Demo1() {
  const [conversationId, setConversationId] = useState("default");
  const [currentUsers, setCurrentUsers] = useState({
    user1: "1",
    user2: "2",
  });

  // Check for conversation ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const convId = urlParams.get("conversationId");
    if (convId) {
      setConversationId(convId);
    }
  }, []);

  // Function to reset database without page reload
  const handleResetDatabase = async () => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
    } catch (error) {
      console.error("Error resetting database:", error);
    }
  };

  // Function to view database - just returns a resolved promise
  const handleViewDatabase = async () => {
    return Promise.resolve();
  };

  return (
    <div className={styles.demoContainer}>
      <div className={styles.phonesContainer}>
        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user1}
            initialColor="rose"
            demoVersion={1}
          />
        </div>

        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user2}
            initialColor="blue"
            demoVersion={1}
            isRight={true}
          />
        </div>
      </div>

      <AdminPanel
        onResetDatabase={handleResetDatabase}
        onViewDatabase={handleViewDatabase}
        demoVersion={1}
      />
    </div>
  );
}
