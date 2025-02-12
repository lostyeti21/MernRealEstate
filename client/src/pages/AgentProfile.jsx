import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBed, FaBath, FaParking, FaMapMarkerAlt, FaStar, FaEnvelope, FaPhone } from 'react-icons/fa';
import ListingItem from '../components/ListingItem';

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

        // Fetch agent details
        const agentRes = await fetch(`/api/agent/${agentId}`);
        const agentData = await agentRes.json();

        if (!agentRes.ok) {
          throw new Error(agentData.message || 'Failed to fetch agent details');
        }

        // Fetch agent ratings
        const ratingRes = await fetch(`/api/agent-rating/${agentId}`);
        const ratingData = await ratingRes.json();

        // Fetch agent listings
        const listingsRes = await fetch(`/api/listing/agent/${agentId}`);
        const listingsData = await listingsRes.json();

        if (!listingsRes.ok) {
          throw new Error(listingsData.message || 'Failed to fetch listings');
        }

        setAgent({
          ...agentData.agent,
          ratings: ratingData.ratings || {
            overall: { averageRating: 0, totalRatings: 0 },
            categories: {}
          }
        });
        setListings(listingsData.listings || []);

      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId]);

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

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-3 max-w-4xl mx-auto'>
        <p className='text-red-700 text-center my-7'>{error}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className='p-3 max-w-4xl mx-auto'>
        <p className='text-xl text-slate-700 text-center my-7'>Agent not found</p>
      </div>
    );
  }

  return (
    <div className='p-3 max-w-6xl mx-auto'>
      {/* Agent Profile Section */}
      <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
        <div className='flex items-center gap-4'>
          <img
            src={agent.avatar || '/default-avatar.png'}
            alt={agent.name}
            className='w-24 h-24 rounded-full object-cover'
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-avatar.png';
            }}
          />
          <div>
            <h1 className='text-2xl font-semibold'>{agent.name}</h1>
            <p className='text-gray-600'>{agent.companyName}</p>
            <div className='flex items-center gap-2 mt-2'>
              {renderStars(agent.ratings.overall.averageRating)}
              <span className='text-lg font-medium text-gray-900'>
                {agent.ratings.overall.averageRating.toFixed(1)}
              </span>
              <span className='text-sm text-gray-500'>
                ({agent.ratings.overall.totalRatings} {agent.ratings.overall.totalRatings === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            {agent.ratings.overall.totalRatings > 0 && (
              <div className='text-sm text-gray-500 mt-1'>
                Top rated for: {Object.entries(agent.ratings.categories || {})
                  .sort(([,a], [,b]) => b.averageRating - a.averageRating)
                  .slice(0, 1)
                  .map(([category, { averageRating }]) => (
                    `${category} (${averageRating.toFixed(1)})`
                  ))}
              </div>
            )}
            <div className='flex gap-4 mt-3'>
              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className='flex items-center gap-2 text-blue-600 hover:underline'
                >
                  <FaEnvelope /> Email
                </a>
              )}
              {agent.contact && (
                <a
                  href={`tel:${agent.contact}`}
                  className='flex items-center gap-2 text-blue-600 hover:underline'
                >
                  <FaPhone /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <h2 className='text-2xl font-semibold mb-4'>Listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className='text-gray-600 text-center'>No listings available</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {listings.map((listing) => (
            <ListingItem key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentProfile;