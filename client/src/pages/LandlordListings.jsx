import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { FaStar } from 'react-icons/fa';
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
        setVerificationError('Please enter a verification code');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setVerificationError('Please log in to verify');
        return;
      }

      // First verify the code
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

      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || 'Invalid verification code');
      }

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Verification failed');
      }

      // If code is valid, check if user has already rated
      const ratedResponse = await fetch(`/api/user/check-if-rated/${userId}`, {
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
        throw new Error('You have already rated this landlord');
      }

      // If all checks pass, allow rating
      setIsVerified(true);
      setVerificationError('');
      toast.success('Verification successful! You can now rate the landlord.');

    } catch (err) {
      console.error('Verification error:', err);
      setVerificationError(err.message || 'Failed to verify code');
      toast.error(err.message || 'Failed to verify code');
    }
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
      setError(null);

      // Check if user is verified first
      if (!isVerified) {
        throw new Error('Please verify your code before submitting a rating');
      }

      // Get current user token
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Please log in to submit a rating');
      }

      // Validate that all ratings are set and valid
      const hasInvalidRating = Object.values(ratings).some(rating => !rating || rating < 1 || rating > 5);
      if (hasInvalidRating) {
        throw new Error('Please provide a rating (1-5 stars) for all categories');
      }

      // Prepare ratings array with correct category names
      const ratingsArray = Object.entries(ratings).map(([category, value]) => ({
        category: category.toLowerCase(),  // Ensure category names match backend expectations
        value: Number(value),
        comment: ''
      }));

      const response = await fetch('/api/user/rate-landlord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          landlordId: userId,
          ratings: ratingsArray
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.message || 'Failed to submit rating';
        console.error('Rating submission error:', { status: response.status, data });
        throw new Error(errorMessage);
      }

      // Update the current rating with the new values
      if (data.ratings?.overall) {
        setCurrentRating({
          averageRating: data.ratings.overall.averageRating,
          totalRatings: data.ratings.overall.totalRatings
        });

        // Reset all rating states after successful submission
        setRatings(initialRatingState);
        setHoveredRating(initialRatingState);
        setRated(true);
        setIsVerified(false);
        setVerificationCode("");

        // Fetch updated landlord data to refresh the displayed ratings
        await fetchUpdatedLandlord();
        
        toast.success('Rating submitted successfully!');
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (err) {
      console.error('Rating submission error:', err);
      toast.error(err.message || 'Failed to submit rating');
      setError(err.message || 'Failed to submit rating');
    }
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
            <div className="flex items-center mt-2">
              {renderStars(currentRating?.averageRating || 0)}
              <span className="ml-2 text-gray-600">
                ({currentRating?.totalRatings || 0} {currentRating?.totalRatings === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(landlord.categoryRatings || {}).map(([category, rating]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-700 capitalize mb-2">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="flex items-center">
                  {renderStars(rating)}
                  <span className="ml-2 text-gray-600">
                    {rating ? rating.toFixed(1) : 'N/A'}
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
          {Object.entries(ratings).map(([category, value]) => (
            <div key={category} className="flex flex-col">
              <label className="text-gray-700 font-medium capitalize mb-2">
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`text-2xl cursor-pointer ${
                      (hoveredRating[category] || value) >= star
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
                  {hoveredRating[category] || value || 0}
                </span>
              </div>
            </div>
          ))}
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
                To rate this landlord, you need their verification code. Ask the landlord for their unique code, 
                which they can generate from their dashboard.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter landlord's verification code"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {verificationError && (
                  <p className="text-red-500 text-sm">{verificationError}</p>
                )}
                <button
                  onClick={handleVerifyCode}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
                >
                  Verify Code
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Note: The verification code is valid for 24 hours after generation.
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
    </div>
  );
};

export default LandlordListings;
