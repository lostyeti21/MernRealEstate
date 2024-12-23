import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';

export default function RealEstateDashboard() {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";

  // Safe JSON parse helper
  const safeJSONParse = (str) => {
    try {
      return str ? JSON.parse(str) : null;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const token = localStorage.getItem('realEstateToken');
        const companyInfo = safeJSONParse(localStorage.getItem('companyInfo'));

        console.log('Token:', token ? 'exists' : 'missing');
        console.log('Company Info:', companyInfo);

        if (!token) {
          console.error('No token found');
          navigate('/real-estate-login');
          return;
        }

        if (!companyInfo || !companyInfo._id) {
          console.error('Invalid company info:', companyInfo);
          localStorage.removeItem('companyInfo');
          localStorage.removeItem('realEstateToken');
          navigate('/real-estate-login');
          return;
        }

        const res = await fetch(`/api/real-estate/company/${companyInfo._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Received company data:', data);

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch company data');
        }

        setCompanyData(data.company);
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError(error.message);
        
        // Clear invalid data
        if (error.message.includes('not found') || error.message.includes('unauthorized')) {
          localStorage.removeItem('companyInfo');
          localStorage.removeItem('realEstateToken');
          navigate('/real-estate-login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [navigate]);

  useEffect(() => {
    const fetchListings = async () => {
      if (activeTab !== 'listings') return;
      
      try {
        setListingsLoading(true);
        setListingsError(null);
        
        const token = localStorage.getItem('realEstateToken');
        const companyInfo = safeJSONParse(localStorage.getItem('companyInfo'));

        if (!token || !companyInfo?._id) {
          navigate('/real-estate-login');
          return;
        }

        console.log('Fetching company listings');
        const res = await fetch(`/api/real-estate/company/${companyInfo._id}/listings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch listings');
        }

        console.log('Received listings:', data.listings);
        setListings(data.listings || []);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListingsError(error.message);
      } finally {
        setListingsLoading(false);
      }
    };

    fetchListings();
  }, [activeTab, navigate]);

  const handleAvatarClick = () => {
    console.log('Avatar clicked, triggering file input');
    if (fileRef.current) {
      fileRef.current.click();
    } else {
      console.error('File input reference not found');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);
    if (!file) return;

    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size should be less than 2MB');
      }

      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('realEstateToken');
      const companyInfo = safeJSONParse(localStorage.getItem('companyInfo'));

      if (!token || !companyInfo || !companyInfo._id) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload image
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.imageUrl) {
        throw new Error('No image URL received from server');
      }

      // Update company avatar
      const updateRes = await fetch('/api/real-estate/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar: uploadData.imageUrl,
          companyId: companyInfo._id
        })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update avatar');
      }

      const updateData = await updateRes.json();
      if (!updateData.success) {
        throw new Error(updateData.message || 'Failed to update avatar');
      }

      // Set progress to 100% when complete
      setUploadProgress(100);
      
      // Update local storage and state with new avatar
      const updatedCompanyInfo = { ...companyInfo, avatar: updateData.avatar };
      localStorage.setItem('companyInfo', JSON.stringify(updatedCompanyInfo));
      setCompanyData(prev => ({ ...prev, avatar: updateData.avatar }));
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('Error updating avatar:', error);
      setError(error.message);
      // Clear any stale data on error
      if (error.message.includes('Authentication required')) {
        localStorage.removeItem('companyInfo');
        localStorage.removeItem('realEstateToken');
        navigate('/real-estate-login');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('realEstateToken');
      if (!token) {
        navigate('/real-estate-login');
        return;
      }

      const res = await fetch(`/api/real-estate/remove-agent/${agentToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete agent');
      }

      // Update local state to remove the deleted agent
      setCompanyData(prev => ({
        ...prev,
        agents: prev.agents.filter(agent => agent._id !== agentToDelete._id)
      }));

      setShowDeleteConfirm(false);
      setAgentToDelete(null);
      alert('Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.message || 'Error deleting agent');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setAgentToDelete(null);
  };

  const handleAgentClick = (agentId) => {
    setIsNavigating(true);
    navigate(`/agent/${agentId}/listings`);
  };

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-8">Error: {error}</div>;
  if (!companyData) return <div className="text-center mt-8">No company data found</div>;

  return (
    <div className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">
        Real Estate Dashboard
      </h1>

      <div className="flex flex-col gap-4">
        {/* Banner Avatar Section */}
        <div className="relative w-full h-[200px] bg-gray-100 rounded-lg overflow-hidden shadow-md">
          <img
            src={companyData?.avatar || defaultProfilePic}
            alt="company profile"
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={handleAvatarClick}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultProfilePic;
            }}
          />
          
          {/* Overlay with camera icon and text */}
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleAvatarClick}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-white mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            <p className="text-white font-medium">Change Banner Image</p>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileRef}
            hidden
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        {/* Company Header */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-md px-4 py-2 inline-flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <StarRating rating={companyData?.averageRating || 0} size="large" />
            <span className="text-xl font-semibold text-gray-700">
              {companyData?.averageRating?.toFixed(1) || '0.0'}
            </span>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center">
            Banner image updated successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
            {error}
          </div>
        )}

        {/* Add Agent Button */}
        <div className="mb-6">
          <Link
            to="/add-agent"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Agent
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'listings'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Listings
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Our Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyData?.agents && companyData.agents.length > 0 ? (
                companyData.agents.map((agent) => (
                  <div
                    key={agent._id}
                    className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow relative group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        console.log('Navigating to agent listings:', agent._id);
                        navigate(`/agent/${agent._id}/listings`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={agent.avatar || '/default-profile.jpg'}
                          alt={agent.name}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-profile.jpg';
                          }}
                        />
                        <div>
                          <p className="font-semibold">{agent.name}</p>
                          <p className="text-gray-600 text-sm">{agent.email}</p>
                          <div className="mt-1">
                            <StarRating rating={agent.averageRating || 0} size="small" />
                            <span className="text-sm text-gray-500 ml-1">
                              ({agent.averageRating?.toFixed(1) || 'N/A'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(agent);
                      }}
                      disabled={deleteLoading}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center">No agents found</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">All Agent Listings</h2>
            {listingsLoading ? (
              <div className="text-center p-8">Loading listings...</div>
            ) : listingsError ? (
              <div className="text-red-500 text-center p-8">{listingsError}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.length > 0 ? listings.map((listing) => (
                  <div
                    key={listing._id}
                    onClick={() => navigate(`/listing/${listing._id}`)}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer transform hover:scale-[1.01] transition-transform duration-200"
                  >
                    <div className="relative h-[200px]">
                      <img
                        src={listing.imageUrls[0] || '/default-house.jpg'}
                        alt={listing.name}
                        className="h-full w-full object-cover"
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
                      <h3 className="text-lg font-semibold truncate">{listing.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={listing.agent?.avatar || '/default-profile.jpg'}
                          alt={listing.agent?.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <p className="text-sm text-gray-600">{listing.agent?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-gray-600 text-sm truncate">{listing.address}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span className="text-sm">{listing.bedrooms} beds</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">{listing.bathrooms} baths</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <p className="text-lg font-semibold text-green-600">
                          ${listing.regularPrice.toLocaleString()}
                          {listing.type === 'rent' && '/month'}
                        </p>
                        {listing.discountPrice > 0 && (
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded-md text-sm font-semibold">
                            -${(listing.regularPrice - listing.discountPrice).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 col-span-full text-center">No listings found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Delete Agent</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete agent {agentToDelete?.name}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}