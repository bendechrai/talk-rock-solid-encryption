"use client";

import { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Message } from "@/types/common";
import {
  encryptWithEphemeralKeys,
  decryptWithAvailableKeys,
  generateEphemeralKeyPair,
  getCurrentEphemeralKey,
} from "@/lib/encryption/ephemeral";
import { generateKeys } from "@/lib/encryption/asymmetric";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import styles from "./Demo4.module.css";
import { KeyManagement } from "../demo-3/KeyManagement";
import { EphemeralKeyPanel } from "./EphemeralKeyPanel";
import { DecryptionPanel } from "./DecryptionPanel";
import { KeyGenerationScreen } from "../demo-3/KeyGenerationScreen";
import { EphemeralKeyGenerationScreen } from "./EphemeralKeyGenerationScreen";
import { useToast } from "@/components/common/Toast";

export default function Demo4() {
  const [currentUsers, setCurrentUsers] = useState({
    user1: "1",
    user2: "2",
  });
  const { showToast } = useToast();

  // Track which conversations have ephemeral keys for each user - only used for UI updates
  const [ephemeralKeyStatus, setEphemeralKeyStatus] = useState<
    Record<string, string[]>
  >({});

  // Function to check if a user has an ephemeral key for a conversation - memoized to prevent issues during render
  const hasEphemeralKey = useCallback((userId: string, conversationId: string): boolean => {
    // First check localStorage directly using the getCurrentEphemeralKey function
    const activeKey = getCurrentEphemeralKey(userId, conversationId);
    if (activeKey) {
      return true;
    }
    // Fall back to the state tracking (mainly for newly generated keys)
    return ephemeralKeyStatus[userId]?.includes(conversationId) || false;
  }, [ephemeralKeyStatus]);

  // Function to mark that a user has an ephemeral key for a conversation
  const markEphemeralKeyGenerated = (
    userId: string,
    conversationId: string
  ) => {
    setEphemeralKeyStatus((prev) => {
      const userConversations = prev[userId] || [];
      if (!userConversations.includes(conversationId)) {
        return {
          ...prev,
          [userId]: [...userConversations, conversationId],
        };
      }
      return prev;
    });
  };

  // Create a message processor factory function that takes a user ID
  const createMessageProcessor = (userId: string) => ({
    beforeSend: async (content: string, conversationId?: string) => {
      try {
        if (!conversationId) {
          throw new Error("Conversation ID is required for encryption");
        }

        // Get conversation members
        const response = await fetch(`/api/conversation/${conversationId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch conversation: ${response.status}`);
        }

        const conversation = await response.json();
        const recipientIds = conversation.memberUserIds;

        // Use ephemeral key encryption (only uses ephemeral keys, no fallback)
        try {
          const encryptedData = await encryptWithEphemeralKeys(
            content,
            recipientIds,
            conversationId,
            userId
          );

          // Parse the encrypted data to check for missing keys
          const parsedData = JSON.parse(encryptedData);
          if (parsedData.missingKeys && parsedData.missingKeys.length > 0) {
            // Some recipients don't have ephemeral keys
            const missingUsers = parsedData.missingKeys
              .map((id: string) => getUserName(id))
              .join(", ");
            showToast(
              `Warning: ${missingUsers} will not be able to read this message because they don't have ephemeral keys.`
            );
          }

          return encryptedData;
        } catch (error) {
          showToast(`Error: ${error.message}`);
          throw error;
        }
      } catch (error) {
        console.error("Encryption error:", error);
        throw error;
      }
    },
    afterReceive: async (messages: Message[]) => {
      // If no messages, return as is
      if (!messages || messages.length === 0) return messages;

      return Promise.all(
        messages.map(async (msg) => {
          try {
            // Use our helper that tries all available keys
            const {
              content: decryptedContent,
              keyType,
              keyInfo,
              isExpired,
            } = await decryptWithAvailableKeys(msg.content, userId);

            // Add a visual indicator for the type of key used to decrypt
            let displayContent = decryptedContent;
            if (keyType) {
              // Create an indicator with the key info as title/alt text
              const indicator = keyType === "ephemeral" ? `🔐` : `🔑`;
              // Add a class for expired keys to style them differently
              const expiredClass = isExpired ? " expired-key" : "";
              // Create a span with title attribute for the indicator
              displayContent = `<span title="${keyInfo}${isExpired ? ' (EXPIRED)' : ''}" class="key-icon${expiredClass}">${indicator}</span> ${decryptedContent}`;
            }

            return {
              ...msg,
              content: displayContent,
              _decryptedWith: keyType,
              _keyInfo: keyInfo,
              _isExpired: isExpired,
              _isHtml: true,
            };
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
      showToast("Keys generated successfully");

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

      showToast(`Keys generated successfully for user ${userId}`);
    } catch (error) {
      console.error(`Error saving generated keys for user ${userId}:`, error);
      throw error; // Re-throw to be handled by the KeyGenerationScreen
    }
  };

  // State to store user data
  const [userData, setUserData] = useState<Record<string, any>>({});

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          const usersRecord: Record<string, any> = {};

          data.users.forEach((user: any) => {
            usersRecord[user.id] = user;
          });

          setUserData(usersRecord);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUserData();
  }, []);

  // Helper function to get user name from ID
  const getUserName = (userId: string) => {
    if (userData[userId] && userData[userId].name) {
      return userData[userId].name;
    }
    return `User ${userId}`;
  };

  return (
    <div className={styles.demoContainer}>
      <div className={styles.phonesContainer}>
        <div className={styles.phoneWrapper}>
          {userKeysStatus[currentUsers.user1] ? (
            <Phone
              initialColor="rose"
              userId={currentUsers.user1}
              demoVersion={4}
              onChangeUser={(userId) =>
                setCurrentUsers((prev) => ({ ...prev, user1: userId }))
              }
              messageProcessor={createMessageProcessor(currentUsers.user1)}
              ephemeralKeyGenerator={(userId, conversationId) => {
                // Use a memoized check to prevent state updates during render
                const needsKey = !hasEphemeralKey(userId, conversationId);
                
                // Only render the key generation screen if needed
                if (needsKey) {
                  return (
                    <EphemeralKeyGenerationScreen
                      userId={userId}
                      conversationId={conversationId}
                      userName={getUserName(userId)}
                      onKeysGenerated={() =>
                        markEphemeralKeyGenerated(userId, conversationId)
                      }
                    />
                  );
                }
                return null; // No key generation needed
              }}
            />
          ) : (
            <div className={styles.phoneWithKeyGen}>
              <Phone
                initialColor="rose"
                userId={currentUsers.user1}
                demoVersion={4}
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
                  demoVersion={4}
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
              demoVersion={4}
              isRight={true}
              onChangeUser={(userId) =>
                setCurrentUsers((prev) => ({ ...prev, user2: userId }))
              }
              messageProcessor={createMessageProcessor(currentUsers.user2)}
              ephemeralKeyGenerator={(userId, conversationId) => {
                // Use a memoized check to prevent state updates during render
                const needsKey = !hasEphemeralKey(userId, conversationId);
                
                // Only render the key generation screen if needed
                if (needsKey) {
                  return (
                    <EphemeralKeyGenerationScreen
                      userId={userId}
                      conversationId={conversationId}
                      userName={getUserName(userId)}
                      onKeysGenerated={() =>
                        markEphemeralKeyGenerated(userId, conversationId)
                      }
                    />
                  );
                }
                return null; // No key generation needed
              }}
            />
          ) : (
            <div className={styles.phoneWithKeyGen}>
              <Phone
                initialColor="blue"
                userId={currentUsers.user2}
                demoVersion={4}
                isRight={true}
                onChangeUser={(userId) =>
                  setCurrentUsers((prev) => ({ ...prev, user2: userId }))
                }
                messageProcessor={createMessageProcessor(currentUsers.user2)}
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
                  demoVersion={4}
                />
              </Phone>
            </div>
          )}
        </div>
      </div>

      <div className={styles.adminPanel}>
        <AdminPanel demoVersion={4}>
          <KeyManagement demoVersion={4} />
          <EphemeralKeyPanel />
          <DecryptionPanel />
        </AdminPanel>
      </div>
    </div>
  );
}
