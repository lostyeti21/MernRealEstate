import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaStar, FaEnvelope, FaPhone } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ListingItem from '../components/ListingItem';
import Loader from '../components/Loader';

const AgentListings = () => {
  const { agentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState(null);
  const initialRatingState = {
    professionalism: 0,
    responsiveness: 0,
    knowledge: 0,
    helpfulness: 0
  };
  const [ratings, setRatings] = useState(initialRatingState);
  const [hoveredRating, setHoveredRating] = useState(initialRatingState);
  const [currentRating, setCurrentRating] = useState(null);

  useEffect(() => {
    setRatings(initialRatingState);
    setHoveredRating(initialRatingState);
  }, [location.pathname]);

  useEffect(() => {
    const fetchAgentAndCompany = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch agent data
        const agentRes = await fetch(`/api/agent/${agentId}`);
        if (!agentRes.ok) {
          throw new Error('Failed to fetch agent data');
        }
        const agentData = await agentRes.json();
        
        // Set agent data first with defaults
        const agentInfo = agentData.agent || agentData;
        setAgent({
          ...agentInfo,
          name: agentInfo.name || '',
          email: agentInfo.email || '',
          companyName: agentInfo.companyName || '',
          avatar: agentInfo.avatar || '',
          ratings: {
            overall: { averageRating: 0, totalRatings: 0 },
            categories: {}
          }
        });

        // Fetch company data if agent has a companyId
        if (agentInfo.companyId) {
          const companyRes = await fetch(`/api/real-estate/company/${agentInfo.companyId}`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!companyRes.ok) {
            throw new Error('Failed to fetch company data');
          }
          
          const companyData = await companyRes.json();
          if (companyData.success) {
            setCompany(companyData.company);
          }
        }

        // Fetch agent ratings
        try {
          const ratingRes = await fetch(`/api/agent-rating/${agentId}`);
          const ratingData = await ratingRes.json();

          if (ratingRes.ok && ratingData.ratings) {
            // Update agent with ratings
            setAgent(prev => ({
              ...prev,
              ratings: {
                overall: { 
                  averageRating: ratingData.ratings.overall?.averageRating || 0, 
                  totalRatings: ratingData.ratings.overall?.totalRatings || 0 
                },
                categories: ratingData.ratings.categories || {}
              }
            }));
          }
        } catch (ratingError) {
          console.error('Error fetching ratings:', ratingError);
        }

        // Fetch agent listings
        try {
          const listingsRes = await fetch(`/api/listing/agent/${agentId}`);
          const listingsData = await listingsRes.json();

          if (listingsRes.ok) {
            setListings(listingsData.listings || []); 
          }
        } catch (listingsError) {
          console.error('Error fetching listings:', listingsError);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgentAndCompany();
    }
  }, [agentId]);

  const handleRating = async () => {
    try {
      // Get current user token
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Please sign in to rate the agent');
      }

      // Decode the token to get user information
      const tokenParts = token.split('.');
      let userInfo = {};
      try {
        userInfo = JSON.parse(atob(tokenParts[1]));
        console.log('Decoded user info:', userInfo);
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
      }

      // Check if any rating is 0
      const zeroRatings = Object.entries(ratings).filter(([_, value]) => value === 0);
      if (zeroRatings.length > 0) {
        console.log('Missing ratings for categories:', zeroRatings.map(([category]) => category));
        throw new Error('Please provide ratings for all categories');
      }

      // Prepare ratings array for each category
      const ratingsArray = Object.entries(ratings)
        .filter(([category]) => category !== 'overall') // Skip overall rating as it's calculated
        .map(([category, rating]) => {
          console.log(`Preparing rating for ${category}:`, {
            category,
            rating: Number(rating),
            type: typeof rating
          });
          return {
            category,
            rating: Number(rating)
          };
        });

      console.log('Submitting ratings:', {
        agentId,
        ratings: ratingsArray,
        ratingsObject: ratings,
        userInfo: userInfo
      });

      // Detailed logging of request payload
      const requestPayload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ratings: ratingsArray
        })
      };

      console.log('Full request details:', {
        url: `/api/agent-rating/${agentId}/rate`,
        method: requestPayload.method,
        headers: requestPayload.headers,
        body: JSON.parse(requestPayload.body)
      });

      // Submit ratings
      const response = await fetch(`/api/agent-rating/${agentId}/rate`, requestPayload);

      // Log raw response details
      console.log('Raw response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const data = await response.json();
      console.log('Rating submission response:', data);

      if (!response.ok) {
        console.error('Rating submission failed:', {
          status: response.status,
          data: data
        });
        
        // Log more details about the error
        if (data.details) {
          console.error('Validation error details:', data.details);
        }

        throw new Error(data.message || data.error || 'Failed to submit ratings');
      }

      console.log('Updating agent state with new ratings:', data.ratings);

      // Update agent ratings
      setAgent(prev => ({
        ...prev,
        ratings: data.ratings
      }));

      // Update current rating display
      setCurrentRating({
        averageRating: data.ratings.overall.averageRating,
        totalRatings: data.ratings.overall.totalRatings
      });

      // Reset ratings
      setRatings(initialRatingState);
      setHoveredRating(initialRatingState);

      toast.success('Ratings submitted successfully!');
    } catch (err) {
      console.error('Rating submission error:', err);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      toast.error(err.message || 'Failed to submit rating');
    }
  };

  const renderStars = (rating, interactive = false, category = null) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={`text-2xl ${
          interactive ? 'cursor-pointer ' : ''
        }${
          index < (interactive ? (hoveredRating[category] || ratings[category]) : Math.round(rating))
            ? 'text-yellow-400'
            : 'text-gray-300'
        }`}
        {...(interactive ? {
          onMouseEnter: () => setHoveredRating(prev => ({ ...prev, [category]: index + 1 })),
          onMouseLeave: () => setHoveredRating(prev => ({ ...prev, [category]: 0 })),
          onClick: () => setRatings(prev => ({ ...prev, [category]: index + 1 }))
        } : {})}
      />
    ));
  };

  const renderStarsForCompany = (averageRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-xl ${i <= averageRating ? "text-yellow-500" : "text-gray-300"} transition-colors duration-200`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Calculate real-time overall rating
  const calculateOverallRating = () => {
    const values = Object.values(ratings);
    const validRatings = values.filter(rating => rating > 0);
    if (validRatings.length === 0) return 0;
    return Number((validRatings.reduce((acc, val) => acc + val, 0) / validRatings.length).toFixed(1));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {agent && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col items-center mb-6">
            <img
              src={agent.avatar || '/default-avatar.png'}
              alt={agent.name || agent.email}
              className="w-24 h-24 rounded-full mb-4 object-cover"
            />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {agent.name || 'Agent'}
            </h2>
            <p className="text-gray-600 text-lg mb-2">
              {agent.email}
            </p>
            {agent.companyName && (
              <div className="w-full max-w-4xl mb-4">
                <div className="w-full h-[200px] relative rounded-lg overflow-hidden">
                  <img
                    src={company?.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                    alt="Company Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    {renderStarsForCompany(company?.companyRating || 0)}
                    <span className="text-sm text-gray-500 ml-1">
                      ({company?.companyRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
                    <span className="text-sm font-semibold">
                      {agent.companyName}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contact Information */}
            <div className="flex gap-4 mt-4">
              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <FaEnvelope /> Email
                </a>
              )}
              {agent.contact && (
                <a
                  href={`tel:${agent.contact}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <FaPhone /> Call
                </a>
              )}
            </div>
          </div>

          {/* Agent Rating Section */}
          <div className='bg-white p-6 rounded-lg shadow-md mb-6'>
            <h2 className='text-2xl font-semibold mb-4 text-center text-slate-700'>
              Agent Rating
            </h2>
            <div className='flex flex-col items-center gap-2'>
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">Overall Rating:</span>
                  <span className="text-lg font-bold text-yellow-500">{agent.ratings?.overall?.averageRating?.toFixed(1) || '0.0'}</span>
                  <div className="flex items-center gap-0.5">
                    {renderStarsForCompany(agent.ratings?.overall?.averageRating || 0)}
                  </div>
                </div>
              </div>

              {/* Agent Category Ratings */}
              {agent.ratings?.categories && Object.keys(agent.ratings.categories).length > 0 && (
                <div className='grid grid-cols-2 gap-4 mt-4 w-full max-w-md'>
                  {Object.entries(agent.ratings.categories).map(([category, data]) => (
                    <div key={category} className='flex flex-col items-center p-2 bg-gray-50 rounded'>
                      <span className='text-sm font-medium capitalize'>{category}</span>
                      <div className='flex items-center gap-1'>
                        <span className='text-yellow-500'>
                          {(data?.averageRating || 0).toFixed(1)}
                        </span>
                        <FaStar className='text-yellow-500 text-sm' />
                        <span className='text-xs text-gray-500'>
                          ({data?.totalRatings || 0})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rate this Agent Section */}
          <div className='bg-white p-6 rounded-lg shadow-md mb-6'>
            <h2 className='text-2xl font-semibold mb-4 text-center text-slate-700'>
              Rate this Agent
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-medium text-gray-700 mb-2 text-center">Overall Rating</h4>
              <div className="flex justify-center items-center gap-2">
                {renderStars(calculateOverallRating())}
                <span className="text-gray-600 text-lg">
                  ({calculateOverallRating()})
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(ratings).map(([category, value]) => (
                <div key={category} className="flex flex-col">
                  <label className="text-gray-700 font-medium capitalize mb-2">
                    {category}
                  </label>
                  <div className="flex items-center space-x-2">
                    {renderStars(value, true, category)}
                    <span className="ml-2 text-gray-600">
                      {hoveredRating[category] || value || 0}
                    </span>
                  </div>
                </div>
              ))}

              <button 
                onClick={handleRating}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
              >
                Submit Rating
              </button>
            </div>
          </div>

          {/* Listings Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Listings ({listings.length})
            </h2>
            {listings.length === 0 ? (
              <p className="text-gray-600 text-center">No listings available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <ListingItem key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentListings;
