"use client";

import { useState, useEffect } from "react";
import { Message } from "@/types/common";
import {
  encryptSymmetric,
  decryptSymmetric,
  decryptWithServerKey,
  SERVER_KEY,
} from "@/lib/encryption/symmetric";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import styles from "./Demo2.module.css";

function AttackDemo() {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);

  const handleDecrypt = async () => {
    if (!selectedMessage) return;

    try {
      const decrypted = await decryptWithServerKey(selectedMessage);
      setDecryptedMessage(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      setDecryptedMessage("(Decryption failed)");
    }
  };

  return (
    <div className={styles.attackDemo}>
      <div className={styles.attackExplanation}>
        <div className={styles.serverKey}>
          <strong>Server Encryption Key:</strong>
          <br />
          <code>{SERVER_KEY}</code>
        </div>
      </div>
    </div>
  );
}

export default function Demo2() {
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
      <div className={styles.encryptionInfo}>
        <strong>Encryption:</strong> AES-256-GCM with server-side key
      </div>

      <div className={styles.phonesContainer}>
        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user1}
            initialColor="rose"
            demoVersion={2}
          />
        </div>

        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user2}
            initialColor="blue"
            demoVersion={2}
            isRight={true}
          />
        </div>
      </div>

      <AdminPanel
        onResetDatabase={handleResetDatabase}
        onViewDatabase={handleViewDatabase}
        demoVersion={2}
      >
        <AttackDemo />
      </AdminPanel>
    </div>
  );
}
