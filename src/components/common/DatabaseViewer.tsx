"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import styles from "./DatabaseViewer.module.css";

// Define interface for the database viewer component
export interface DatabaseViewerProps {
  onClose?: () => void;
  onRefresh?: () => void;
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
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editedMembers, setEditedMembers] = useState<string>("");

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
  const handleEditConversation = (conversationId: string, currentMembers: string[]) => {
    setEditingConversation(conversationId);
    setEditedMembers(currentMembers.join(", "));
  };

  // Function to save edited members
  const handleSaveMembers = async () => {
    if (!editingConversation) return;
    
    const memberIds = editedMembers.split(",").map(id => id.trim());
    
    try {
      const response = await fetch("/api/admin/conversation", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversationId: editingConversation,
          memberUserIds: memberIds
        })
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

  // Expose fetchDatabaseContents method to parent component
  useImperativeHandle(ref, () => ({
    fetchDatabaseContents,
  }));

  // Fetch data when component mounts and set up auto-refresh every second
  useEffect(() => {
    // Initial fetch
    fetchDatabaseContents();

    // Set up interval to refresh every second
    const intervalId = setInterval(() => {
      fetchDatabaseContents();
    }, 1000);

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDatabaseContents]); // Include fetchDatabaseContents in dependencies

  return (
    <div className={styles.databaseViewer}>
      <div className={styles.databaseViewerContent}>
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
            {dbContents && dbContents.users ? dbContents.users.map((user: any) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.phoneColor}</td>
                <td className={styles.contentCell}>{user.publicKey}</td>
                <td className={styles.contentCell}>{user.privateKey}</td>
              </tr>
            )) : <tr><td colSpan={5}>Loading...</td></tr>}
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
            {dbContents && dbContents.conversations ? dbContents.conversations.map((conv: any) => (
              <tr key={conv.id}>
                <td>{conv.id}</td>
                <td>{conv.name}</td>
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
                      <span>{conv.memberUserIds.join(", ")}</span>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleEditConversation(conv.id, conv.memberUserIds)}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan={3}>Loading...</td></tr>}
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
            {dbContents && dbContents.messages ? dbContents.messages.map((msg: any) => (
              <tr key={msg.id}>
                <td>{msg.id}</td>
                <td>{msg.conversationId}</td>
                <td>{msg.sender}</td>
                <td className={styles.contentCell}>{msg.content}</td>
              </tr>
            )) : <tr><td colSpan={4}>Loading...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DatabaseViewer.displayName = "DatabaseViewer";
