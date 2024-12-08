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
        if (!res.ok) {
          throw new Error("Failed to fetch landlords.");
        }
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
    const searchQuery = e.target.value.toLowerCase();
    setSearchTerm(searchQuery);
    setFilteredLandlords(
      landlords.filter((landlord) =>
        landlord.username.toLowerCase().includes(searchQuery)
      )
    );
  };

  if (loading) return <p className="text-center">Loading...</p>;
  if (error)
    return (
      <p className="text-center text-red-500">Error loading landlords.</p>
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
        <p className="text-center">No landlords found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredLandlords.map((landlord) => (
            <li
              key={landlord._id}
              className="flex items-center space-x-4 p-3 border rounded-md hover:shadow-lg transition-shadow"
            >
              <img
                src={landlord.avatar || "https://via.placeholder.com/150"}
                alt={landlord.username}
                className="rounded-full w-12 h-12 object-cover"
              />
              <div>
                <Link to={`/landlord/${landlord._id}`}>
                  <p className="font-semibold text-blue-600 hover:underline">
                    {landlord.username}
                  </p>
                </Link>
                <p className="text-sm text-gray-500">
                  Average Rating:{" "}
                  {landlord.averageRating
                    ? landlord.averageRating.toFixed(1)
                    : "N/A"}
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
