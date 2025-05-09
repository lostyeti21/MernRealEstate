import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const RealEstateSignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agents, setAgents] = useState([]);
  const [agentInput, setAgentInput] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompanyChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleAgentInputChange = (e) => {
    setAgentInput({ ...agentInput, [e.target.id]: e.target.value });
  };

  const addAgent = () => {
    if (!agentInput.name || !agentInput.email || !agentInput.contact || !agentInput.password) {
      setError("All agent fields are required");
      return;
    }
    setAgents([...agents, { ...agentInput }]);
    setAgentInput({ name: "", email: "", contact: "", password: "" });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/real-estate/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
          agents,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        setLoading(false);
        return;
      }

      navigate("/real-estate-login");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">
        Real Estate Company Sign Up
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Company Details */}
        <div className="flex flex-col gap-4 border-b pb-4">
          <h2 className="text-xl font-semibold">Company Details</h2>
          <input
            type="text"
            placeholder="Company Name"
            id="companyName"
            className="border p-3 rounded-lg"
            onChange={handleCompanyChange}
            value={formData.companyName}
            required
          />
          <input
            type="email"
            placeholder="Company Email"
            id="email"
            className="border p-3 rounded-lg"
            onChange={handleCompanyChange}
            value={formData.email}
            required
          />
          <input
            type="password"
            placeholder="Password"
            id="password"
            className="border p-3 rounded-lg"
            onChange={handleCompanyChange}
            value={formData.password}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            id="confirmPassword"
            className="border p-3 rounded-lg"
            onChange={handleCompanyChange}
            value={formData.confirmPassword}
            required
          />
        </div>

        {/* Agent Details */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Add Agents</h2>
          <input
            type="text"
            placeholder="Agent Name"
            id="name"
            className="border p-3 rounded-lg"
            onChange={handleAgentInputChange}
            value={agentInput.name}
          />
          <input
            type="email"
            placeholder="Agent Email"
            id="email"
            className="border p-3 rounded-lg"
            onChange={handleAgentInputChange}
            value={agentInput.email}
          />
          <input
            type="text"
            placeholder="Agent Contact"
            id="contact"
            className="border p-3 rounded-lg"
            onChange={handleAgentInputChange}
            value={agentInput.contact}
          />
          <input
            type="password"
            placeholder="Agent Password"
            id="password"
            className="border p-3 rounded-lg"
            onChange={handleAgentInputChange}
            value={agentInput.password}
          />
          <button
            type="button"
            onClick={addAgent}
            className="bg-green-700 text-white p-3 rounded-lg uppercase hover:opacity-95"
          >
            Add Agent
          </button>
        </div>

        {/* Display Added Agents */}
        {agents.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Added Agents:</h3>
            <ul className="list-disc pl-5">
              {agents.map((agent, index) => (
                <li key={index}>
                  {agent.name} - {agent.email} - {agent.contact}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-5">{error}</p>}

      <div className="flex gap-2 mt-5">
        <p>Already have an account?</p>
        <Link to="/real-estate-login" className="text-blue-700">
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default RealEstateSignUp;
