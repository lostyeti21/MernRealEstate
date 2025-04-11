import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaStar, FaEnvelope, FaPhone, FaInfoCircle } from 'react-icons/fa';
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
  
  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(true);
  const [verificationError, setVerificationError] = useState("");

  // Add this state at the top with other state declarations
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [popupContent, setPopupContent] = useState('');
  const [showPopup, setShowPopup] = useState(false);

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
      // Check if user is verified
      if (!isVerified) {
        toast.error('Please verify with a code or contract number first');
        return;
      }

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
      
      // Reset verification state
      setIsVerified(false);
      setVerificationCode("");
      setShowVerificationModal(false);

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

  const handleVerifyCode = async () => {
    try {
      if (!verificationCode.trim()) {
        setVerificationError('Please enter a verification code or contract number');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setVerificationError('Please log in to verify');
        return;
      }

      // First try to verify using the standard verification code
      let standardVerificationSuccess = false;
      try {
        console.log('Attempting standard code verification with:', verificationCode);
        const verifyResponse = await fetch('/api/code/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: verificationCode,
            landlordId: agentId // Using agentId as the user ID to verify
          })
        });

        const verifyData = await verifyResponse.json();
        console.log('Standard verification response:', verifyData);

        if (verifyResponse.ok && verifyData.success) {
          // Standard code verification succeeded
          standardVerificationSuccess = true;
          await checkIfRatedAndSetVerified(token);
          return;
        }
      } catch (standardVerifyError) {
        console.log('Standard verification failed:', standardVerifyError.message);
      }

      if (!standardVerificationSuccess) {
        // If standard verification fails, try contract number verification
        try {
          console.log('Attempting contract verification with:', verificationCode);
          const contractVerifyResponse = await fetch('/api/code/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code: verificationCode,
              landlordId: agentId // Using agentId as the user ID to verify
            })
          });

          const contractVerifyData = await contractVerifyResponse.json();
          console.log('Contract verification response:', contractVerifyData);

          if (!contractVerifyResponse.ok) {
            console.error('Contract verification HTTP error:', contractVerifyResponse.status);
            throw new Error(contractVerifyData.message || `Error ${contractVerifyResponse.status}: Failed to verify contract number`);
          }

          if (!contractVerifyData.success) {
            throw new Error(contractVerifyData.message || 'Invalid contract number');
          }

          // Contract number verification succeeded
          await checkIfRatedAndSetVerified(token);
        } catch (contractVerifyError) {
          console.error('Contract verification error:', contractVerifyError);
          throw new Error(contractVerifyError.message || 'Invalid verification code or contract number');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationError(err.message || 'Failed to verify code');
      toast.error(err.message || 'Failed to verify code');
    }
  };

  // Helper function to check if user has already rated and set verified state
  const checkIfRatedAndSetVerified = async (token) => {
    try {
      // Check if user has already rated
      const tokenParts = token.split('.');
      let userInfo = {};
      try {
        userInfo = JSON.parse(atob(tokenParts[1]));
        console.log('Decoded user info for rating check:', userInfo);
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
      }
      
      const userId = userInfo.id;
      
      // Try to fetch existing ratings to check if user has already rated
      const ratingCheckResponse = await fetch(`/api/agent-rating/${agentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (ratingCheckResponse.ok) {
        const ratingData = await ratingCheckResponse.json();
        console.log('Rating data:', ratingData);
        
        // Check if the current user has already rated this agent
        if (ratingData.userRatings && ratingData.userRatings.some(rating => rating.userId === userId)) {
          throw new Error('You have already rated this agent');
        }
      } else {
        // If the endpoint doesn't exist or returns an error, log it but continue
        console.warn('Could not check if user has already rated, proceeding with verification');
      }
      
      // If all checks pass or we couldn't check, set verified to true
      setIsVerified(true);
      setVerificationError('');
      setShowVerificationModal(false);
      toast.success('Verification successful! You can now rate this agent.');
    } catch (error) {
      console.error('Error in rating check:', error);
      throw error;
    }
  };

  const handleInfoClick = (e, content) => {
    setPopupPosition({ x: e.clientX, y: e.clientY });
    setPopupContent(content);
    setShowPopup(true);
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

  const InfoPopup = () => (
    <div 
      className="fixed bg-white p-4 rounded shadow-lg z-50 max-w-xs border border-gray-200"
      style={{ left: popupPosition.x, top: popupPosition.y }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm text-gray-700">{popupContent}</div>
        <button 
          onClick={() => setShowPopup(false)}
          className="text-gray-500 hover:text-gray-700 ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {agent && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Banner and Profile */}
          <div className="w-full h-[200px] relative rounded-lg overflow-hidden mb-6">
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

          <div className="flex flex-col items-center">
            <img src={agent.avatar || '/default-avatar.png'} alt={agent.name} className="w-32 h-32 rounded-full object-cover mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">{agent.name}</h1>
            {company && <p className="text-gray-600">{company.name}</p>}
            
            <div className="mt-4 flex gap-4">
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="flex items-center text-blue-600 hover:text-blue-800">
                  <FaEnvelope className="mr-1" />
                  {agent.email}
                </a>
              )}
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="flex items-center text-blue-600 hover:text-blue-800">
                  <FaPhone className="mr-1" />
                  {agent.phone}
                </a>
              )}
            </div>
            
            {/* Ratings Section */}
            <div className="mt-6 w-full">
              <div className="flex items-center justify-center gap-2 mb-4">
                {renderStars(agent.ratings?.overall?.averageRating || 0)}
                <span className="text-gray-600">
                  {agent.ratings?.overall?.averageRating?.toFixed(1) || 0} out of 5
                </span>
                <span className="text-gray-500 text-sm">
                  ({agent.ratings?.overall?.totalRatings || 0} ratings)
                </span>
              </div>
              
              {agent.ratings?.categories && (
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-6">
                  {Object.entries(agent.ratings.categories).map(([category, rating]) => {
                    const isRightAligned = ['helpfulness', 'professionalism'].includes(category);
                    const tooltips = {
                      helpfulness: 'How helpful was the agent in helping you find the property you wanted',
                      professionalism: 'How professional was the agent when you were working with them?',
                      knowledge: 'How knowledgable was the agent regarding the entire process of finding a property and your eventual moving in',
                      responsiveness: 'How responsive was the agent when it came to answering questions and responding to you during your property searching journey?'
                    };
                    
                    return (
                      <div key={category} className={`flex items-center ${isRightAligned ? 'justify-end' : ''}`}>
                        <div className="flex items-center">
                          <button 
                            onClick={(e) => handleInfoClick(e, tooltips[category])}
                            className="text-gray-400 hover:text-gray-600 mr-1"
                          >
                            <FaInfoCircle size={14} />
                          </button>
                          <span className="text-gray-600 capitalize w-32">{category}:</span>
                        </div>
                        <div className="flex items-center ml-4">
                          {renderStars(rating.averageRating)}
                          <span className="ml-2 text-gray-600">
                            {rating.averageRating.toFixed(1)} out of 5
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {agent && (
        <div className='bg-white p-6 rounded-lg shadow-md mb-6 relative'>
          <h2 className='text-2xl font-semibold mb-4 text-center text-slate-700'>
            Rate this Agent
          </h2>

          <div className={`space-y-4 ${!isVerified && showVerificationModal ? 'filter blur-sm pointer-events-none' : ''}`}>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-medium text-gray-700 mb-2 text-center">Overall Rating</h4>
              <div className="flex justify-center items-center gap-2">
                {renderStars(calculateOverallRating())}
                <span className="text-gray-600 text-lg">
                  ({calculateOverallRating()})
                </span>
              </div>
            </div>

            {Object.entries(ratings).map(([category, value]) => (
              <div key={category} className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button 
                      onClick={(e) => handleInfoClick(e, {
                        helpfulness: 'How helpful was the agent in helping you find the property you wanted',
                        professionalism: 'How professional was the agent when you were working with them?',
                        knowledge: 'How knowledgable was the agent regarding the entire process of finding a property and your eventual moving in',
                        responsiveness: 'How responsive was the agent when it came to answering questions and responding to you during your property searching journey?'
                      }[category])}
                      className="text-gray-400 hover:text-gray-600 mr-1"
                    >
                      <FaInfoCircle size={14} />
                    </button>
                    <span className="text-gray-600 capitalize w-32">{category}:</span>
                  </div>
                  <div className="flex items-center ml-4">
                    {renderStars(value, true, category)}
                    <span className="ml-2 text-gray-600">
                      {hoveredRating[category] || value || 0}
                    </span>
                  </div>
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

          {/* Verification Modal */}
          {!isVerified && showVerificationModal && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg z-10">
              <div className="text-center p-6 max-w-md">
                <h4 className="text-lg font-semibold mb-4">Verify to Rate</h4>
                <p className="text-gray-600 mb-6">
                  To rate this agent, you need either:
                  <ul className="list-disc list-inside mt-2 text-left">
                    <li>Their verification code (which they can generate from their profile)</li>
                    <li>A contract number from a fully signed contract with this agent</li>
                  </ul>
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code or contract number"
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {verificationError && (
                    <p className="text-red-500 text-sm">{verificationError}</p>
                  )}
                  <button
                    onClick={handleVerifyCode}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
                  >
                    Verify
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    Note: Verification codes are valid for 24 hours. Contract numbers are permanently valid.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Banner - Only show when not verified and modal is closed */}
          {!isVerified && !showVerificationModal && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Verification required to rate this agent.
                    <button
                      onClick={() => setShowVerificationModal(true)}
                      className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-1"
                    >
                      Verify now
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner - Only show when verified */}
          {isVerified && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Verification successful! You can now rate this agent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Listings Section at Bottom */}
      {agent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">
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
      {showPopup && <InfoPopup />}
    </div>
  );
};

export default AgentListings;
