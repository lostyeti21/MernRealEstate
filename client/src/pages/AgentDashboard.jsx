import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaStar, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { updateUserSuccess } from '../redux/user/userSlice';

export default function AgentDashboard() {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(undefined);
  const [uploading, setUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.contact || '');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactUpdateSuccess, setContactUpdateSuccess] = useState(false);
  const [contactUpdateError, setContactUpdateError] = useState(null);
  const [companyRating, setCompanyRating] = useState(null);
  const [companyRatingError, setCompanyRatingError] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || '');
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);
  const [nameUpdateError, setNameUpdateError] = useState(null);

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

  useEffect(() => {
    const fetchCompanyRating = async () => {
      try {
        setCompanyRatingError(null);
        
        // Fetch agent data first
        const agentRes = await fetch(`/api/agent/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!agentRes.ok) {
          throw new Error('Failed to fetch agent data');
        }

        const agentData = await agentRes.json();
        if (!agentData.success || !agentData.agent) {
          throw new Error(agentData.message || 'Failed to fetch agent data');
        }

        // Update agent rating in Redux store if needed
        if (agentData.agent.averageRating !== currentUser.averageRating) {
          dispatch(updateUserSuccess({
            ...currentUser,
            averageRating: agentData.agent.averageRating
          }));
        }

        // Then fetch company data
        const companyId = agentData.agent.companyId;
        if (companyId) {
          const companyRes = await fetch(`/api/company/${companyId}`, {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (!companyRes.ok) {
            throw new Error('Failed to fetch company data');
          }

          const companyData = await companyRes.json();
          if (!companyData.success) {
            throw new Error(companyData.message || 'Failed to fetch company data');
          }

          setCompanyData(companyData.company);
          setCompanyRating(companyData.company.companyRating || 0);
        }
      } catch (error) {
        console.error('Error fetching company rating:', error);
        setCompanyRatingError('Failed to load ratings');
      }
    };

    if (currentUser?._id) {
      fetchCompanyRating();
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    const handleFileChange = async () => {
      if (!file) return;
      
      try {
        setUploading(true);
        setFileUploadError(false);
        
        const formData = new FormData();
        formData.append('image', file);  
        
        // Upload to Cloudinary through our API
        const uploadResponse = await fetch('/api/upload/image', {  
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`  
          },
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Failed to upload image');
        }

        // Update agent's avatar with Cloudinary URL
        const res = await fetch('/api/agent/update-avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            avatar: uploadData.url,
            agentId: currentUser._id,
            isCloudinary: true
          })
        });

        const data = await res.json();
        if (data.success) {
          setUpdateSuccess(true);
          // Update the Redux store with the new avatar
          dispatch(updateUserSuccess({
            ...currentUser,
            avatar: uploadData.url
          }));
        } else {
          throw new Error(data.message || 'Failed to update avatar');
        }
      } catch (error) {
        console.error('Error updating avatar:', error);
        setFileUploadError(true);
      } finally {
        setUploading(false);
      }
    };

    if (file) {
      handleFileChange();
    }
  }, [file, currentUser]);

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

  const handleContactUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setContactUpdateError(null);
      
      const res = await fetch('/api/agent/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          agentId: currentUser._id,
          phoneNumber: phoneNumber
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setContactUpdateSuccess(true);
        setIsEditingContact(false);
        // Update Redux store
        dispatch(updateUserSuccess({
          ...currentUser,
          contact: phoneNumber
        }));
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setContactUpdateSuccess(false);
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to update contact number');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setContactUpdateError(error.message);
    }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setNameUpdateError('Name cannot be empty');
      return;
    }

    try {
      const res = await fetch(`/api/agent/update-name/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          name: newName.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update name');
      }

      const data = await res.json();

      if (data.success) {
        setNameUpdateSuccess(true);
        setNameUpdateError(null);
        setIsEditingName(false);
        
        // Update Redux store
        dispatch(updateUserSuccess({
          ...currentUser,
          name: newName.trim()
        }));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setNameUpdateSuccess(false);
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      setNameUpdateError(error.message || 'Failed to update name');
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
      {/* Profile Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Agent Profile Section */}
          <div className="flex items-center gap-6">
            <input
              onChange={(e) => setFile(e.target.files[0])}
              type='file'
              ref={fileRef}
              hidden
              accept='image/*'
            />
            <img
              onClick={() => fileRef.current.click()}
              src={currentUser.avatar || "/default-profile.jpg"}
              alt="profile"
              className="w-24 h-24 rounded-full object-cover cursor-pointer"
            />
            <div className="flex flex-col gap-2">
              {/* Name Section */}
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <form onSubmit={handleNameUpdate} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter your full name"
                      className="border p-1 rounded text-lg"
                    />
                    <button 
                      type="submit"
                      className="text-green-500 hover:text-green-600"
                    >
                      <FaCheck size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setNewName(currentUser.name || '');
                        setNameUpdateError(null);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <FaTimes size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="text-lg font-semibold">{currentUser.name || 'Add your name'}</p>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <FaEdit size={16} />
                    </button>
                  </>
                )}
              </div>
              
              {nameUpdateSuccess && (
                <p className="text-green-500 text-sm">Name updated successfully!</p>
              )}
              {nameUpdateError && (
                <p className="text-red-500 text-sm">{nameUpdateError}</p>
              )}

              <p className="text-gray-500">{currentUser.email}</p>
              
              {/* Agent Rating */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Your Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${
                        star <= (currentUser.averageRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-gray-600">
                    ({currentUser.averageRating?.toFixed(1) || 'N/A'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Section */}
          {companyData && (
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4 border-t md:border-l md:border-t-0 pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
              <div className="w-full h-48 md:h-full overflow-hidden rounded-lg relative">
                <img
                  src={companyData.avatar || "/default-company.jpg"}
                  alt={companyData.companyName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
                  <h3 className="text-lg font-semibold">{companyData.companyName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={`${
                          star <= (companyRating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span>
                      ({companyRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Number Section */}
        <div className="mt-2">
          {isEditingContact ? (
            <form onSubmit={handleContactUpdate} className="flex items-center gap-2">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="border p-1 rounded"
              />
              <button 
                type="submit"
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
              >
                Save
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsEditingContact(false);
                  setPhoneNumber(currentUser.contact || '');
                }}
                className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-gray-700">
                Contact: {currentUser.contact || 'Not set'}
              </p>
              <button
                onClick={() => setIsEditingContact(true)}
                className="text-blue-500 hover:text-blue-600"
              >
                Edit
              </button>
            </div>
          )}
          
          {contactUpdateSuccess && (
            <p className="text-green-500 text-sm mt-1">Contact updated successfully!</p>
          )}
          {contactUpdateError && (
            <p className="text-red-500 text-sm mt-1">{contactUpdateError}</p>
          )}
        </div>

        <p className="text-sm">
          {fileUploadError ? (
            <span className='text-red-700'>
              Error uploading image (image must be less than 2 MB)
            </span>
          ) : uploading ? (
            <span className='text-slate-700'>Uploading...</span>
          ) : updateSuccess ? (
            <span className='text-green-700'>Image successfully uploaded!</span>
          ) : (
            <span className='text-slate-700'>Click on the image to update your profile picture</span>
          )}
        </p>
      </div>

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
