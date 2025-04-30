import React, { useState } from 'react';
import styles from './ApiQueryPanel.module.css';

interface ApiQueryPanelProps {
  demoVersion: number;
}

interface ApiEndpoint {
  name: string;
  url: string;
  description: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    name: 'Get Conversation',
    url: '/api/conversation/:id',
    description: 'Retrieve a specific conversation by ID'
  },
  {
    name: 'Get Messages',
    url: '/api/conversation/:id/message',
    description: 'Retrieve messages for a specific conversation'
  },
];

const ApiQueryPanel: React.FC<ApiQueryPanelProps> = ({ demoVersion }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [url, setUrl] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = API_ENDPOINTS.find(endpoint => endpoint.name === e.target.value);
    if (selected) {
      setSelectedEndpoint(selected);
      setUrl(selected.url);
      setResult('');
      setError(null);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const executeQuery = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-Demo-Version': demoVersion.toString()
        }
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setResult('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>API Query Tool</h3>
      
      <div className={styles.controlRow}>
        <select 
          className={styles.endpointSelect} 
          onChange={handleEndpointChange}
          value={selectedEndpoint?.name || ''}
        >
          <option value="">Select an API endpoint</option>
          {API_ENDPOINTS.map(endpoint => (
            <option key={endpoint.name} value={endpoint.name}>
              {endpoint.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedEndpoint && (
        <div className={styles.endpointInfo}>
          <p className={styles.description}>{selectedEndpoint.description}</p>
          <div className={styles.urlContainer}>
            <input 
              type="text" 
              className={styles.urlInput} 
              value={url} 
              onChange={handleUrlChange} 
              placeholder="API URL"
            />
            <button 
              className={styles.executeButton} 
              onClick={executeQuery}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Execute'}
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
        <div className={styles.resultContainer}>
          <h5 className={styles.resultTitle}>Result:</h5>
          <pre className={styles.result}>{result}</pre>
        </div>
    </div>
  );
};

export default ApiQueryPanel;
