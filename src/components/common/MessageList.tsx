"use client";

import React, { useRef, useEffect } from "react";
import { Message } from "@/types/common";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: Message[];
  currentUser?: string;
}

export function MessageList({
  messages,
  currentUser = "User",
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to get user name from ID
  const getUserName = (id: string) => {
    switch (id) {
      case "1":
        return "Alice";
      case "2":
        return "Bob";
      case "3":
        return "Charlie";
      case "4":
        return "Eve";
      default:
        return `User ${id}`;
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use the parent container's scrollTop property instead of scrollIntoView
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  return (
    <div className={styles["messages-container"]}>
      {messages.length === 0 ? (
        <div className={styles["empty-message"]}>
          No messages yet. Start a conversation!
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === currentUser
                  ? styles["message-sent"]
                  : styles["message-received"]
              }`}
            >
              <div className={styles["message-sender"]}>
                {getUserName(message.sender)}
              </div>
              <div className={styles["message-content"]}>{message.content}</div>
              <div className={styles["message-time"]}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
