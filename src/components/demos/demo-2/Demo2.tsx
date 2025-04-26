"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// Enhanced Attack Demo component with interactive decryption form
function AttackDemo() {
  // State for the form inputs and decryption result
  const [serverKey, setServerKey] = useState(SERVER_KEY);
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState('');
  
  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to handle decryption with the local serverKey value
  const handleDecrypt = useCallback(async (textToDecrypt: string, key: string) => {
    // Clear any previous errors
    setError('');
    
    if (!textToDecrypt) {
      setDecryptedText('');
      return;
    }
    
    setIsDecrypting(true);
    
    try {
      // Try to decrypt the text using the provided key instead of the constant SERVER_KEY
      const decrypted = await decryptSymmetric(textToDecrypt, key);
      setDecryptedText(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      setError("Decryption failed. Make sure the input is a valid encrypted message and the key is correct.");
      setDecryptedText('');
    } finally {
      setIsDecrypting(false);
    }
  }, []);
  
  // Function to trigger decryption with debouncing
  const triggerDecryption = useCallback((text: string, key: string) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer to trigger decryption after 500ms of inactivity
    debounceTimerRef.current = setTimeout(() => {
      handleDecrypt(text, key);
    }, 500);
  }, [handleDecrypt]);
  
  // Handle encrypted text input change
  const handleEncryptedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEncryptedText(newValue);
    triggerDecryption(newValue, serverKey);
  };
  
  // Handle server key input change
  const handleServerKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setServerKey(newKey);
    triggerDecryption(encryptedText, newKey);
  };
  
  // Clean up the timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.attackDemo}>
      <h3>Server-Side Encryption Attack Demo</h3>
            
      <form className={styles.attackForm} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formGroup}>
          <label htmlFor="server-key">Server Encryption Key:</label>
          <input
            id="server-key"
            type="text"
            value={serverKey}
            onChange={handleServerKeyChange}
            className={styles.keyInput}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="encrypted-text">Paste Encrypted Message:</label>
          <textarea
            id="encrypted-text"
            value={encryptedText}
            onChange={handleEncryptedTextChange}
            placeholder="Paste an encrypted message here..."
            className={styles.encryptedInput}
            rows={4}
          />
        </div>
        
        {isDecrypting && <div className={styles.loading}>Decrypting...</div>}
        
        {error && <div className={styles.error}>{error}</div>}
        
          <div className={styles.decryptedResult}>
            <div className={styles.decryptedContent}>{decryptedText}</div>
          </div>
      </form>
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
