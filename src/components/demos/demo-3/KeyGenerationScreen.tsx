import { useState, useEffect } from "react";
import styles from "./KeyGenerationScreen.module.css";
import { generateKeys } from "@/lib/encryption/asymmetric";
import { PhoneHeader } from "@/components/common/PhoneHeader";
import { fetchUserData } from "@/lib/helpers/dataHelpers";
import { User } from "@/types/common";

interface KeyGenerationScreenProps {
  userId: string;
  userName: string;
  onKeysGenerated: (publicKey: string, privateKey: string) => Promise<void>;
  onChangeUser?: (userId: string) => void;
  demoVersion: number;
}

export function KeyGenerationScreen({
  userId,
  userName,
  onKeysGenerated,
  onChangeUser,
  demoVersion,
}: KeyGenerationScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  
  // Fetch user data when userId changes
  useEffect(() => {
    const loadUserData = async () => {
      const user = await fetchUserData(userId, demoVersion);
      if (user) {
        setUserData(user);
      }
    };
    
    loadUserData();
  }, [userId, demoVersion]);

  const handleGenerateKeys = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Generate new key pair
      const keys = await generateKeys();

      // Call the callback with the generated keys
      await onKeysGenerated(keys.publicKey, keys.privateKey);
    } catch (err) {
      console.error("Error generating keys:", err);
      setError("Failed to generate keys. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.keyGenerationScreen}>
      <PhoneHeader
        userId={userId}
        userName={userData?.name || userName}
        onChangeUser={onChangeUser}
      />
      <div className={styles.keyGenerationContent}>
        <p className={styles.description}>
          To send and receive encrypted messages, you need to generate a key
          pair. Your <strong>private key</strong> will be stored only on this
          device, while your
          <strong> public key</strong> will be shared with others so they can
          send you encrypted messages.
        </p>

        <div className={styles.buttonContainer}>
          <button
            className={styles.generateButton}
            onClick={handleGenerateKeys}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating Keys..." : "Generate Key Pair"}
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    </div>
  );
}
