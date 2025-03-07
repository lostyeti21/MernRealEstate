import { useSelector } from "react-redux";
import { useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  updateUserSuccess,
  updateUserFailure,
  updateUserStart,
  signOut
} from "../redux/user/userSlice.js";
import { motion } from "framer-motion";
import { FaStar, FaUser, FaBuilding, FaPhone, FaEnvelope } from 'react-icons/fa';

const AgentDash = () => {
  const fileRef = useRef(null);
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(''); // 'uploading' | 'updating' | ''

  const [showListingsError, setShowListingsError] = useState(false);
  const [agentListings, setAgentListings] = useState([]);
  const [listingsFetched, setListingsFetched] = useState(false);

  // Loading state messages
  const loadingMessages = {
    uploading: 'Uploading your image...',
    updating: 'Updating your profile...',
  };

  const [agentRatings, setAgentRatings] = useState({
    overall: { averageRating: null, totalRatings: 0 },
    categories: {}
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        avatar: currentUser.avatar || '',
        companyId: currentUser.companyId || '',
        companyName: currentUser.companyName || ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    const uploadFile = async () => {
      if (!file) return;
      try {
        await handleFileUpload(file);
      } catch (error) {
        if (isMounted) {
          console.error('Failed to upload file:', error);
        }
      }
    };

    uploadFile();

    return () => {
      isMounted = false;
      // Reset states on unmount
      setFilePerc(0);
      setUploading(false);
      setUploadSuccess(false);
      setUploadPhase('');
      setFileUploadError(false);
    };
  }, [file]);

  useEffect(() => {
    let timeout;
    if (uploadSuccess) {
      timeout = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [uploadSuccess]);

  useEffect(() => {
    // If no agent is logged in, redirect to sign in
    if (!currentUser) {
      console.log('User authentication check failed:', {
        hasCurrentUser: Boolean(currentUser),
        redirectingTo: '/agent-signin'
      });
      navigate('/agent-signin');
    } else {
      console.log('Current user data:', {
        id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        isAgent: currentUser.isAgent,
        companyId: currentUser.companyId,
        companyName: currentUser.companyName,
        token: currentUser.token ? `${currentUser.token.substring(0, 20)}...` : 'No token'
      });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchAgentListings = async () => {
      try {
        const res = await fetch(`/api/agent/listings/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success === false) {
          setShowListingsError(true);
          return;
        }
        setAgentListings(data);
      } catch (error) {
        setShowListingsError(true);
      }
    };

    const fetchAgentRatings = async () => {
      try {
        const res = await fetch(`/api/agent/ratings/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success === false) {
          console.error('Failed to fetch ratings');
          return;
        }
        setAgentRatings(data.ratings);
      } catch (error) {
        console.error('Error fetching ratings:', error);
      }
    };

    if (currentUser) {
      fetchAgentListings();
      fetchAgentRatings();
    }
  }, [currentUser?._id]);

  // Helper function to get the best available token
  const getBestToken = () => {
    // Try to get token from different sources in order of preference
    return currentUser?.token || localStorage.getItem('mern_token') || '';
  };

  // Validate agent status and required data
  const validateAgentStatus = () => {
    if (!currentUser) {
      throw new Error('You must be logged in to update your avatar');
    }
    if (!currentUser.isAgent) {
      throw new Error('You are not authorized as an agent');
    }
    if (!currentUser.companyId) {
      throw new Error('Missing company ID. Please ensure you are properly registered with a real estate company.');
    }
    if (!currentUser._id) {
      throw new Error('Invalid agent ID. Please try logging in again.');
    }
    
    // Log validation success
    console.log('Agent validation passed:', {
      id: currentUser._id,
      isAgent: currentUser.isAgent,
      companyId: currentUser.companyId,
      hasToken: Boolean(currentUser.token)
    });
  };

  const handleFileUpload = async (file, retryCount = 0) => {
    try {
      // Validate agent status before proceeding
      validateAgentStatus();
      
      console.log('Starting file upload process:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        agentId: currentUser._id,
        hasToken: Boolean(currentUser.token),
        tokenPreview: currentUser.token ? `${currentUser.token.substring(0, 20)}...` : 'No token'
      });

      setFileUploadError(false);
      setFilePerc(0);
      setUploading(true);
      setUpdateSuccess(false);
      setUploadPhase('uploading');

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Start upload progress
      setFilePerc(10);

      // Validate company ID before proceeding
      if (!currentUser.companyId) {
        throw new Error('Missing company ID. Please ensure you are properly registered with a real estate company.');
      }

      try {
        // Upload to backend
        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Image upload failed');
        }

        const uploadData = await uploadResponse.json();
        if (!uploadData.url) {
          throw new Error('No URL returned from image upload');
        }

        setFilePerc(50);
        setUploadPhase('updating');

        // Update form data with temporary URL
        const imageUrl = uploadData.url;
        setFormData(prev => ({ ...prev, avatar: imageUrl }));

        // Log request data before sending
        console.log('Sending avatar update request:', {
          url: `/api/agent/update-avatar/${currentUser._id}`,
          agentId: currentUser._id,
          companyId: currentUser.companyId,
          tokenPresent: Boolean(currentUser.token),
          tokenPreview: currentUser.token ? `Bearer ${currentUser.token.substring(0, 15)}...` : 'No token',
          avatarUrl: imageUrl ? `${imageUrl.substring(0, 30)}...` : 'No URL'
        });

        // Get the best available token
        const token = getBestToken();
        
        // Log authentication details
        console.log('Authentication details:', {
          hasCurrentUserToken: Boolean(currentUser.token),
          hasLocalStorageToken: Boolean(localStorage.getItem('mern_token')),
          usingToken: token ? `${token.substring(0, 15)}...` : 'No token available'
        });
        
        // Update backend with new avatar using the agent update endpoint
        const updateResponse = await fetch(`/api/agent/update-avatar/${currentUser._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            avatar: imageUrl,
            companyId: currentUser.companyId
          }),
          credentials: 'include'
        });

        // Log the response status
        console.log('Avatar update response status:', {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          ok: updateResponse.ok
        });

        let responseData;
        try {
          responseData = await updateResponse.json();
          console.log('Avatar update response data:', {
            success: responseData.success,
            message: responseData.message,
            hasAgent: Boolean(responseData.agent),
            hasToken: Boolean(responseData.token),
            tokenPreview: responseData.token ? `${responseData.token.substring(0, 15)}...` : 'No token'
          });
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          throw new Error('Invalid response from server');
        }

        if (!updateResponse.ok || !responseData.success) {
          const errorMessage = responseData.message || 'Failed to update avatar';
          if (errorMessage.includes('company')) {
            throw new Error('Company validation failed. Please ensure you are logged in with the correct company.');
          }
          throw new Error(errorMessage);
        }

        // Validate response data
        if (!responseData.agent || !responseData.token) {
          console.error('Invalid response format:', responseData);
          throw new Error('Invalid response format from server');
        }

        // Validate required agent fields
        const requiredFields = ['_id', 'name', 'email', 'avatar', 'companyId', 'companyName'];
        const missingFields = requiredFields.filter(field => !responseData.agent[field]);
        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          throw new Error('Invalid agent data received from server');
        }

        // Update Redux store with the complete agent data including company details
        // Use response data and ensure we have valid tokens and agent data
        if (!responseData.token) {
          console.error('No token received in response:', responseData);
          throw new Error('No authentication token received from server');
        }
        
        // Verify the agent data has all required fields
        if (!responseData.agent.companyId || !responseData.agent._id) {
          console.error('Invalid agent data received:', responseData.agent);
          throw new Error('Invalid agent data received from server');
        }

        const updatedUserData = {
          ...currentUser,
          ...responseData.agent,
          token: responseData.token,
          isAgent: true // Ensure this flag is set
        };

        // Verify the token is correctly added
        console.log('Updating user data:', {
          id: updatedUserData._id,
          name: updatedUserData.name,
          companyId: updatedUserData.companyId,
          companyName: updatedUserData.companyName,
          hasAvatar: Boolean(updatedUserData.avatar),
          tokenPreview: updatedUserData.token ? `${updatedUserData.token.substring(0, 20)}...` : 'No token',
          isAgent: updatedUserData.isAgent
        });

        // Update the Redux store with the new user data
        dispatch(updateUserSuccess(updatedUserData));
        
        // Set the token in localStorage as a backup
        localStorage.setItem('mern_token', responseData.token);

        // Complete progress
        setFilePerc(100);
        setUploading(false);
        setUploadSuccess(true);
        setUpdateSuccess(true);
        setFileUploadError(false);
        setUploadPhase('');
      } catch (error) {
        // Revert form data on error
        setFormData(prev => ({ ...prev, avatar: currentUser.avatar }));
        setUploadPhase('');
        throw error;
      }

    } catch (error) {
      console.error('Error in avatar update:', {
        error: error.message,
        phase: error.message.includes('upload') ? 'image_upload' : 'avatar_update',
        retryCount
      });

      // Check if we should retry
      const maxRetries = 2;
      const isRetryableError = (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('connection') ||
        error.message.includes('ECONNREFUSED')
      );

      if (isRetryableError && retryCount < maxRetries) {
        console.log(`Retrying avatar update (attempt ${retryCount + 1} of ${maxRetries})...`);
        // Wait for a short delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return handleFileUpload(file, retryCount + 1);
      }

      // Set appropriate error message based on the phase
      const errorMessage = error.message.includes('upload')
        ? 'Failed to upload image. Please try again.'
        : error.message || 'Failed to update avatar. Please try again.';

      setFileUploadError(errorMessage);
      setUpdateSuccess(false);
      setFilePerc(0);
      setUploading(false);
      setUploadSuccess(false);
      setUploadPhase('');

      // Reset form data if avatar update failed
      if (!error.message.includes('upload')) {
        setFormData(prev => ({
          ...prev,
          avatar: currentUser.avatar
        }));
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await fetch(`/api/agent/update/${currentUser._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success === false) {
        dispatch(updateUserFailure(data.message));
        return;
      }

      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
    } catch (error) {
      dispatch(updateUserFailure(error.message));
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout');
      dispatch(signOut());
      navigate('/agent-signin');
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteListing = async (listingId) => {
    try {
      const res = await fetch(`/api/agent/listing/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const data = await res.json();
      if (data.success === false) {
        console.log(data.message);
        return;
      }

      setAgentListings((prev) =>
        prev.filter((listing) => listing._id !== listingId)
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>
        Agent Dashboard
      </h1>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <input
          onChange={(e) => setFile(e.target.files[0])}
          type='file'
          ref={fileRef}
          hidden
          accept='image/*'
        />
        <div className="relative self-center">
          <img
            onClick={() => !uploading && fileRef.current.click()}
            src={formData.avatar || currentUser.avatar}
            alt='profile'
            className={`rounded-full h-24 w-24 object-cover cursor-pointer mt-2 transition-opacity duration-200 ${uploading ? 'opacity-50' : ''}`}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
        <p className='text-sm self-center'>
          {fileUploadError ? (
            <span className='text-red-700'>{fileUploadError}</span>
          ) : uploadPhase ? (
            <span className='text-slate-700'>{loadingMessages[uploadPhase]}</span>
          ) : uploadSuccess ? (
            <span className='text-green-700'>Avatar updated successfully!</span>
          ) : (
            <span className='text-gray-500'>Click on the image to update your avatar</span>
          )}
        </p>
        <div className='flex flex-col gap-4 bg-slate-100 p-4 rounded-lg'>
          <div className='flex items-center gap-2'>
            <FaUser className='text-slate-700' />
            <span className='font-semibold'>Name:</span>
            <span>{currentUser.name}</span>
          </div>
          <div className='flex items-center gap-2'>
            <FaEnvelope className='text-slate-700' />
            <span className='font-semibold'>Email:</span>
            <span>{currentUser.email}</span>
          </div>
          <div className='flex items-center gap-2'>
            <FaBuilding className='text-slate-700' />
            <span className='font-semibold'>Company:</span>
            <span>{currentUser.companyName}</span>
          </div>
          {currentUser.contact && (
            <div className='flex items-center gap-2'>
              <FaPhone className='text-slate-700' />
              <span className='font-semibold'>Contact:</span>
              <span>{currentUser.contact}</span>
            </div>
          )}
        </div>

        {/* Agent Ratings Section */}
        {agentRatings.overall.averageRating !== null && (
          <div className='flex flex-col gap-4 bg-slate-100 p-4 rounded-lg mt-4'>
            <h3 className='text-lg font-semibold'>Agent Ratings</h3>
            <div className='flex items-center gap-2'>
              <span>Overall Rating:</span>
              <div className='flex items-center'>
                {[...Array(5)].map((_, index) => (
                  <FaStar
                    key={index}
                    className={index < Math.round(agentRatings.overall.averageRating)
                      ? 'text-yellow-500'
                      : 'text-gray-300'
                    }
                  />
                ))}
                <span className='ml-2'>
                  ({agentRatings.overall.averageRating.toFixed(1)}/5 from {agentRatings.overall.totalRatings} ratings)
                </span>
              </div>
            </div>
            {Object.entries(agentRatings.categories).map(([category, rating]) => (
              <div key={category} className='flex items-center gap-2'>
                <span className='capitalize'>{category}:</span>
                <div className='flex items-center'>
                  {[...Array(5)].map((_, index) => (
                    <FaStar
                      key={index}
                      className={index < Math.round(rating.averageRating)
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                      }
                    />
                  ))}
                  <span className='ml-2'>
                    ({rating.averageRating.toFixed(1)}/5)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSignOut}
          className='bg-slate-700 text-white rounded-lg p-3 hover:opacity-95'
        >
          Sign out
        </button>
      </form>

      <div className='flex justify-between mt-5'>
        <Link
          className='bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
          to={'/create-listing'}
        >
          Create listing
        </Link>
      </div>

      <p className='text-red-700 mt-5'>
        {error ? error : ''}
      </p>
      <p className='text-green-700 mt-5'>
        {updateSuccess ? 'User is updated successfully!' : ''}
      </p>

      {showListingsError && (
        <p className='text-red-700 mt-5'>Error showing listings</p>
      )}

      {agentListings && agentListings.length > 0 && (
        <div className='flex flex-col gap-4'>
          <h1 className='text-center mt-7 text-2xl font-semibold'>
            Your Listings
          </h1>
          {agentListings.map((listing) => (
            <div
              key={listing._id}
              className='border rounded-lg p-3 flex justify-between items-center gap-4'
            >
              <Link to={`/listing/${listing._id}`}>
                <img
                  src={listing.imageUrls[0]}
                  alt='listing cover'
                  className='h-16 w-16 object-contain'
                />
              </Link>
              <Link
                className='text-slate-700 font-semibold  hover:underline truncate flex-1'
                to={`/listing/${listing._id}`}
              >
                <p>{listing.name}</p>
              </Link>

              <div className='flex flex-col item-center'>
                <button
                  onClick={() => handleDeleteListing(listing._id)}
                  className='text-red-700 uppercase'
                >
                  Delete
                </button>
                <Link to={`/update-listing/${listing._id}`}>
                  <button className='text-green-700 uppercase'>Edit</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentDash;
