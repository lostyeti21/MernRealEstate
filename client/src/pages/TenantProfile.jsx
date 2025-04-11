import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FaStar, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const TenantProfile = () => {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState({
    communication: 0,
    cleanliness: 0,
    reliability: 0
  });
  const [hoveredRating, setHoveredRating] = useState({
    communication: 0,
    cleanliness: 0,
    reliability: 0
  });
  const [currentRating, setCurrentRating] = useState(null);
  
  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [popupContent, setPopupContent] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Calculate real-time overall rating
  const currentOverallRating = useMemo(() => {
    const values = Object.values(ratings);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    return values.some(val => val > 0) ? Number(average.toFixed(1)) : 0;
  }, [ratings]);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Please log in to view tenant details');
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // Fetch tenant details
        const resTenant = await fetch(`http://localhost:3000/api/user/${tenantId}`, {
          headers
        });
        const tenantData = await resTenant.json();
        if (!resTenant.ok) throw new Error(tenantData.message || "Failed to fetch tenant details");

        // Fetch tenant ratings
        const resRatings = await fetch(`http://localhost:3000/api/tenant-rating/${tenantId}`, {
          headers
        });
        const ratingsData = await resRatings.json();
        if (!resRatings.ok) throw new Error(ratingsData.message || "Failed to fetch tenant ratings");

        setTenant(tenantData);
        setCurrentRating({
          averageRating: ratingsData.ratings?.overall?.averageRating || null,
          totalRatings: ratingsData.ratings?.overall?.totalRatings || 0,
          categories: ratingsData.ratings?.categories || {}
        });
      } catch (err) {
        console.error('Error fetching tenant details:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantDetails();
  }, [tenantId]);

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
            landlordId: tenantId // Using tenantId as the user ID to verify
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
              landlordId: tenantId // Using tenantId as the user ID to verify
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
    // Check if user has already rated
    const ratedResponse = await fetch(`http://localhost:3000/api/tenant-rating/check/${tenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const ratedData = await ratedResponse.json();

    if (!ratedResponse.ok) {
      throw new Error(ratedData.message || 'Failed to check rating status');
    }

    if (ratedData.hasRated) {
      throw new Error('You have already rated this tenant');
    }

    // If all checks pass, allow rating
    setIsVerified(true);
    setShowVerificationModal(false);
    setVerificationError('');
    toast.success('Verification successful! You can now rate the tenant.');
  };

  const handleRating = async () => {
    try {
      setError(null);

      // Get current user token
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Please log in to submit a rating');
      }

      // Validate ratings
      const hasEmptyRatings = Object.values(ratings).some(value => value === 0);
      if (hasEmptyRatings) {
        throw new Error('Please provide ratings for all categories');
      }

      // Verify that the user is allowed to rate
      if (!isVerified) {
        setShowVerificationModal(true);
        throw new Error('Please verify with a code before rating');
      }

      // Prepare ratings array with overall rating
      const ratingsArray = [
        ...Object.entries(ratings).map(([category, value]) => ({
          category,
          value: Number(value),
          comment: ''
        }))
      ];

      // Add overall rating if all other ratings are set
      if (!hasEmptyRatings) {
        ratingsArray.push({
          category: 'overall',
          value: currentOverallRating,
          comment: ''
        });
      }

      console.log('Submitting ratings:', ratingsArray);

      // Submit rating
      const response = await fetch(`http://localhost:3000/api/tenant-rating/rate/${tenantId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ratings: ratingsArray
        }),
      });

      const data = await response.json();
      console.log('Rating submission response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }

      // Update the current rating with the new values
      setCurrentRating({
        averageRating: data.ratings?.overall?.averageRating,
        totalRatings: data.ratings?.overall?.totalRatings,
        categories: data.ratings?.categories
      });

      // Send rating notification
      console.log('Preparing to send rating notification:', {
        ratedUser: tenantId,
        ratedBy: JSON.parse(localStorage.getItem('currentUser'))._id,
        ratingType: 'tenant',
        ratingDetails: {
          communication: ratings.communication,
          cleanliness: ratings.cleanliness,
          reliability: ratings.reliability,
          overall: currentOverallRating
        }
      });

      const ratingNotificationResponse = await fetch('http://localhost:3000/api/rating-notifications/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ratedUser: tenantId,
          ratedBy: JSON.parse(localStorage.getItem('currentUser'))._id,
          ratingType: 'tenant',
          ratingDetails: {
            communication: ratings.communication,
            cleanliness: ratings.cleanliness,
            reliability: ratings.reliability,
            overall: currentOverallRating
          }
        })
      });

      console.log('Rating notification response:', {
        status: ratingNotificationResponse.status,
        ok: ratingNotificationResponse.ok
      });

      if (!ratingNotificationResponse.ok) {
        const errorText = await ratingNotificationResponse.text();
        console.error('Failed to send rating notification:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(errorJson.message || 'Failed to send rating notification');
        } catch (e) {
          console.error('Error parsing notification error:', e);
        }
      }

      // Reset all rating states after successful submission
      setRatings({
        communication: 0,
        cleanliness: 0,
        reliability: 0
      });
      setHoveredRating({
        communication: 0,
        cleanliness: 0,
        reliability: 0
      });
      
      // Reset verification state
      setIsVerified(false);
      setVerificationCode("");

      toast.success('Rating submitted successfully!');
    } catch (err) {
      console.error('Rating submission error:', err);
      toast.error(err.message || 'Failed to submit rating');
      setError(err.message || 'Failed to submit rating');
    }
  };

  const handleInfoClick = (e, content, category) => {
    setActiveCategory(category);
    setPopupPosition({ x: e.clientX, y: e.clientY });
    setPopupContent(content);
    setShowPopup(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handlePopupClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setShowPopup(false);
      setIsAnimating(false);
      setActiveCategory(null);
    }, 150);
  };

  const renderStars = (rating) => {
    // If rating is null or 0, return 5 gray stars
    if (!rating || rating === 0) {
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

  const popupClasses = `
    fixed z-50 p-4 rounded-lg backdrop-blur-lg bg-white/30 shadow-lg border border-white/20
    transition-all duration-200 ease-out transform
    ${showPopup ? (isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100') : 'opacity-0 scale-95'}
  `;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!tenant) return <div>No tenant found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center space-x-6 mb-6">
          <img 
            src={tenant.avatar || 'https://via.placeholder.com/150'} 
            alt={tenant.username} 
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{tenant.username}</h1>
            <div className="flex items-center space-x-2 mt-2">
              {renderStars(currentRating?.averageRating)}
              <span className="text-sm text-gray-600">
                ({currentRating?.averageRating || 0} out of 5)
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Ratings</h2>
          {currentRating && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Current Rating</h4>
              <div className="space-y-3">
                {['communication', 'reliability', 'cleanliness'].map(category => (
                  currentRating.categories[category] && (
                    <div key={category} className="mb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <FaInfoCircle 
                            className="text-gray-400 hover:text-blue-500 cursor-pointer mr-2"
                            onClick={(e) => handleInfoClick(e, 
                              category === 'communication' 
                                ? 'Communication is a category associated with how well the tenant communicated challenges or issues associated with the property, issues with late rent payment etc.' 
                                : category === 'reliability' 
                                  ? 'Reliability is how reliable the tenant is, this may be timeliness of rent payments, sticking to one\'s word etc.' 
                                  : 'Cleanliness refers to how well the tenant kept the property while renting it'
                            , category)}
                          />
                          <span className={`
                            capitalize mr-2 ml-1
                            ${activeCategory === category ? 
                              'text-blue-400 font-medium animate-pulse' : 
                              'text-gray-700 font-medium'
                            }
                          `}>
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {renderStars(currentRating.categories[category].averageRating)}
                          <span className="ml-2 text-gray-600">
                            {currentRating.categories[category].averageRating.toFixed(1)} out of 5
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 relative">
          <h2 className="text-xl font-semibold mb-6">Rate this Tenant</h2>
          
          <div className={`space-y-6 ${!isVerified && showVerificationModal ? 'filter blur-sm' : ''}`}>
            {['communication', 'reliability', 'cleanliness'].map(category => (
              <div key={category} className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaInfoCircle 
                      className="text-gray-400 hover:text-blue-500 cursor-pointer mr-2"
                      onClick={(e) => handleInfoClick(e, 
                        category === 'communication' 
                          ? 'Communication is a category associated with how well the tenant communicated challenges or issues associated with the property, issues with late rent payment etc.' 
                          : category === 'reliability' 
                            ? 'Reliability is how reliable the tenant is, this may be timeliness of rent payments, sticking to one\'s word etc.' 
                            : 'Cleanliness refers to how well the tenant kept the property while renting it'
                      , category)}
                    />
                    <span className={`
                      text-gray-700 font-medium capitalize ml-1
                      ${activeCategory === category ? 
                        'text-blue-400 animate-pulse' : 
                        'text-gray-700'
                      }
                    `}>
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center ml-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={`text-2xl cursor-pointer ${
                          (hoveredRating[category] || ratings[category]) >= star
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        onMouseEnter={() =>
                          setHoveredRating((prev) => ({ ...prev, [category]: star }))
                        }
                        onMouseLeave={() =>
                          setHoveredRating((prev) => ({ ...prev, [category]: 0 }))
                        }
                        onClick={() =>
                          setRatings((prev) => ({ ...prev, [category]: star }))
                        }
                      />
                    ))}
                    <span className="ml-2 text-gray-600">
                      {hoveredRating[category] || ratings[category] || 0} out of 5
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <span className="text-gray-700 font-medium mr-2">Overall:</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${
                        star <= Math.round(currentOverallRating)
                          ? 'text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">
                  {currentOverallRating.toFixed(1)} out of 5
                </span>
              </div>
            </div>
            
            <button
              onClick={handleRating}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Submit Rating
            </button>
          </div>
          
          {/* Verification Modal */}
          {!isVerified && showVerificationModal && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
              <div className="text-center p-6 max-w-md">
                <h4 className="text-lg font-semibold mb-4">Verify to Rate</h4>
                <p className="text-gray-600 mb-6">
                  To rate this tenant, you need either:
                  <ul className="list-disc list-inside mt-2 text-left">
                    <li>Their verification code (which they can generate from their profile)</li>
                    <li>A contract number from a fully signed contract with this tenant</li>
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
        </div>
      </div>
      {/* Popup for info icons */}
      {showPopup && (
        <div 
          className={popupClasses}
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y + 20}px`,
            transform: 'translateX(-50%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="relative">
            <button 
              className="absolute -top-3 -right-3 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              onClick={handlePopupClose}
            >
              ×
            </button>
            <div className="pr-6 py-1 text-sm text-gray-800">
              {popupContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantProfile;
