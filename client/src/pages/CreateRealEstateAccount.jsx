import React, { useState } from "react";

const CreateRealEstateAccount = () => {
  const [step, setStep] = useState("authenticate"); // Steps: "authenticate" -> "addAgents"
  const [agencyFormData, setAgencyFormData] = useState({
    company: "",
    password: "",
  });
  const [formData, setFormData] = useState({
    agents: [],
    agentInput: { email: "" },
  });
  const [companyName, setCompanyName] = useState(""); // Store authenticated company name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handle changes for authentication form
  const handleAgencyFormChange = (e) => {
    const { id, value } = e.target;
    setAgencyFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  // Handle changes for agent input
  const handleAgentInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      agentInput: { ...prevData.agentInput, [id]: value },
    }));
  };

  const addAgent = () => {
    if (formData.agentInput.email.trim()) {
      setFormData((prevData) => ({
        ...prevData,
        agents: [...prevData.agents, { ...prevData.agentInput }],
        agentInput: { email: "" },
      }));
    }
  };

  // Authenticate the real estate company
  const authenticateAgency = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { company, password } = agencyFormData;

    if (!company || !password) {
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
        body: JSON.stringify({ company, password }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to authenticate.");
        setLoading(false);
        return;
      }

      // Authentication successful
      setCompanyName(data.companyName); // Store the authenticated company name
      setStep("addAgents"); // Move to the next step
    } catch (err) {
      console.error("Error during authentication:", err.message);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Submit agents
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/create-real-estate-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName, agents: formData.agents }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to add agents.");
        setLoading(false);
        return;
      }

      setSuccess("Agents added successfully!");
      setFormData({ agents: [], agentInput: { email: "" } });
    } catch (err) {
      console.error("Error adding agents:", err.message);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      {step === "authenticate" ? (
        <>
          <h1 className="text-3xl text-center font-semibold my-7">
            Authenticate Real Estate Agency
          </h1>
          <form onSubmit={authenticateAgency} className="flex flex-col gap-4">
            <input
              type="text"
              id="company"
              placeholder="Real Estate Company Name"
              className="border p-3 rounded-lg"
              onChange={handleAgencyFormChange}
              value={agencyFormData.company}
              required
            />
            <input
              type="password"
              id="password"
              placeholder="Password"
              className="border p-3 rounded-lg"
              onChange={handleAgencyFormChange}
              value={agencyFormData.password}
              required
            />
            <button
              type="submit"
              className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Authenticate"}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
        </>
      ) : (
        <>
          <h1 className="text-3xl text-center font-semibold my-7">
            Add Agents for {companyName}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Agent Email"
              id="email"
              className="border p-3 rounded-lg"
              onChange={handleAgentInputChange}
              value={formData.agentInput.email}
              required
            />
            <button
              type="button"
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              onClick={addAgent}
            >
              Add Agent
            </button>

            {formData.agents.length > 0 && (
              <ul className="list-disc ml-6">
                {formData.agents.map((agent, idx) => (
                  <li key={idx}>{agent.email}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
              disabled={loading}
            >
              {loading ? "Adding..." : "Submit"}
            </button>
          </form>

          {error && <p className="text-red-500 mt-3">{error}</p>}
          {success && <p className="text-green-500 mt-3">{success}</p>}
        </>
      )}
    </div>
  );
};

export default CreateRealEstateAccount;
