import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFilter, FaStar, FaBuilding, FaSearch, FaSort, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [landlordsPerPage] = useState(6);

  // Ref for scrolling
  const landlordsContainerRef = useRef(null);

  // Smooth scroll to top function
  const scrollToTop = () => {
    if (landlordsContainerRef.current) {
      landlordsContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Scroll to top when page changes
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        setLoading(true);
        setError(null);

        // Remove limit and startIndex to get all landlords
        const queryParams = new URLSearchParams({
          sort: sortCriteria
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

        console.log('Total Landlords Fetched:', normalizedLandlords.length);
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

    return Array.from({ length: 5 }, (_, i) => {
      // Calculate star fill based on rating
      // Full star if index is less than floor of rating
      // Half star if index is less than floor of rating and there's a remainder
      // Empty star otherwise
      const starValue = i + 1;
      const isFilled = starValue <= Math.floor(rating);
      const isHalfFilled = !isFilled && starValue <= Math.ceil(rating) && rating % 1 >= 0.5;

      return (
        <FaStar 
          key={i} 
          className={`inline-block ${
            isFilled 
              ? 'text-yellow-500' 
              : isHalfFilled 
                ? 'text-yellow-500 opacity-50' 
                : 'text-gray-300'
          }`} 
        />
      );
    });
  };

  const formatRating = (rating) => {
    return rating === null ? 'N/A' : rating.toFixed(1);
  };

  // Update filtered landlords when search term changes
  useEffect(() => {
    const filtered = searchTerm
      ? landlords.filter(landlord => 
          landlord.username.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : landlords;
    setFilteredLandlords(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, landlords]);

  // Get current landlords for pagination
  const indexOfLastLandlord = currentPage * landlordsPerPage;
  const indexOfFirstLandlord = indexOfLastLandlord - landlordsPerPage;
  const currentLandlords = filteredLandlords.slice(indexOfFirstLandlord, indexOfLastLandlord);
  const totalPages = Math.max(1, Math.ceil(filteredLandlords.length / landlordsPerPage));

  // Pagination functions
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Debug pagination
  console.log('Pagination Debug:', {
    totalLandlords: filteredLandlords.length,
    landlordsPerPage,
    totalPages,
    currentPage,
    currentLandlordsCount: currentLandlords.length
  });

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
      className="max-w-6xl mx-auto px-3 py-8"
    >
      {/* Registered Landlords Section Header */}
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative h-[100px] mb-8"
      >
        <motion.h1 
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left"
        >
          <span style={{ color: '#d2d1e6', opacity: 0.6 }}>REGISTERED</span>
        </motion.h1>
        <motion.h2 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'
        >
          Landlords
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 300 }}
          className="absolute top-0 right-0 bg-[#0065ff] text-white text-sm font-semibold px-4 py-2 rounded-full"
        >
          Our Property Managers
        </motion.div>
      </motion.div>

      {/* Search and Filter Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="mb-8 flex flex-col sm:flex-row justify-end items-center gap-4"
      >
        {/* Search Input */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
          className="relative w-full sm:w-64"
        >
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search landlords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </motion.div>

        {/* Sort Dropdown */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
          className="relative"
        >
          <button
            onClick={() => setShowSortPopup(!showSortPopup)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <FaSort />
            <span>Sort by: {sortCriteria === 'overallRating' ? 'Rating' : 'Name'}</span>
          </button>

          {showSortPopup && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-lg shadow-xl z-10 border"
            >
              <button
                onClick={() => {
                  setSortCriteria('overallRating');
                  setShowSortPopup(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  sortCriteria === 'overallRating' ? 'bg-gray-100' : ''
                }`}
              >
                Rating
              </button>
              <button
                onClick={() => {
                  setSortCriteria('username');
                  setShowSortPopup(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  sortCriteria === 'username' ? 'bg-gray-100' : ''
                }`}
              >
                Name
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Landlords Grid */}
      <div ref={landlordsContainerRef}>
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader />
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : currentLandlords.length === 0 ? (
          <div className="text-center text-gray-500">No landlords found</div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {currentLandlords.map((landlord, index) => (
              <motion.div
                key={landlord._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.5, 
                  type: "spring", 
                  stiffness: 300,
                  damping: 10 
                }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
                className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center"
              >
                <Link to={`/landlord/${landlord._id}`} className="w-full">
                  <img 
                    src={landlord.avatar} 
                    alt={`${landlord.username}'s avatar`} 
                    className="w-24 h-24 rounded-full object-cover mb-4 mx-auto"
                  />
                  <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">{landlord.username}</h2>
                  
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
                  
                  <button 
                    className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    View Profile
                  </button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredLandlords.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className='flex flex-col items-center mt-8 space-y-4'
        >
          {/* Debug info */}
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstLandlord + 1} to {Math.min(indexOfLastLandlord, filteredLandlords.length)} of {filteredLandlords.length} landlords
          </div>

          {/* Pagination controls */}
          <div className='flex items-center space-x-2'>
            <button 
              onClick={prevPage} 
              disabled={currentPage === 1}
              className='px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
            >
              <FaChevronLeft />
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                  currentPage === index + 1 
                    ? 'bg-[#009688] text-white hover:bg-[#00897b]' 
                    : 'bg-white text-gray-700'
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button 
              onClick={nextPage} 
              disabled={currentPage === totalPages}
              className='px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
            >
              <FaChevronRight />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Landlords;
