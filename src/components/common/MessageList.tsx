'use client';

import React, { useRef, useEffect } from 'react';
import { Message } from '@/types/common';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  currentUser?: string;
}

export function MessageList({ messages, currentUser = 'User' }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    // scrollToBottom();
  }, [messages]);
  
  return (
    <div className={styles['messages-container']}>
      {messages.length === 0 ? (
        <div className={styles['empty-message']}>No messages yet. Start a conversation!</div>
      ) : (
        <>
          {messages.map(message => (
            <div key={message.id} className={`${styles.message} ${message.sender === currentUser ? styles['message-sent'] : styles['message-received']}`}>
              <div className={styles['message-sender']}>{message.sender}</div>
              <div className={styles['message-content']}>{message.content}</div>
              <div className={styles['message-time']}>
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
