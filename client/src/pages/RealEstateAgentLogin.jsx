import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';

export default function RealEstateAgentLogin() {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/real-estate/agent-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('Sign-in response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to sign in');
      }

      // Store token and agent info in localStorage
      localStorage.setItem('realEstateToken', data.token);
      localStorage.setItem('agentInfo', JSON.stringify(data.agent));

      // Update Redux store
      dispatch(signInSuccess({
        ...data.agent,
        isAgent: true
      }));

      // Navigate to agent dashboard
      console.log('Navigating to agent dashboard...');
      navigate('/agent-dashboard');
      
    } catch (error) {
      console.error('Sign-in error:', error);
      setError(error.message || 'Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">Agent Sign In</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Company Name"
          className="border p-3 rounded-lg"
          id="companyName"
          onChange={handleChange}
          value={formData.companyName}
        />
        <input
          type="email"
          placeholder="Email"
          className="border p-3 rounded-lg"
          id="email"
          onChange={handleChange}
          value={formData.email}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-3 rounded-lg"
          id="password"
          onChange={handleChange}
          value={formData.password}
        />

        <button
          disabled={loading}
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
        >
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      </form>

      {error && (
        <div className="mt-5 text-red-500 text-center">
          {error}
        </div>
      )}
    </div>
  );
} 