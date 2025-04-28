"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./JsonPrettifierPanel.module.css";

// JSON Prettifier Panel component with interactive formatting
export function JsonPrettifierPanel() {
  // State for the form inputs and prettification result
  const [jsonText, setJsonText] = useState("");
  const [prettifiedJson, setPrettifiedJson] = useState("");
  const [isPrettifying, setIsPrettifying] = useState(false);
  const [error, setError] = useState("");
  const [decodeNested, setDecodeNested] = useState(true);

  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to recursively decode JSON strings within an object
  const recursivelyDecodeJson = useCallback((obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => recursivelyDecodeJson(item));
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        try {
          // Try to parse the string as JSON
          const parsedValue = JSON.parse(value);
          // If successful, recursively decode the parsed value
          result[key] = recursivelyDecodeJson(parsedValue);
        } catch (e) {
          // If parsing fails, it's not a JSON string, so keep the original value
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = recursivelyDecodeJson(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }, []);

  // Function to handle JSON prettification
  const handlePrettify = useCallback(async (textToPrettify: string) => {
    // Clear any previous errors
    setError("");

    if (!textToPrettify) {
      setPrettifiedJson("");
      return;
    }

    setIsPrettifying(true);

    try {
      // Try to parse the JSON
      const parsedJson = JSON.parse(textToPrettify);
      
      // Recursively decode any nested JSON strings if the option is enabled
      const processedJson = decodeNested ? recursivelyDecodeJson(parsedJson) : parsedJson;
      
      // Format it with 2 spaces indentation
      const formatted = JSON.stringify(processedJson, null, 2);
      setPrettifiedJson(formatted);
    } catch (error) {
      console.error("JSON parsing failed:", error);
      setError(
        "Invalid JSON format. Please check your input and ensure it's valid JSON."
      );
      setPrettifiedJson("");
    } finally {
      setIsPrettifying(false);
    }
  }, []);

  // Function to trigger prettification with debouncing
  const triggerPrettification = useCallback(
    (text: string) => {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set a new timer to trigger prettification after 500ms of inactivity
      debounceTimerRef.current = setTimeout(() => {
        handlePrettify(text);
      }, 500);
    },
    [handlePrettify]
  );

  // Handle JSON text input change
  const handleJsonTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setJsonText(newValue);
    triggerPrettification(newValue);
  };

  // Handle manual prettify button click
  const handlePrettifyClick = () => {
    handlePrettify(jsonText);
  };

  // Handle clear button click
  const handleClearClick = () => {
    setJsonText("");
    setPrettifiedJson("");
    setError("");
  };

  // Handle toggle for nested JSON decoding
  const handleToggleDecodeNested = () => {
    setDecodeNested(!decodeNested);
    // Re-prettify with the new setting if we have content
    if (jsonText) {
      handlePrettify(jsonText);
    }
  };

  // Clean up the timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.jsonPrettifierPanel}>
      <h3>JSON Prettifier</h3>

      <form className={styles.prettifierForm} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formGroup}>
          <label htmlFor="json-text">Paste JSON:</label>
          <textarea
            id="json-text"
            value={jsonText}
            onChange={handleJsonTextChange}
            placeholder="Paste your JSON here..."
            className={styles.jsonInput}
            rows={6}
          />
        </div>

        <div className={styles.toggleGroup}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={decodeNested}
              onChange={handleToggleDecodeNested}
              className={styles.toggleInput}
            />
            <span className={styles.toggleText}>Auto-decode nested JSON strings</span>
          </label>
        </div>

        <div className={styles.buttonGroup}>
          <button 
            type="button" 
            onClick={handlePrettifyClick} 
            className={styles.button}
            disabled={!jsonText || isPrettifying}
          >
            Prettify
          </button>
          <button 
            type="button" 
            onClick={handleClearClick} 
            className={`${styles.button} ${styles.clearButton}`}
            disabled={!jsonText && !prettifiedJson && !error}
          >
            Clear
          </button>
        </div>

        {isPrettifying && <div className={styles.loading}>Prettifying...</div>}

        {error && <div className={styles.error}>{error}</div>}

        {prettifiedJson && (
          <div className={styles.prettifiedResult}>
            <div className={styles.prettifiedContent}>{prettifiedJson}</div>
          </div>
        )}
      </form>
    </div>
  );
}
