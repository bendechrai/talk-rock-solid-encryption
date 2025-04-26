"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import styles from "./DatabaseViewer.module.css";

// Define interface for the database viewer component
export interface DatabaseViewerProps {
  onClose?: () => void;
  onRefresh?: () => void;
  onResetDatabase?: () => Promise<void>;
}

// Define interface for database viewer ref
export interface DatabaseViewerRef {
  fetchDatabaseContents: () => void;
}

// Reusable database viewer component with forwardRef to expose methods to parent
export const DatabaseViewer = forwardRef<
  DatabaseViewerRef,
  DatabaseViewerProps
>((props, ref) => {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversation, setEditingConversation] = useState<string | null>(
    null
  );
  const [editedMembers, setEditedMembers] = useState<string>("");
  // Track copied cell by a unique identifier (table-row-column) instead of content
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch database contents
  const fetchDatabaseContents = useCallback(() => {
    setIsLoading(true);
    fetch("/api/admin")
      .then((response) => response.json())
      .then((data) => {
        setDbContents(data);
        setIsLoading(false);
        // Call onRefresh callback if provided, but don't include it in dependencies
        if (props.onRefresh) {
          props.onRefresh();
        }
      })
      .catch((error) => {
        console.error("Error fetching database:", error);
        setIsLoading(false);
      });
  }, []); // Empty dependency array to prevent infinite loops

  // Function to start editing a conversation's members
  const handleEditConversation = (
    conversationId: string,
    currentMembers: string[]
  ) => {
    setEditingConversation(conversationId);
    setEditedMembers(currentMembers.join(", "));
  };

  // Function to save edited members
  const handleSaveMembers = async () => {
    if (!editingConversation) return;

    const memberIds = editedMembers.split(",").map((id) => id.trim());

    try {
      const response = await fetch("/api/admin/conversation", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: editingConversation,
          memberUserIds: memberIds,
        }),
      });

      if (response.ok) {
        // Reset editing state
        setEditingConversation(null);
        setEditedMembers("");
        // Refresh data
        fetchDatabaseContents();
      } else {
        console.error("Failed to update conversation members");
      }
    } catch (error) {
      console.error("Error updating conversation members:", error);
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingConversation(null);
    setEditedMembers("");
  };

  // Function to copy cell content to clipboard
  const handleCopyToClipboard = (content: string, cellId: string) => {
    // Copy to clipboard
    navigator.clipboard
      .writeText(content)
      .then(() => {
        // Set the copied cell ID to show feedback
        setCopiedCellId(cellId);

        // Clear any existing timeout
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }

        // Clear the copied state after 2 seconds
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedCellId(null);
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  // Function to handle database reset
  const handleReset = async () => {
    if (confirm("Are you sure you want to reset the database?")) {
      setIsResetting(true);
      if (props.onResetDatabase) {
        try {
          await props.onResetDatabase();
          // Refresh the database contents after reset
          fetchDatabaseContents();
        } catch (error) {
          console.error("Error resetting database:", error);
        } finally {
          setIsResetting(false);
        }
      }
    }
  };

  // Expose fetchDatabaseContents method to parent component
  useImperativeHandle(ref, () => ({
    fetchDatabaseContents,
  }));

  // Fetch data when component mounts and set up auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchDatabaseContents();

    // Set up interval to refresh every 3 seconds, but only if we're not editing
    const intervalId = setInterval(() => {
      // Only refresh if we're not currently editing a conversation
      if (!editingConversation) {
        fetchDatabaseContents();
      }
    }, 1000);

    // Clean up interval and timeout on unmount
    return () => {
      clearInterval(intervalId);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [fetchDatabaseContents, editingConversation]); // Include dependencies

  return (
    <div className={styles.databaseViewer}>
      <div className={styles.databaseViewerContent}>
        <h3>Database Viewer</h3>

        <h4>Users Table</h4>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone Color</th>
              <th>Public Key</th>
              <th>Private Key</th>
            </tr>
          </thead>
          <tbody>
            {dbContents && dbContents.users ? (
              dbContents.users.map((user: any) => (
                <tr key={user.id}>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(user.id, `users-${user.id}-id`)
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-id`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.id}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(user.name, `users-${user.id}-name`)
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-name`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.name}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        user.phoneColor,
                        `users-${user.id}-phoneColor`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-phoneColor`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.phoneColor}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        user.publicKey,
                        `users-${user.id}-publicKey`
                      )
                    }
                    className={`${styles.contentCell} ${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-publicKey`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.publicKey}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        user.privateKey,
                        `users-${user.id}-privateKey`
                      )
                    }
                    className={`${styles.contentCell} ${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-privateKey`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.privateKey}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4>Conversations Table</h4>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Members</th>
            </tr>
          </thead>
          <tbody>
            {dbContents && dbContents.conversations ? (
              dbContents.conversations.map((conv: any) => (
                <tr key={conv.id}>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        conv.id,
                        `conversations-${conv.id}-id`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `conversations-${conv.id}-id`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {conv.id}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        conv.name,
                        `conversations-${conv.id}-name`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `conversations-${conv.id}-name`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {conv.name}
                  </td>
                  <td>
                    {editingConversation === conv.id ? (
                      <div className={styles.editField}>
                        <input
                          type="text"
                          value={editedMembers}
                          onChange={(e) => setEditedMembers(e.target.value)}
                          placeholder="User IDs separated by commas"
                        />
                        <div className={styles.editButtons}>
                          <button onClick={handleSaveMembers}>Save</button>
                          <button onClick={handleCancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.membersList}>
                        <span
                          onClick={() =>
                            handleCopyToClipboard(
                              conv.memberUserIds.join(", "),
                              `conversations-${conv.id}-members`
                            )
                          }
                          className={`${styles.clickableCell} ${
                            copiedCellId === `conversations-${conv.id}-members`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {conv.memberUserIds.join(", ")}
                        </span>
                        <button
                          className={styles.editButton}
                          onClick={() =>
                            handleEditConversation(conv.id, conv.memberUserIds)
                          }
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4>Messages Table</h4>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Conversation ID</th>
              <th>Sender</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {dbContents && dbContents.messages ? (
              dbContents.messages.map((msg: any) => (
                <tr key={msg.id}>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(msg.id, `messages-${msg.id}-id`)
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `messages-${msg.id}-id`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {msg.id}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        msg.conversationId,
                        `messages-${msg.id}-conversationId`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `messages-${msg.id}-conversationId`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {msg.conversationId}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        msg.sender,
                        `messages-${msg.id}-sender`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `messages-${msg.id}-sender`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {msg.sender}
                  </td>
                  <td
                    onClick={() =>
                      handleCopyToClipboard(
                        msg.content,
                        `messages-${msg.id}-content`
                      )
                    }
                    className={`${styles.contentCell} ${styles.clickableCell} ${
                      copiedCellId === `messages-${msg.id}-content`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {msg.content}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {props.onResetDatabase && (
        <div className={styles.databaseActions}>
          <button
            onClick={handleReset}
            disabled={isResetting || isLoading}
            className={styles.resetButton}
            aria-label="Reset Database"
          >
            {isResetting ? "Resetting..." : "Reset Database"}
          </button>
        </div>
      )}
    </div>
  );
});

DatabaseViewer.displayName = "DatabaseViewer";
