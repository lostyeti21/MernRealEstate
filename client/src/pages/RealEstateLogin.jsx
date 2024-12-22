import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const RealEstateLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
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
      // Validate input
      if (!formData.companyName || !formData.email || !formData.password) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      console.log('Submitting form data:', { 
        companyName: formData.companyName, 
        email: formData.email 
      });

      const res = await fetch('/api/real-estate/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Login response:', data);

      if (!data.success) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (!data.token) {
        setError('No token received from server');
        setLoading(false);
        return;
      }

      localStorage.setItem('realEstateToken', data.token);
      localStorage.setItem('companyInfo', JSON.stringify(data.company));
      
      navigate('/real-estate-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">
        Real Estate Company Login
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Company Name"
          id="companyName"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.companyName}
          required
        />

        <input
          type="email"
          placeholder="Company Email"
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

      <div className="flex gap-2 mt-5">
        <p>Don't have an account?</p>
        <Link to="/real-estate-signup" className="text-blue-700">
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default RealEstateLogin;
