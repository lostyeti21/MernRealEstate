import React, { useEffect, useState } from "react";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/user/tenants");
        const data = await res.json();
        setTenants(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading tenants:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;
  if (error) return <p className="text-center text-red-500">Error loading tenants.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tenants</h1>
      {tenants.length === 0 ? (
        <p className="text-center">No tenants found.</p>
      ) : (
        <ul className="space-y-4">
          {tenants.map((tenant) => (
            <li key={tenant._id} className="flex items-center space-x-4 p-3 border rounded-md">
              <img
                src={tenant.avatar || "https://via.placeholder.com/150"}
                alt={tenant.username}
                className="rounded-full w-12 h-12 object-cover"
              />
              <div>
                <p className="font-semibold">{tenant.username}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tenants;
