import React, { useEffect, useState } from "react";

const Landlords = () => {
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        const res = await fetch("/api/user/landlords");
        const data = await res.json();
        setLandlords(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading landlords:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchLandlords();
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;
  if (error) return <p className="text-center text-red-500">Error loading landlords.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Landlords</h1>
      {landlords.length === 0 ? (
        <p className="text-center">No landlords found.</p>
      ) : (
        <ul className="space-y-4">
          {landlords.map((landlord) => (
            <li key={landlord._id} className="flex items-center space-x-4 p-3 border rounded-md">
              <img
                src={landlord.avatar || "https://via.placeholder.com/150"}
                alt={landlord.username}
                className="rounded-full w-12 h-12 object-cover"
              />
              <div>
                <p className="font-semibold">{landlord.username}</p>
                <p className="text-sm text-gray-500">
                  Average Rating: {landlord.averageRating ? landlord.averageRating.toFixed(1) : "N/A"}
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
