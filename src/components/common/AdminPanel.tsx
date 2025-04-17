'use client';

import { useState } from 'react';
import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  onResetDatabase: () => Promise<void>;
  onViewDatabase: () => Promise<void>;
  demoVersion: number;
  onSwitchDemo?: (demoNumber: number) => void;
}

export function AdminPanel({ 
  onResetDatabase, 
  onViewDatabase, 
  demoVersion,
  onSwitchDemo 
}: AdminPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the database?')) {
      setIsLoading(true);
      await onResetDatabase();
      setIsLoading(false);
    }
  };
  
  const handleViewDatabase = async () => {
    setIsLoading(true);
    await onViewDatabase();
    setIsLoading(false);
  };
  
  return (
    <div className={`admin-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="admin-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Admin Panel {isExpanded ? '▼' : '▶'}</h3>
      </div>
      
      {isExpanded && (
        <div className="admin-controls">
          <div className="demo-info">
            <span>Current Demo: {demoVersion}</span>
            {onSwitchDemo && (
              <div className="demo-switcher">
                <button 
                  onClick={() => onSwitchDemo(1)} 
                  disabled={demoVersion === 1 || isLoading}
                >
                  Demo 1
                </button>
                <button 
                  onClick={() => onSwitchDemo(2)} 
                  disabled={demoVersion === 2 || isLoading}
                >
                  Demo 2
                </button>
                <button 
                  onClick={() => onSwitchDemo(3)} 
                  disabled={demoVersion === 3 || isLoading}
                >
                  Demo 3
                </button>
              </div>
            )}
          </div>
          
          <div className="admin-actions">
            <button 
              onClick={handleReset} 
              disabled={isLoading}
              className="danger-button"
            >
              Reset Database
            </button>
            <button 
              onClick={handleViewDatabase} 
              disabled={isLoading}
            >
              View Database Contents
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
