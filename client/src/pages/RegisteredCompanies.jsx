import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaStarHalfAlt, FaSearch, FaSort, FaChevronLeft, FaChevronRight, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';
import StarRating from '../components/StarRating';

const RegisteredCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [companiesPerPage] = useState(9);

  // Ref for scrolling
  const companiesContainerRef = useRef(null);

  // Smooth scroll to top function
  const scrollToTop = () => {
    if (companiesContainerRef.current) {
      companiesContainerRef.current.scrollIntoView({ 
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
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError(null);

        // First fetch all companies
        const res = await fetch('/api/real-estate/companies');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch companies');
        }

        // Fetch detailed company data for each company
        const companiesWithDetails = await Promise.all(
          data.companies.map(async (company) => {
            try {
              // Get detailed company data
              const companyRes = await fetch(`/api/real-estate/company/${company._id}`);
              if (!companyRes.ok) {
                throw new Error('Failed to fetch company details');
              }
              const companyData = await companyRes.json();
              
              if (companyData.success) {
                return {
                  ...company,
                  ...companyData.company,
                  companyRating: companyData.company.companyRating || 0,
                  totalReviews: companyData.company.reviews?.length || 0,
                  banner: companyData.company.banner || '',
                  agents: companyData.company.agents || []
                };
              }
              return company;
            } catch (err) {
              console.error(`Error processing company ${company.companyName}:`, err);
              return company;
            }
          })
        );

        setCompanies(companiesWithDetails);
        setFilteredCompanies(companiesWithDetails);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to fetch companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompanies(companies);
      setCurrentPage(1);
    } else {
      const filtered = companies.filter(company => 
        company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, companies]);

  const handleSort = (criteria) => {
    if (criteria === sortCriteria) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCriteria(criteria);
      setSortOrder('desc');
    }
    setShowSortPopup(false);
  };

  // Get current companies for pagination
  const indexOfLastCompany = currentPage * companiesPerPage;
  const indexOfFirstCompany = indexOfLastCompany - companiesPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstCompany, indexOfLastCompany);

  // Sort companies
  const sortedCompanies = [...currentCompanies].sort((a, b) => {
    if (sortCriteria === 'rating') {
      return sortOrder === 'desc' 
        ? (b.companyRating || 0) - (a.companyRating || 0)
        : (a.companyRating || 0) - (b.companyRating || 0);
    }
    return 0;
  });

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 text-center mt-8">{error}</div>;

  return (
    <div ref={companiesContainerRef} className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative mb-12 h-24"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
          <span style={{ color: '#353386' }}>REGISTERED</span>
          </h1>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'
        >
          Real Estate Companies
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
        className="mb-8 flex flex-col sm:flex-row justify-end items-center gap-4"
      >
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Sort Button */}
        <div className="relative">
          <button
            onClick={() => setShowSortPopup(!showSortPopup)}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
          >
            <FaSort />
            Sort
          </button>
          
          {/* Sort Popup */}
          {showSortPopup && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <button
                onClick={() => handleSort('rating')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg"
              >
                By Rating {sortCriteria === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCompanies.map((company, index) => (
          <motion.div
            key={company._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link
              to={`/company/${company._id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block"
            >
              {/* Banner Image */}
              <div className="relative h-48">
                {company.banner ? (
                  <img
                    src={company.banner}
                    alt={company.companyName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = company.avatar || 'https://via.placeholder.com/400x200?text=' + encodeURIComponent(company.companyName);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    {company.avatar ? (
                      <img
                        src={company.avatar}
                        alt={company.companyName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/400x200?text=' + encodeURIComponent(company.companyName);
                        }}
                      />
                    ) : (
                      <span className="text-gray-500 text-xl font-semibold">{company.companyName}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Company Info */}
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{company.companyName}</h3>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <StarRating rating={Number(company.companyRating) || 0} />
                    <span>({Number(company.companyRating || 0).toFixed(1)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUser className="text-gray-400" />
                    <span>{company.agents?.length || 0} Agents</span>
                  </div>
                </div>
                <p className="text-gray-600 mt-2 truncate">{company.email}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {filteredCompanies.length > companiesPerPage && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-full ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FaChevronLeft />
          </button>
          
          {Array.from({ length: Math.ceil(filteredCompanies.length / companiesPerPage) }).map((_, index) => (
            <button
              key={index + 1}
              onClick={() => paginate(index + 1)}
              className={`w-8 h-8 rounded-full ${
                currentPage === index + 1
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === Math.ceil(filteredCompanies.length / companiesPerPage)}
            className={`p-2 rounded-full ${
              currentPage === Math.ceil(filteredCompanies.length / companiesPerPage)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default RegisteredCompanies;
