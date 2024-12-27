import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';
import { FaBed, FaBath, FaParking, FaMapMarkerAlt } from 'react-icons/fa';

const AgentListings = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rated, setRated] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const fetchAgentListings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('realEstateToken');
        if (!token) {
          throw new Error('Authentication required');
        }

        console.log('Frontend: Fetching data for agent:', agentId);
        
        const res = await fetch(`/api/real-estate/agent/${agentId}/listings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('Frontend: Server error response:', errorData);
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }

        const data = await res.json();
        console.log('Frontend: Received API Response:', data);

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch agent data');
        }

        if (!data.agent) {
          throw new Error('No agent data received from server');
        }

        setAgentData(data.agent);
        setListings(data.listings || []);
      } catch (err) {
        console.error('Frontend: Error in fetchAgentListings:', err);
        setError(err.message || 'Something went wrong');
        
        if (err.message.includes('Authentication required')) {
          navigate('/real-estate-login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgentListings();
    } else {
      setError('No agent ID provided');
      setLoading(false);
    }
  }, [agentId, navigate]);

  const handleRating = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const userId = currentUser._id;

      if (!token || !userId) {
        setError('You must be logged in to rate an agent');
        return;
      }

      const response = await fetch(`/api/agent/${agentId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }

      if (data.success) {
        setRated(true);
        // Update the agent's rating in the UI
        setAgentData(prev => ({
          ...prev,
          averageRating: data.newRating
        }));
      }
    } catch (error) {
      console.error('Rating error:', error);
      setError(error.message);
    }
  };

  const handleRatingClick = (value) => {
    setRating(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-8 p-4 bg-red-50 rounded-lg">
        <p className="text-red-600 font-semibold">Error: {error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="text-center mt-8 p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-600">Agent not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Agent Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-6">
          <img
            src={agentData.avatar || '/default-profile.jpg'}
            alt={agentData.name}
            className="w-24 h-24 rounded-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-profile.jpg';
            }}
          />
          <div>
            <h1 className="text-2xl font-semibold mb-2">{agentData.name}</h1>
            <p className="text-gray-600 mb-2">{agentData.email}</p>
            <div className="flex items-center gap-2">
              <StarRating rating={agentData.averageRating || 0} />
              <span className="text-gray-600">
                ({agentData.averageRating?.toFixed(1) || 'N/A'})
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              Total Listings: {listings.length}
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-4">
            <img
              src={agentData.companyAvatar || '/default-company.jpg'}
              alt={agentData.companyName}
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-company.jpg';
              }}
            />
            <div>
              <p className="font-semibold">{agentData.companyName}</p>
            </div>
          </div>
        </div>

        {/* Add Rating UI */}
        {!rated && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Rate this agent:</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleRatingClick(value)}
                  className={`p-2 ${
                    rating >= value ? 'text-yellow-500' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={handleRating}
              disabled={!rating}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Submit Rating
            </button>
          </div>
        )}
      </div>

      {/* Listings Grid */}
      <h2 className="text-2xl font-semibold mb-6">Agent's Listings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length > 0 ? (
          listings.map((listing) => (
            <div
              key={listing._id}
              onClick={() => navigate(`/listing/${listing._id}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="relative h-48">
                <img
                  src={listing.imageUrls[0] || '/default-house.jpg'}
                  alt={listing.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-house.jpg';
                  }}
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-md text-sm font-semibold ${
                    listing.type === 'rent' ? 'bg-blue-500' : 'bg-green-500'
                  } text-white`}>
                    {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{listing.name}</h3>
                <p className="text-gray-600 mb-2 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-green-600" />
                  {listing.address}
                </p>
                <div className="flex gap-4 mb-2">
                  <span className="flex items-center gap-1">
                    <FaBed className="text-gray-400" />
                    {listing.bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaBath className="text-gray-400" />
                    {listing.bathrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaParking className="text-gray-400" />
                    {listing.parking ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-lg font-semibold text-green-600">
                    ${listing.regularPrice.toLocaleString()}
                    {listing.type === 'rent' && '/month'}
                  </p>
                  {listing.discountPrice > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-md text-sm">
                      -${(listing.regularPrice - listing.discountPrice).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            No listings found for this agent
          </p>
        )}
      </div>
    </div>
  );
};

export default AgentListings;
