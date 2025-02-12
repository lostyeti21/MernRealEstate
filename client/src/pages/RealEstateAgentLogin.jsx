import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import Loader from '../components/Loader';

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

  // Fetch companies on component mount
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
            { _id: '2', companyName: 'Keller Williams' },
            { _id: '3', companyName: 'Remax' },
            { _id: '4', companyName: 'Coldwell Banker' }
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

      // Store token and agent info
      localStorage.setItem('agentToken', data.token);
      localStorage.setItem('agentInfo', JSON.stringify(data.agent));

      // Dispatch signin success with agent details
      dispatch(signInSuccess({
        ...data.agent,
        isAgent: true,
        token: data.token
      }));
      
      navigate('/agent-dashboard');
    } catch (error) {
      console.error('Sign-in error:', error);
      dispatch(signInFailure(error.message || 'An error occurred during sign in'));
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl text-center font-semibold my-7'>Agent Sign In</h1>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <select
          id='companyName'
          className='border p-3 rounded-lg'
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
        </select>
        <input
          type='email'
          placeholder='Email'
          className='border p-3 rounded-lg'
          id='email'
          value={formData.email}
          onChange={handleChange}
          required
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder='Password'
            id='password'
            className='border p-3 rounded-lg w-full'
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button
            type='button'
            onClick={togglePasswordVisibility}
            className='absolute right-3 top-3 text-gray-500'
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          disabled={loading}
          className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
        >
          {loading ? <Loader /> : 'Sign In'}
        </button>
      </form>
      {error && <p className='text-red-500 mt-5'>{error}</p>}
      <div className='flex gap-2 mt-5'>
        <p>Not registered with a company?</p>
        <Link to='/real-estate-agent-register'>
          <span className='text-blue-700'>Register here</span>
        </Link>
      </div>
    </div>
  );
}