"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import styles from "./MessageInput.module.css";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

// Use React.memo to prevent unnecessary re-renders when parent components update
export const MessageInput = React.memo(function MessageInput({
  onSendMessage,
  isLoading = false,
}: MessageInputProps) {
  // Use a stable ID for the input to avoid hydration errors
  const inputId = useRef("message-input");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use a ref to track the loading state to avoid unnecessary re-renders
  const isLoadingRef = useRef(isLoading);
  
  // Only update the loading ref when it actually changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Focus the input field only when the component first mounts
  // We use a ref to track if we've already focused to prevent refocusing
  const hasInitialFocusRef = useRef(false);
  
  useEffect(() => {
    // Only focus if this is the first time mounting and hasn't been focused yet
    if (inputRef.current && !hasInitialFocusRef.current) {
      inputRef.current.focus();
      hasInitialFocusRef.current = true;
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");

      // Re-focus the input after sending a message
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Use React.memo to prevent unnecessary re-renders
  return (
    <form onSubmit={handleSubmit} className={styles["message-input-form"]}>
      <input
        id={inputId.current}
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className={styles["message-input"]}
        // Use the ref for disabled state to prevent flickering
        disabled={isLoadingRef.current}
        // We no longer try to aggressively regain focus on blur
        // This prevents the two phone inputs from fighting for focus
      />
      <button
        type="submit"
        className={`${styles["send-button"]} ${
          isLoadingRef.current ? styles["loading"] : ""
        }`}
        aria-label="Send message"
        disabled={isLoadingRef.current}
      ></button>
    </form>
  );
});

