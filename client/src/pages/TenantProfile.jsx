import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FaStar } from 'react-icons/fa';
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

      // Check if user has already rated
      const checkRes = await fetch(`http://localhost:3000/api/tenant-rating/check/${tenantId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const checkData = await checkRes.json();
      
      if (!checkRes.ok) {
        throw new Error(checkData.message || 'Error checking rating status');
      }
      
      if (checkData.hasRated) {
        throw new Error('You have already rated this tenant');
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
        } catch {
          toast.error('Failed to send rating notification');
        }
      } else {
        const responseData = await ratingNotificationResponse.json();
        console.log('Rating notification created successfully:', responseData);
        toast.success('Rating submitted successfully');
      }

      // Reset ratings and hover states
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

    return Array.from({ length: 5 }, (_, i) => (
      <FaStar 
        key={i} 
        className={`inline-block ${
          i < Math.round(rating) ? 'text-yellow-500' : 'text-gray-300'
        }`} 
      />
    ));
  };

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
                ({currentRating?.averageRating || 0} / 5)
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Ratings</h2>
          {currentRating?.categories && Object.entries(currentRating.categories).map(([category, data]) => (
            <div key={category} className="mb-3">
              <div className="flex justify-between items-center">
                <span className="capitalize">{category}</span>
                <div className="flex items-center">
                  {renderStars(data.averageRating)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Rate Tenant</h2>
          
          {/* Real-time overall rating display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Overall Rating</h3>
              <div className="flex justify-center items-center">
                {renderStars(currentOverallRating)}
                <span className="text-gray-600 ml-2">
                  ({currentOverallRating || 0})
                </span>
              </div>
            </div>
          </div>

          {Object.entries(ratings).map(([category, rating]) => (
            <div key={category} className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="capitalize">{category}</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`cursor-pointer ${
                        star <= (hoveredRating[category] || rating)
                          ? 'text-yellow-500'
                          : 'text-gray-300'
                      }`}
                      onMouseEnter={() => 
                        setHoveredRating(prev => ({ ...prev, [category]: star }))
                      }
                      onMouseLeave={() => 
                        setHoveredRating(prev => ({ ...prev, [category]: 0 }))
                      }
                      onClick={() => 
                        setRatings(prev => ({ ...prev, [category]: star }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={handleRating}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantProfile;
