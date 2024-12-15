import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RealEstateLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company: "",
    agentEmail: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError(null); // Reset error message when input changes
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev); // Toggle password visibility
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Input validation
    if (!formData.company || !formData.agentEmail || !formData.password) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/real-estate-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to log in. Please try again.");
        setLoading(false);
        return;
      }

      // Handle successful login (e.g., store token, navigate to dashboard)
      console.log("Login successful:", data);
      navigate("/dashboard"); // Update to the appropriate dashboard route
    } catch (err) {
      console.error("Error logging in:", err.message);
      setError("An unexpected error occurred. Please try again later.");
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
          placeholder="Real Estate Company"
          id="company"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.company}
          required
        />

        <input
          type="email"
          placeholder="Agent Email"
          id="agentEmail"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.agentEmail}
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
            onClick={toggleShowPassword}
            className="absolute top-1/2 right-3 transform -translate-y-1/2 text-sm text-blue-600"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          disabled={loading}
        >
          {loading ? "Logging In..." : "Log In"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-3">{error}</p>}

      <div className="flex gap-2 mt-5">
        <p>Don't have an account?</p>
        <button
          onClick={() => navigate("/real-estate-sign-up")}
          className="text-blue-700 underline focus:outline-none"
        >
          Sign Up Your Real Estate Agency Today!
        </button>
      </div>
    </div>
  );
};

export default RealEstateLogin;
