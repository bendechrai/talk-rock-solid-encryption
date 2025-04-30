"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel"
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent click outside from exiting fullscreen and handle backdrop clicks
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Stop the event from propagating to prevent exiting fullscreen
    e.stopPropagation();
    e.preventDefault();
    
    // Only close if clicking directly on the backdrop (not on modal content)
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Use createPortal to render the modal directly in the document body
  return createPortal(
    <div 
      className={styles.modalBackdrop} 
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div 
        className={styles.modalContent} 
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            {cancelText}
          </button>
          <button 
            className={styles.confirmButton} 
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
