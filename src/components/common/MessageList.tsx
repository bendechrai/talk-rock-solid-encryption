'use client';

import { Message } from '@/types/common';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="empty-message">No messages yet. Start a conversation!</div>
      ) : (
        messages.map(message => (
          <div key={message.id} className={`message ${message.sender === 'User' ? 'message-sent' : 'message-received'}`}>
            <div className="message-sender">{message.sender}</div>
            <div className="message-content">{message.content}</div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
