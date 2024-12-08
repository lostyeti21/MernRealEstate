import React, { useEffect, useState } from "react";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]); // For search functionality
  const [searchTerm, setSearchTerm] = useState(""); // Search term state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // State to track hovered rating for each tenant
  const [hoveredRatings, setHoveredRatings] = useState({});

  const handleRateTenant = async (tenantId, rating) => {
    try {
      const res = await fetch("/api/user/rate-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ tenantId, rating }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Rating submitted successfully!");
        setTenants((prevTenants) =>
          prevTenants.map((tenant) =>
            tenant._id === tenantId
              ? { ...tenant, averageRating: data.averageRating }
              : tenant
          )
        );
      } else {
        alert(data.message || "Failed to rate tenant.");
      }
    } catch (err) {
      console.error("Error rating tenant:", err);
      alert("An error occurred while rating the tenant.");
    }
  };

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
              className="flex flex-col sm:flex-row items-center justify-between space-x-4 p-3 border rounded-md"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={tenant.avatar || "https://via.placeholder.com/150"}
                  alt={tenant.username}
                  className="rounded-full w-12 h-12 object-cover"
                />
                <div>
                  <p className="font-semibold">{tenant.username}</p>
                  <p className="text-sm text-gray-500">
                    Average Rating:{" "}
                    {tenant.averageRating
                      ? tenant.averageRating.toFixed(1)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Rating Section */}
              <div className="mt-2 sm:mt-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`cursor-pointer ${
                      star <=
                      (hoveredRatings[tenant._id] || tenant.averageRating || 0)
                        ? "text-yellow-500"
                        : "text-gray-300"
                    }`}
                    onClick={() => handleRateTenant(tenant._id, star)}
                    onMouseEnter={() =>
                      setHoveredRatings((prevState) => ({
                        ...prevState,
                        [tenant._id]: star,
                      }))
                    }
                    onMouseLeave={() =>
                      setHoveredRatings((prevState) => ({
                        ...prevState,
                        [tenant._id]: null,
                      }))
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tenants;
