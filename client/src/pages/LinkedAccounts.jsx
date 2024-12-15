import React, { useState, useEffect } from "react";

const LinkedAccounts = () => {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ email: "", name: "" });
  const [newCompany, setNewCompany] = useState({ companyName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch linked accounts
  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      try {
        const res = await fetch("/api/real-estate/linked-accounts");
        if (!res.ok) throw new Error("Failed to fetch linked accounts.");
        const data = await res.json();
        setLinkedAccounts(data.accounts || []);
      } catch (err) {
        console.error("Error fetching linked accounts:", err.message);
        setError("Could not fetch linked accounts. Please try again.");
      }
    };

    fetchLinkedAccounts();
  }, []);

  // Handle input changes for adding accounts
  const handleAccountChange = (e) => {
    const { id, value } = e.target;
    setNewAccount({ ...newAccount, [id]: value });
  };

  // Handle input changes for creating a company
  const handleCompanyChange = (e) => {
    const { id, value } = e.target;
    setNewCompany({ ...newCompany, [id]: value });
  };

  // Add a linked account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!newAccount.email || !newAccount.name) {
      setError("Please fill out all fields for the new account.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/real-estate/add-linked-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      if (!res.ok) throw new Error("Failed to add the account.");
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to add account.");
        setLoading(false);
        return;
      }

      setSuccess("Account added successfully!");
      setLinkedAccounts([...linkedAccounts, data.account]);
      setNewAccount({ email: "", name: "" });
    } catch (err) {
      setError("An error occurred while adding the account. Please try again.");
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new company
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!newCompany.companyName || !newCompany.email || !newCompany.password) {
      setError("Please fill out all fields for the new company.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/real-estate/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      if (!res.ok) throw new Error("Failed to create the company.");
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to create company.");
        setLoading(false);
        return;
      }

      setSuccess("Company created successfully!");
      setNewCompany({ companyName: "", email: "", password: "" });
    } catch (err) {
      setError("An error occurred while creating the company. Please try again.");
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-5">Manage Linked Accounts</h1>

      {/* Error/Success Messages */}
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      {/* Add New Account Section */}
      <h2 className="text-xl font-semibold mt-5">Add New Linked Account</h2>
      <form onSubmit={handleAddAccount} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          id="email"
          value={newAccount.email}
          onChange={handleAccountChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Name"
          id="name"
          value={newAccount.name}
          onChange={handleAccountChange}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Account"}
        </button>
      </form>

      {/* Create New Company Section */}
      <h2 className="text-xl font-semibold mt-5">Create New Real Estate Company</h2>
      <form onSubmit={handleCreateCompany} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Company Name"
          id="companyName"
          value={newCompany.companyName}
          onChange={handleCompanyChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          id="email"
          value={newCompany.email}
          onChange={handleCompanyChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          id="password"
          value={newCompany.password}
          onChange={handleCompanyChange}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Company"}
        </button>
      </form>

      {/* Linked Accounts Table */}
      <h2 className="text-xl font-semibold mt-5">Linked Accounts</h2>
      <table className="w-full border-collapse border border-gray-300 mt-3">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">Name</th>
            <th className="border border-gray-300 px-4 py-2">Email</th>
          </tr>
        </thead>
        <tbody>
          {linkedAccounts.length > 0 ? (
            linkedAccounts.map((account, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">{account.name}</td>
                <td className="border border-gray-300 px-4 py-2">{account.email}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="border border-gray-300 px-4 py-2 text-center">
                No linked accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LinkedAccounts;
