"use client";

import { useState, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationList } from "./ConversationList";
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
}

export function ChatApp({
  userId,
  demoVersion,
  onChangePhoneColor,
  initialColor = "default",
}: ChatAppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneColor, setPhoneColor] = useState<PhoneColor>(initialColor);

  // Load messages
  const loadMessages = async () => {
    if (!conversationId) return false;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/conversation/${conversationId}/message`,
        {
          headers: {
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": userId,
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

      const response = await fetch(
        `/api/conversation/${conversationId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Demo-Version": demoVersion.toString(),
            "X-User-Id": userId,
          },
          body: JSON.stringify({
            content,
            sender: userId,
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
        <span className={styles.userInfo}>{getUserName(userId)}</span>
      </div>

      <MessageList messages={messages} currentUser={userId} />

      <div className={styles.phoneFooter}>
        <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </>
  );

  const renderConversationListScreen = () => (
    <>
      <div className={styles.phoneHeader}>
        <span className={styles.userInfo}>{getUserName(userId)}</span>
      </div>

      <ConversationList
        userId={userId}
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
