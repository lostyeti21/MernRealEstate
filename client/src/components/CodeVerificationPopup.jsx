import React, { useState } from 'react';
import styled from 'styled-components';

const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PopupContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 15px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  letter-spacing: 10px;
  font-size: 20px;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 15px;

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
`;

const CodeVerificationPopup = ({ 
  email, 
  onVerify, 
  onClose, 
  errorMessage 
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      return;
    }

    setLoading(true);
    await onVerify(email, code);
    setLoading(false);
  };

  return (
    <PopupOverlay>
      <PopupContent>
        <h2>Verification Code</h2>
        <p>Enter the 6-digit code sent to {email}</p>
        <form onSubmit={handleSubmit}>
          <Input 
            type="text" 
            maxLength="6" 
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="------"
          />
          {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
          <Button 
            type="submit" 
            disabled={code.length !== 6 || loading}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button 
            type="button" 
            onClick={onClose}
            style={{ 
              backgroundColor: '#6c757d', 
              marginTop: '10px' 
            }}
          >
            Cancel
          </Button>
        </form>
      </PopupContent>
    </PopupOverlay>
  );
};

export default CodeVerificationPopup;
