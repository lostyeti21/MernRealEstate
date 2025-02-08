import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import React, { useState } from 'react'; 
import { useNavigate, Link } from "react-router-dom";
import OAuth from '../components/OAuth';
import styled from 'styled-components';

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
  const [formData, setFormData] = useState({});
  const [showPopup, setShowPopup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      dispatch(signInStart());
      
      console.group('Sign In Process');
      console.log('Submitting form data:', formData);
      
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      console.log('Server Response:', {
        status: res.status,
        data: data
      });
      
      if (data.success === false) {
        console.error('Sign In Failed:', data.message);
        setError(data.message);
        dispatch(signInFailure(data.message));
        console.groupEnd();
        return;
      }

      // Log token extraction
      const token = 
        data.token || 
        data.accessToken || 
        data.access_token;
      
      console.log('Extracted Token:', token);
      
      dispatch(signInSuccess(data));
      navigate('/');
      console.groupEnd();
    } catch (error) {
      console.error('Sign In Error:', error);
      setError(error.message);
      dispatch(signInFailure(error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      {showPopup ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <StyledPopup className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6">Sign in as:</h2>
            <div className="cards">
              <div className="card user" onClick={() => setShowPopup(false)}>
                <p className="title">Regular User</p>
                <p className="description">Find or list your property</p>
              </div>
              <div className="card agent" onClick={() => navigate('/real-estate-agent-login')}>
                <p className="title">Real Estate Agent</p>
                <p className="description">Manage your listings</p>
              </div>
              <div className="card company" onClick={() => navigate('/real-estate-login')}>
                <p className="title">Real Estate Company</p>
                <p className="description">Manage your agency</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setShowPopup(false);
                navigate('/');
              }}
              className="mt-6 text-gray-600 hover:text-gray-800 block mx-auto"
            >
              Close
            </button>
          </StyledPopup>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl text-center font-semibold my-7">Sign In</h1>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <input
              type='email'
              placeholder='Email'
              className='border p-3 rounded-lg'
              id="email"
              onChange={handleChange}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder='Password'
                className='border p-3 rounded-lg w-full'
                id="password"
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              disabled={loading}
              className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <OAuth />
          </form>

          <div className='flex gap-2 mt-5'>
            <p>Don't have an account?</p>
            <button
              onClick={() => navigate("/sign-up")}
              className='text-blue-700 underline focus:outline-none'
            >
              Sign Up
            </button>
          </div>

          <div className='mt-5'>
            <p className='text-center'>Forgot your password?</p>
            <input
              type='email'
              placeholder='Enter your email address'
              className='border p-3 rounded-lg w-full mt-2'
              value={""}
              onChange={(e) => {}}
            />
            <button
              onClick={() => {}}
              className='bg-blue-500 text-white p-3 rounded-lg w-full mt-3 hover:opacity-95'
            >
              Reset Account Password
            </button>
          </div>
        </div>
      )}
      {error && <p className='text-red-500 mt-5'>{error}</p>}
    </div>
  );
}