import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AgentDashboard() {
  const { currentUser } = useSelector((state) => state.user);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Check if user is logged in and is an agent
        if (!currentUser || !currentUser._id) {
          console.log('No user found in Redux store');
          navigate('/real-estate-agent-login');
          return;
        }

        console.log('Current user state:', {
          id: currentUser._id,
          isAgent: currentUser.isAgent,
          token: currentUser.token ? 'present' : 'missing'
        });

        const res = await fetch(`/api/agent/listings/${currentUser._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        const data = await res.json();
        console.log('API Response:', data);

        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch listings');
        }

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch listings');
        }

        setListings(data.listings || []);
      } catch (error) {
        console.error('Error fetching listings:', error);
        if (error.message.includes('token') || error.message.includes('unauthorized')) {
          navigate('/real-estate-agent-login');
        } else {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [currentUser, navigate]);

  const handleDeleteListing = async (listingId) => {
    try {
      const res = await fetch(`/api/agent/listing/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        setListings(listings.filter(listing => listing._id !== listingId));
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <button
          onClick={() => navigate('/agent-create-listing')}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Create New Listing
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't created any listings yet.</p>
          <button
            onClick={() => navigate('/agent-create-listing')}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={listing.imageUrls[0]}
                alt={listing.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{listing.name}</h3>
                <p className="text-gray-600 mb-4">${listing.regularPrice.toLocaleString()}</p>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => navigate(`/update-listing/${listing._id}`)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteListing(listing._id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
