import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaSearch, FaSort, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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

  // Helper function to render stars with optional grayed-out style
  const renderStars = (rating) => {
    return (
      <div className='flex gap-0.5'>
        {[...Array(5)].map((_, index) => (
          <FaStar
            key={index}
            className={`w-5 h-5 ${
              index < Math.floor(rating)
                ? 'text-yellow-400'
                : index < rating
                ? 'text-gradient-star'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/real-estate/company/agents');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch agents');
      }

      // Fetch ratings for each agent
      const agentsWithRatings = await Promise.all(
        data.agents.map(async (agent) => {
          try {
            const ratingRes = await fetch(`/api/agent-rating/${agent._id}`);
            
            if (!ratingRes.ok) {
              console.warn(`Could not fetch ratings for agent ${agent._id}`);
              return {
                ...agent,
                ratings: {
                  overall: { averageRating: 0, totalRatings: 0 },
                  categories: {}
                }
              };
            }

            const ratingData = await ratingRes.json();
            
            return {
              ...agent,
              ratings: ratingData.ratings || {
                overall: { averageRating: 0, totalRatings: 0 },
                categories: {}
              }
            };
          } catch (err) {
            console.warn(`Error fetching ratings for agent ${agent._id}:`, err);
            return {
              ...agent,
              ratings: {
                overall: { averageRating: 0, totalRatings: 0 },
                categories: {}
              }
            };
          }
        })
      );

      setAgents(agentsWithRatings);
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
      <div className='mb-8 flex justify-between items-center'>
        <h1 className='text-3xl font-bold text-slate-800'>Real Estate Agents</h1>
        
        <div className='flex items-center space-x-4'>
          {/* Search Input */}
          <div className='relative flex-grow max-w-md'>
            <input
              type='text'
              placeholder='Search agents...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009688]'
            />
            <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
          </div>

          {/* Sort Dropdown */}
          <div className='relative'>
            <button 
              onClick={() => setShowSortPopup(!showSortPopup)}
              className='flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 focus:outline-none'
            >
              <FaSort className='mr-2' />
              Sort
            </button>

            {showSortPopup && (
              <div className='absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10'>
                <div 
                  onClick={() => handleSort('rating')} 
                  className='px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center'
                >
                  Rating 
                  {sortCriteria === 'rating' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className='text-center text-gray-500 py-12'>
          No agents found.
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {currentAgents.map((agent) => (
            <Link
              to={`/agent/${agent._id}/listings`}
              key={agent._id}
              className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200'
            >
              <div className='flex flex-col'>
                <div className='flex items-center gap-4 mb-4'>
                  <img
                    src={agent.avatar || '/default-avatar.png'}
                    alt={agent.name}
                    className='w-20 h-20 rounded-full object-cover border-2 border-gray-100'
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div className='flex-1'>
                    <h3 className='text-xl font-semibold text-gray-900'>{agent.name}</h3>
                    <div className='flex flex-col gap-1 mt-2'>
                      <div className='flex items-center gap-2'>
                        <div className='flex items-center'>
                          {renderStars(agent.ratings?.overall?.averageRating || 0)}
                        </div>
                        <span className='text-lg font-medium text-gray-900'>
                          {(agent.ratings?.overall?.averageRating || 0).toFixed(1)}
                        </span>
                        <span className='text-sm text-gray-500'>
                          ({agent.ratings?.overall?.totalRatings || 0} {agent.ratings?.overall?.totalRatings === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                      {agent.ratings?.overall?.totalRatings > 0 && (
                        <div className='text-sm text-gray-500'>
                          Top rated for: {Object.entries(agent.ratings?.categories || {})
                            .sort(([,a], [,b]) => b.averageRating - a.averageRating)
                            .slice(0, 1)
                            .map(([category, { averageRating }]) => (
                              `${category} (${averageRating.toFixed(1)})`
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className='border-t pt-4'>
                  <div className='flex flex-col'>
                    <span className='text-sm text-gray-500'>Real Estate Company</span>
                    <span className='text-base font-medium text-gray-900'>{agent.companyName}</span>
                  </div>
                  {agent.specialization && (
                    <div className='mt-2'>
                      <span className='text-sm text-gray-500'>Specialization</span>
                      <p className='text-base text-gray-900'>{agent.specialization}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center mt-8 space-x-2'>
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
        </div>
      )}
    </motion.div>
  );
};

export default Agents;
