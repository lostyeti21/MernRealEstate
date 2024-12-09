import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Landlords = () => {
  const [landlords, setLandlords] = useState([]);
  const [filteredLandlords, setFilteredLandlords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        const res = await fetch("/api/user/landlords");
        if (!res.ok) throw new Error("Failed to fetch landlords.");
        const data = await res.json();
        setLandlords(data);
        setFilteredLandlords(data); // Initialize filtered landlords
        setLoading(false);
      } catch (err) {
        console.error("Error loading landlords:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchLandlords();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value.trim().toLowerCase();
    setSearchTerm(query);
    setFilteredLandlords(
      landlords.filter((landlord) =>
        landlord.username.toLowerCase().includes(query)
      )
    );
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        className={`text-lg ${
          i + 1 <= Math.round(rating) ? "text-yellow-500" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  if (loading)
    return (
      <div className="text-center">
        <p>Loading landlords...</p>
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center">
        <p className="text-red-500">Error loading landlords. Please try again later.</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 underline">
          Retry
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Landlords</h1>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search landlords by username..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
        />
      </div>

      {/* Landlords List */}
      {filteredLandlords.length === 0 ? (
        <p className="text-center">No landlords found matching your search.</p>
      ) : (
        <ul className="space-y-4">
          {filteredLandlords.map((landlord) => (
            <li
              key={landlord._id}
              className="flex items-center justify-between space-x-4 p-3 border rounded-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={landlord.avatar || "https://via.placeholder.com/150"}
                  alt={`${landlord.username}'s avatar`}
                  className="rounded-full w-12 h-12 object-cover"
                />
                <Link to={`/landlord/${landlord._id}`} className="text-blue-600 hover:underline">
                  <p className="font-semibold">{landlord.username}</p>
                </Link>
              </div>
              <div className="flex items-center space-x-1">
                {renderStars(landlord.averageRating || 0)}
                <p className="text-sm text-gray-500">
                  ({landlord.averageRating ? landlord.averageRating.toFixed(1) : "N/A"})
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Landlords;
