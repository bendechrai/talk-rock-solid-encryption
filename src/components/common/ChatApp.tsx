"use client";

import { useState, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationList } from "./ConversationList";
import { UserSelector } from "./UserSelector";
import { Message } from "@/types/common";
import styles from "./ChatApp.module.css";
import { phoneStyles } from "./phoneStyles";
import { useMessages } from "@/lib/hooks/useMessages";

type PhoneColor =
  | "default"
  | "silver"
  | "gold"
  | "rose"
  | "blue"
  | "red"
  | "titanium";

interface ChatAppProps {
  userId: string;
  demoVersion: 1 | 2 | 3;
  onChangePhoneColor?: (color: PhoneColor) => void;
  initialColor?: PhoneColor;
  onChangeUser?: (userId: string) => void;
  messageProcessor?: {
    beforeSend?: (content: string) => Promise<string>;
    afterReceive?: (messages: Message[]) => Promise<Message[]>;
  };
}

export function ChatApp({
  userId,
  demoVersion,
  onChangePhoneColor,
  initialColor = "default",
  onChangeUser,
  messageProcessor,
}: ChatAppProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [phoneColor, setPhoneColor] = useState<PhoneColor>(initialColor);
  const [currentUserId, setCurrentUserId] = useState<string>(userId);

  // Use the messages hook to handle all message-related operations
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    loadMessages, 
    clearMessages 
  } = useMessages({
    conversationId,
    userId: currentUserId,
    demoVersion,
    messageProcessor,
    pollingInterval: 5000
  });

  // Function to cycle through phone colors
  const cyclePhoneColor = () => {
    const colors: PhoneColor[] = [
      "default",
      "silver",
      "gold",
      "rose",
      "blue",
      "red",
      "titanium",
    ];
    const currentIndex = colors.indexOf(phoneColor);
    const nextIndex = (currentIndex + 1) % colors.length;
    const newColor = colors[nextIndex];

    setPhoneColor(newColor);
    if (onChangePhoneColor) {
      onChangePhoneColor(newColor);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      const dropdowns = document.querySelectorAll('.' + styles.dropdown);
      if (dropdowns.length > 0) {
        // There's an open dropdown, close it by triggering a click on the document
        document.querySelectorAll('.' + styles.userSelector).forEach(selector => {
          const selectorComponent = selector as HTMLElement;
          if (selectorComponent.querySelector('.' + styles.dropdown)) {
            // This is the open dropdown, find its trigger and click it
            const trigger = selectorComponent.querySelector('.' + styles.currentUser) as HTMLElement;
            if (trigger) trigger.click();
          }
        });
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // The polling logic is now handled by the useMessages hook

  // Handle back button click to return to conversation list
  const handleBackToList = () => {
    setConversationId(null);
    clearMessages();
  };

  // Render the appropriate screen based on whether a conversation is selected
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
  
  // Handle user change
  const handleUserChange = (newUserId: string) => {
    setCurrentUserId(newUserId);
    
    // Reset conversation when user changes
    setConversationId(null);
    clearMessages();
    
    // Get the user's phone color and update it based on predefined values
    let newPhoneColor: PhoneColor = 'default';
    switch (newUserId) {
      case '1': newPhoneColor = 'rose'; break;
      case '2': newPhoneColor = 'blue'; break;
      case '3': newPhoneColor = 'gold'; break;
      case '4': newPhoneColor = 'titanium'; break;
      default: newPhoneColor = 'default';
    }
    
    setPhoneColor(newPhoneColor);
    if (onChangePhoneColor) {
      onChangePhoneColor(newPhoneColor);
    }
    
    // Notify parent component if callback provided
    if (onChangeUser) {
      onChangeUser(newUserId);
    }
  };
  
  // Update currentUserId when userId prop changes
  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  const renderConversationScreen = () => (
    <>
      <div className={styles.phoneHeader}>
        <button
          onClick={handleBackToList}
          className={styles.backButton}
          title="Back to conversations"
        >
          ←
        </button>
        <span className={styles.userInfo}>
          <span>{getUserName(currentUserId)}</span>
          <UserSelector currentUserId={currentUserId} onUserChange={handleUserChange} />
        </span>
      </div>

      <MessageList messages={messages} currentUser={currentUserId} />

      <div className={styles.phoneFooter}>
        <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </>
  );

  const renderConversationListScreen = () => (
    <>
      <div className={styles.phoneHeader}>
        <span className={styles.userInfo}>
          <span>{getUserName(currentUserId)}</span>
          <UserSelector currentUserId={currentUserId} onUserChange={handleUserChange} />
        </span>
      </div>

      <ConversationList
        userId={currentUserId}
        demoVersion={demoVersion}
        onSelectConversation={setConversationId}
      />
    </>
  );

  return (
    <div className={phoneStyles.phoneChatApp}>
      {conversationId
        ? renderConversationScreen()
        : renderConversationListScreen()}
    </div>
  );
}
