import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p>Loading landlords...</p>
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500">Error loading landlords. Please try again later.</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 underline mt-4">
          Retry
        </button>
      </div>
    );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full mx-auto px-4 bg-white min-h-screen relative pt-20"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[100px] mb-8"
        >
          <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>REGISTERED</span>
          </h1>
          <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
            Landlords
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <input
            type="text"
            placeholder="Search landlords by username..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
          />
        </motion.div>

        {filteredLandlords.length === 0 ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            No landlords found matching your search.
          </motion.p>
        ) : (
          <motion.ul 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delayChildren: 0.3, staggerChildren: 0.1 }}
            className="space-y-4"
          >
            {filteredLandlords.map((landlord) => (
              <motion.li
                key={landlord._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
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
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.div>
  );
};

export default Landlords;
