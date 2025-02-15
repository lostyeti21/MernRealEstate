import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaSearch, FaSort, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tenantsPerPage] = useState(9);

  // Ref for scrolling
  const tenantsContainerRef = useRef(null);

  // Smooth scroll to top function
  const scrollToTop = () => {
    if (tenantsContainerRef.current) {
      tenantsContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Scroll to top when page changes
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  // Helper function to render stars with optional grayed-out style
  const renderStars = (rating, isGrayedOut = false) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <FaStar
        key={star}
        className={`${
          star <= Math.round(rating || 0)
            ? isGrayedOut 
              ? 'text-gray-300' 
              : 'text-yellow-500'
            : isGrayedOut 
              ? 'text-gray-200' 
              : 'text-gray-300'
        }`}
      />
    ));
  };

  // Predefined categories to always show
  const ratingCategories = ['communication', 'cleanliness', 'reliability'];

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        sort: sortCriteria,
        order: sortOrder
      });

      const res = await fetch(`/api/user/get-tenants?${queryParams}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch tenants');
      }

      const tenantsList = data.tenants || [];

      // Fetch ratings for each tenant
      const tenantsWithRatings = await Promise.all(
        tenantsList.map(async (tenant) => {
          try {
            const ratingRes = await fetch(`/api/tenant-rating/${tenant._id}`);
            const ratingData = await ratingRes.json();
            
            return {
              ...tenant,
              ratings: {
                overall: ratingData.ratings.overall || { averageRating: 0, totalRatings: 0 },
                categories: ratingData.ratings.categories || {}
              }
            };
          } catch (err) {
            console.error(`Error fetching ratings for tenant ${tenant._id}:`, err);
            return {
              ...tenant,
              ratings: {
                overall: { averageRating: 0, totalRatings: 0 },
                categories: {}
              }
            };
          }
        })
      );

      // Sort tenants by rating by default
      const sortedTenants = [...tenantsWithRatings].sort((a, b) => {
        const ratingA = a.ratings?.overall?.averageRating || 0;
        const ratingB = b.ratings?.overall?.averageRating || 0;
        return sortOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });

      setTenants(sortedTenants);
      setFilteredTenants(sortedTenants);
      setLoading(false);
      setCurrentPage(1); // Reset to first page on new fetch

    } catch (err) {
      console.error('Error in fetchTenants:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unknown error occurred while fetching tenants';
      
      setError(errorMessage);
      setLoading(false);
      setTenants([]);
      setFilteredTenants([]);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [sortCriteria, sortOrder]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTenants(tenants);
      setCurrentPage(1);
    } else {
      const filtered = tenants.filter(tenant => 
        tenant.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTenants(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, tenants]);

  const handleSort = (criteria) => {
    if (criteria === sortCriteria) {
      // If clicking the same criteria, toggle the order
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // If clicking a new criteria, set it and default to descending
      setSortCriteria(criteria);
      setSortOrder('desc');
    }
    setShowSortPopup(false);
  };

  // Pagination logic
  const indexOfLastTenant = currentPage * tenantsPerPage;
  const indexOfFirstTenant = indexOfLastTenant - tenantsPerPage;
  const currentTenants = filteredTenants.slice(indexOfFirstTenant, indexOfLastTenant);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Next and Previous page handlers
  const nextPage = () => {
    if (currentPage < Math.ceil(filteredTenants.length / tenantsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredTenants.length / tenantsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;

  return (
    <motion.div
      ref={tenantsContainerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className='max-w-6xl mx-auto px-3 py-8'
    >
      {/* Registered Tenants Section Header */}
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
          Tenants
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 300 }}
          className="absolute top-0 right-0 bg-[#0065ff] text-white text-sm font-semibold px-4 py-2 rounded-full"
        >
          Our Community
        </motion.div>
      </motion.div>

      {/* Search and Filter Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            className="relative w-full sm:w-auto"
          >
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </motion.div>

          {/* Sort Button */}
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
              <span>Sort by: {sortCriteria === 'rating' ? 'Rating' : 'Name'} ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</span>
            </button>

            {/* Sort Popup */}
            {showSortPopup && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-lg shadow-xl z-10 border"
              >
                <button
                  onClick={() => handleSort('rating')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'rating' ? 'bg-gray-100' : ''
                  }`}
                >
                  Rating {sortCriteria === 'rating' && `(${sortOrder === 'desc' ? '↓' : '↑'})`}
                </button>
                <button
                  onClick={() => handleSort('name')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    sortCriteria === 'name' ? 'bg-gray-100' : ''
                  }`}
                >
                  Name {sortCriteria === 'name' && `(${sortOrder === 'desc' ? '↓' : '↑'})`}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Tenants Grid */}
      {currentTenants.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='text-center text-gray-500 py-12'
        >
          No tenants found.
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, staggerChildren: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {currentTenants.map((tenant) => (
            <motion.div
              key={tenant._id}
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
              className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all"
            >
              <Link to={`/tenant/${tenant._id}`} className="block">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <img 
                      src={tenant.avatar} 
                      alt={`${tenant.username}'s avatar`} 
                      className="w-16 h-16 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <h2 className="text-xl font-semibold">{tenant.username}</h2>
                    </div>
                  </div>

                  {/* Overall Rating Display */}
                  <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      {renderStars(
                        tenant.ratings?.overall?.averageRating, 
                        !tenant.ratings?.overall?.averageRating
                      )}
                    </div>
                    <div className="ml-2 text-gray-600">
                      <span className="font-medium">
                        {tenant.ratings?.overall?.averageRating 
                          ? tenant.ratings.overall.averageRating.toFixed(1) 
                          : 'No rating'}
                      </span>
                    </div>
                  </div>

                  {/* Category Ratings */}
                  <div className={`space-y-3 mt-4 border-t pt-4 relative ${
                    !tenant.ratings?.overall?.averageRating ? 'opacity-[0.17] pointer-events-none' : ''
                  }`}>
                    {!tenant.ratings?.overall?.averageRating && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-white bg-opacity-80 p-4 rounded-lg shadow-md">
                          <p className="text-gray-700 font-semibold text-center">
                            No Rating Yet
                          </p>
                        </div>
                      </div>
                    )}

                    {ratingCategories.map((category) => {
                      // Get rating data for this category, or use default if not available
                      const categoryData = tenant.ratings?.categories?.[category] || {
                        averageRating: null,
                        totalRatings: 0
                      };

                      return (
                        <div key={category} className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <span className="capitalize text-gray-700 font-medium">
                              {category}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="flex">
                                {renderStars(
                                  categoryData.averageRating, 
                                  !categoryData.averageRating
                                )}
                              </div>
                              <div className="text-gray-600 min-w-[80px] text-right">
                                <span className="font-medium">
                                  {categoryData.averageRating 
                                    ? categoryData.averageRating.toFixed(1) 
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Rating Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                categoryData.averageRating 
                                  ? 'bg-yellow-500' 
                                  : 'bg-gray-300'
                              }`}
                              style={{ 
                                width: `${categoryData.averageRating 
                                  ? (categoryData.averageRating / 5) * 100 
                                  : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className='flex justify-center items-center mt-8 space-x-2'
        >
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className='px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <FaChevronLeft />
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => paginate(index + 1)}
              className={`px-4 py-2 border rounded-lg ${
                currentPage === index + 1 
                  ? 'bg-[#009688] text-white' 
                  : 'bg-white text-gray-700'
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className='px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <FaChevronRight />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Tenants;
