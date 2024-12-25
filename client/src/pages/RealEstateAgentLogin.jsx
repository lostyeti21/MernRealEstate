import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [showPassword, setShowPassword] = useState(false);
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
      setError(null);
      setLoading(true);

      const res = await fetch('/api/real-estate/agent-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to sign in');
      }

      if (!data.success) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store agent info and token
      localStorage.setItem('agentInfo', JSON.stringify(data.agent));
      localStorage.setItem('agentToken', data.token);

      // Update Redux state
      dispatch(signInSuccess({
        ...data.agent,
        isAgent: true
      }));

      navigate('/agent-dashboard');

    } catch (error) {
      console.error('Sign-in error:', error);
      setError(error.message || 'Something went wrong during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-3">
      <h1 className="text-3xl text-center font-semibold my-7">
        Agent Sign In
      </h1>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Company Name"
          id="companyName"
          className="border p-3 rounded-lg"
          value={formData.companyName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          placeholder="Email"
          id="email"
          className="border p-3 rounded-lg"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            id="password"
            className="border p-3 rounded-lg w-full"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          disabled={loading}
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <p>Not registered as an agent?</p>
        <Link to="/real-estate-login" className="text-blue-700">
          Contact your company
        </Link>
      </div>
    </div>
  );
} 