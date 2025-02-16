import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { signInStart, signInFailure, realEstateSignInSuccess } from '../redux/user/userSlice';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const StyledContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const StyledInput = styled.input`
  padding: 8px;
  border: 2px solid #e2e8f0;
  border-radius: 5px;
  font-size: 16px;
  transition: all 0.3s ease;

  &:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const StyledButton = styled.button`
  background-color: #3b82f6;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background-color: #2563eb;
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #93c5fd;
    cursor: not-allowed;
  }
`;

const PasswordContainer = styled.div`
  position: relative;
  width: 100%;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.3s ease;

  &:hover {
    color: #3b82f6;
  }
`;

const TitleContainer = styled.div`
  position: relative;
  width: 100%;
  text-align: center;
  padding: 2rem 0;
  overflow: hidden;

  h1 {
    position: relative;
    z-index: 2;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin: 0;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.05);
    }
  }

  &::before {
    content: 'Real Estate';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 6rem;
    font-weight: 800;
    color: rgba(59, 130, 246, 0.07);
    white-space: nowrap;
    z-index: 1;
    letter-spacing: 0.5rem;
    text-transform: uppercase;
    transition: all 0.5s ease;
  }

  &:hover::before {
    transform: translate(-50%, -50%) scale(1.1);
    color: rgba(59, 130, 246, 0.1);
  }
`;

const ErrorText = styled.p`
  color: #ef4444;
  text-align: center;
  margin: 10px 0;
  font-size: 14px;
  animation: shake 0.5s ease-in-out;

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;

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
      setError(error.message || 'Something went wrong!');
      
      // Clear any partial data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('realEstateCompany');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledContainer>
      <TitleContainer>
        <h1>Real Estate Company Login</h1>
      </TitleContainer>
      <StyledForm onSubmit={handleSubmit}>
        <StyledInput
          type="email"
          placeholder="Email"
          id="email"
          onChange={handleChange}
          value={formData.email}
          required
        />
        <PasswordContainer>
          <StyledInput
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            id="password"
            onChange={handleChange}
            value={formData.password}
            required
          />
          <PasswordToggle
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </PasswordToggle>
        </PasswordContainer>
        <StyledButton disabled={loading}>
          {loading ? 'Loading...' : 'Sign In'}
        </StyledButton>
        {error && <ErrorText>{error}</ErrorText>}
      </StyledForm>
      <div className="flex gap-2 mt-5">
        <p>Don't have an account?</p>
        <Link to="/real-estate-signup" className="text-blue-700">
          Sign up
        </Link>
      </div>
    </StyledContainer>
  );
}
