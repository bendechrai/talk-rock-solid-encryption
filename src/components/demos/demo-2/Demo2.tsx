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

  // Function to fetch database contents - can be called manually when needed
  const fetchDatabaseContents = () => {
    setIsLoading(true);
    fetch("/api/admin")
      .then((response) => response.json())
      .then((data) => {
        setDbContents(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching database:", error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    // Load data only once when component mounts
    fetchDatabaseContents();
  }, []); // Empty dependency array ensures it only runs once

  const handleSelectMessage = (content: string) => {
    setSelectedMessage(content);
    setDecryptedMessage(null); // Reset previous decryption
  };

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
        <h4>Server-Side Encryption Vulnerability</h4>
        <p>
          This demo shows how server-side encryption with a single key is
          vulnerable. If an attacker gains access to the server and obtains the
          encryption key, they can decrypt all messages.
        </p>
        <div className={styles.serverKey}>
          <strong>Server Encryption Key:</strong> <code>{SERVER_KEY}</code>
        </div>
      </div>

      {isLoading ? (
        <p>Loading encrypted messages...</p>
      ) : (
        <div className={styles.attackSteps}>
          <div className={styles.encryptedMessages}>
            <h4>Step 1: Select an encrypted message from the database</h4>
            <div className={styles.messageList}>
              {dbContents?.messages
                .filter((msg: any) => msg.conversationId === "default")
                .map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`${styles.encryptedMessage} ${
                      selectedMessage === msg.content ? styles.selected : ""
                    }`}
                    onClick={() => handleSelectMessage(msg.content)}
                  >
                    <div>
                      <strong>ID:</strong> {msg.id}
                    </div>
                    <div>
                      <strong>From:</strong> {msg.sender}
                    </div>
                    <div className={styles.encryptedContent}>
                      <strong>Encrypted:</strong>{" "}
                      <code>{msg.content.substring(0, 40)}...</code>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className={styles.decryptionArea}>
            <h4>Step 2: Decrypt with the server key</h4>
            <button
              onClick={handleDecrypt}
              disabled={!selectedMessage}
              className={styles.decryptButton}
            >
              Decrypt Selected Message
            </button>

            {decryptedMessage && (
              <div className={styles.decryptionResult}>
                <h4>Decrypted Message:</h4>
                <div className={styles.decryptedContent}>
                  {decryptedMessage}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Demo2() {
  const [conversationId, setConversationId] = useState("default");

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
          <Phone userId="Alice" initialColor="rose" demoVersion={2} />
        </div>

        <div className={styles.phoneWrapper}>
          <Phone userId="Bob" initialColor="blue" demoVersion={2} />
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
