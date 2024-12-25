import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StarRating from '../components/StarRating';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { app } from "../firebase";

const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";

const safeJSONParse = (str) => {
  try {
    return str ? JSON.parse(str) : null;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return null;
  }
};

export default function RealEstateDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const fileRef = useRef(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [avatarUploadError, setAvatarUploadError] = useState(null);
  const [bannerUploadError, setBannerUploadError] = useState(null);
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        // Get stored company info
        const companyInfoStr = localStorage.getItem('companyInfo');
        const token = localStorage.getItem('realEstateToken');

        if (!companyInfoStr || !token) {
          throw new Error('No company info or token found');
        }

        const companyInfo = JSON.parse(companyInfoStr);

        const response = await fetch(`/api/real-estate/company/${companyInfo._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch company data');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch company data');
        }

        setCompanyData(data.company);
        setError(null);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError(err.message);
        if (err.message.includes('No company info')) {
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
          console.log('Missing token or company info');
          navigate('/real-estate-login');
          return;
        }

        // Get all listings from all agents
        const allListings = [];
        
        if (companyData?.agents && companyData.agents.length > 0) {
          console.log('Found agents:', companyData.agents.map(a => ({ id: a._id, name: a.name })));
          
          // Fetch listings for each agent
          const listingPromises = companyData.agents.map(async agent => {
            console.log(`Fetching listings for agent: ${agent.name} (${agent._id})`);
            const res = await fetch(`/api/listing/agent/${agent._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const data = await res.json();
            
            // Add agent info to each listing
            if (data.success && data.listings) {
              return data.listings.map(listing => ({
                ...listing,
                agent: {
                  _id: agent._id,
                  name: agent.name,
                  email: agent.email,
                  avatar: agent.avatar,
                  averageRating: agent.averageRating
                }
              }));
            }
            return [];
          });

          const results = await Promise.all(listingPromises);
          const combinedListings = results.flat();
          console.log('Combined listings with agent data:', combinedListings);
          setListings(combinedListings);
        } else {
          console.log('No agents found in company data');
          setListings([]);
        }
        
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListingsError(error.message);
      } finally {
        setListingsLoading(false);
      }
    };

    fetchListings();
  }, [activeTab, navigate, companyData]);

  const handleAvatarClick = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
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

      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadRes.json();
      
      // Update company avatar
      const token = localStorage.getItem('realEstateToken');
      const companyInfo = JSON.parse(localStorage.getItem('companyInfo'));

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

      const updateData = await updateRes.json();
      
      setUploadProgress(100);
      setCompanyData(prev => ({ ...prev, avatar: updateData.avatar }));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      setError(error.message);
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
      
      const res = await fetch(`/api/real-estate/remove-agent/${agentToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setCompanyData(prev => ({
        ...prev,
        agents: prev.agents.filter(agent => agent._id !== agentToDelete._id)
      }));

      setShowDeleteConfirm(false);
      setAgentToDelete(null);
    } catch (error) {
      setError(error.message);
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

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      handleImageUpload(file, 'avatar');
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      handleImageUpload(file, 'banner');
    }
  };

  const handleImageUpload = async (file, type) => {
    try {
      // Use Cloudinary for new uploads
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

      // Update company profile with the new Cloudinary URL
      const res = await fetch(`/api/real-estate/update-${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: companyData._id,
          [type]: uploadData.url,
          isCloudinary: true // Add flag to indicate this is a Cloudinary URL
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setCompanyData(prev => ({
          ...prev,
          [type]: uploadData.url
        }));
        
        if (type === 'avatar') {
          setAvatarUploadError(null);
        } else {
          setBannerUploadError(null);
        }
        
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      if (type === 'avatar') {
        setAvatarUploadError(error.message);
      } else {
        setBannerUploadError(error.message);
      }
    } finally {
      if (type === 'avatar') {
        setAvatarUploadProgress(0);
      } else {
        setBannerUploadProgress(0);
      }
    }
  };

  // Add this function to handle image URL display
  const getImageUrl = (imageUrl, type) => {
    if (!imageUrl) {
      return type === 'avatar' 
        ? "https://via.placeholder.com/150" 
        : "https://via.placeholder.com/1200x400";
    }

    // Check if it's a Cloudinary URL
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }

    // Handle Firebase URL
    if (imageUrl.startsWith('firebase')) {
      const storage = getStorage(app);
      const imageRef = ref(storage, imageUrl);
      return getDownloadURL(imageRef);
    }

    return imageUrl;
  };

  // Add loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Add error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-500">
          {error}
          <button 
            onClick={() => navigate('/real-estate-login')}
            className="ml-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Add null check for companyData
  if (!companyData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">No company data available</div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">
        {companyData.companyName} Dashboard
      </h1>

      {/* Company Info Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center gap-4">
          <img
            src={companyData.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
            alt="Company Logo"
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <h2 className="text-2xl font-semibold">{companyData.companyName}</h2>
            <p className="text-gray-600">{companyData.email}</p>
            <div className="flex items-center mt-2">
              <StarRating rating={companyData.companyRating || 0} />
              <span className="ml-2">({companyData.companyRating?.toFixed(1) || 'N/A'})</span>
            </div>
          </div>
        </div>
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

      {/* Content based on active tab */}
      {activeTab === 'overview' ? (
        <div>
          {/* Agents Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Our Agents</h2>
              <Link
                to="/add-agent"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add New Agent
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyData.agents?.map((agent) => (
                <div
                  key={agent._id}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <img
                    src={agent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                    alt={agent.name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                  />
                  <h3 className="text-lg font-semibold text-center">{agent.name}</h3>
                  <p className="text-gray-600 text-center">{agent.email}</p>
                  <div className="flex justify-center items-center mt-2">
                    <StarRating rating={agent.averageRating || 0} />
                    <span className="ml-2">({agent.averageRating?.toFixed(1) || 'N/A'})</span>
                  </div>
                </div>
              ))}
            </div>
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
                    
                    {/* Agent Information */}
                    {listing.agent && (
                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={listing.agent.avatar || '/default-profile.jpg'}
                          alt={listing.agent.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-profile.jpg';
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{listing.agent.name}</p>
                          {listing.agent.averageRating && (
                            <div className="flex items-center gap-1">
                              <StarRating rating={listing.agent.averageRating} size="small" />
                              <span className="text-xs text-gray-500">
                                ({listing.agent.averageRating.toFixed(1)})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rest of the listing details */}
                    <div className="flex items-center gap-2 mt-2">
                      <FaMapMarkerAlt className="text-gray-500" />
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

      {/* File Input */}
      <input
        type="file"
        ref={fileRef}
        hidden
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Delete Agent</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete agent {agentToDelete?.name}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4">Company Profile</h2>
        
        {/* Banner Section */}
        <div className="mb-6">
          <div className="relative h-[200px] md:h-[300px] rounded-lg overflow-hidden mb-2">
            <img
              src={getImageUrl(companyData?.banner, 'banner')}
              alt="Company Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1466&q=80"; // Default company banner
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-2xl font-bold">{companyData.companyName}</h3>
                {companyData.companyRating > 0 && (
                  <div className="flex items-center mt-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xl ${
                            star <= companyData.companyRating
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="ml-2">
                      ({companyData.companyRating.toFixed(1)})
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <button
                onClick={() => bannerRef.current.click()}
                className="bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit Banner
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={bannerRef}
            hidden
            accept="image/*"
            onChange={handleBannerUpload}
          />
          {bannerUploadProgress > 0 && bannerUploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${bannerUploadProgress}%` }}
              ></div>
            </div>
          )}
          {bannerUploadError && (
            <p className="text-red-500 text-sm mt-2">{bannerUploadError}</p>
          )}
        </div>

        {/* Avatar Section */}
        <div className="flex items-center space-x-6 mt-8">
          <div className="relative">
            <img
              src={getImageUrl(companyData?.avatar, 'avatar')}
              alt="Company Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/150?text=Company";
              }}
            />
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => avatarRef.current.click()}
                className="bg-black/70 text-white px-3 py-1 rounded-full text-sm hover:bg-black/80 transition-colors"
              >
                Change
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={avatarRef}
            hidden
            accept="image/*"
            onChange={handleAvatarUpload}
          />
          <div className="flex-1">
            <h3 className="text-2xl font-semibold">{companyData?.companyName}</h3>
            <p className="text-gray-600">{companyData?.email}</p>
            {avatarUploadProgress > 0 && avatarUploadProgress < 100 && (
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${avatarUploadProgress}%` }}
                ></div>
              </div>
            )}
            {avatarUploadError && (
              <p className="text-red-500 text-sm mt-1">{avatarUploadError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}