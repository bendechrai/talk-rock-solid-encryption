"use client";

import { useState, useEffect } from "react";
import styles from "./ChatApp.module.css";
import phoneStyles from "./Phone.module.css";
import { Message, User, Conversation } from "@/types/common";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationList } from "./ConversationList";
import { useMessages } from "@/lib/hooks/useMessages";
import {
  fetchUserData,
  fetchConversationData,
  fetchUserConversations
} from '@/lib/helpers/dataHelpers';
import { Layout } from "./Layout";
import { Header } from "./Header";
import { Content } from "./Content";
import { Footer } from "./Footer";

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
    clearMessages,
  } = useMessages({
    conversationId,
    userId: currentUserId,
    demoVersion,
    messageProcessor,
    pollingInterval: 5000,
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
      const dropdowns = document.querySelectorAll("." + styles.dropdown);
      if (dropdowns.length > 0) {
        // There's an open dropdown, close it by triggering a click on the document
        document
          .querySelectorAll("." + styles.userSelector)
          .forEach((selector) => {
            const selectorComponent = selector as HTMLElement;
            if (selectorComponent.querySelector("." + styles.dropdown)) {
              // This is the open dropdown, find its trigger and click it
              const trigger = selectorComponent.querySelector(
                "." + styles.currentUser
              ) as HTMLElement;
              if (trigger) trigger.click();
            }
          });
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // The polling logic is now handled by the useMessages hook

  // Handle back button click to return to conversation list
  const handleBackToList = () => {
    setConversationId(null);
    clearMessages();
  };

  // Render the appropriate screen based on whether a conversation is selected
  // State to store user data
  const [userData, setUserData] = useState<Record<string, User>>({});

  // State to store conversation data
  const [conversationData, setConversationData] = useState<
    Record<string, Conversation>
  >({});

  // Function to get user name from ID using database data
  const getUserName = (id: string) => {
    // If we have the user data in our state, use it
    if (userData[id] && userData[id].name) {
      return userData[id].name;
    }

    // Fallback to hardcoded names for demo purposes
    // This ensures we don't get stuck in a loading state
    switch (id) {
      case "1":
        return "Alice";
      case "2":
        return "Bob";
      case "3":
        return "Charlie";
      case "4":
        return "Diana";
      default:
        return `User ${id}`;
    }
  };

  // Function to get conversation name from ID using database data
  const getConversationName = (id: string | null) => {
    if (!id) return "";

    // If we have the conversation data in our state, use it
    if (conversationData[id] && conversationData[id].name) {
      return conversationData[id].name;
    }

    // Provide a meaningful fallback based on conversation ID pattern
    if (id.includes("_")) {
      // This is likely a direct conversation between users
      const userIds = id.split("_");
      const userNames = userIds.map((userId) => getUserName(userId));
      return userNames.join(" & ");
    } else if (id === "group") {
      return "Group Chat";
    }

    // Generic fallback
    return `Chat ${id}`;
  };

  // Fetch user data when current user ID changes
  useEffect(() => {
    const loadUserData = async () => {
      // Only fetch if we don't already have this user's data
      if (!userData[currentUserId]) {
        const user = await fetchUserData(currentUserId, demoVersion);
        if (user) {
          setUserData((prev) => ({
            ...prev,
            [currentUserId]: user,
          }));
        }
      }
    };

    loadUserData();
  }, [currentUserId, demoVersion, userData]);

  // Preload all conversations for the current user
  useEffect(() => {
    const preloadConversations = async () => {
      try {
        const conversations = await fetchUserConversations(currentUserId, demoVersion);
        if (conversations && conversations.length > 0) {
          const conversationsMap = conversations.reduce((acc, conversation) => {
            acc[conversation.id] = conversation;
            return acc;
          }, {} as Record<string, Conversation>);
          
          setConversationData(prev => ({
            ...prev,
            ...conversationsMap
          }));
        }
      } catch (error) {
        console.error('Error preloading conversations:', error);
      }
    };
    
    preloadConversations();
  }, [currentUserId, demoVersion]);
  
  // Fetch conversation data when conversation ID changes
  useEffect(() => {
    if (!conversationId) return;

    // Only fetch if we don't already have this conversation's data
    if (!conversationData[conversationId]) {
      const loadConversationData = async () => {
        const conversation = await fetchConversationData(
          conversationId,
          currentUserId,
          demoVersion
        );
        if (conversation) {
          setConversationData((prev) => ({
            ...prev,
            [conversationId]: conversation,
          }));
        }
      };

      loadConversationData();
    }
  }, [conversationId, currentUserId, demoVersion, conversationData]);

  // Handle user change
  const handleUserChange = (newUserId: string) => {
    setCurrentUserId(newUserId);

    // Reset conversation when user changes
    setConversationId(null);
    clearMessages();

    // Get the user's phone color and update it based on predefined values
    let newPhoneColor: PhoneColor = "default";
    switch (newUserId) {
      case "1":
        newPhoneColor = "rose";
        break;
      case "2":
        newPhoneColor = "blue";
        break;
      case "3":
        newPhoneColor = "gold";
        break;
      case "4":
        newPhoneColor = "titanium";
        break;
      default:
        newPhoneColor = "default";
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
    <div className={styles.phoneChatApp}>
      <div className={styles.phoneHeader}>
        <Header
          userId={currentUserId}
          title={getConversationName(conversationId)}
          showBackButton={true}
          onBack={handleBackToList}
          onChangeUser={handleUserChange}
        />
      </div>

      <div className={styles.messageContainer}>
        <MessageList messages={messages} currentUser={currentUserId} />
      </div>

      <div className={styles.phoneFooter}>
        <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );

  const renderConversationListScreen = () => (
    <div className={styles.phoneChatApp}>
      <div className={styles.phoneHeader}>
        <Header
          userId={currentUserId}
          title={getUserName(currentUserId)}
          onChangeUser={handleUserChange}
        />
      </div>

      <div className={styles.messageContainer}>
        <ConversationList
          userId={currentUserId}
          demoVersion={demoVersion}
          onSelectConversation={setConversationId}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.phoneChatApp}>
      {conversationId
        ? renderConversationScreen()
        : renderConversationListScreen()}
    </div>
  );
}
