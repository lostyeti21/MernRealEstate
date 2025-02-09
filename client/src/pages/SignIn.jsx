import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import React, { useState, useRef } from 'react'; 
import { useNavigate, Link } from "react-router-dom";
import OAuth from '../components/OAuth';
import styled from 'styled-components';
import CodeVerificationPopup from '../components/CodeVerificationPopup';
import { 
  Container, 
  Form, 
  Input, 
  Button, 
  ErrorMessage 
} from '../components/StyledComponents';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const StyledPopup = styled.div`
  .cards {
    display: flex;
    gap: 20px;
    justify-content: center;
    padding: 20px;
  }

  .card {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    height: 150px;
    width: 250px;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    transition: 400ms;
  }

  .card.user {
    background-color: #3b82f6;
  }

  .card.agent {
    background-color: #22c55e;
  }

  .card.company {
    background-color: #f43f5e;
  }

  .card p.title {
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .card p.description {
    font-size: 0.9em;
  }

  .card:hover {
    transform: scale(1.1, 1.1);
  }

  .cards:hover > .card:not(:hover) {
    filter: blur(10px);
    transform: scale(0.9, 0.9);
  }
`;

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPopup, setShowPopup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const passwordResetRef = useRef(null);
  const containerRef = useRef(null);

  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Validate inputs - only check for empty fields
      if (!formData.email?.trim() || !formData.password?.trim()) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Log attempt details (without sensitive info)
      console.log('Sign In Attempt:', {
        email: formData.email,
        passwordLength: formData.password.length
      });

      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        }),
      });

      // Log raw response
      const responseText = await res.text();
      console.log('Raw Sign In Response:', responseText);

      // Parse response safely
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        setError('Invalid server response');
        setLoading(false);
        return;
      }

      // Detailed error handling
      if (!res.ok) {
        console.error('Sign In Error Response:', {
          status: res.status,
          message: data.message
        });

        // Specific error messages
        switch (res.status) {
          case 404:
            setError('No account found with this email');
            break;
          case 401:
            setError('Invalid email or password. Please try again.');
            break;
          default:
            setError(data.message || 'Sign in failed');
        }
        setLoading(false);
        return;
      }

      // Successful sign-in
      if (data.success) {
        dispatch(signInSuccess(data));
        navigate('/');
      } else {
        setError(data.message || 'Sign in failed');
      }
    } catch (error) {
      console.error('Sign In Catch Error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    try {
      // Basic email validation
      if (!forgotPasswordEmail) {
        setVerificationError('Please enter an email address');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forgotPasswordEmail)) {
        setVerificationError('Please enter a valid email address');
        return;
      }

      // Reset previous messages
      setVerificationError('');

      // Navigate directly to reset password page
      navigate('/reset-password', { 
        state: { email: forgotPasswordEmail.trim() } 
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      setVerificationError('Network error. Please try again.');
    }
  };

  const handlePasswordResetClick = () => {
    setShowPasswordReset(!showPasswordReset);
    
    // Use setTimeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      if (passwordResetRef.current) {
        passwordResetRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'start'
        });
      }
    }, 100);
  };

  return (
    <div ref={containerRef} className='max-w-6xl mx-auto'>
      {showPopup ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <StyledPopup className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6">Sign in as:</h2>
            <div className="cards grid grid-cols-3 gap-4">
              <div 
                className="card user cursor-pointer border-2 p-6 rounded-lg hover:border-blue-500 transition-all text-black"
                style={{backgroundColor: '#3C8F00'}}
                onClick={() => {
                  setShowPopup(false);
                  // Proceed with regular user sign-in
                }}
              >
                <p className="title font-bold text-xl mb-2">Regular User</p>
                <p className="description">Find or list your property</p>
              </div>
              
              <div 
                className="card agent cursor-pointer border-2 p-6 rounded-lg hover:border-blue-500 transition-all text-black"
                style={{backgroundColor: '#7E79DF'}}
                onClick={() => {
                  setShowPopup(false);
                  navigate('/real-estate-agent-login');
                }}
              >
                <p className="title font-bold text-xl mb-2">Real Estate Agent</p>
                <p className="description">Manage your listings</p>
              </div>
              
              <div 
                className="card company cursor-pointer border-2 p-6 rounded-lg hover:border-blue-500 transition-all text-white"
                style={{backgroundColor: '#009688'}}
                onClick={() => {
                  setShowPopup(false);
                  navigate('/real-estate-login');
                }}
              >
                <p className="title font-bold text-xl mb-2">Real Estate Company</p>
                <p className="description">Manage your agency</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowPopup(false)}
              className="mt-6 text-gray-600 hover:text-gray-800 block mx-auto"
            >
              Close
            </button>
          </StyledPopup>
        </div>
      ) : (
        <div className='relative w-full min-h-screen'>
          <div className="absolute w-full" style={{ top: '-180px' }}>
            <h1 className="text-[120px] font-bold text-gray-100 uppercase whitespace-nowrap text-center" style={{ letterSpacing: '-0.05em' }}>
              <span style={{ color: '#d2d1e6', opacity: 0.6 }}>LANDLORD</span>
              <span style={{ color: '#009688', opacity: 0.2 }}> / TENANT</span>
            </h1>
          </div>
          
          <div className='p-6 max-w-md mx-auto mt-40'>
            <h2 className='text-4xl font-semibold text-slate-600 mb-8 text-center'>
              Sign In
            </h2>
            
            <div className='w-full max-w-[400px] mx-auto'>
              <Form 
                onSubmit={handleSubmit} 
                className='flex flex-col gap-6 w-full'
              >
                <Input
                  type='email'
                  placeholder='Email'
                  className='border p-4 rounded-lg text-lg w-full'
                  value={formData.email}
                  onChange={handleChange}
                  name='email'
                  required
                />

                <div className="relative w-full">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Password'
                    className='border p-4 rounded-lg w-full text-lg'
                    value={formData.password}
                    onChange={handleChange}
                    name='password'
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[40%] -translate-y-[50%] text-gray-500 flex items-center h-[24px]"
                    style={{ marginTop: '1px' }}
                  >
                    {!showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className='bg-slate-700 text-white p-4 rounded-lg uppercase hover:opacity-95 disabled:opacity-80 text-lg w-full'
                >
                  {loading ? 'Loading...' : 'Sign In'}
                </Button>

                <div className='w-full'>
                  <OAuth />
                </div>
              </Form>

              <div className='flex gap-2 mt-6 justify-center'>
                <p>Don't have an account?</p>
                <Link 
                  to='/sign-up' 
                  className='text-blue-700 hover:underline'
                >
                  Sign Up
                </Link>
              </div>

              <div className='mt-6 text-center'>
                <button 
                  onClick={handlePasswordResetClick}
                  className='text-blue-700 hover:underline focus:outline-none mb-4'
                >
                  {showPasswordReset ? 'Cancel' : 'Forgot your password?'}
                </button>

                {showPasswordReset && (
                  <div 
                    ref={passwordResetRef}
                    className='transition-all duration-300 ease-in-out'
                  >
                    <Input
                      type='email'
                      placeholder='Enter your email address'
                      className='border p-4 rounded-lg w-full text-lg mb-4'
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    />
                    <Button
                      onClick={handleForgotPassword}
                      className='bg-blue-500 text-white p-4 rounded-lg w-full hover:opacity-95 text-lg'
                    >
                      Reset Account Password
                    </Button>
                    {verificationError && <ErrorMessage className='text-red-500 mt-4'>{verificationError}</ErrorMessage>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <ErrorMessage className='text-red-500 mt-5'>{error}</ErrorMessage>}
    </div>
  );
}