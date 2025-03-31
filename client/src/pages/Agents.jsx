import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaStarHalfAlt, FaSearch, FaSort, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [agentsPerPage] = useState(9);

  // Ref for scrolling
  const agentsContainerRef = useRef(null);

  // Smooth scroll to top function
  const scrollToTop = () => {
    if (agentsContainerRef.current) {
      agentsContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Scroll to top when page changes
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  // Predefined categories to always show
  const ratingCategories = ['knowledge', 'professionalism', 'responsiveness', 'helpfulness'];

  // Helper function to render stars with optional grayed-out style
  const renderStars = (rating, isGrayedOut = false) => {
    return [1, 2, 3, 4, 5].map((star) => {
      const isHalfStar = star - 0.5 <= rating && rating < star;
      const isFullStar = star <= rating;

      return isFullStar ? (
        <FaStar
          key={star}
          className={`w-4 h-4 ${
            isGrayedOut 
              ? 'text-gray-300' 
              : 'text-yellow-400'
          }`}
        />
      ) : isHalfStar ? (
        <FaStarHalfAlt
          key={star}
          className={`w-4 h-4 ${
            isGrayedOut 
              ? 'text-gray-300' 
              : 'text-yellow-400'
          }`}
        />
      ) : (
        <FaStar
          key={star}
          className={`w-4 h-4 ${
            isGrayedOut 
              ? 'text-gray-200' 
              : 'text-gray-300'
          }`}
        />
      );
    });
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch all agents
      const res = await fetch('/api/real-estate/company/agents');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch agents');
      }

      console.log('Initial agents data:', JSON.stringify(data.agents, null, 2));

      // Fetch detailed agent data and company info for each agent
      const agentsWithCompanyData = await Promise.all(
        data.agents.map(async (agent) => {
          try {
            // First get detailed agent data
            console.log(`Fetching details for agent: ${agent._id}`);
            const agentRes = await fetch(`/api/agent/${agent._id}`);
            if (!agentRes.ok) {
              throw new Error('Failed to fetch agent details');
            }
            const agentData = await agentRes.json();
            const agentInfo = agentData.agent || agentData;
            
            console.log(`Agent ${agent.name} details:`, JSON.stringify(agentInfo, null, 2));

            // Prepare agent data with ratings
            const preparedAgent = {
              ...agentInfo,
              ratings: {
                overall: { 
                  averageRating: agent.averageRating || 0, 
                  totalRatings: agent.ratedBy?.length || 0 
                },
                categories: agent.categoryRatings || {
                  knowledge: { averageRating: 0, totalRatings: agent.knowledgeRatings?.length || 0 },
                  professionalism: { averageRating: 0, totalRatings: agent.professionalismRatings?.length || 0 },
                  responsiveness: { averageRating: 0, totalRatings: agent.responsivenessRatings?.length || 0 },
                  helpfulness: { averageRating: 0, totalRatings: agent.helpfulnessRatings?.length || 0 }
                }
              }
            };

            // Then fetch company data if we have companyId
            if (agentInfo.companyId) {
              console.log(`Fetching company data for companyId: ${agentInfo.companyId}`);
              const companyRes = await fetch(`/api/real-estate/company/${agentInfo.companyId}`, {
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              console.log('Company response status:', companyRes.status);
              
              if (!companyRes.ok) {
                console.error('Failed to fetch company data:', companyRes.status);
                throw new Error('Failed to fetch company data');
              }
              
              const companyData = await companyRes.json();
              console.log('Raw company data:', JSON.stringify(companyData, null, 2));
              
              if (companyData.success) {
                const finalAgent = {
                  ...preparedAgent,
                  company: {
                    ...companyData.company,
                    companyRating: companyData.company.companyRating || companyData.company.rating || 0
                  }
                };
                console.log('Final agent with company:', JSON.stringify(finalAgent, null, 2));
                return finalAgent;
              }
            } else {
              console.warn(`No companyId found for agent: ${agent.name}`);
            }

            return preparedAgent;
          } catch (err) {
            console.error(`Error processing agent ${agent.name}:`, err);
            return agent; // Return original agent data if there's an error
          }
        })
      );

      console.log('Final agents with company data:', JSON.stringify(agentsWithCompanyData, null, 2));
      setAgents(agentsWithCompanyData);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAgents(agents);
      setCurrentPage(1);
    } else {
      const filtered = agents.filter(agent => 
        agent.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAgents(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, agents]);

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
  const indexOfLastAgent = currentPage * agentsPerPage;
  const indexOfFirstAgent = indexOfLastAgent - agentsPerPage;
  const currentAgents = filteredAgents.slice(indexOfFirstAgent, indexOfLastAgent);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Next and Previous page handlers
  const nextPage = () => {
    if (currentPage < Math.ceil(filteredAgents.length / agentsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredAgents.length / agentsPerPage);

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
      ref={agentsContainerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className='max-w-6xl mx-auto px-3 py-8'
    >
      {/* Registered Agents Section Header */}
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
          Real Estate Agents
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 300 }}
          className="absolute top-0 right-0 bg-[#0065ff] text-white text-sm font-semibold px-4 py-2 rounded-full"
        >
          Our Professionals
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className='mb-8 flex justify-end items-center'
      >
        <div className='flex items-center space-x-4'>
          {/* Search Input */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            className='relative flex-grow max-w-md'
          >
            <input
              type='text'
              placeholder='Search agents...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009688]'
            />
            <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
          </motion.div>

          {/* Sort Dropdown */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className='relative'
          >
            <button 
              onClick={() => setShowSortPopup(!showSortPopup)}
              className='flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 focus:outline-none'
            >
              <FaSort className='mr-2' />
              Sort
            </button>

            {showSortPopup && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className='absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10'
              >
                <div 
                  onClick={() => handleSort('rating')} 
                  className='px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center'
                >
                  Rating 
                  {sortCriteria === 'rating' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {filteredAgents.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='text-center text-gray-500 py-12'
        >
          No agents found.
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, staggerChildren: 0.1 }}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        >
          {currentAgents.map((agent) => (
            <motion.div
              key={agent._id}
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
              className='bg-white rounded-lg shadow-md overflow-hidden'
            >
              <Link to={`/agent/${agent._id}/listings`}>
                {/* Company Banner Section */}
                <div className="relative h-32 w-full bg-gray-100">
                  {(() => {
                    console.log('Agent company data:', agent.company);
                    console.log('Agent banner:', agent.company?.banner);
                    console.log('Agent avatar:', agent.company?.avatar);
                    
                    if (agent.company?.banner) {
                      return (
                        <div className="w-full h-full">
                          <img
                            src={agent.company.banner}
                            alt={agent.companyName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    } else if (agent.company?.avatar) {
                      return (
                        <div className="w-full h-full">
                          <img
                            src={agent.company.avatar}
                            alt={agent.companyName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-gray-50 to-gray-100">
                          <div className="text-gray-400 text-xl font-semibold">
                            {agent.companyName || 'Company'}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Company Rating Section */}
                <div className="px-6 py-3 border-b flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      console.log('Company name:', agent.company?.name);
                      console.log('Fallback company name:', agent.companyName);
                      return agent.company?.name || agent.companyName;
                    })()}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const rating = agent.company?.companyRating || 0;
                      const isHalfStar = star - 0.5 <= rating && rating < star;
                      const isFullStar = star <= rating;

                      return isFullStar ? (
                        <FaStar
                          key={star}
                          className="w-4 h-4 text-yellow-400"
                        />
                      ) : isHalfStar ? (
                        <FaStarHalfAlt
                          key={star}
                          className="w-4 h-4 text-yellow-400"
                        />
                      ) : (
                        <FaStar
                          key={star}
                          className="w-4 h-4 text-gray-300"
                        />
                      );
                    })}
                    <span className="text-sm text-gray-600 ml-1">
                      {(() => {
                        console.log('Company rating:', agent.company?.companyRating);
                        return `(${(agent.company?.companyRating || 0).toFixed(1)})`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Agent Section */}
                <div className='p-6'>
                  <div className='flex items-center gap-4 mb-4'>
                    <img
                      src={agent.avatar || '/default-avatar.png'}
                      alt={agent.name}
                      className='w-16 h-16 rounded-full object-cover'
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                    <div>
                      <h3 className='text-xl font-semibold text-gray-900'>{agent.name}</h3>
                      <div className='flex items-center gap-1 mt-1'>
                        {renderStars(agent.ratings?.overall?.averageRating || 0)}
                        <span className="text-gray-600 ml-1">
                          {(agent.ratings?.overall?.averageRating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Ratings */}
                  <div className="space-y-2">
                    {ratingCategories.map((category) => {
                      const categoryData = agent.ratings?.categories?.[category] || {
                        averageRating: agent[`${category}Rating`] || 0,
                        totalRatings: agent[`${category}Ratings`]?.length || 0
                      };

                      return (
                        <div key={category} className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <span className="capitalize text-gray-600">
                              {category.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="flex">
                                {renderStars(categoryData.averageRating)}
                              </div>
                              <span className="text-sm text-gray-500">
                                {categoryData.averageRating.toFixed(1)} ({categoryData.totalRatings || 0})
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${(categoryData.averageRating / 5) * 100}%` 
                              }}
                            />
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

export default Agents;
