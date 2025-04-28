"use client";

import { useState, useEffect } from "react";
import { Message } from "@/types/common";
import {
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

export default function Demo3() {
  const [currentUsers, setCurrentUsers] = useState({
    user1: "1",
    user2: "2",
  });

  // Create a message processor factory function that takes a user ID
  const createMessageProcessor = (userId: string) => ({
    beforeSend: async (content: string, conversationId?: string) => {
      try {
        // Get our private key from localStorage with user-specific key
        const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);
        if (!privateKey) throw new Error("Private key not found");

        // Fetch public keys for the conversation members
        let publicKeys: Record<string, string> = {};

        if (!conversationId) {
          throw new Error("Conversation ID is required for encryption");
        }

        // Use the conversation-specific endpoint to get public keys for members
        const response = await fetch(
          `/api/conversation/${conversationId}/keys`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch public keys for conversation: ${response.status}`
          );
        }

        const data = await response.json();
        publicKeys = data.keys || {};

        if (Object.keys(publicKeys).length === 0) {
          throw new Error("No recipients with public keys available");
        }

        // Encrypt the message with each recipient's public key
        const encryptedForRecipients = await Promise.all(
          Object.entries(publicKeys).map(async ([recipientId, publicKey]) => {
            try {
              // Validate the public key before attempting encryption
              if (
                !publicKey ||
                typeof publicKey !== "string" ||
                publicKey.length < 32
              ) {
                console.warn(
                  `Skipping encryption for user ${recipientId}: Invalid public key`
                );
                return null;
              }

              // For each recipient, encrypt the message using their public key
              const encrypted = await encryptWithPublicKey(content, publicKey);
              return { userId: recipientId, encrypted };
            } catch (encryptError) {
              console.error(
                `Encryption failed for user ${recipientId}:`,
                encryptError
              );
              return null;
            }
          })
        );

        // Filter out any failed encryptions
        const validEncryptions = encryptedForRecipients.filter(
          (item) => item !== null
        );

        if (validEncryptions.length === 0) {
          throw new Error("Failed to encrypt message for any recipients");
        }

        // Return the encrypted data with metadata
        return JSON.stringify({
          sender: userId,
          recipients: validEncryptions,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Encryption error:", error);
        throw error;
      }
    },
    afterReceive: async (messages: Message[]) => {
      // Get the private key for this specific user
      const privateKey = localStorage.getItem(`chatPrivateKey_${userId}`);

      if (!privateKey) {
        console.warn(`Cannot decrypt: missing private key for user ${userId}`);
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

            // Handle messages with different formats

            // Format 1: Full E2E encrypted message with recipients array
            if (
              encryptedData &&
              encryptedData.recipients &&
              Array.isArray(encryptedData.recipients)
            ) {
              console.log(
                `[Demo3] Message has proper E2E structure with recipients`
              );
              const { sender, recipients } = encryptedData;

              // Find our encrypted message
              const myMessage = recipients.find(
                (r: any) => r.userId === userId
              );

              if (myMessage) {
                // Decrypt with our private key
                try {
                  const decrypted = await decryptWithPrivateKey(
                    myMessage.encrypted,
                    privateKey
                  );

                  if (
                    decrypted &&
                    decrypted !== "(Unable to decrypt message)"
                  ) {
                    return {
                      ...msg,
                      content: decrypted,
                      sender: sender || msg.sender, // Use the sender from the encrypted data if available
                    };
                  } else {
                    return { ...msg, content: "(Could not decrypt message)" };
                  }
                } catch (error) {
                  return { ...msg, content: "(Could not decrypt message)" };
                }
              } else {
                return { ...msg, content: "(Message not intended for you)" };
              }
            }
            // Format 2: Simple encrypted message (no recipients array)
            else if (
              encryptedData &&
              encryptedData.iv &&
              encryptedData.ciphertext
            ) {
            
              // For demo purposes, try to decrypt it anyway if it's from a conversation we're in
              try {
                const decrypted = await decryptWithPrivateKey(
                  JSON.stringify(encryptedData),
                  privateKey
                );

                if (decrypted && decrypted !== "(Unable to decrypt message)") {
                
                  return {
                    ...msg,
                    content: decrypted,
                  };
                } else {
                  return { ...msg, content: "(Could not decrypt message)" };
                }
              } catch (directDecryptError) {
                return { ...msg, content: "(Could not decrypt message)" };
              }
            } else {
              return { ...msg, content: "(Could not decrypt message)" };
            }
          } catch (e) {
            // If the message isn't in the expected format, return it as is
            return { ...msg, content: "(Unable to decrypt message)" };
          }
        })
      );
    },
  });

  // State to track which users have keys
  const [userKeysStatus, setUserKeysStatus] = useState<Record<string, boolean>>(
    {}
  );

  // Check which users have keys on component mount
  useEffect(() => {
    const checkUserKeys = () => {
      const status: Record<string, boolean> = {};
      // Check all possible users
      ["1", "2", "3", "4"].forEach((userId) => {
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
  const handleKeysGenerated = async (
    userId: string,
    publicKey: string,
    privateKey: string
  ) => {
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
      setUserKeysStatus((prev) => ({
        ...prev,
        [userId]: true,
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
      case "1":
        return "Alice";
      case "2":
        return "Bob";
      case "3":
        return "Charlie";
      case "4":
        return "Diana";
      default:
        return `User ${userId}`;
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
              messageProcessor={createMessageProcessor(currentUsers.user1)}
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
                    handleKeysGenerated(
                      currentUsers.user1,
                      publicKey,
                      privateKey
                    )
                  }
                  onChangeUser={(userId) =>
                    setCurrentUsers((prev) => ({ ...prev, user1: userId }))
                  }
                  demoVersion={3}
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
              messageProcessor={createMessageProcessor(currentUsers.user2)}
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
                    handleKeysGenerated(
                      currentUsers.user2,
                      publicKey,
                      privateKey
                    )
                  }
                  onChangeUser={(userId) =>
                    setCurrentUsers((prev) => ({ ...prev, user2: userId }))
                  }
                  demoVersion={3}
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
