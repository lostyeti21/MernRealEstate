import React, { useState } from "react";

const AgentChangePassword = () => {
  const [formData, setFormData] = useState({ email: "", newPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/update-agent-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to update password.");
        setLoading(false);
        return;
      }

      setSuccess("Password updated successfully!");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">Change Password</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Agent Email"
          id="email"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.email}
          required
        />

        <input
          type="password"
          placeholder="New Password"
          id="newPassword"
          className="border p-3 rounded-lg"
          onChange={handleChange}
          value={formData.newPassword}
          required
        />

        <button
          type="submit"
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-3">{error}</p>}
      {success && <p className="text-green-500 mt-3">{success}</p>}
    </div>
  );
};

export default AgentChangePassword;
