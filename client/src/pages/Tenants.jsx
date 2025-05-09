import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]); // For search functionality
  const [searchTerm, setSearchTerm] = useState(""); // Search term state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/user/tenants");
        const data = await res.json();
        setTenants(data);
        setFilteredTenants(data); // Initialize filtered tenants
        setLoading(false);
      } catch (err) {
        console.error("Error loading tenants:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchTerm(query);
    setFilteredTenants(
      tenants.filter((tenant) =>
        tenant.username.toLowerCase().includes(query)
      )
    );
  };

  const renderAverageRating = (avgRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-xl ${
            i <= Math.round(avgRating) ? "text-yellow-500" : "text-gray-300"
          }`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) return <p className="text-center">Loading...</p>;
  if (error)
    return (
      <p className="text-center text-red-500">Error loading tenants.</p>
    );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tenants</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tenants by username..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
        />
      </div>

      {/* Tenant List */}
      {filteredTenants.length === 0 ? (
        <p className="text-center">No tenants found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredTenants.map((tenant) => (
            <li
              key={tenant._id}
              className="flex items-center justify-between p-3 border rounded-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={tenant.avatar || "https://via.placeholder.com/150"}
                  alt={tenant.username}
                  className="rounded-full w-12 h-12 object-cover"
                />
                <Link
                  to={`/tenant/${tenant._id}`}
                  className="font-semibold text-blue-500 hover:underline"
                >
                  {tenant.username}
                </Link>
              </div>

              {/* Average Rating */}
              <div className="flex items-center space-x-1">
                {renderAverageRating(tenant.averageRating || 0)}
                <p className="text-sm text-gray-500">
                  ({tenant.averageRating ? tenant.averageRating.toFixed(1) : "N/A"})
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tenants;
