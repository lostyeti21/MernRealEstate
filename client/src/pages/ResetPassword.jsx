import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Form, 
  Input, 
  Button, 
  ErrorMessage, 
  SuccessMessage 
} from '../components/StyledComponents';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email', 'verify', 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if email was passed from forgot password page
    const state = location.state;
    if (state && state.email) {
      setEmail(state.email);
      setStep('verify'); // Directly go to verification step
      
      // Automatically send verification code
      const sendVerificationCode = async () => {
        try {
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: state.email }),
          });

          const data = await response.json();

          if (data.success) {
            setSuccess('Verification code sent to your email');
          } else {
            setError(data.message || 'Failed to send verification code');
          }
        } catch (error) {
          console.error('Send verification code error:', error);
          setError('Network error. Please try again.');
        }
      };

      sendVerificationCode();
    }
  }, [location, navigate]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Verification code sent to your email');
        setStep('verify');
        setEmail(data.email);
      } else {
        setError(data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code: verificationCode 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Code verified. You can now reset your password.');
        setStep('reset');
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Verify code error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Reset previous messages
    setError('');
    setSuccess('');
    
    // Validate inputs
    if (!password || !confirmPassword) {
      setError('Please enter both password fields');
      return;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    // Additional password complexity checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar)) {
      setError('Password must include uppercase, lowercase, number, and special character');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email, 
          newPassword: password 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Password reset successful. You can now sign in.');
        // Optional: Redirect to sign-in after a short delay
        setTimeout(() => {
          navigate('/sign-in');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 'email':
        return (
          <Form onSubmit={handleForgotPassword}>
            <Input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </Form>
        );
      case 'verify':
        return (
          <Form onSubmit={handleVerifyCode}>
            <Input 
              type="text" 
              placeholder="Enter 6-digit verification code" 
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength="6"
              required 
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </Form>
        );
      case 'reset':
        return (
          <Form onSubmit={handleResetPassword}>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="New Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="relative mt-4">
              <Input 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Confirm New Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Form>
        );
      default:
        return null;
    }
  };

  return (
    <Container>
      <h1>Reset Password</h1>
      {renderStep()}
    </Container>
  );
}
