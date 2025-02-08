import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFilter, FaStar, FaBuilding, FaSearch, FaSort } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Loader from '../components/Loader'; // Import Loader component

const Landlords = () => {
  const [landlords, setLandlords] = useState([]);
  const [filteredLandlords, setFilteredLandlords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('overallRating');

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          sort: sortCriteria,
          limit: '9',
          startIndex: '0'
        });

        const res = await fetch(`/api/user/get-landlords?${queryParams}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch landlords');
        }

        // Ensure we're handling the new response structure
        const landlordsList = data.landlords || [];

        const normalizedLandlords = landlordsList.map(landlord => {
          const processedLandlord = {
            _id: landlord._id,
            username: landlord.username,
            email: landlord.email,
            avatar: landlord.avatar || 'https://via.placeholder.com/150',
            listingCount: landlord.listingCount || 0,
            ratings: {
              overall: { 
                averageRating: landlord.averageRating || null, 
                totalRatings: landlord.totalRatings || 0 
              },
              categories: [
                { 
                  category: 'responseTime', 
                  averageRating: landlord.categoryRatings?.responseTime || null, 
                  totalRatings: 0 
                },
                { 
                  category: 'maintenance', 
                  averageRating: landlord.categoryRatings?.maintenance || null, 
                  totalRatings: 0 
                },
                { 
                  category: 'experience', 
                  averageRating: landlord.categoryRatings?.experience || null, 
                  totalRatings: 0 
                }
              ]
            }
          };

          console.log(`Processed landlord: ${landlord.username}`, JSON.stringify(processedLandlord, null, 2));

          return processedLandlord;
        });

        console.log('Normalized Landlords:', JSON.stringify(normalizedLandlords, null, 2));

        setLandlords(normalizedLandlords);
        setFilteredLandlords(normalizedLandlords);
        setLoading(false);

      } catch (err) {
        console.error('Detailed error in fetchLandlords:', err);
        
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'An unknown error occurred while fetching landlords';
        
        toast.error(errorMessage);
        setError(errorMessage);
        setLoading(false);
        setLandlords([]);
        setFilteredLandlords([]);
      }
    };

    fetchLandlords();
  }, [sortCriteria]);

  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    
    const filtered = landlords.filter(landlord => 
      landlord.username.toLowerCase().includes(term)
    );
    
    setFilteredLandlords(filtered);
  };

  const handleSortPopup = () => {
    setShowSortPopup(!showSortPopup);
  };

  const handleSortCriteria = (criteria) => {
    setSortCriteria(criteria);
    setShowSortPopup(false);
  };

  const renderStars = (rating) => {
    // If rating is null, return 5 gray stars
    if (rating === null) {
      return Array.from({ length: 5 }, (_, i) => (
        <FaStar 
          key={i} 
          className="inline-block text-gray-300"
        />
      ));
    }

    return Array.from({ length: 5 }, (_, i) => (
      <FaStar 
        key={i} 
        className={`inline-block ${
          i < Math.round(rating) ? 'text-yellow-500' : 'text-gray-300'
        }`} 
      />
    ));
  };

  const formatRating = (rating) => {
    return rating === null ? 'N/A' : rating.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500">Error: {error}</p>
        <button 
          onClick={() => {
            setSortCriteria('overallRating');
            setError(null);
          }} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className='max-w-6xl mx-auto px-3 py-8'
    >
      {/* Registered Landlords Section Header */}
      <div className="relative h-[100px] mb-8">
        <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
          <span style={{ color: '#d2d1e6', opacity: 0.6 }}>REGISTERED</span>
        </h1>
        <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
          Landlords
        </h2>
        <div 
          className="absolute top-0 right-0 bg-[#0065ff] text-white text-sm font-semibold px-4 py-2 rounded-full"
        >
          Our Community
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Search Bar */}
          <div className="relative w-full sm:w-auto">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search landlords..."
              value={searchTerm}
              onChange={(e) => handleSearch(e)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort Button */}
          <div className="relative">
            <button
              onClick={handleSortPopup}
              className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <FaSort />
              <span>Sort</span>
            </button>

            {/* Sort Popup */}
            {showSortPopup && (
              <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-lg shadow-xl z-10 border">
                <button
                  onClick={() => handleSortCriteria('overallRating')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'overallRating' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  Overall Rating
                </button>
                <button
                  onClick={() => handleSortCriteria('responseTime')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'responseTime' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  Response Time
                </button>
                <button
                  onClick={() => handleSortCriteria('maintenance')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'maintenance' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  Maintenance
                </button>
                <button
                  onClick={() => handleSortCriteria('experience')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'experience' ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  Experience
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Landlords Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLandlords.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No landlords found.
          </div>
        ) : (
          filteredLandlords.map((landlord) => (
            <motion.div 
              key={landlord._id}
              whileHover={{ scale: 1.05 }}
              className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center"
            >
              <img 
                src={landlord.avatar} 
                alt={`${landlord.username}'s avatar`} 
                className="w-24 h-24 rounded-full object-cover mb-4"
              />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{landlord.username}</h2>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <FaBuilding className="mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {landlord.listingCount} {landlord.listingCount === 1 ? 'Listing' : 'Listings'}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  {renderStars(landlord.ratings.overall.averageRating)}
                  <span className="ml-2 text-gray-600">
                    {formatRating(landlord.ratings.overall.averageRating)} 
                  </span>
                </div>
              </div>
              
              {/* Detailed Ratings Breakdown */}
              <div className="w-full mt-2">
                {landlord.ratings.categories.map((category) => (
                  <div key={category.category} className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 capitalize">
                      {category.category.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center">
                      {renderStars(category.averageRating)}
                      <span className="ml-2 text-xs text-gray-500">
                        ({formatRating(category.averageRating)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link 
                to={`/landlord/${landlord._id}`} 
                state={{ landlordRating: landlord.ratings.overall }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                View Profile
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Landlords;
