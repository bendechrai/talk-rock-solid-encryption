"use client";

import { useState, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationList } from "./ConversationList";
import { UserSelector } from "./UserSelector";
import { Message } from "@/types/common";
import styles from "./ChatApp.module.css";
import { phoneStyles } from "./phoneStyles";

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
}

export function ChatApp({
  userId,
  demoVersion,
  onChangePhoneColor,
  initialColor = "default",
  onChangeUser,
}: ChatAppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneColor, setPhoneColor] = useState<PhoneColor>(initialColor);
  const [currentUserId, setCurrentUserId] = useState<string>(userId);

  // Load messages without affecting the input field's state
  const loadMessages = async () => {
    if (!conversationId) return false;
    
    // Make sure we're using a valid conversation ID (not 'default')
    const validConversationId = conversationId === 'default' ? '1' : conversationId;

    try {
      // Don't set loading state for background refreshes
      const isBackgroundRefresh = !isLoading;
      
      // Only set loading state for user-initiated actions (like sending a message)
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      }
      
      const response = await fetch(
        `/api/conversation/${validConversationId}/message`,
        {
          headers: {
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": currentUserId,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Only update state if messages have actually changed
        // This reduces unnecessary re-renders
        if (JSON.stringify(data.messages) !== JSON.stringify(messages)) {
          setMessages(data.messages);
        }
      }
      
      // Only update loading state if this was a user-initiated action
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
      
      return true; // Return a value to allow chaining with .then()
    } catch (error) {
      console.error("Error loading messages:", error);
      // Only update loading state if we set it earlier
      if (isLoading) {
        setIsLoading(false);
      }
      return false;
    }
  };

  // Send a message
  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // Determine encryption type based on demo version
      let encryptionType;
      if (demoVersion === 2) {
        encryptionType = "symmetric";
      } else if (demoVersion === 3) {
        encryptionType = "asymmetric";
      }

      // Make sure we're using a valid conversation ID (not 'default')
      const validConversationId = conversationId === 'default' ? '1' : conversationId;
      
      const response = await fetch(
        `/api/conversation/${validConversationId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": currentUserId,
          },
          body: JSON.stringify({
            content,
            sender: currentUserId,
            encryptionType,
          }),
        }
      );

      if (response.ok) {
        await loadMessages();
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  };

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

  // Set up polling for new messages
  useEffect(() => {
    if (!conversationId) return;

    // Initial load
    loadMessages();

    // Create a simplified message loading function that doesn't affect the input field
    const refreshMessages = () => {
      // Only poll if the component is still mounted and visible
      if (document.visibilityState === "visible") {
        // Always fetch messages in the background without affecting input field
        // Make a direct API call without changing loading state
        const validConversationId = conversationId === 'default' ? '1' : conversationId;
        
        fetch(`/api/conversation/${validConversationId}/message`, {
          headers: {
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": currentUserId,
          },
        })
          .then(response => response.ok ? response.json() : null)
          .then(data => {
            if (data && data.messages) {
              // Only update if messages have changed to minimize re-renders
              if (JSON.stringify(data.messages) !== JSON.stringify(messages)) {
                setMessages(data.messages);
              }
            }
          })
          .catch(error => {
            console.error("Background refresh error:", error);
          });
      }
    };

    // Handle visibility changes (refresh when tab becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshMessages();
      }
    };

    // Set up polling interval (increased to 5 seconds to reduce API calls)
    const intervalId = setInterval(refreshMessages, 5000);

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, loadMessages]);

  // Handle back button click to return to conversation list
  const handleBackToList = () => {
    setConversationId(null);
    setMessages([]);
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
    setMessages([]);
    
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
