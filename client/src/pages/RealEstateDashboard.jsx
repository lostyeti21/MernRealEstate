import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StarRating from '../components/StarRating';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { app } from "../firebase";

const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";

const safeJSONParse = (str) => {
  if (!str) return null;
  try {
    // Check if str is already an object
    if (typeof str === 'object') return str;
    // Try to parse the string
    return JSON.parse(str);
  } catch (e) {
    console.error('Error parsing JSON:', { error: e, value: str });
    return null;
  }
};

export default function RealEstateDashboard() {
  const navigate = useNavigate();
  const { currentUser, realEstateCompany, isRealEstateCompany } = useSelector((state) => state.user);
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

  // Redirect if not logged in as real estate company
  useEffect(() => {
    if (!isRealEstateCompany || !realEstateCompany) {
      navigate('/real-estate-login');
      return;
    }
  }, [isRealEstateCompany, realEstateCompany, navigate]);

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
      const companyInfo = JSON.parse(localStorage.getItem('realEstateCompany'));

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

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Banner size should be less than 2MB');
      }

      setBannerUploadProgress(0);
      setBannerUploadError(null);

      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('realEstateToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Upload image
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload banner');
      }

      const uploadData = await uploadRes.json();

      // Update company with new banner URL
      const updateRes = await fetch(`/api/company/update/${realEstateCompany._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          banner: uploadData.url
        })
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update company banner');
      }

      const updateData = await updateRes.json();

      // Update state and localStorage
      setCompanyData(updateData.company);
      localStorage.setItem('realEstateCompany', JSON.stringify(updateData.company));

      // Force banner image update
      const bannerImg = document.querySelector('.company-banner');
      if (bannerImg) {
        bannerImg.src = uploadData.url;
      }

    } catch (error) {
      console.error('Banner upload error:', error);
      setBannerUploadError(error.message);
    } finally {
      setBannerUploadProgress(0);
    }
  };

  const handleImageUpload = async (file, type) => {
    try {
      // Use Cloudinary for new uploads
      const formData = new FormData();
      formData.append('image', file);

      // Get company info and token
      const token = localStorage.getItem('realEstateToken');
      let companyInfo;
      try {
        const storedInfo = localStorage.getItem('realEstateCompany');
        companyInfo = JSON.parse(storedInfo);
        console.log('Retrieved company info:', companyInfo);
      } catch (e) {
        console.error('Error parsing company info:', e);
        throw new Error('Invalid company information');
      }

      if (!token || !companyInfo?._id) {
        throw new Error('Missing authentication or company information');
      }

      console.log('Starting image upload...', { type, companyId: companyInfo._id });

      // Upload to Cloudinary through our backend
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error('Upload response error:', errorText);
        throw new Error('Failed to upload image');
      }

      let uploadData;
      try {
        uploadData = await uploadRes.json();
        console.log('Upload successful:', uploadData);
      } catch (e) {
        console.error('Error parsing upload response:', e);
        throw new Error('Invalid response from upload service');
      }

      if (!uploadData.success) {
        throw new Error(uploadData.message || 'Failed to upload image');
      }

      // Update company profile with the new Cloudinary URL
      const updateEndpoint = `/api/company/update/${companyInfo._id}`;
      const updateBody = { [type]: uploadData.url };

      console.log('Updating company profile...', {
        endpoint: updateEndpoint,
        body: updateBody,
        token: !!token
      });

      const res = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateBody)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Update response error:', errorText);
        throw new Error(`Failed to update ${type}`);
      }

      let responseData;
      try {
        responseData = await res.json();
        console.log('Update successful:', responseData);
      } catch (e) {
        console.error('Error parsing update response:', e);
        throw new Error('Invalid response from update service');
      }

      if (!responseData.success) {
        throw new Error(responseData.message || `Failed to update ${type}`);
      }

      // Update local state and storage with the entire updated company data
      console.log('Updating local state with response data:', {
        companyId: responseData.company._id,
        hasBanner: !!responseData.company.banner,
        bannerUrl: responseData.company.banner
      });

      localStorage.setItem('realEstateCompany', JSON.stringify(responseData.company));
      setCompanyData(responseData.company);

      // Show success message
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
      
      if (type === 'banner') {
        setBannerUploadProgress(100);
        // Force a re-render of the banner
        const bannerImg = document.querySelector('.company-banner');
        if (bannerImg) {
          console.log('Forcing banner image update with URL:', responseData.company.banner);
          bannerImg.src = responseData.company.banner;
        }
      } else {
        setAvatarUploadProgress(100);
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
    console.log('Processing image URL:', { imageUrl, type });

    // Default images
    const defaultAvatarUrl = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    const defaultBannerUrl = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1466&q=80";

    // If no image URL provided, return default
    if (!imageUrl) {
      console.log(`No ${type} URL provided, using default`);
      return type === 'avatar' ? defaultAvatarUrl : defaultBannerUrl;
    }

    // Handle Cloudinary URLs
    if (imageUrl.includes('cloudinary.com')) {
      console.log(`Using Cloudinary ${type} URL:`, imageUrl);
      return imageUrl;
    }

    // Handle default images
    if (type === 'avatar' && imageUrl === 'default-company-avatar.png') {
      console.log('Using default avatar');
      return defaultAvatarUrl;
    }

    // If URL is absolute
    if (imageUrl.startsWith('http')) {
      console.log(`Using absolute ${type} URL:`, imageUrl);
      return imageUrl;
    }

    console.log(`No valid ${type} URL found, using default`);
    return type === 'avatar' ? defaultAvatarUrl : defaultBannerUrl;
  };

  // Add initial data loading
  useEffect(() => {
    if (!realEstateCompany) {
      navigate('/real-estate-login');
      return;
    }

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get token and stored company info
        const token = localStorage.getItem('realEstateToken');
        const storedCompanyInfo = localStorage.getItem('realEstateCompany');
        
        console.log('Initial stored company info:', storedCompanyInfo);
        
        let parsedCompanyInfo;
        try {
          parsedCompanyInfo = JSON.parse(storedCompanyInfo);
          console.log('Parsed stored company info:', parsedCompanyInfo);
        } catch (e) {
          console.error('Error parsing stored company info:', e);
        }

        if (!token || !parsedCompanyInfo?._id) {
          console.error('Missing token or company ID');
          navigate('/real-estate-login', { replace: true });
          return;
        }

        // Fetch fresh company data
        const response = await fetch(`/api/real-estate/company/${parsedCompanyInfo._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          if (response.status === 401) {
            localStorage.removeItem('realEstateToken');
            localStorage.removeItem('realEstateCompany');
            navigate('/real-estate-login', { replace: true });
            return;
          }
          throw new Error('Failed to fetch company data');
        }

        const data = await response.json();
        console.log('Received fresh company data:', data);
        
        if (data.success && data.company) {
          // Merge fresh data with stored banner/avatar info
          const mergedCompanyData = {
            ...data.company,
            banner: data.company.banner || parsedCompanyInfo.banner || '',
            avatar: data.company.avatar || parsedCompanyInfo.avatar || 'default-company-avatar.png',
            isCloudinaryBanner: data.company.isCloudinaryBanner || parsedCompanyInfo.isCloudinaryBanner,
            isCloudinaryAvatar: data.company.isCloudinaryAvatar || parsedCompanyInfo.isCloudinaryAvatar
          };
          
          console.log('Merged company data:', mergedCompanyData);
          
          setCompanyData(mergedCompanyData);
          localStorage.setItem('realEstateCompany', JSON.stringify(mergedCompanyData));
        } else {
          throw new Error(data.message || 'Failed to fetch company data');
        }

      } catch (error) {
        console.error('Error loading company data:', error);
        setError(error.message);
        if (error.message.includes('Authentication') || error.message.includes('token')) {
          localStorage.removeItem('realEstateToken');
          localStorage.removeItem('realEstateCompany');
          navigate('/real-estate-login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [realEstateCompany, navigate]);

  // Load company data safely
  useEffect(() => {
    if (!realEstateCompany) return;

    const loadCompanyData = () => {
      try {
        const storedData = localStorage.getItem('realEstateCompany');
        if (storedData) {
          // Safely parse the JSON data
          try {
            const parsedData = JSON.parse(storedData);
            setCompanyData(parsedData);
          } catch (parseError) {
            console.error('Error parsing company data:', parseError);
            // If parse fails, try to get fresh data from API
            fetchCompanyData();
          }
        } else {
          fetchCompanyData();
        }
      } catch (error) {
        console.error('Error loading company data:', error);
        setError('Error loading company data');
      }
    };

    const fetchCompanyData = async () => {
      try {
        const response = await fetch(`/api/company/${realEstateCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${realEstateCompany.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch company data');
        }

        const data = await response.json();
        if (data.success) {
          setCompanyData(data.company);
          localStorage.setItem('realEstateCompany', JSON.stringify(data.company));
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError('Error fetching company data');
      }
    };

    loadCompanyData();
  }, [realEstateCompany?.token, realEstateCompany?._id]);

  useEffect(() => {
    if (!realEstateCompany) return;

    const fetchListings = async () => {
      if (activeTab !== 'listings') return;
      
      try {
        setListingsLoading(true);
        setListingsError(null);
        
        const token = localStorage.getItem('realEstateToken');
        const companyInfo = safeJSONParse(localStorage.getItem('realEstateCompany'));

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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });

            if (!res.ok) {
              const errorData = await res.json();
              console.error(`Error fetching listings for agent ${agent.name}:`, errorData);
              return [];
            }

            const data = await res.json();
            console.log(`Received listings for agent ${agent.name}:`, data);
            
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
          console.log('Combined listings:', {
            total: combinedListings.length,
            byAgent: results.map((r, i) => ({
              agent: companyData.agents[i].name,
              count: r.length
            }))
          });
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
  }, [activeTab, navigate, companyData, realEstateCompany]);

  // Add this function to handle agent form submission
  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('realEstateToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const agentData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        contact: formData.get('contact')
      };

      console.log('Creating new agent:', { ...agentData, password: '***' });

      const response = await fetch(`/api/real-estate/${realEstateCompany._id}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(agentData)
      });

      const data = await response.json();
      console.log('Agent creation response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create agent');
      }

      // Update company data with new agent
      setCompanyData(prevData => ({
        ...prevData,
        agents: [...(prevData.agents || []), data.agent]
      }));

      // Update localStorage
      const storedCompany = JSON.parse(localStorage.getItem('realEstateCompany'));
      localStorage.setItem('realEstateCompany', JSON.stringify({
        ...storedCompany,
        agents: [...(storedCompany.agents || []), data.agent]
      }));

      // Show success message
      alert('Agent created successfully!');
      
      // Reset form
      e.target.reset();

    } catch (error) {
      console.error('Error creating agent:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add delete agent handler
  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`Are you sure you want to delete agent ${agentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('realEstateToken');
      const companyData = JSON.parse(localStorage.getItem('realEstateCompany'));
      
      if (!token || !companyData) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/real-estate/${companyData._id}/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error('Failed to delete agent');
      }

      // Update local state
      setCompanyData(prev => ({
        ...prev,
        agents: prev.agents.filter(agent => agent._id !== agentId)
      }));

      // Update localStorage
      const storedCompany = JSON.parse(localStorage.getItem('realEstateCompany'));
      const updatedCompany = {
        ...storedCompany,
        agents: storedCompany.agents.filter(agent => agent._id !== agentId)
      };
      localStorage.setItem('realEstateCompany', JSON.stringify(updatedCompany));

      alert('Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.message || 'Failed to delete agent');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">Error loading dashboard</p>
          <p className="mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
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
          {(() => {
            console.log('Company Avatar Debug:', {
              avatarUrl: companyData.avatar,
              processedUrl: getImageUrl(companyData.avatar, 'avatar')
            });

            return (
              <img
                src={getImageUrl(companyData.avatar, 'avatar')}
                alt="Company Logo"
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  console.error('Company avatar image error:', {
                    originalSrc: e.target.src
                  });
                  e.target.onerror = null;
                  e.target.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
                }}
              />
            );
          })()}
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
                onClick={(e) => {
                  e.preventDefault();
                  const token = localStorage.getItem('realEstateToken');
                  const companyData = localStorage.getItem('realEstateCompany');
                  
                  if (!token || !companyData) {
                    navigate('/real-estate-login', { replace: true });
                    return;
                  }
                  
                  navigate('/add-agent');
                }}
              >
                Add New Agent
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyData.agents?.map((agent) => {
                console.log('Rendering agent:', {
                  name: agent.name,
                  avatarUrl: agent.avatar,
                  processedUrl: getImageUrl(agent.avatar, 'avatar')
                });

                return (
                <div
                  key={agent._id}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <img
                    src={getImageUrl(agent.avatar, 'avatar')}
                    alt={agent.name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                    onError={(e) => {
                      console.error('Agent avatar image error:', {
                        agentName: agent.name,
                        originalSrc: e.target.src
                      });
                      e.target.onerror = null;
                      e.target.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
                    }}
                  />
                  <h3 className="text-lg font-semibold text-center">{agent.name}</h3>
                  <p className="text-gray-600 text-center">{agent.email}</p>
                  <div className="flex items-center mt-2">
                    <StarRating rating={agent.averageRating || 0} />
                    <span className="ml-2">({agent.averageRating?.toFixed(1) || 'N/A'})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAgent(agent._id, agent.name)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
                  >
                    Delete Agent
                  </button>
                </div>
                );
              })}
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
        <div className="relative w-full h-48 mb-8 overflow-hidden rounded-lg shadow-md">
          <img
            src={getImageUrl(companyData.banner, 'banner')}
            alt="Company Banner"
            className="company-banner w-full h-full object-cover"
            onError={(e) => {
              console.error('Banner load error:', {
                src: e.target.src,
                originalBanner: companyData.banner
              });
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1466&q=80";
            }}
          />
          
          {/* Banner Upload Button */}
          <div className="absolute bottom-4 right-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              ref={bannerRef}
              className="hidden"
            />
            <button
              onClick={() => bannerRef.current.click()}
              className="bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Change Banner'}
            </button>
          </div>

          {/* Upload Progress */}
          {bannerUploadProgress > 0 && bannerUploadProgress < 100 && (
            <div className="absolute bottom-16 right-4 w-32 bg-white rounded-lg shadow p-2">
              <div className="h-2 bg-gray-200 rounded">
                <div
                  className="h-full bg-blue-500 rounded"
                  style={{ width: `${bannerUploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {bannerUploadError && (
            <div className="absolute bottom-16 right-4 bg-red-100 text-red-600 px-4 py-2 rounded-lg">
              {bannerUploadError}
            </div>
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