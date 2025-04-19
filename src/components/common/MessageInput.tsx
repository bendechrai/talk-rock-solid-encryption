'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export function MessageInput({ onSendMessage, isLoading = false }: MessageInputProps) {
  // Generate a unique ID for this input instance
  const inputId = useRef(`message-input-${Math.random().toString(36).substr(2, 9)}`);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Re-focus the input after sending a message
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={styles['message-input-form']}>
      <input
        id={inputId.current}
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className={styles['message-input']}
        disabled={isLoading}
        // Add onBlur handler to help maintain focus
        onBlur={(e) => {
          // If the blur event was not caused by switching to another input element
          // or intentional user action outside the chat, refocus
          if (!isLoading && document.activeElement?.tagName !== 'INPUT') {
            // Short delay to avoid fighting with other focus events
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 100);
          }
        }}
      />
      <button 
        type="submit" 
        className={`${styles['send-button']} ${isLoading ? styles['loading'] : ''}`} 
        aria-label="Send message"
        disabled={isLoading}
      ></button>
    </form>
  );
}
