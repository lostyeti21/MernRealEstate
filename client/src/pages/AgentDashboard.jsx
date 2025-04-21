import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaStar, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { updateUserSuccess } from '../redux/user/userSlice';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function AgentDashboard() {
  const { currentUser, isAgent } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(undefined);
  const [uploading, setUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [filePerc, setFilePerc] = useState(0);
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
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState(null);
  const [agentRating, setAgentRating] = useState(currentUser?.averageRating || 0);
  const [agentRatingError, setAgentRatingError] = useState(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });
  
  // Verification code states
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);
  const [showShareButton, setShowShareButton] = useState(false);
  const qrRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!isAgent) {
      console.error('Not an agent, redirecting to login');
      navigate('/real-estate-agent-login');
      return;
    }
  }, [isAgent, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'analytics') {
      navigate('/agent-analytics', { state: { returnTab: activeTab } });
    }
  };

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
        // Fetch agent data first
        const agentRes = await fetch(`/api/agent/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!agentRes.ok) {
          throw new Error('Failed to fetch agent data');
        }

        const agentData = await agentRes.json();
        
        // Check if agent has a company
        const companyId = agentData.agent?.companyId;
        if (!companyId) {
          console.log('No company associated with this agent');
          return;
        }

        // Fetch company data
        const companyRes = await fetch(`/api/company/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!companyRes.ok) {
          // Log the full response for debugging
          const errorText = await companyRes.text();
          console.error('Company fetch error:', {
            status: companyRes.status,
            statusText: companyRes.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch company data: ${companyRes.status}`);
        }

        const companyData = await companyRes.json();
        
        // Validate company data
        if (!companyData.success) {
          throw new Error(companyData.message || 'Invalid company data');
        }

        // Set company data safely
        setCompanyData(companyData.company || null);
        setCompanyRating(companyData.company?.companyRating || 0);
      } catch (error) {
        console.error('Comprehensive error in company rating fetch:', error);
        setCompanyRatingError(error.message || 'Failed to load company ratings');
        // Optional: set default or fallback values
        setCompanyData(null);
        setCompanyRating(0);
      }
    };

    // Only attempt fetch if user is authenticated
    if (currentUser?._id && currentUser?.token) {
      fetchCompanyRating();
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    const fetchAgentRating = async () => {
      try {
        // Fetch agent data to get the most up-to-date rating
        const agentRes = await fetch(`/api/agent/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!agentRes.ok) {
          throw new Error('Failed to fetch agent data');
        }

        const data = await agentRes.json();
        
        // Check if agent data exists and has a rating
        if (data.success && data.agent && typeof data.agent.averageRating !== 'undefined') {
          const newRating = data.agent.averageRating;
          setAgentRating(newRating);

          // Update Redux store if rating has changed
          if (newRating !== currentUser.averageRating) {
            dispatch(updateUserSuccess({
              ...currentUser,
              averageRating: newRating
            }));
          }
        } else {
          console.log('No rating found for agent');
          setAgentRating(0);
        }
      } catch (error) {
        console.error('Error fetching agent rating:', error);
        setAgentRatingError(error.message || 'Failed to load agent rating');
        setAgentRating(0);
      }
    };

    // Only attempt fetch if user is an authenticated agent
    if (currentUser?._id && currentUser?.token && isAgent) {
      fetchAgentRating();
    }
  }, [currentUser, dispatch, isAgent]);

  useEffect(() => {
    const checkPasswordsMatch = () => {
      if (passwordData.newPassword || passwordData.confirmPassword) {
        setPasswordsMatch(passwordData.newPassword === passwordData.confirmPassword);
      } else {
        setPasswordsMatch(true);
      }
    };

    checkPasswordsMatch();
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  useEffect(() => {
    const checkPasswordStrength = () => {
      const newPassword = passwordData.newPassword;
      setPasswordStrength({
        length: newPassword.length >= 6,
        uppercase: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
      });
    };

    checkPasswordStrength();
  }, [passwordData.newPassword]);

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  useEffect(() => {
    const fetchVerificationCode = async () => {
      if (!currentUser || !currentUser._id) return;
      
      try {
        setCodeLoading(true);
        setCodeError(null);
        
        const response = await fetch('/api/code/generate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to generate verification code');
        }
        
        setCode(data.code);
      } catch (error) {
        console.error('Error generating verification code:', error);
        setCodeError(error.message);
      } finally {
        setCodeLoading(false);
      }
    };
    
    fetchVerificationCode();
  }, [currentUser]);

  const handleFileUpload = async (file) => {
    try {
      // Reset states at the start
      setFileUploadError(null);
      setUpdateSuccess(false);
      setFilePerc(0);

      // Validate agent data and token
      if (!currentUser) {
        throw new Error('You must be logged in to update your avatar');
      }

      const { _id, companyId, token, isAgent } = currentUser;

      if (!isAgent) {
        throw new Error('Only agents can update their avatar');
      }

      if (!_id || !companyId) {
        throw new Error('Missing agent credentials. Please log in again.');
      }

      // Check for token in multiple places
      const authToken = token || 
                       localStorage.getItem('access_token') || 
                       localStorage.getItem('agent_token');

      if (!authToken) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      console.log('Starting avatar upload process:', {
        fileName: file?.name,
        fileSize: file?.size,
        agentId: _id,
        companyId: companyId,
        isAgent,
        token: 'present'
      });

      // Validate file
      if (!file) {
        throw new Error('Please select a file');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image must be less than 2MB');
      }

      setUploading(true);
      setFilePerc(10);

      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      console.log('Uploading image...');
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      let uploadData;
      try {
        const uploadText = await uploadRes.text();
        uploadData = JSON.parse(uploadText);
        
        if (!uploadRes.ok) {
          throw new Error(uploadData.message || `Upload failed: ${uploadRes.status}`);
        }
      } catch (parseError) {
        console.error('Error parsing upload response:', parseError);
        throw new Error('Invalid response from upload server');
      }

      if (!uploadData?.url) {
        throw new Error('No URL returned from image upload');
      }

      setFilePerc(50);
      console.log('Image uploaded successfully:', { url: uploadData.url });

      // Update agent profile
      console.log('Updating agent profile...');
      const updateRes = await fetch(`/api/agent/update-avatar/${_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          avatar: uploadData.url,
          companyId: companyId
        }),
        credentials: 'include'
      });

      let updateData;
      try {
        const updateText = await updateRes.text();
        updateData = JSON.parse(updateText);

        if (!updateRes.ok) {
          throw new Error(updateData.message || 'Failed to update profile');
        }
      } catch (parseError) {
        console.error('Error parsing profile update response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!updateData.success || !updateData.agent) {
        throw new Error(updateData.message || 'Invalid response from server');
      }

      // Update Redux store with complete agent data
      const updatedUser = {
        ...currentUser,
        ...updateData.agent,
        token: updateData.token || currentUser.token // Use new token if provided
      };
      dispatch(updateUserSuccess(updatedUser));

      // Store new token if provided
      if (updateData.token) {
        localStorage.setItem('access_token', updateData.token);
        localStorage.setItem('agent_token', updateData.token); // Store in both places for compatibility
      }

      setFilePerc(100);
      setUpdateSuccess(true);
      console.log('Avatar update completed successfully:', updatedUser);

      // Reset states after delay
      setTimeout(() => {
        setUpdateSuccess(false);
        setFilePerc(0);
        setUploading(false);
      }, 3000);

    } catch (error) {
      console.error('Avatar update error:', error);
      setFileUploadError(error.message || 'Failed to update avatar');
      setUpdateSuccess(false);
      setFilePerc(0);
    } finally {
      if (!updateSuccess) {
        setUploading(false);
      }
    }
  };

  const handleAvatarClick = () => {
    if (uploading) return;
    fileRef.current?.click();
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

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      setEmailUpdateError('Email cannot be empty');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailUpdateError('Please enter a valid email address');
      return;
    }

    try {
      const res = await fetch(`/api/agent/update-email/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          email: newEmail.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update email');
      }

      const data = await res.json();

      if (data.success) {
        setEmailUpdateSuccess(true);
        setEmailUpdateError(null);
        setIsEditingEmail(false);
        
        // Update Redux store
        dispatch(updateUserSuccess({
          ...currentUser,
          email: newEmail.trim()
        }));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setEmailUpdateSuccess(false);
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to update email');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      setEmailUpdateError(error.message || 'Failed to update email');
    }
  };

  const handleCreateListing = () => {
    // Double-check agent status before navigation
    if (isAgent) {
      navigate('/agent-create-listing');
    } else {
      console.error('Not authorized to create listings');
      navigate('/real-estate-agent-login');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    // Reset states
    setPasswordUpdateError(null);
    setPasswordUpdateSuccess(false);

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordUpdateError("New passwords don't match");
      return;
    }

    if (!Object.values(passwordStrength).every(Boolean)) {
      setPasswordUpdateError("Password does not meet the requirements");
      return;
    }

    try {
      const res = await fetch(`/api/real-estate/agent/update-password/${currentUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setPasswordUpdateSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsEditingPassword(false);

      // Show success notification
      toast.success('Password updated successfully', {
        duration: 3000,
        position: 'top-center',
      });

    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordUpdateError(error.message);
      
      // Show error notification
      toast.error(error.message || 'Failed to update password', {
        duration: 3000,
        position: 'top-center',
      });
    }
  };

  // Handle sharing QR code
  const handleShareQR = async () => {
    try {
      if (!qrRef.current) {
        toast.error('QR code not available');
        return;
      }
      
      // Create a canvas from the SVG
      const svgElement = qrRef.current;
      
      // Check if the SVG element has the required properties
      if (!svgElement || !svgElement.width || !svgElement.width.baseVal) {
        console.error('SVG element is not properly initialized', svgElement);
        toast.error('QR code is not ready yet. Please try again.');
        return;
      }
      
      const canvas = document.createElement('canvas');
      const width = svgElement.width.baseVal.value || 128; // Default to 128 if value is undefined
      const height = svgElement.height.baseVal.value || 128; // Default to 128 if value is undefined
      
      canvas.width = width * 2;
      canvas.height = height * 2;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      try {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        
        img.onload = async () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          try {
            canvas.toBlob(async (blob) => {
              const file = new File([blob], 'agent-rating-qr.png', { type: 'image/png' });
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'Rate me as an agent',
                    text: `Please rate me as an agent using this QR code or verification code: ${code}`,
                    files: [file]
                  });
                  toast.success('QR code shared successfully');
                } catch (shareError) {
                  console.error('Share error:', shareError);
                  fallbackShare(canvas);
                }
              } else {
                fallbackShare(canvas);
              }
            }, 'image/png');
          } catch (error) {
            console.error('Error sharing:', error);
            toast.error('Failed to share QR code');
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load QR code image');
          toast.error('Failed to generate QR code image');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (svgError) {
        console.error('Error processing SVG:', svgError);
        toast.error('Failed to process QR code');
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      toast.error('Failed to share QR code');
    }
  };
  
  // Fallback share method
  const fallbackShare = (canvas) => {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'agent-rating-qr.png';
      link.href = dataUrl;
      link.click();
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Fallback share error:', error);
      toast.error('Failed to download QR code');
    }
  };
  
  // Calculate time remaining for verification code
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const fetchExpiryTime = async () => {
      try {
        const response = await fetch('/api/code/get', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch code expiry time');
        }
        
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.expiryTime) {
          const expiryTime = new Date(data.expiryTime);
          const now = new Date();
          const diff = expiryTime - now;
          
          if (diff <= 0) {
            setTimeRemaining('Expired');
          } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeRemaining(`${hours}h ${minutes}m`);
          }
        }
      } catch (error) {
        console.error('Error fetching expiry time:', error);
        if (isMounted) {
          setTimeRemaining('Error');
        }
      }
    };
    
    fetchExpiryTime();
    
    // Set up interval to update the time remaining
    const intervalId = setInterval(fetchExpiryTime, 60000); // Update every minute
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentUser, code]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-center my-7'>Agent Dashboard</h1>
      
      {/* Navigation Tabs */}
      <div className='flex justify-center mb-6'>
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`px-4 py-2 mx-2 rounded ${activeTab === 'dashboard' ? 'bg-slate-700 text-white' : 'bg-gray-200'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => handleTabChange('analytics')}
          className={`px-4 py-2 mx-2 rounded ${activeTab === 'analytics' ? 'bg-slate-700 text-white' : 'bg-gray-200'}`}
        >
          Analytics
        </button>
      </div>
      {/* Profile Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Agent Profile Section */}
          <div className="flex items-center gap-6">
            {/* Hidden file input for avatar */}
            <input
              type="file"
              ref={fileRef}
              hidden
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
            />

            {/* Avatar Section */}
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <img
                src={currentUser.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
                alt="profile"
                className="h-24 w-24 rounded-full object-cover transition-all duration-300 group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-white text-sm">{uploading ? 'Uploading...' : 'Change Photo'}</span>
              </div>
              {filePerc > 0 && filePerc < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300" 
                    style={{ width: `${filePerc}%` }}
                  />
                </div>
              )}
            </div>

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
              
              {nameUpdateError && (
                <p className="text-red-500 text-sm">{nameUpdateError}</p>
              )}

              {/* Email Section */}
              <div className="flex items-center gap-2">
                {isEditingEmail ? (
                  <form onSubmit={handleEmailUpdate} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="border p-1 rounded text-sm w-full"
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
                        setIsEditingEmail(false);
                        setNewEmail(currentUser.email || '');
                        setEmailUpdateError(null);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <FaTimes size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="text-gray-500">{currentUser.email}</p>
                    <button
                      onClick={() => setIsEditingEmail(true)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <FaEdit size={16} />
                    </button>
                  </>
                )}
              </div>
              
              {emailUpdateSuccess && (
                <p className="text-green-500 text-sm">Email updated successfully!</p>
              )}
              {emailUpdateError && (
                <p className="text-red-500 text-sm">{emailUpdateError}</p>
              )}
              
              {/* Agent Rating */}
              {fileUploadError && (
                <p className="text-red-500 text-sm mt-2">{fileUploadError}</p>
              )}
              {updateSuccess && (
                <p className="text-green-500 text-sm mt-2">Profile picture updated successfully!</p>
              )}

              <div className="flex items-center gap-2 mt-4">
                <span className="text-gray-700">Your Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${
                        star <= Math.round(agentRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-gray-600">
                    {agentRating ? `(${agentRating.toFixed(1)})` : '(No ratings yet)'}
                  </span>
                </div>
                {agentRatingError && (
                  <span className="text-red-500 text-sm ml-2">{agentRatingError}</span>
                )}
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

        {/* Password Update Section with Glassmorphism */}
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Security Settings</h2>
          {isEditingPassword ? (
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white border-opacity-30">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 font-medium mb-2 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {/* Password Strength Indicators */}
                  <div className="mt-2 space-y-1">
                    <div className="text-sm flex items-center gap-2">
                      <span className={`${passwordStrength.length ? 'text-green-500' : 'text-red-500'}`}>
                        {passwordStrength.length ? <FaCheck /> : <FaTimes />}
                      </span>
                      <span className="text-gray-600">At least 6 characters</span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span className={`${passwordStrength.uppercase ? 'text-green-500' : 'text-red-500'}`}>
                        {passwordStrength.uppercase ? <FaCheck /> : <FaTimes />}
                      </span>
                      <span className="text-gray-600">One uppercase letter</span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span className={`${passwordStrength.number ? 'text-green-500' : 'text-red-500'}`}>
                        {passwordStrength.number ? <FaCheck /> : <FaTimes />}
                      </span>
                      <span className="text-gray-600">One number</span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span className={`${passwordStrength.special ? 'text-green-500' : 'text-red-500'}`}>
                        {passwordStrength.special ? <FaCheck /> : <FaTimes />}
                      </span>
                      <span className="text-gray-600">One special character</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 font-medium mb-2 block">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {passwordUpdateError && (
                  <div className="text-red-500 text-sm mt-2">{passwordUpdateError}</div>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={!Object.values(passwordStrength).every(Boolean)}
                    className={`px-6 py-2 rounded-lg text-white font-medium transition duration-200 ${
                      Object.values(passwordStrength).every(Boolean)
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(false)}
                    className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingPassword(true)}
              className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition duration-200"
            >
              Change Password
            </button>
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

      {/* Verification Code Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Rating Verification</h2>
        
        <div className="flex flex-col md:flex-row justify-around items-center gap-8">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div 
              className="relative mb-3"
              onMouseEnter={() => setShowShareButton(true)}
              onMouseLeave={() => setShowShareButton(false)}
            >
              <QRCodeSVG
                ref={qrRef}
                value={`${window.location.origin}/generated-code`}
                size={128}
                level="H"
                includeMargin={true}
                className={`shadow-md rounded-lg transition-all duration-500 ease-in-out ${
                  showShareButton ? 'blur-[2px]' : ''
                }`}
              />
              {showShareButton && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleShareQR}
                    className="bg-black bg-opacity-75 text-white px-4 py-1 rounded-lg 
                             transition-all duration-300 ease-in-out hover:bg-opacity-90 
                             text-sm font-medium z-10"
                  >
                    Share QR
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Scan to view verification code
            </p>
          </div>
          
          {/* Verification Code */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-medium text-slate-700 mb-3">Verification Code:</h3>
            {codeLoading ? (
              <p className="text-gray-500">Loading code...</p>
            ) : codeError ? (
              <p className="text-red-700">{codeError}</p>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-mono tracking-wider">
                  {code.split('').map((char, index) => (
                    <span 
                      key={index} 
                      className={`${/[0-9]/.test(char) ? 'text-blue-600' : 
                        /[A-Z]/.test(char) ? 'text-green-600' : 'text-purple-600'}`}
                    >
                      {char}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">Valid for: {timeRemaining}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 text-center mt-2">
              Share this code with clients to get rated
            </p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Clients can rate you using either this verification code or any contract number where you're listed as the agent.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <button
          onClick={handleCreateListing}
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
            onClick={handleCreateListing}
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
