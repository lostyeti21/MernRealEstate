import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StarRating from '../components/StarRating';
import { FaMapMarkerAlt } from 'react-icons/fa';
import ReactApexChart from 'react-apexcharts';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { app } from "../firebase";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
  const [timeAnalytics, setTimeAnalytics] = useState({
    hourlyClicks: Array(24).fill(0),
    loading: false,
    error: null
  });
  const [priceAnalytics, setPriceAnalytics] = useState({
    salesPrices: [],
    rentalPrices: [],
    loading: false,
    error: null
  });
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
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [resetPasswordModal, setResetPasswordModal] = useState({ show: false, agentId: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Get authentication data
        const token = localStorage.getItem('mern_token') || localStorage.getItem('token');
        const storedCompany = safeJSONParse(localStorage.getItem('realEstateCompany'));
        
        if (!token || !storedCompany || !storedCompany._id) {
          console.log('No auth data found, redirecting to login');
          navigate('/real-estate-login');
          return;
        }

        // Set initial company data
        setCompanyData(storedCompany);
        
        // Fetch fresh company data
        const freshDataResponse = await fetch(`/api/real-estate/${storedCompany._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!freshDataResponse.ok) {
          throw new Error('Failed to fetch company data');
        }

        const freshData = await freshDataResponse.json();
        if (freshData.success && freshData.company) {
          setCompanyData(freshData.company);
          localStorage.setItem('realEstateCompany', JSON.stringify(freshData.company));
        } else {
          throw new Error('Invalid company data received');
        }

      } catch (error) {
        console.error('Authentication error:', error);
        // Clear stored data and redirect to login
        localStorage.removeItem('mern_token');
        localStorage.removeItem('token');
        localStorage.removeItem('realEstateCompany');
        navigate('/real-estate-login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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
      const token = localStorage.getItem('mern_token');
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
      const token = localStorage.getItem('mern_token');
      
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
    try {
      const file = e.target.files[0];
      console.log('Avatar upload started:', { 
        fileName: file?.name, 
        fileSize: file?.size,
        currentUser: currentUser?.username,
        companyId: realEstateCompany?._id,
        storedCompanyId: JSON.parse(localStorage.getItem('realEstateCompany'))?._id
      });
      
      if (!file) {
        console.log('No file selected');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        console.error('File too large:', { size: file.size });
        setAvatarUploadError('Image must be less than 2MB');
        return;
      }

      // Validate company ID availability
      const companyId = realEstateCompany?._id || JSON.parse(localStorage.getItem('realEstateCompany'))?._id;
      if (!companyId) {
        console.error('Company ID not found:', {
          reduxState: realEstateCompany,
          localStorage: localStorage.getItem('realEstateCompany')
        });
        setAvatarUploadError('Unable to update avatar: Company information not found');
        return;
      }

      setAvatarFile(file);
      setAvatarUploadError(null);
      handleAvatarChange(e, 'avatar');
    } catch (error) {
      console.error('Error in handleAvatarUpload:', error);
      setAvatarUploadError('Failed to process image upload');
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

      const token = localStorage.getItem('mern_token');
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

      // Update local state and storage with the entire updated company data
      console.log('Updating local state with response data:', {
        companyId: updateData.company._id,
        hasBanner: !!updateData.company.banner,
        bannerUrl: updateData.company.banner
      });

      localStorage.setItem('realEstateCompany', JSON.stringify(updateData.company));
      setCompanyData(updateData.company);

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

  const handleAvatarChange = async (e, type = 'avatar') => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      setAvatarUploadProgress(0);
      let progressInterval;

      try {
        // Get company ID from Redux first, then fallback to localStorage
        let companyId = realEstateCompany?._id;
        
        if (!companyId) {
          const storedCompany = localStorage.getItem('realEstateCompany');
          if (storedCompany) {
            const parsedCompany = safeJSONParse(storedCompany);
            companyId = parsedCompany?._id;
          }
        }

        if (!companyId) {
          throw new Error('Company ID not found');
        }

        // Get authentication token
        const token = localStorage.getItem('mern_token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Create form data
        const formData = new FormData();
        formData.append('image', file);

        // Start progress simulation
        progressInterval = setInterval(() => {
          setAvatarUploadProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        // Upload to Cloudinary
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.message || 'Upload failed');
        }

        // Update company profile
        const updateRes = await fetch('/api/real-estate/update-avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            avatar: uploadData.url,
            companyId: companyId
          })
        });

        if (!updateRes.ok) {
          throw new Error(`Profile update failed with status ${updateRes.status}`);
        }

        const updateData = await updateRes.json();
        if (!updateData.success) {
          throw new Error(updateData.message || 'Profile update failed');
        }

        // Update local state
        setCompanyData(prev => ({
          ...prev,
          avatar: uploadData.url
        }));

        setAvatarUploadProgress(100);
        setPopupMessage('Avatar successfully changed');
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          setPopupMessage('');
        }, 3000);
      } finally {
        clearInterval(progressInterval);
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error in avatar upload process:', error);
      setError(error.message || 'Failed to update avatar');
      setTimeout(() => setError(null), 3000);
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
        const token = localStorage.getItem('mern_token');
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
            localStorage.removeItem('mern_token');
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
          localStorage.removeItem('mern_token');
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
        
        const token = localStorage.getItem('mern_token');
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
            const res = await fetch(`/api/agent/listings/${agent._id}`, {
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

  // Fetch time analytics data
  useEffect(() => {
    const fetchTimeAnalytics = async () => {
      if (!realEstateCompany?._id || !listings.length) return;
      
      try {
        setTimeAnalytics(prev => ({ ...prev, loading: true, error: null }));
        
        // Initialize hourly clicks array
        const hourlyClicks = Array(24).fill(0);
        
        // Process each listing's clicks
        listings.forEach(listing => {
          // Get timestamps from listing views/clicks
          const timestamps = listing.lastViewed ? [new Date(listing.lastViewed)] : [];
          if (listing.views) {
            timestamps.push(...listing.views.map(view => new Date(view.timestamp)));
          }
          if (listing.clicks) {
            timestamps.push(...listing.clicks.map(click => new Date(click.timestamp)));
          }
          
          // Count clicks per hour
          timestamps.forEach(timestamp => {
            const hour = timestamp.getHours();
            hourlyClicks[hour]++;
          });
        });

        setTimeAnalytics(prev => ({
          ...prev,
          hourlyClicks,
          loading: false
        }));

      } catch (error) {
        console.error('Error processing time analytics:', error);
        setTimeAnalytics(prev => ({
          ...prev,
          loading: false,
          error: 'Unable to process time analytics'
        }));
      }
    };

    if (activeTab === 'analysis') {
      fetchTimeAnalytics();
    }
  }, [realEstateCompany?._id, activeTab, listings]);

  // Calculate price analytics from listings
  useEffect(() => {
    if (!listings.length || activeTab !== 'analysis') return;

    try {
      setPriceAnalytics(prev => ({ ...prev, loading: true, error: null }));

      // Separate listings by type
      const salesListings = listings.filter(listing => listing.type === 'sale');
      const rentalListings = listings.filter(listing => listing.type === 'rent');

      // Calculate price metrics for sales
      const salesPrices = salesListings.map(listing => ({
        price: listing.regularPrice,
        location: listing.address,
        type: 'sale',
        title: listing.name
      }));

      // Calculate price metrics for rentals
      const rentalPrices = rentalListings.map(listing => ({
        price: listing.regularPrice,
        location: listing.address,
        type: 'rent',
        title: listing.name
      }));

      setPriceAnalytics(prev => ({
        ...prev,
        salesPrices,
        rentalPrices,
        loading: false
      }));

    } catch (error) {
      console.error('Error processing price analytics:', error);
      setPriceAnalytics(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to process price analytics'
      }));
    }
  }, [listings, activeTab]);

  // Add this function to handle agent form submission
  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('mern_token');
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

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`Are you sure you want to delete agent ${agentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get authentication token from the correct source
      const token = localStorage.getItem('mern_token') || localStorage.getItem('token');
      const companyData = safeJSONParse(localStorage.getItem('realEstateCompany'));
      
      if (!token || !companyData) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/real-estate/${companyData._id}/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include credentials for authentication
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server error:', data);
        throw new Error(data.message || 'Failed to delete agent');
      }

      // Update local state
      setCompanyData(prev => ({
        ...prev,
        agents: prev.agents.filter(agent => agent._id !== agentId)
      }));

      // Update localStorage
      const storedCompany = safeJSONParse(localStorage.getItem('realEstateCompany'));
      if (storedCompany) {
        const updatedCompany = {
          ...storedCompany,
          agents: storedCompany.agents.filter(agent => agent._id !== agentId)
        };
        localStorage.setItem('realEstateCompany', JSON.stringify(updatedCompany));
      }

      alert('Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.message || 'Failed to delete agent');
    }
  };

  // Add this function to handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    // Get token from localStorage
    const token = localStorage.getItem('mern_token');
    console.log('Token:', token);

    if (!token) {
      toast.error('Please sign in to reset passwords');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = await fetch(`/api/real-estate/admin/reset-agent-password/${resetPasswordModal.agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      // Show success message
      toast.success('Password reset successfully');
      
      // Reset form and close modal
      setNewPassword('');
      setConfirmPassword('');
      setResetPasswordModal({ show: false, agentId: null });

    } catch (error) {
      console.error('Error resetting password:', error);
      setResetError(error.message);
      toast.error(error.message);
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
      {showPopup && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 animate-fade-in-down">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{popupMessage}</p>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-semibold text-center my-7">
        {companyData.companyName} Dashboard
      </h1>

      {/* Company Info Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-start gap-6">
          {/* Hidden file input for avatar upload */}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            ref={avatarRef}
            className="hidden"
          />
          
          {(() => {
            console.log('Company Avatar Debug:', {
              avatarUrl: companyData.avatar,
              processedUrl: getImageUrl(companyData.avatar, 'avatar')
            });

            return (
              <div 
                onClick={() => avatarRef.current?.click()}
                className="relative cursor-pointer group w-4/5 min-h-[200px] flex-shrink-0"
              >
                <img
                  src={getImageUrl(companyData.avatar, 'avatar')}
                  alt="Company Logo"
                  className="w-full h-full min-h-[200px] rounded-lg object-cover transition-opacity group-hover:opacity-70"
                  onError={(e) => {
                    console.error('Company avatar image error:', {
                      originalSrc: e.target.src
                    });
                    e.target.onerror = null;
                    e.target.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
                  }}
                />
                {/* Hover overlay with icon and text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-white font-medium">Change Avatar</p>
                </div>
                {/* Loading overlay */}
                {avatarUploadProgress > 0 && avatarUploadProgress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-t-4 border-white border-t-blue-500 rounded-full animate-spin mb-2"></div>
                      <p className="text-white font-medium">{avatarUploadProgress}%</p>
                    </div>
                  </div>
                )}
                {/* Error message */}
                {avatarUploadError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white p-2 text-center rounded-b-lg">
                    <p className="text-sm font-medium">{avatarUploadError}</p>
                  </div>
                )}
              </div>
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
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'analysis'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Analysis
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
                  const token = localStorage.getItem('mern_token');
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
                    className="w-full h-60 rounded mx-auto mb-3 object-cover"
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
                  <button
                    onClick={() => setResetPasswordModal({ show: true, agentId: agent._id })}
                    className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition duration-200 mt-2"
                  >
                    Reset Password
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'listings' ? (
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
                          className="w-full h-11 rounded object-cover"
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
                      <p className="text-gray-600">{listing.address}</p>
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
      ) : activeTab === 'analysis' ? (
        <div>
          <h2 className="text-2xl font-semibold mb-6" id="company-analytics">Company Analytics</h2>
          
          {/* Table of Contents */}
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#time-analytics" 
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('time-analytics').scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Time Analytics
                </a>
              </li>
              <li>
                <a 
                  href="#price-competitiveness" 
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('price-competitiveness').scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Price Competitiveness
                </a>
              </li>
              <li>
                <a 
                  href="#agent-performance" 
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('agent-performance').scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Agent Performance
                </a>
                <ul className="ml-4 mt-2 space-y-2">
                  <li>
                    <a 
                      href="#performance-metrics" 
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('performance-metrics').scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Performance Metrics
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#listing-distribution" 
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('listing-distribution').scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Listing Distribution
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#agent-ratings" 
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('agent-ratings').scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Agent Ratings
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#portfolio-value" 
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('portfolio-value').scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Total Portfolio Value
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          {/* Company Performance */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Company Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold">{listings.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold">{companyData?.agents?.length || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-gray-600">Average Price</p>
                <p className="text-2xl font-bold">
                  ${listings.length > 0
                    ? (listings.reduce((sum, listing) => sum + listing.regularPrice, 0) / listings.length).toLocaleString()
                    : 0}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-gray-600">Total Portfolio Value</p>
                <p className="text-2xl font-bold">
                  ${listings.reduce((sum, listing) => sum + listing.regularPrice, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Agent Performance */}
          <div className="mt-8" id="agent-performance">
            <h3 className="text-xl font-semibold mb-4">Agent Performance</h3>
            
            {/* Performance Metrics Table - Full Width */}
            <div id="performance-metrics" className="bg-white p-4 rounded-lg shadow mb-6">
              <h4 className="text-lg font-semibold mb-3">Performance Metrics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Listings</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(companyData?.agents || []).map((agent) => {
                      const agentListings = listings?.filter(listing => listing.agent?._id === agent._id) || [];
                      const totalValue = agentListings.reduce((sum, listing) => sum + (listing.regularPrice || 0), 0);
                      
                      return (
                        <tr key={agent._id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100">
                                <img 
                                  src={agent.avatar || 'https://via.placeholder.com/40'} 
                                  alt={agent.name || 'Agent'}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{agent.name || 'Unknown Agent'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{agentListings.length}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              {agent.averageRating ? (
                                <StarRating rating={agent.averageRating} />
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {agentListings.length > 0 ? (
                              `$${totalValue.toLocaleString()}`
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Listing Distribution Chart */}
              {companyData?.agents?.length > 0 && listings?.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-3" id="listing-distribution">Listing Distribution</h4>
                  <ReactApexChart
                    options={{
                      chart: {
                        type: 'donut',
                      },
                      labels: companyData.agents.map(agent => agent.name || 'Unknown Agent'),
                      legend: {
                        position: 'bottom'
                      },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '70%'
                          }
                        }
                      },
                      colors: ['#4C51BF', '#48BB78', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED'],
                      tooltip: {
                        y: {
                          formatter: function(value) {
                            return value + ' listings'
                          }
                        }
                      }
                    }}
                    series={companyData.agents.map(agent => 
                      listings.filter(listing => listing.agent?._id === agent._id).length
                    )}
                    type="donut"
                    height={300}
                  />
                </div>
              )}

              {/* Agent Ratings Chart */}
              {companyData?.agents?.some(agent => agent.averageRating) && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-3" id="agent-ratings">Agent Ratings</h4>
                  <ReactApexChart
                    options={{
                      chart: {
                        type: 'bar',
                        toolbar: {
                          show: false
                        }
                      },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          dataLabels: {
                            position: 'top',
                          },
                        }
                      },
                      colors: ['#4C51BF'],
                      dataLabels: {
                        enabled: true,
                        formatter: function (val) {
                          return (val || 0).toFixed(1) + ' ★';
                        },
                        offsetX: 30,
                      },
                      xaxis: {
                        categories: companyData.agents
                          .filter(agent => agent.averageRating)
                          .map(agent => agent.name || 'Unknown Agent'),
                        max: 5
                      },
                      tooltip: {
                        y: {
                          formatter: function(value) {
                            return (value || 0).toFixed(1) + ' stars'
                          }
                        }
                      }
                    }}
                    series={[{
                      name: 'Rating',
                      data: companyData.agents
                        .filter(agent => agent.averageRating)
                        .map(agent => agent.averageRating)
                    }]}
                    type="bar"
                    height={300}
                  />
                </div>
              )}

              {/* Total Value by Agent Chart */}
              {companyData?.agents?.some(agent => 
                listings?.filter(listing => listing.agent?._id === agent._id).length > 0
              ) && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-3" id="portfolio-value">Total Portfolio Value</h4>
                  <ReactApexChart
                    options={{
                      chart: {
                        type: 'bar',
                        toolbar: {
                          show: false
                        }
                      },
                      plotOptions: {
                        bar: {
                          borderRadius: 4,
                          columnWidth: '60%',
                        }
                      },
                      colors: ['#48BB78'],
                      dataLabels: {
                        enabled: true,
                        formatter: function (val) {
                          return '$' + ((val || 0)/1000).toFixed(0) + 'k';
                        },
                        offsetY: -20,
                        style: {
                          fontSize: '12px',
                        }
                      },
                      xaxis: {
                        // Filter agents to only include those with listings
                        categories: companyData.agents
                          .filter(agent => 
                            listings?.filter(listing => listing.agent?._id === agent._id).length > 0
                          )
                          .map(agent => agent.name || 'Unknown Agent'),
                        position: 'bottom',
                        axisBorder: {
                          show: false
                        },
                        axisTicks: {
                          show: false
                        }
                      },
                      yaxis: {
                        labels: {
                          formatter: function (val) {
                            return '$' + ((val || 0)/1000).toFixed(0) + 'k';
                          }
                        }
                      },
                      tooltip: {
                        y: {
                          formatter: function(value) {
                            return '$' + (value || 0).toLocaleString()
                          }
                        }
                      }
                    }}
                    series={[{
                      name: 'Portfolio Value',
                      // Filter agents to only include those with listings
                      data: companyData.agents
                        .filter(agent => 
                          listings?.filter(listing => listing.agent?._id === agent._id).length > 0
                        )
                        .map(agent => 
                          listings
                            .filter(listing => listing.agent?._id === agent._id)
                            .reduce((sum, listing) => sum + (listing.regularPrice || 0), 0)
                        )
                    }]}
                    type="bar"
                    height={300}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Listing Distribution */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Listing Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 mb-2">By Type</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sale</span>
                    <span>{listings.filter(l => !l.type.includes('rent')).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rent</span>
                    <span>{listings.filter(l => l.type.includes('rent')).length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 mb-2">By Offer</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>With Offer</span>
                    <span>{listings.filter(l => l.offer).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Without Offer</span>
                    <span>{listings.filter(l => !l.offer).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Analytics */}
          <div id="time-analytics" className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Click Volume by Time of Day</h3>
            {timeAnalytics.loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : timeAnalytics.error ? (
              <div className="text-red-500 text-center py-4">
                Error loading time analytics: {timeAnalytics.error}
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow">
                <ReactApexChart
                  options={{
                    chart: {
                      type: 'area',
                    },
                    dataLabels: {
                      enabled: false
                    },
                    stroke: {
                      curve: 'smooth',
                      width: 2
                    },
                    xaxis: {
                      categories: Array.from({ length: 24 }, (_, i) => 
                        i === 0 ? '12 AM' : 
                        i < 12 ? `${i} AM` : 
                        i === 12 ? '12 PM' : 
                        `${i - 12} PM`
                      ),
                      title: {
                        text: 'Time of Day'
                      }
                    },
                    yaxis: {
                      title: {
                        text: 'Number of Clicks'
                      }
                    },
                    tooltip: {
                      x: {
                        formatter: function(value) {
                          return value
                        }
                      }
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.2,
                        stops: [0, 90, 100]
                      }
                    },
                    colors: ['#3B82F6']
                  }}
                  series={[
                    {
                      name: 'Clicks',
                      data: timeAnalytics.hourlyClicks
                    }
                  ]}
                  type="area"
                  height={320}
                />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600">Peak Click Time</p>
                    <p className="text-lg font-semibold">
                      {(() => {
                        const maxClicks = Math.max(...timeAnalytics.hourlyClicks);
                        const peakHour = timeAnalytics.hourlyClicks.indexOf(maxClicks);
                        return peakHour === 0 ? '12 AM' : 
                               peakHour < 12 ? `${peakHour} AM` : 
                               peakHour === 12 ? '12 PM' : 
                               `${peakHour - 12} PM`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-gray-600">Total Daily Clicks</p>
                    <p className="text-lg font-semibold">
                      {timeAnalytics.hourlyClicks.reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Competitiveness Analysis */}
          <div id="price-competitiveness" className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Price Competitiveness Analysis</h3>
            {priceAnalytics.loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : priceAnalytics.error ? (
              <div className="text-red-500 text-center py-4">
                Error loading price analytics: {priceAnalytics.error}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Price Analysis */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-3">Sales Listings</h4>
                  {priceAnalytics.salesPrices.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No sales listings available</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">vs. Avg</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {priceAnalytics.salesPrices.map((item, index) => {
                              const avgPrice = priceAnalytics.salesPrices.reduce((sum, curr) => sum + curr.price, 0) / priceAnalytics.salesPrices.length;
                              const priceDiff = ((item.price - avgPrice) / avgPrice) * 100;
                              
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{item.location}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">${item.price.toLocaleString()}</td>
                                  <td className={`px-4 py-3 text-sm text-right ${priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-600">Average Price</p>
                          <p className="text-lg font-semibold">
                            ${(priceAnalytics.salesPrices.reduce((sum, curr) => sum + curr.price, 0) / priceAnalytics.salesPrices.length).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-gray-600">Price Range</p>
                          <p className="text-lg font-semibold">
                            ${Math.min(...priceAnalytics.salesPrices.map(item => item.price)).toLocaleString()} - ${Math.max(...priceAnalytics.salesPrices.map(item => item.price)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rental Price Analysis */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-3">Rental Listings</h4>
                  {priceAnalytics.rentalPrices.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No rental listings available</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price/mo</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">vs. Avg</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {priceAnalytics.rentalPrices.map((item, index) => {
                              const avgPrice = priceAnalytics.rentalPrices.reduce((sum, curr) => sum + curr.price, 0) / priceAnalytics.rentalPrices.length;
                              const priceDiff = ((item.price - avgPrice) / avgPrice) * 100;
                              
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{item.location}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">${item.price.toLocaleString()}</td>
                                  <td className={`px-4 py-3 text-sm text-right ${priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-600">Average Price</p>
                          <p className="text-lg font-semibold">
                            ${(priceAnalytics.rentalPrices.reduce((sum, curr) => sum + curr.price, 0) / priceAnalytics.rentalPrices.length).toLocaleString()}/mo
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-gray-600">Price Range</p>
                          <p className="text-lg font-semibold">
                            ${Math.min(...priceAnalytics.rentalPrices.map(item => item.price)).toLocaleString()} - ${Math.max(...priceAnalytics.rentalPrices.map(item => item.price)).toLocaleString()}/mo
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location-based Price Analysis */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Price Analysis by Location</h3>
            
            {/* Sales Analysis */}
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-3 text-blue-800">Sales Listings by Location</h4>
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Number of Listings</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Average Price</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Highest Price</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Lowest Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Get unique locations for sale listings
                      const saleListings = listings.filter(l => !l.type.includes('rent'));
                      const locations = [...new Set(saleListings.map(l => l.address))];
                      
                      return locations.map(location => {
                        const locationListings = saleListings.filter(l => l.address === location);
                        const prices = locationListings.map(l => l.regularPrice);
                        const avgPrice = prices.reduce((acc, curr) => acc + curr, 0) / prices.length;
                        const maxPrice = Math.max(...prices);
                        const minPrice = Math.min(...prices);

                        return (
                          <tr key={location} className="border-t hover:bg-blue-50">
                            <td className="px-4 py-3">{location}</td>
                            <td className="px-4 py-3">{locationListings.length}</td>
                            <td className="px-4 py-3">${avgPrice.toFixed(2)}</td>
                            <td className="px-4 py-3">${maxPrice.toFixed(2)}</td>
                            <td className="px-4 py-3">${minPrice.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rentals Analysis */}
            <div>
              <h4 className="text-lg font-medium mb-3 text-green-800">Rental Listings by Location</h4>
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Number of Listings</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Average Price/mo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Highest Price/mo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Lowest Price/mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Get unique locations for rental listings
                      const rentalListings = listings.filter(l => l.type.includes('rent'));
                      const locations = [...new Set(rentalListings.map(l => l.address))];
                      
                      return locations.map(location => {
                        const locationListings = rentalListings.filter(l => l.address === location);
                        const prices = locationListings.map(l => l.regularPrice);
                        const avgPrice = prices.reduce((acc, curr) => acc + curr, 0) / prices.length;
                        const maxPrice = Math.max(...prices);
                        const minPrice = Math.min(...prices);

                        return (
                          <tr key={location} className="border-t hover:bg-green-50">
                            <td className="px-4 py-3">{location}</td>
                            <td className="px-4 py-3">{locationListings.length}</td>
                            <td className="px-4 py-3">${avgPrice.toFixed(2)}/mo</td>
                            <td className="px-4 py-3">${maxPrice.toFixed(2)}/mo</td>
                            <td className="px-4 py-3">${minPrice.toFixed(2)}/mo</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

      {/* Password Reset Modal */}
      {resetPasswordModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white border-opacity-30 max-w-md w-full mx-4">
            <h3 className="text-2xl font-semibold mb-4 text-white">Reset Agent Password</h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-white"
                    required
                    minLength={6}
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
                <label className="text-white font-medium mb-2 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-white"
                    required
                    minLength={6}
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

              {resetError && (
                <div className="text-red-400 text-sm">{resetError}</div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition duration-200"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordModal({ show: false, agentId: null });
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetError('');
                  }}
                  className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-medium transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}