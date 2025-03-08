import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { signInStart, signInFailure, realEstateSignInSuccess } from '../redux/user/userSlice';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Container, Form, Input, Button, ErrorMessage } from '../components/StyledComponents';
import OAuth from '../components/OAuth';
import Background from '../components/Background';

const StyledContainer = Container;

const StyledForm = Form;

const StyledInput = Input;

const StyledButton = Button;

export default function RealEstateLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [showInvalidCredentialsPopup, setShowInvalidCredentialsPopup] = useState(false);
  const [invalidCredentialsMessage, setInvalidCredentialsMessage] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const storedCompany = localStorage.getItem('realEstateCompany');
    const token = localStorage.getItem('access_token');
    
    if (storedCompany && token) {
      try {
        const parsedCompany = JSON.parse(storedCompany);
        
        // Dispatch sign-in success to update Redux state
        dispatch(realEstateSignInSuccess(parsedCompany));
        
        // Navigate to dashboard
        navigate('/real-estate-dashboard');
      } catch (error) {
        console.error('Error parsing stored company data:', error);
        // Clear invalid data
        localStorage.removeItem('realEstateCompany');
        localStorage.removeItem('access_token');
      }
    }
  }, [dispatch, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleError = (errorMessage) => {
    if (errorMessage === 'Company not found') {
      setPopupMessage('Please ensure you are typing in the correct email address!');
      setShowPopup(true);
    } else if (errorMessage === 'Invalid credentials') {
      setInvalidCredentialsMessage('Please check your email and password and try again.');
      setShowInvalidCredentialsPopup(true);
    } else {
      setError(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      dispatch(signInStart());

      const res = await fetch('/api/real-estate/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await res.json();
      console.log('Login response:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to sign in');
      }

      // Ensure we have token and company data
      if (!data.token || !data.company) {
        throw new Error('Invalid login response');
      }

      // Store access token
      localStorage.setItem('access_token', data.token);
      localStorage.setItem('realEstateToken', data.token);
      
      // Store company data
      localStorage.setItem('realEstateCompany', JSON.stringify(data.company));

      // Update Redux state
      dispatch(realEstateSignInSuccess({
        ...data.company,
        token: data.token
      }));

      // Navigate to dashboard
      navigate('/real-estate-dashboard');

    } catch (error) {
      console.error('Login error:', error);
      dispatch(signInFailure(error.message));
      handleError(error.message || 'Something went wrong!');
      
      // Clear any partial data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('realEstateCompany');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative w-full min-h-screen'>
      <Background />
      <div className='relative z-10'>
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full animate-fade-in relative">
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-20 h-20">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm3.53 12.97a.75.75 0 01-1.06 0L12 13.06l-2.47 2.47a.75.75 0 01-1.06-1.06L10.94 12l-2.47-2.47a.75.75 0 011.06-1.06L12 10.94l2.47-2.47a.75.75 0 011.06 1.06L13.06 12l2.47 2.47a.75.75 0 010 1.06z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-4 text-center">Company not found</h2>
              <p className="text-center">{popupMessage}</p>
            </div>
          </div>
        )}
        {showInvalidCredentialsPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full animate-fade-in relative">
              <button
                onClick={() => setShowInvalidCredentialsPopup(false)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-20 h-20">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm3.53 12.97a.75.75 0 01-1.06 0L12 13.06l-2.47 2.47a.75.75 0 01-1.06-1.06L10.94 12l-2.47-2.47a.75.75 0 011.06-1.06L12 10.94l2.47-2.47a.75.75 0 011.06 1.06L13.06 12l2.47 2.47a.75.75 0 010 1.06z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-4 text-center">Invalid credentials</h2>
              <p className="text-center">{invalidCredentialsMessage}</p>
            </div>
          </div>
        )}
        <div className="absolute w-full" style={{ top: '-180px' }}>
          <h1 className="text-[120px] font-bold text-gray-100 uppercase whitespace-nowrap text-center" style={{ letterSpacing: '-0.05em' }}>
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>Real Estate</span>
          </h1>
        </div>
        
        <div className='p-6 max-w-md mx-auto mt-40'>
          <h2 className='text-4xl font-semibold text-slate-600 mb-8 text-center'>
            Sign In
          </h2>
          <StyledForm onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <StyledInput
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            <div className="mb-4 relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <StyledInput
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-[46%] right-0 pr-3 flex items-center text-sm leading-5"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <StyledButton type="submit" disabled={loading} style={{ marginBottom: '1.5rem', backgroundColor: '#009688' }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </StyledButton>
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </StyledForm>
          <div className="flex gap-2 mt-5">
            <p>Don't have an account?</p>
            <Link to="/real-estate-signup" className="text-blue-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
