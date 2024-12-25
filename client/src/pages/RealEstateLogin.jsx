import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { signInStart, signInFailure, realEstateSignInSuccess } from '../redux/user/userSlice';

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

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to sign in');
      }

      // Store token
      localStorage.setItem('realEstateToken', data.token);
      
      // Store company data
      localStorage.setItem('realEstateCompany', JSON.stringify(data.company));

      // Update Redux state
      dispatch(realEstateSignInSuccess(data.company));

      // Navigate to dashboard
      navigate('/real-estate-dashboard');

    } catch (error) {
      console.error('Login error:', error);
      dispatch(signInFailure(error.message));
      setError(error.message || 'Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-3">
      <h1 className="text-3xl text-center font-semibold my-7">
        Real Estate Company Login
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
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
          disabled={loading}
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <p>Don't have an account?</p>
        <Link to="/real-estate-signup" className="text-blue-700">
          Sign up
        </Link>
      </div>
    </div>
  );
}
