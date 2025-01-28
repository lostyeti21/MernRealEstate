import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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

  if (loading)
    return (
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p>Loading...</p>
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500">Error loading tenants.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-blue-500 underline mt-4"
        >
          Retry
        </button>
      </div>
    );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full mx-auto px-4 bg-white min-h-screen pt-20"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[100px] mb-8"
        >
          <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
            <span style={{ color: '#009688', opacity: 0.2 }}>REGISTERED</span>
          </h1>
          <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
            Tenants
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
            placeholder="Search tenants by username..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
          />
        </motion.div>

        {filteredTenants.length === 0 ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            No tenants found.
          </motion.p>
        ) : (
          <motion.ul 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delayChildren: 0.3, staggerChildren: 0.1 }}
            className="space-y-4"
          >
            {filteredTenants.map((tenant) => (
              <motion.li
                key={tenant._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
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
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.div>
  );
};

export default Tenants;
