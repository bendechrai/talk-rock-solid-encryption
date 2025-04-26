import { useState } from 'react';
import styles from './KeyGenerationScreen.module.css';
import { generateKeys } from '@/lib/encryption/asymmetric';

interface KeyGenerationScreenProps {
  userId: string;
  userName: string;
  onKeysGenerated: (publicKey: string, privateKey: string) => Promise<void>;
}

export function KeyGenerationScreen({ userId, userName, onKeysGenerated }: KeyGenerationScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateKeys = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Generate new key pair
      const keys = await generateKeys();
      
      // Call the callback with the generated keys
      await onKeysGenerated(keys.publicKey, keys.privateKey);
    } catch (err) {
      console.error('Error generating keys:', err);
      setError('Failed to generate keys. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.keyGenerationScreen}>
      <div className={styles.keyGenerationContent}>
        <div className={styles.lockIcon}>
          🔒
        </div>
        
        <h2>End-to-End Encryption</h2>
        
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userId}>ID: {userId}</span>
        </div>
        
        <p className={styles.description}>
          To send and receive encrypted messages, you need to generate a key pair.
          Your <strong>private key</strong> will be stored only on this device, while your
          <strong> public key</strong> will be shared with others so they can send you encrypted messages.
        </p>
        
        <div className={styles.buttonContainer}>
          <button 
            className={styles.generateButton}
            onClick={handleGenerateKeys}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating Keys...' : 'Generate Key Pair'}
          </button>
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <div className={styles.securityInfo}>
          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>🔐</div>
            <div className={styles.infoText}>
              <strong>End-to-End Encrypted</strong>
              <span>Only you and your recipient can read messages</span>
            </div>
          </div>
          
          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>🔑</div>
            <div className={styles.infoText}>
              <strong>X25519 Elliptic Curve</strong>
              <span>Strong cryptography for secure messaging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
