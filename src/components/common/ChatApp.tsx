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

  // Load messages
  const loadMessages = async () => {
    if (!conversationId) return false;
    
    // Make sure we're using a valid conversation ID (not 'default')
    const validConversationId = conversationId === 'default' ? '1' : conversationId;

    try {
      setIsLoading(true);
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
      setIsLoading(false);
      return true; // Return a value to allow chaining with .then()
    } catch (error) {
      console.error("Error loading messages:", error);
      setIsLoading(false);
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

    // Create a modified loadMessages function that preserves the active element's focus
    const loadMessagesPreserveFocus = () => {
      // Only poll if the component is still mounted and visible
      if (document.visibilityState === "visible") {
        // Store the currently focused element
        const activeElement = document.activeElement;
        const activeElementId = activeElement ? activeElement.id : null;
        const activeElementTagName = activeElement
          ? activeElement.tagName
          : null;
        const selectionStart =
          activeElement && "selectionStart" in activeElement
            ? (activeElement as HTMLInputElement).selectionStart
            : null;
        const selectionEnd =
          activeElement && "selectionEnd" in activeElement
            ? (activeElement as HTMLInputElement).selectionEnd
            : null;

        // Load messages
        loadMessages().then(() => {
          // After loading, restore focus if the active element was an input or textarea
          if (
            activeElementTagName &&
            (activeElementTagName === "INPUT" ||
              activeElementTagName === "TEXTAREA")
          ) {
            // Find the element again (in case the DOM has changed)
            let elementToFocus: HTMLElement | null = null;

            if (activeElementId) {
              elementToFocus = document.getElementById(
                activeElementId
              ) as HTMLElement;
            } else if (activeElement) {
              // Try to find by matching the element itself
              elementToFocus = activeElement as HTMLElement;
            }

            // Restore focus and selection if possible
            if (elementToFocus) {
              elementToFocus.focus();

              // Restore cursor position if applicable
              if (
                "selectionStart" in elementToFocus &&
                selectionStart !== null &&
                selectionEnd !== null
              ) {
                (elementToFocus as HTMLInputElement).selectionStart =
                  selectionStart;
                (elementToFocus as HTMLInputElement).selectionEnd =
                  selectionEnd;
              }
            }
          }
        });
      }
    };

    // Set up polling interval
    const interval = setInterval(loadMessagesPreserveFocus, 3000);

    // Add visibility change listener to pause polling when tab is not visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Immediately load messages when tab becomes visible again
        loadMessagesPreserveFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, demoVersion]);

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
