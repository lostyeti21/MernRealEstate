import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBed, FaBath, FaParking, FaMapMarkerAlt, FaStar } from 'react-icons/fa';

const AgentProfile = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('realEstateToken');
        if (!token) {
          throw new Error('Authentication required');
        }

        const res = await fetch(`/api/real-estate/agent/${agentId}/listings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Agent data:', data);

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch agent data');
        }

        setAgent(data.agent);
        setListings(data.listings || []);

      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId]);

  const handleShowListings = () => {
    // Store agent info in localStorage
    if (agent) {
      localStorage.setItem('agentInfo', JSON.stringify(agent));
      localStorage.setItem('realEstateToken', localStorage.getItem('realEstateToken'));
      navigate('/agent-dashboard');
    }
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
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center mt-8">
        <p>Agent not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Agent Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-6">
          <img
            src={agent.avatar || '/default-profile.jpg'}
            alt={agent.name}
            className="w-24 h-24 rounded-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-profile.jpg';
            }}
          />
          <div>
            <h1 className="text-2xl font-semibold mb-2">{agent.name}</h1>
            <p className="text-gray-600 mb-2">{agent.email}</p>
            <p className="text-gray-600 mb-2">{agent.contact}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`${
                      star <= (agent.averageRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600">
                ({agent.averageRating?.toFixed(1) || 'N/A'})
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              Company: {agent.companyName}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleShowListings}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Show Listings ({listings.length})
          </button>
        </div>
      </div>

      {/* Recent Listings Preview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Listings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.slice(0, 3).map((listing) => (
            <div
              key={listing._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={listing.imageUrls[0] || '/default-house.jpg'}
                alt={listing.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-house.jpg';
                }}
              />
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
                <p className="text-lg font-semibold text-green-600">
                  ${listing.regularPrice.toLocaleString()}
                  {listing.type === 'rent' && '/month'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentProfile; 