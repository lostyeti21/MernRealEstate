import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { FaStar } from 'react-icons/fa';
import { FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const LandlordListings = () => {
  const { userId } = useParams();
  const location = useLocation();
  const [landlord, setLandlord] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialRatingState = {
    responseTime: 0,
    maintenance: 0,
    experience: 0,
  };
  const [ratings, setRatings] = useState(initialRatingState);
  const [hoveredRating, setHoveredRating] = useState(initialRatingState);
  const [rated, setRated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [currentRating, setCurrentRating] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [popupContent, setPopupContent] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setRatings(initialRatingState);
    setHoveredRating(initialRatingState);
    setRated(false);
    setIsVerified(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchLandlordData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/user/landlord/${userId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch landlord data');
        }

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch landlord data');
        }

        const { landlord, listings } = data;

        setLandlord(landlord);
        setListings(listings);

        // Set current rating for display only (not for the rating form)
        setCurrentRating({
          averageRating: landlord.averageRating || 0,
          totalRatings: landlord.totalRatings || 0
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching landlord data:', err);
        setError(err.message || 'Failed to fetch landlord data');
        setLoading(false);
      }
    };

    if (userId) {
      fetchLandlordData();
    }
  }, [userId]);

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
            landlordId: userId
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
          const contractVerifyResponse = await fetch('/api/contract/verify-by-number', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contractNumber: verificationCode,
              landlordId: userId
            })
          });

          // Check if we got a 404, which means the endpoint doesn't exist
          if (contractVerifyResponse.status === 404) {
            console.error('Contract verification endpoint not found (404)');
            throw new Error('Contract verification code is wrong. Please try again  or use a verification code instead.');
          }

          let contractVerifyData;
          try {
            contractVerifyData = await contractVerifyResponse.json();
            console.log('Contract verification response:', contractVerifyData);
          } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            throw new Error('Invalid response from server. Please try again later.');
          }

          if (!contractVerifyResponse.ok) {
            console.error('Contract verification HTTP error:', contractVerifyResponse.status);
            throw new Error(contractVerifyData?.message || `Error ${contractVerifyResponse.status}: Failed to verify contract number`);
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

  // Helper function to verify user and enable rating
  const checkIfRatedAndSetVerified = async (token) => {
    // Allow rating immediately after verification
    setIsVerified(true);
    setVerificationError('');
    toast.success('Verification successful! You can now rate the landlord.');
  };

  const fetchUpdatedLandlord = async () => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      const updatedLandlord = await res.json();
      if (res.ok) {
        setLandlord(updatedLandlord);
      } else {
        throw new Error("Failed to fetch updated landlord data");
      }
    } catch (error) {
      console.error("Error fetching updated landlord data:", error);
    }
  };

  const isValidRating = (rating) => rating >= 1 && rating <= 5;

  const handleRating = async () => {
    try {
      // Convert ratings to array format expected by backend
      const ratingsArray = Object.entries(ratings).map(([category, value]) => ({
        category: category.toLowerCase(),
        value: Number(value),
        comment: ''
      }));

      console.log('Submitting ratings:', ratingsArray);

      const response = await fetch('/api/user/rate-landlord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          landlordId: userId,
          ratings: ratingsArray
        }),
      });

      const data = await response.json();
      console.log('Rating submission response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }

      if (!data.success || !data.ratings?.overall) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from server');
      }

      // Update the current rating with the new values
      setCurrentRating({
        averageRating: data.ratings.overall.averageRating,
        totalRatings: data.ratings.overall.totalRatings
      });

      // Send rating notification
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const ratingDetails = {
        categories: {
          responseTime: {
            value: Number(ratings.responseTime.toFixed(1)),
            label: "Response Time"
          },
          maintenance: {
            value: Number(ratings.maintenance.toFixed(1)),
            label: "Maintenance"
          },
          experience: {
            value: Number(ratings.experience.toFixed(1)),
            label: "Overall Experience"
          }
        },
        overall: Number(calculateAverageRating(ratings).toFixed(1))
      };

      console.log('Preparing to send rating notification:', {
        ratedUser: userId,
        ratedBy: currentUser._id,
        ratingType: 'landlord',
        ratingDetails
      });

      const ratingNotificationResponse = await fetch('http://localhost:3000/api/rating-notifications/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ratedUser: userId,
          ratedBy: currentUser._id,
          ratingType: 'landlord',
          ratingDetails
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
      setRatings(initialRatingState);
      setHoveredRating(initialRatingState);
      setRated(true);
      setIsVerified(false);
      setVerificationCode("");

      // Fetch updated landlord data to refresh the displayed ratings
      await fetchUpdatedLandlord();
      
      toast.success('Rating submitted successfully!');

    } catch (err) {
      console.error('Rating submission error:', err);
      toast.error(err.message || 'Failed to submit rating');
      setError(err.message || 'Failed to submit rating');
    }
  };

  const handleInfoClick = (e, content) => {
    setPopupPosition({ x: e.clientX, y: e.clientY });
    setPopupContent(content);
    setShowPopup(true);
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
    // Ensure rating is always a number with one decimal place
    return rating !== null && rating !== undefined 
      ? Number(rating).toFixed(1) 
      : 'N/A';
  };

  const renderRatingStars = (category) => {
    const categoryRating = ratings[category] || 0;
    const hoveredCategoryRating = hoveredRating[category] || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        onClick={() => setRatings({ ...ratings, [category]: i + 1 })}
        onMouseEnter={() => setHoveredRating({ ...hoveredRating, [category]: i + 1 })}
        onMouseLeave={() => setHoveredRating({ ...hoveredRating, [category]: 0 })}
        className={`cursor-pointer ${
          i + 1 <= (hoveredCategoryRating || categoryRating)
            ? "text-yellow-500"
            : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  const calculateAverageRating = (ratings) => {
    const validRatings = Object.values(ratings).filter(r => r > 0);
    if (validRatings.length === 0) return 0;
    return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
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
      <div className="text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <div className="spinner animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
        <p className="mt-4">Loading landlord details...</p>
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
      {landlord && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col items-center mb-6">
            <img
              src={landlord.avatar}
              alt={`${landlord.username}'s avatar`}
              className="w-24 h-24 rounded-full mb-4 object-cover"
            />
            <h2 className="text-2xl font-semibold text-gray-800">{landlord.username}</h2>
            
            {/* Overall Rating */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {renderStars(currentRating?.averageRating || 0)}
              <span className="text-gray-600">
                {currentRating?.averageRating ? currentRating.averageRating.toFixed(1) : 'N/A'} out of 5
              </span>
              <span className="text-gray-500 text-sm">
                ({currentRating?.totalRatings || 0} ratings)
              </span>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(landlord.categoryRatings || {}).map(([category, rating]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-700 capitalize mb-2 flex items-center">
                  <button 
                    onClick={(e) => handleInfoClick(e, {
                      experience: 'How was your overall experience with this landlord?',
                      maintenance: 'How well did the landlord maintain the property?',
                      responseTime: 'How quickly did the landlord respond and act on issues regarding the property?'
                    }[category])}
                    className="text-gray-400 hover:text-gray-600 mr-2"
                  >
                    <FaInfoCircle size={14} />
                  </button>
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="flex items-center">
                  {renderStars(rating)}
                  <span className="ml-2 text-gray-600">
                    {formatRating(rating)} out of 5
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Contact Information</h3>
            <p className="text-gray-600">{landlord.email}</p>
            {landlord.phoneNumbers && landlord.phoneNumbers.length > 0 && (
              <div className="mt-2">
                {landlord.phoneNumbers.map((phone, index) => (
                  <p key={index} className="text-gray-600">{phone}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rating Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Rate this Landlord</h3>
        
        <div className={`space-y-4 ${!isVerified ? 'filter blur-sm' : ''}`}>
          {['experience', 'maintenance', 'responseTime'].map(category => (
            <div key={category} className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button 
                    onClick={(e) => handleInfoClick(e, {
                      experience: 'How was your overall experience with this landlord?',
                      maintenance: 'How well did the landlord maintain the property?',
                      responseTime: 'How quickly did the landlord respond and act on issues regarding the property?'
                    }[category])}
                    className="text-gray-400 hover:text-gray-600 mr-2"
                  >
                    <FaInfoCircle size={14} />
                  </button>
                  <span className="text-gray-600 capitalize w-32">{category}:</span>
                </div>
                <div className="flex items-center ml-4">
                  {renderRatingStars(category)}
                  <span className="ml-2 text-gray-600">
                    {hoveredRating[category] || ratings[category] || 0} out of 5
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-gray-700">Overall Rating:</span>
            <div className="flex items-center">
              {renderStars(calculateAverageRating(ratings))}
              <span className="ml-2 text-gray-600">
                {calculateAverageRating(ratings).toFixed(1)} out of 5
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRating}
          disabled={!isVerified}
          className={`mt-6 w-full py-2 px-4 rounded transition duration-200 ${
            isVerified 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Submit Rating
        </button>

        {/* Verification Overlay */}
        {!isVerified && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
            <div className="text-center p-6 max-w-md">
              <h4 className="text-lg font-semibold mb-4">Verify to Rate</h4>
              <p className="text-gray-600 mb-6">
                To rate this landlord, you need either:
                <ul className="list-disc list-inside mt-2 text-left">
                  <li>Their verification code (which they can generate from their dashboard)</li>
                  <li>A contract number from a fully signed contract with this landlord</li>
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

      {/* Listings Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Listings</h2>
        {listings.length === 0 ? (
          <p className="text-gray-600">No listings available</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link 
                to={`/listing/${listing._id}`} 
                key={listing._id} 
                className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <img 
                  src={listing.imageUrls[0]} 
                  alt={listing.name} 
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800">{listing.name}</h3>
                  <p className="text-gray-600">{listing.address}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-blue-600 font-bold">
                      ${listing.regularPrice.toLocaleString()}
                      {listing.type === 'rent' && ' / month'}
                    </span>
                    <span className="text-green-600">
                      {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {showPopup && <InfoPopup />}
    </div>
  );
};

export default LandlordListings;
