import { useState } from 'react';
import { testFirebaseConnection } from '../utils/firebase-test';

export const FirebaseTest = ({ onTestComplete }) => {
  const [testResult, setTestResult] = useState(null);

  const runTest = async () => {
    const result = await testFirebaseConnection();
    setTestResult(result);
    if (onTestComplete) {
      onTestComplete(result);
    }
  };

  return (
    <div className="mt-4">
      <button 
        onClick={runTest}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Test Firebase Connection
      </button>
      {testResult && (
        <div className="mt-2">
          <p>Status: {testResult.success ? 'Success' : 'Failed'}</p>
          <p>Message: {testResult.message || testResult.error}</p>
          {testResult.url && <p>Test URL: {testResult.url}</p>}
        </div>
      )}
    </div>
  );
}; 