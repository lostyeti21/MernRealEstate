import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFilter, FaStar } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const Landlords = () => {
  const [landlords, setLandlords] = useState([]);
  const [filteredLandlords, setFilteredLandlords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('overallRating');

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        const response = await fetch(`/api/user/landlords?sort=${sortCriteria}`);
        if (!response.ok) throw new Error("Failed to fetch landlords.");
        const data = await response.json();
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
  }, [sortCriteria]);

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

  const sortOptions = [
    { 
      value: 'overallRating', 
      label: 'Overall Rating', 
      icon: <FaStar className="inline mr-2" /> 
    },
    { 
      value: 'responseTime', 
      label: 'Response Time', 
      icon: <FaStar className="inline mr-2" /> 
    },
    { 
      value: 'maintenance', 
      label: 'Maintenance', 
      icon: <FaStar className="inline mr-2" /> 
    },
    { 
      value: 'experience', 
      label: 'Experience', 
      icon: <FaStar className="inline mr-2" /> 
    }
  ];

  const SortPopup = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-80">
          <h2 className="text-xl font-bold mb-4 text-center">Sort Landlords</h2>
          
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSortCriteria(option.value);
                setShowSortPopup(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center ${
                sortCriteria === option.value ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
          
          <button
            onClick={() => setShowSortPopup(false)}
            className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
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
          className="mb-6 flex justify-between"
        >
          <input
            type="text"
            placeholder="Search landlords by username..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-blue-500"
          />
          <button 
            onClick={() => setShowSortPopup(true)}
            className="text-gray-600 hover:text-blue-600 transition-colors ml-4"
          >
            <FaFilter className="w-6 h-6" />
          </button>
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
      {showSortPopup && <SortPopup />}
    </motion.div>
  );
};

export default Landlords;
