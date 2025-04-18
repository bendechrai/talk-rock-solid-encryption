'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './DatabaseViewer.module.css';

// Define interface for the database viewer component
export interface DatabaseViewerProps {
  isVisible?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
}

// Define interface for database viewer ref
export interface DatabaseViewerRef {
  fetchDatabaseContents: () => void;
}

// Reusable database viewer component with forwardRef to expose methods to parent
export const DatabaseViewer = forwardRef<DatabaseViewerRef, DatabaseViewerProps>((props, ref) => {
  const [dbContents, setDbContents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to fetch database contents
  const fetchDatabaseContents = useCallback(() => {
    setIsLoading(true);
    fetch('/api/admin')
      .then(response => response.json())
      .then(data => {
        setDbContents(data);
        setIsLoading(false);
        // Call onRefresh callback if provided, but don't include it in dependencies
        if (props.onRefresh) {
          props.onRefresh();
        }
      })
      .catch(error => {
        console.error('Error fetching database:', error);
        setIsLoading(false);
      });
  }, []); // Empty dependency array to prevent infinite loops
  
  // Expose fetchDatabaseContents to parent component via ref
  useImperativeHandle(ref, () => ({
    fetchDatabaseContents
  }));
  
  // Load data when component mounts - only once
  useEffect(() => {
    fetchDatabaseContents();
    // Don't add fetchDatabaseContents to dependencies to avoid infinite loop
  }, []);
  
  // Don't render anything if not visible
  if (props.isVisible === false) {
    return null;
  }
  
  return (
    <div className={styles.databaseViewer}>
      <div className={styles.databaseViewerHeader}>
        <h3>Database</h3>
      </div>
      
      {isLoading ? (
        <p>Loading database contents...</p>
      ) : (
        <div className={styles.databaseViewerContent}>
          <h4>Messages Table</h4>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Conversation ID</th>
                <th>Sender</th>
                <th>Content</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {dbContents?.messages.map((msg: any) => (
                <tr key={msg.id}>
                  <td>{msg.id}</td>
                  <td>{msg.conversationId}</td>
                  <td>{msg.sender}</td>
                  <td className={styles.contentCell}>{msg.content}</td>
                  <td>{new Date(msg.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

DatabaseViewer.displayName = 'DatabaseViewer';
