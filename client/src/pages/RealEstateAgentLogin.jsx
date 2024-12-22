import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RealEstateAgentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/real-estate/agent-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('Agent data to store:', {
        ...data.agent,
        companyName: data.companyName
      });

      if (!data.agent._id) {
        throw new Error('Invalid agent data received');
      }

      localStorage.setItem('agentToken', data.token);
      localStorage.setItem('agentInfo', JSON.stringify({
        ...data.agent,
        companyName: data.companyName
      }));

      navigate('/agent-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">
        Real Estate Agent Login
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Real Estate Company Name"
          id="companyName"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.companyName}
          required
        />

        <input
          type="email"
          placeholder="Agent Email"
          id="email"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.email}
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            id="password"
            className="border p-3 rounded-lg w-full"
            onChange={handleChange}
            value={formData.password}
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
          type="submit"
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-5">{error}</p>}

      <div className="flex flex-col gap-4 mt-5">
        <div className="flex gap-2 justify-center">
          <p>Are you a Real Estate Company?</p>
          <Link to="/real-estate-login" className="text-blue-700">
            Sign in here
          </Link>
        </div>
        <div className="flex gap-2 justify-center">
          <p>Are you a Landlord or Tenant?</p>
          <Link to="/sign-in" className="text-blue-700">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RealEstateAgentLogin; 