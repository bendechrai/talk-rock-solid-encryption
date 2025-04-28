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
      // Use scrollIntoView with a block: 'end' setting for more reliable scrolling
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // First immediate scroll attempt
    scrollToBottom();
    
    // Second attempt with a small delay to ensure DOM is fully updated
    const timer = setTimeout(scrollToBottom, 100);
    
    // Third attempt with a longer delay for any slow rendering
    const timer2 = setTimeout(scrollToBottom, 300);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [messages]);
  
  // Also scroll to bottom on component mount
  useEffect(() => {
    scrollToBottom();
  }, []);

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
