import { useState } from "react";
import { decryptWithPrivateKey } from "@/lib/encryption/asymmetric";
import styles from "./DecryptionPanel.module.css";

export function DecryptionPanel() {
  const [privateKey, setPrivateKey] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedContent, setDecryptedContent] = useState("");
  const [error, setError] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    setError("");
    setDecryptedContent("");
    setIsDecrypting(true);

    try {
      // First, try to parse the encrypted message
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(encryptedMessage);
      } catch (parseError) {
        throw new Error(
          "Invalid message format. Please enter a valid JSON message."
        );
      }

      // Check if this is a message with recipients array
      if (parsedMessage.recipients && Array.isArray(parsedMessage.recipients)) {
        // Try to decrypt each recipient's message until one works
        let decrypted = null;
        let decryptionError = null;

        // Loop through all recipients and try to decrypt their messages
        for (const recipient of parsedMessage.recipients) {
          if (recipient && recipient.encrypted) {
            try {
              decrypted = await decryptWithPrivateKey(
                recipient.encrypted,
                privateKey
              );

              // If decryption succeeded and returned a valid message, use it
              if (decrypted && decrypted !== "(Unable to decrypt message)") {
                // Add the recipient ID to the result for clarity
                setDecryptedContent(decrypted);
                break; // Exit the loop once we've successfully decrypted a message
              }
            } catch (error) {
              // Store the error but continue trying other recipients
              decryptionError = error;
            }
          }
        }

        // If we couldn't decrypt any messages, throw an error
        if (!decrypted) {
          throw new Error(
            decryptionError?.message ||
              "Could not decrypt any messages for the provided private key."
          );
        }
      }
      // Check if this is a direct encrypted message
      else if (
        parsedMessage.publicKey &&
        parsedMessage.iv &&
        parsedMessage.ciphertext
      ) {
        const decrypted = await decryptWithPrivateKey(
          encryptedMessage,
          privateKey
        );
        setDecryptedContent(decrypted);
      } else {
        throw new Error(
          "Unrecognized message format. Please check the structure."
        );
      }
    } catch (error: any) {
      setError(error.message || "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h2>PPK Decryption Panel</h2>

      <div className={styles.inputGroup}>
        <label>Private Key:</label>
        <textarea
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Paste a private key here"
          className={styles.inputField}
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Encrypted Message:</label>
        <textarea
          value={encryptedMessage}
          onChange={(e) => setEncryptedMessage(e.target.value)}
          placeholder="Paste an encrypted message here"
          className={styles.inputField}
          rows={6}
        />
      </div>

      <button
        onClick={handleDecrypt}
        disabled={!privateKey || !encryptedMessage || isDecrypting}
        className={styles.decryptButton}
      >
        {isDecrypting ? "Decrypting..." : "Decrypt Message"}
      </button>

      {error && <div className={styles.errorMessage}>Error: {error}</div>}

      {decryptedContent && (
        <div className={styles.resultContainer}>
          <h3>Decrypted Content:</h3>
          <div className={styles.decryptedContent}>{decryptedContent}</div>
        </div>
      )}
    </div>
  );
}
