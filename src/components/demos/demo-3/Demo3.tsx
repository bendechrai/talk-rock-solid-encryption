"use client";

import { useState, useEffect } from "react";
import { Message } from "@/types/common";
import {
  generateKeys,
  generateEphemeralKeys,
  encryptWithPublicKey,
  decryptWithPrivateKey,
} from "@/lib/encryption/asymmetric";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import styles from "./Demo3.module.css";
import { KeyManagement } from "./KeyManagement";
import { KeyGenerationScreen } from "./KeyGenerationScreen";

interface KeyInfoProps {
  userId: string;
  keyStatus: string;
  publicKey: string;
  privateKey: string;
  publicKeysCount: number;
  onRegenerateKeys: () => Promise<void>;
}

function KeyInfo({
  userId,
  keyStatus,
  publicKey,
  privateKey,
  publicKeysCount,
  onRegenerateKeys,
}: KeyInfoProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  return (
    <div className="key-info">
      <div className="key-status">
        <div className="status-indicator">
          <span
            className={`status-dot ${
              keyStatus === "loaded" || keyStatus === "generated"
                ? "active"
                : "inactive"
            }`}
          ></span>
          <span>Key Status: {keyStatus}</span>
        </div>
        <button className="regenerate-button" onClick={onRegenerateKeys}>
          Regenerate Keys
        </button>
      </div>

      <div className="user-id">
        <strong>Your ID:</strong> {userId}
      </div>

      <div className="key-details">
        <div className="public-key">
          <div className="key-header">
            <strong>Your Public Key</strong>
            <span className="key-badge">Shared with others</span>
          </div>
          <div className="key-value">
            <code>
              {publicKey.substring(0, 32)}...
              {publicKey.substring(publicKey.length - 8)}
            </code>
          </div>
        </div>

        <div className="private-key">
          <div className="key-header">
            <strong>Your Private Key</strong>
            <span className="key-badge secure">Kept secret</span>
            <button
              className="toggle-key-button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? "Hide" : "Show"}
            </button>
          </div>
          <div className="key-value">
            {showPrivateKey ? (
              <code>
                {privateKey.substring(0, 32)}...
                {privateKey.substring(privateKey.length - 8)}
              </code>
            ) : (
              <code>••••••••••••••••••••••••••••••••</code>
            )}
          </div>
        </div>
      </div>

      <div className="network-info">
        <div className="public-keys-count">
          <strong>Public Keys Available:</strong> {publicKeysCount}
        </div>
        <div className="pfs-info">
          <span className="pfs-badge">Perfect Forward Secrecy Enabled</span>
          <span className="info-tooltip">
            Using ephemeral keys for each message
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Demo3() {
  const [currentUsers, setCurrentUsers] = useState({
    user1: "1",
    user2: "2",
  });

  // Message processor for end-to-end encryption
  const messageProcessor = {
    beforeSend: async (content: string) => {
      try {
        // Get our user ID - this is the current user in the phone
        const myUserId = currentUsers.user1;
        if (!myUserId) throw new Error("User ID not found");

        // Get our private key from localStorage with user-specific key
        const privateKey = localStorage.getItem(`chatPrivateKey_${myUserId}`);
        if (!privateKey) throw new Error("Private key not found");

        // Fetch all public keys
        const response = await fetch("/api/keys");
        const data = await response.json();
        const publicKeys = data.keys;

        if (Object.keys(publicKeys).length === 0) {
          throw new Error("No recipients available");
        }

        // Generate ephemeral keys for perfect forward secrecy
        const ephemeralKeys = await generateEphemeralKeys();

        // Encrypt the message with each recipient's public key
        const encryptedForRecipients = await Promise.all(
          Object.entries(publicKeys).map(async ([userId, publicKey]) => {
            // For each recipient, encrypt the message using their public key and our ephemeral private key
            const encrypted = await encryptWithPublicKey(
              content,
              publicKey as string,
              ephemeralKeys.privateKey
            );
            return { userId, encrypted };
          })
        );

        // Return the encrypted data for all recipients
        // Return the encrypted data with metadata
        return JSON.stringify({
          sender: myUserId,
          recipients: encryptedForRecipients,
          timestamp: new Date().toISOString(),
          // Include ephemeral public key for potential future verification
          ephemeralPublicKey: ephemeralKeys.publicKey,
        });
      } catch (error) {
        console.error("Encryption error:", error);
        throw error;
      }
    },
    afterReceive: async (messages: Message[]) => {
      // Get the current user ID from the phone
      const myUserId = currentUsers.user1;

      // Get the private key for this specific user
      const privateKey = localStorage.getItem(`chatPrivateKey_${myUserId}`);

      if (!myUserId || !privateKey) {
        console.warn("Cannot decrypt: missing user ID or private key");
        return messages;
      }

      return Promise.all(
        messages.map(async (msg) => {
          try {
            // Check if the content is valid JSON before parsing
            let encryptedData;
            try {
              encryptedData = JSON.parse(msg.content);
            } catch (parseError) {
              console.warn(
                "Failed to parse message content as JSON:",
                parseError
              );
              // Return the original message if it's not valid JSON
              return msg;
            }

            // Check if the parsed data has the expected structure
            if (!encryptedData || !encryptedData.recipients) {
              console.warn(
                "Message does not have expected encrypted structure:",
                encryptedData
              );
              return msg;
            }

            const { sender, recipients } = encryptedData;

            // Find our encrypted message
            const myMessage = recipients.find(
              (r: any) => r.userId === myUserId
            );

            if (myMessage) {
              // Decrypt with our private key
              const decrypted = await decryptWithPrivateKey(
                myMessage.encrypted,
                privateKey
              );
              return {
                ...msg,
                content: decrypted,
                sender: sender || msg.sender, // Use the sender from the encrypted data if available
              };
            }

            return { ...msg, content: "(Message not intended for you)" };
          } catch (e) {
            console.error("Decryption error:", e);
            // If the message isn't in the expected format, return it as is
            return { ...msg, content: "(Unable to decrypt message)" };
          }
        })
      );
    },
  };

  // State to track which users have keys
  const [userKeysStatus, setUserKeysStatus] = useState<Record<string, boolean>>({});
  
  // Check which users have keys on component mount
  useEffect(() => {
    const checkUserKeys = () => {
      const status: Record<string, boolean> = {};
      // Check all possible users
      ['1', '2', '3', '4'].forEach(userId => {
        const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);
        status[userId] = !!privateKey;
      });
      setUserKeysStatus(status);
    };
    
    // Initial check
    checkUserKeys();
    
    // Set up interval to periodically check for key changes
    const interval = setInterval(checkUserKeys, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle key generation for a specific user
  const handleKeysGenerated = async (userId: string, publicKey: string, privateKey: string) => {
    try {
      // Store private key in localStorage with user-specific key
      localStorage.setItem(`chatPrivateKey_${userId}`, privateKey);

      // Send public key to server
      await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, publicKey }),
      });

      // Update user keys status
      setUserKeysStatus(prev => ({
        ...prev,
        [userId]: true
      }));

      console.log(`Keys generated successfully for user ${userId}`);
    } catch (error) {
      console.error(`Error saving generated keys for user ${userId}:`, error);
      throw error; // Re-throw to be handled by the KeyGenerationScreen
    }
  };

  // Helper function to get user name from ID
  const getUserName = (userId: string) => {
    switch (userId) {
      case '1': return 'Alice';
      case '2': return 'Bob';
      case '3': return 'Charlie';
      case '4': return 'Diana';
      default: return `User ${userId}`;
    }
  };

  return (
    <div className={styles.demoContainer}>

      <div className={styles.phonesContainer}>
        <div className={styles.phoneWrapper}>
          {userKeysStatus[currentUsers.user1] ? (
            <Phone
              initialColor="rose"
              userId={currentUsers.user1}
              demoVersion={3}
              onChangeUser={(userId) =>
                setCurrentUsers((prev) => ({ ...prev, user1: userId }))
              }
              messageProcessor={messageProcessor}
            />
          ) : (
            <div className={styles.phoneWithKeyGen}>
              <Phone
                initialColor="rose"
                userId={currentUsers.user1}
                demoVersion={3}
                onChangeUser={(userId) =>
                  setCurrentUsers((prev) => ({ ...prev, user1: userId }))
                }
              >
                <KeyGenerationScreen
                  userId={currentUsers.user1}
                  userName={getUserName(currentUsers.user1)}
                  onKeysGenerated={(publicKey, privateKey) => 
                    handleKeysGenerated(currentUsers.user1, publicKey, privateKey)
                  }
                />
              </Phone>
            </div>
          )}
        </div>

        <div className={styles.phoneWrapper}>
          {userKeysStatus[currentUsers.user2] ? (
            <Phone
              initialColor="blue"
              userId={currentUsers.user2}
              demoVersion={3}
              isRight={true}
              onChangeUser={(userId) =>
                setCurrentUsers((prev) => ({ ...prev, user2: userId }))
              }
              messageProcessor={messageProcessor}
            />
          ) : (
            <div className={styles.phoneWithKeyGen}>
              <Phone
                initialColor="blue"
                userId={currentUsers.user2}
                demoVersion={3}
                isRight={true}
                onChangeUser={(userId) =>
                  setCurrentUsers((prev) => ({ ...prev, user2: userId }))
                }
              >
                <KeyGenerationScreen
                  userId={currentUsers.user2}
                  userName={getUserName(currentUsers.user2)}
                  onKeysGenerated={(publicKey, privateKey) => 
                    handleKeysGenerated(currentUsers.user2, publicKey, privateKey)
                  }
                />
              </Phone>
            </div>
          )}
        </div>
      </div>

      <div className={styles.adminPanel}>
        <AdminPanel demoVersion={3}>
          <KeyManagement demoVersion={3} />
        </AdminPanel>
      </div>
    </div>
  );
}
