"use client";

import { useState } from "react";
import styles from "./EphemeralKeyGenerationScreen.module.css";
import { generateEphemeralKeyPair } from "@/lib/encryption/ephemeral";
import { useToast } from "@/components/common/Toast";

interface EphemeralKeyGenerationScreenProps {
  userId: string;
  conversationId: string;
  userName: string;
  onKeysGenerated?: () => void;
}

export function EphemeralKeyGenerationScreen({
  userId,
  conversationId,
  userName,
  onKeysGenerated,
}: EphemeralKeyGenerationScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const handleGenerateKeys = async () => {
    try {
      setIsGenerating(true);
      showToast(
        `Generating ephemeral keys for conversation ${conversationId}...`
      );

      // Generate ephemeral key pair
      const keyPair = await generateEphemeralKeyPair(userId, conversationId);

      showToast(`Ephemeral keys generated successfully for ${userName}`);

      // Notify parent component
      if (onKeysGenerated) {
        onKeysGenerated();
      }
    } catch (error) {
      console.error("Error generating ephemeral keys:", error);
      showToast(`Error generating ephemeral keys: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.description}>
          To securely communicate in this conversation, you need to generate an
          ephemeral key pair.
        </p>
        <button
          className={styles.generateButton}
          onClick={handleGenerateKeys}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Ephemeral Keys for this Conversation"}
        </button>
        <p className={styles.securityNote}>
          Ephemeral keys provide Perfect Forward Secrecy, ensuring that if your
          long-term keys are compromised, past messages remain secure.
        </p>
      </div>
    </div>
  );
}
