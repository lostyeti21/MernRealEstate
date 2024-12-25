import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';
import { FaPlus } from 'react-icons/fa';

export default function AgentDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contact, setContact] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef(null);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    if (currentUser?.contact) {
      setContact(currentUser.contact);
    }
  }, [currentUser]);

  useEffect(() => {
    // Check if user is authenticated and is an agent
    if (!currentUser || !currentUser._id) {
      navigate('/real-estate-agent-login');
      return;
    }

    fetchAgentListings();
  }, [currentUser, navigate]);

  const fetchAgentListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('agentToken'); // Get the agent token

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/listing/agent/${currentUser._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized access
          navigate('/real-estate-agent-login');
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch listings');
      }

      setListings(data.listings);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err.message);
      if (err.message === 'Authentication required') {
        navigate('/real-estate-agent-login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Upload to Cloudinary through our backend
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.message);
      }

      // Update agent profile with new avatar
      const token = localStorage.getItem('agentToken');
      const res = await fetch(`/api/real-estate/agent/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: currentUser._id,
          avatar: uploadData.url
        })
      });

      const data = await res.json();
      
      if (data.success) {
        // Update Redux store and localStorage
        const updatedUser = { ...currentUser, avatar: uploadData.url };
        dispatch(signInSuccess(updatedUser));
        localStorage.setItem('agentInfo', JSON.stringify(updatedUser));
        setUploadError(null);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.message);
    } finally {
      setUploadProgress(0);
    }
  };

  const handleContactUpdate = async () => {
    try {
      const token = localStorage.getItem('agentToken');
      const res = await fetch(`/api/real-estate/agent/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: currentUser._id,
          contact
        })
      });

      const data = await res.json();

      if (data.success) {
        // Update Redux store and localStorage
        const updatedUser = { ...currentUser, contact };
        dispatch(signInSuccess(updatedUser));
        localStorage.setItem('agentInfo', JSON.stringify(updatedUser));
        setIsEditingContact(false);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact information');
    }
  };

  const handleCreateListing = () => {
    navigate('/create-listing');
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const token = localStorage.getItem('agentToken');
      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete listing');
      }

      // Remove the deleted listing from state
      setListings(listings.filter(listing => listing._id !== listingId));
    } catch (error) {
      console.error('Error deleting listing:', error);
      setError(error.message);
    }
  };

  // Add loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Add error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/real-estate-agent-login')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">Agent Dashboard</h1>
        <button
          onClick={handleCreateListing}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <FaPlus className="text-sm" />
          Create Listing
        </button>
      </div>
      
      {/* Agent Info Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img
              src={currentUser.avatar || "/default-profile.png"}
              alt="Agent"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
            <div 
              className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileRef.current.click()}
            >
              <span className="text-white text-sm">Change Photo</span>
            </div>
            <input
              type="file"
              ref={fileRef}
              hidden
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0])}
            />
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{currentUser.name}</h2>
            <p className="text-gray-600">{currentUser.email}</p>
            <p className="text-gray-600">Company: {currentUser.companyName}</p>
            
            {/* Contact Information */}
            <div className="mt-2 flex items-center gap-2">
              {isEditingContact ? (
                <>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="border rounded px-2 py-1"
                    placeholder="Enter contact number"
                  />
                  <button
                    onClick={handleContactUpdate}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingContact(false);
                      setContact(currentUser.contact || '');
                    }}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-600">
                    Contact: {currentUser.contact || 'Not set'}
                  </p>
                  <button
                    onClick={() => setIsEditingContact(true)}
                    className="text-blue-500 text-sm hover:underline"
                  >
                    {currentUser.contact ? 'Edit' : 'Add'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        {/* Upload Error */}
        {uploadError && (
          <p className="text-red-500 text-sm mt-2">{uploadError}</p>
        )}
      </div>

      {/* Listings Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Your Listings</h2>
        <div className="text-gray-600">
          Total Listings: {listings.length}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Listing Card */}
        <div
          onClick={handleCreateListing}
          className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all border-2 border-dashed border-gray-300 flex flex-col items-center justify-center h-[300px] hover:border-blue-500 group"
        >
          <FaPlus className="text-4xl text-gray-400 group-hover:text-blue-500 mb-3" />
          <p className="text-gray-600 group-hover:text-blue-500 font-medium">
            Create New Listing
          </p>
        </div>

        {/* Existing Listings */}
        {listings.map((listing) => (
          <div
            key={listing._id}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative"
          >
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteListing(listing._id);
                }}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/update-listing/${listing._id}`);
                }}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="relative h-48" onClick={() => navigate(`/listing/${listing._id}`)}>
              <img
                src={listing.imageUrls[0] || "/default-house.jpg"}
                alt={listing.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 rounded text-sm text-white ${
                  listing.type === 'rent' ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{listing.name}</h3>
              <p className="text-gray-600 mb-2 truncate">{listing.address}</p>
              <div className="flex justify-between items-center">
                <p className="text-blue-600 font-semibold">
                  ${listing.regularPrice.toLocaleString()}
                  {listing.type === 'rent' && '/month'}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">{listing.bedrooms} beds</span>
                  <span>{listing.bathrooms} baths</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {listings.length === 0 && !loading && (
        <div className="text-center text-gray-600 mt-6 bg-white p-8 rounded-lg shadow-md">
          <FaPlus className="text-4xl mx-auto mb-4 text-gray-400" />
          <p className="mb-4">You haven't created any listings yet</p>
          <button
            onClick={handleCreateListing}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Your First Listing
          </button>
        </div>
      )}
    </div>
  );
}
