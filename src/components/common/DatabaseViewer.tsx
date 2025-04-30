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
import { useToast } from "./Toast";
import { Modal } from "./Modal";

// Define interface for the database viewer component
export interface DatabaseViewerProps {
  demoVersion: number;
}

// Define interface for database viewer ref
export interface DatabaseViewerRef {
  fetchDatabaseContents: () => void;
}

// Reusable database viewer component with forwardRef to expose methods to parent
export const DatabaseViewer = forwardRef<
  DatabaseViewerRef,
  DatabaseViewerProps
>(({ demoVersion }, ref) => {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversation, setEditingConversation] = useState<string | null>(
    null
  );
  const [editedMembers, setEditedMembers] = useState<string>("");
  // Track copied cell by a unique identifier (table-row-column) instead of content
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get toast function for notifications
  const { showToast } = useToast();

  // Function to fetch database contents
  const fetchDatabaseContents = useCallback(() => {
    setIsLoading(true);

    fetch("/api/admin")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setDbContents(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching database:", error);
        const errorMessage = `Failed to load database: ${error.message}`;
        showToast(errorMessage, "error");
        setIsLoading(false);
      });
  }, [showToast]); // Include showToast in dependencies

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

  // Function to open the reset confirmation modal
  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  // Function to handle the actual database reset
  const confirmReset = async () => {
    setIsResetting(true);
    try {
      // Make the API call directly
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Show success message
      showToast("Database reset successfully", "success");

      // Refresh the database contents after reset
      fetchDatabaseContents();
    } catch (error) {
      console.error("Error resetting database:", error);
      showToast(
        `Failed to reset database: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    } finally {
      setIsResetting(false);
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
                        user.phoneColor || "default",
                        `users-${user.id}-phoneColor`
                      )
                    }
                    className={`${styles.clickableCell} ${
                      copiedCellId === `users-${user.id}-phoneColor`
                        ? styles.copiedCell
                        : ""
                    }`}
                  >
                    {user.phoneColor || "default"}
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

        {demoVersion >= 3 && (
          <>
            <h4>Public Keys Table</h4>
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Public Key</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {dbContents && dbContents.publicKeys ? (
                  dbContents.publicKeys.map((keyEntry: any) => {
                    // Find the user name for this key
                    const user = dbContents.users?.find(
                      (u: any) => u.id === keyEntry.userId
                    );
                    const userName = user ? user.name : "Unknown User";

                    return (
                      <tr key={`pubkey-${keyEntry.userId}`}>
                        <td
                          onClick={() =>
                            handleCopyToClipboard(
                              keyEntry.userId,
                              `pubkey-${keyEntry.userId}-id`
                            )
                          }
                          className={`${styles.clickableCell} ${
                            copiedCellId === `pubkey-${keyEntry.userId}-id`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {keyEntry.userId}
                        </td>
                        <td>{userName}</td>
                        <td
                          onClick={() =>
                            handleCopyToClipboard(
                              keyEntry.publicKey,
                              `pubkey-${keyEntry.userId}-key`
                            )
                          }
                          className={`${styles.contentCell} ${
                            styles.clickableCell
                          } ${
                            copiedCellId === `pubkey-${keyEntry.userId}-key`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {keyEntry.publicKey}
                        </td>
                        <td>{new Date(keyEntry.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>Loading...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {demoVersion >= 4 && (
          <>
            <h4>Ephemeral Keys Table</h4>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Conversation ID</th>
                  <th>Public Key</th>
                  <th>Created At</th>
                  <th>Expires At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dbContents && dbContents.ephemeralKeys ? (
                  dbContents.ephemeralKeys.map((key: any) => {
                    // Find the user name for this key
                    const user = dbContents.users?.find(
                      (u: any) => u.id === key.userId
                    );
                    const userName = user ? user.name : "Unknown User";
                    const now = new Date();
                    const isExpired = new Date(key.expiresAt) < now;

                    return (
                      <tr
                        key={`ephkey-${key.id}`}
                        className={isExpired ? styles.expiredKey : ""}
                      >
                        <td
                          onClick={() =>
                            handleCopyToClipboard(key.id, `ephkey-${key.id}-id`)
                          }
                          className={`${styles.clickableCell} ${
                            copiedCellId === `ephkey-${key.id}-id`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {key.id}
                        </td>
                        <td
                          onClick={() =>
                            handleCopyToClipboard(
                              key.userId,
                              `ephkey-${key.id}-userId`
                            )
                          }
                          className={`${styles.clickableCell} ${
                            copiedCellId === `ephkey-${key.id}-userId`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {key.userId} ({userName})
                        </td>
                        <td
                          onClick={() =>
                            handleCopyToClipboard(
                              key.conversationId,
                              `ephkey-${key.id}-convId`
                            )
                          }
                          className={`${styles.clickableCell} ${
                            copiedCellId === `ephkey-${key.id}-convId`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {key.conversationId}
                        </td>
                        <td
                          onClick={() =>
                            handleCopyToClipboard(
                              key.publicKey,
                              `ephkey-${key.id}-key`
                            )
                          }
                          className={`${styles.contentCell} ${
                            styles.clickableCell
                          } ${
                            copiedCellId === `ephkey-${key.id}-key`
                              ? styles.copiedCell
                              : ""
                          }`}
                        >
                          {key.publicKey}
                        </td>
                        <td>{new Date(key.createdAt).toLocaleString()}</td>
                        <td>{new Date(key.expiresAt).toLocaleString()}</td>
                        <td
                          className={
                            isExpired
                              ? styles.expiredStatus
                              : styles.validStatus
                          }
                        >
                          {isExpired ? "EXPIRED" : "VALID"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>Loading...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className={styles.databaseActions}>
        <button
          onClick={handleReset}
          className={styles.resetButton}
          disabled={isResetting}
        >
          {isResetting ? "Resetting..." : "Reset Database"}
        </button>
      </div>
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmReset}
        title="Reset Database"
        message="Are you sure you want to reset the database?"
        confirmText="Reset"
        cancelText="Cancel"
      />
    </div>
  );
});

DatabaseViewer.displayName = "DatabaseViewer";
