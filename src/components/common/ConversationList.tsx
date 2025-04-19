"use client";

import { useState, useEffect } from "react";
import { Conversation } from "@/types/common";
import styles from "./ConversationList.module.css";

interface ConversationListProps {
  userId: string;
  demoVersion: 1 | 2 | 3;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({
  userId,
  demoVersion,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/conversation", {
        headers: {
          "X-Demo-Version": demoVersion.toString(),
          "X-User-Id": userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversations) {
          setConversations(data.conversations);
        } else {
          console.error("No conversations found in response:", data);
          setConversations([]);
        }
      } else {
        console.error("Failed to load conversations:", response.status);
        setConversations([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setIsLoading(false);
      setConversations([]);
    }
  };

  useEffect(() => {
    loadConversations();

    // Set up polling interval for conversations
    const interval = setInterval(loadConversations, 5000);

    // Clean up
    return () => clearInterval(interval);
  }, [demoVersion, userId]);

  return (
    <div className={styles.conversationList}>
      {isLoading && conversations.length === 0 ? (
        <div className={styles.loadingIndicator}>Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className={styles.emptyState}>No conversations found</div>
      ) : (
        <ul className={styles.list}>
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className={styles.conversationItem}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className={styles.conversationName}>
                {conversation.name || `Chat ${conversation.id}`}
              </div>
              <div className={styles.conversationMembers}>
                {conversation.memberUserIds.length} members
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
