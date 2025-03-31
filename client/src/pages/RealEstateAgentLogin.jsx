import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Container, Form, Input, Button, ErrorMessage } from '../components/StyledComponents';
import Background from '../components/Background';

const StyledContainer = Container;

const StyledForm = Form;

const StyledInput = Input;

const StyledButton = Button;

export default function RealEstateAgentLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.user);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: ''
  });
  const [companies, setCompanies] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/real-estate/companies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || `HTTP error! status: ${res.status}`);
        }
        
        if (data.success && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        } else {
          console.error('Invalid data format:', data);
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        // Set empty array to avoid undefined errors in the dropdown
        setCompanies([]);
      }
    };

    fetchCompanies();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
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
      <Background />
      <div className='relative z-10'>
        <div className="absolute w-full" style={{ top: '-70px', left: '-70%', transform: 'translateX(-50%)' }}>
          <h1 className="text-[120px] font-bold text-gray-100 uppercase whitespace-nowrap text-center" style={{ letterSpacing: '-0.05em' }}>
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>Real Estate Agent</span>
          </h1>
        </div>
        
        <div className='p-6 w-[165%] mx-auto mt-[40%] flex justify-center items-center ml-[-28%]'>
          <div className='w-full text-center'>
            <h2 className='text-4xl font-semibold text-slate-600 mb-8 ml-[-11%]'>
              Sign In
            </h2>
            <StyledForm onSubmit={handleSubmit} className="w-full">
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1 text-left">Company Name</label>
                <StyledInput
                  as="select"
                  id="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </StyledInput>
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 text-left">Email</label>
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 text-left">Password</label>
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
                  onClick={togglePasswordVisibility}
                  className="absolute top-[46%] right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <StyledButton type="submit" disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Sign In'}
              </StyledButton>
              {error && <ErrorMessage>{error}</ErrorMessage>}
            </StyledForm>
            <div className="flex gap-2 mt-5 justify-center">
              <p>Don't have an account?</p>
              <Link to="/real-estate-agent-signup" className="text-blue-700">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StyledContainer>
  );
}