import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import Loader from '../components/Loader';
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
  width: 100%;
  transition: all 0.3s ease;
  background-color: white;

  &:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const StyledSelect = styled.select`
  padding: 8px;
  border: 2px solid #e2e8f0;
  border-radius: 5px;
  font-size: 16px;
  transition: all 0.3s ease;
  background-color: white;

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
    content: 'Agent';
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

const LinkContainer = styled.div`
  display: flex;
  gap: 2px;
  justify-content: center;
  margin-top: 20px;
  
  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;

    &:hover {
      color: #2563eb;
    }
  }
`;

export default function RealEstateAgentLogin() {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: ''
  });
  const [companies, setCompanies] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const { loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        console.log('Attempting to fetch companies...');
        const res = await fetch('/api/real-estate/companies');
        console.log('Response status:', res.status);
        
        const data = await res.json();
        console.log('Received data:', data);

        if (data.success) {
          console.log('Companies fetched:', data.companies);
          setCompanies(data.companies);
        } else {
          console.error('Failed to fetch companies:', data.message);
          // Fallback to hardcoded companies if fetch fails
          setCompanies([
            { _id: '1', companyName: 'Century 21' },
            { _id: '2', companyName: 'Pam Golding Harare' },
            { _id: '3', companyName: 'Remax' },
            { _id: '4', companyName: 'Kennan Properties' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        // Fallback to hardcoded companies if fetch fails
        setCompanies([
          { _id: '1', companyName: 'Century 21' },
          { _id: '2', companyName: 'Keller Williams' },
          { _id: '3', companyName: 'Remax' },
          { _id: '4', companyName: 'Coldwell Banker' }
        ]);
      }
    };

    fetchCompanies();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(signInStart());
      
      console.log('Attempting agent login:', { 
        email: formData.email,
        companyName: formData.companyName
      });
      
      const res = await fetch('/api/agent/agent-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          email: formData.email.trim(),
          password: formData.password
        }),
        credentials: 'include'
      });

      // First check if response is ok
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to sign in');
      }

      const data = await res.json();
      console.log('Login response:', data);

      if (!data.success) {
        dispatch(signInFailure(data.message || 'Login failed'));
        return;
      }

      // Store token and agent info with proper flags
      const agentData = {
        ...data.agent,
        isAgent: true,
        token: data.token,
        companyId: data.agent.companyId,
        companyName: data.agent.companyName
      };

      // Store complete agent data
      localStorage.setItem('mern_token', data.token);
      localStorage.setItem('agentInfo', JSON.stringify(agentData));

      // Log the data being stored
      console.log('Storing agent data:', {
        id: agentData._id,
        isAgent: agentData.isAgent,
        companyId: agentData.companyId,
        companyName: agentData.companyName,
        tokenPreview: data.token ? `${data.token.substring(0, 15)}...` : 'No token'
      });

      // Dispatch signin success with complete agent details
      dispatch(signInSuccess(agentData));
      
      navigate('/agent-dashboard');
    } catch (error) {
      console.error('Sign-in error:', error);
      dispatch(signInFailure(error.message || 'An error occurred during sign in'));
    }
  };

  return (
    <StyledContainer>
      <TitleContainer>
        <h1>Agent Sign In</h1>
      </TitleContainer>
      <StyledForm onSubmit={handleSubmit}>
        <StyledSelect
          id="companyName"
          value={formData.companyName}
          onChange={handleChange}
          required
        >
          <option value="">Select Company</option>
          {companies.map((company) => (
            <option key={company._id} value={company.companyName}>
              {company.companyName}
            </option>
          ))}
        </StyledSelect>

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

      <LinkContainer>
        <p>Don't have an account?</p>
        <Link to="/real-estate-agent-signup">
          Sign up
        </Link>
      </LinkContainer>
    </StyledContainer>
  );
}