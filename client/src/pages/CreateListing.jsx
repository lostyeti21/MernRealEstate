import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';

const CreateListing = () => {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    title: "",
    name: "",
    description: "",
    address: "",
    type: "rent",
    bedrooms: 1,
    bathrooms: 1,
    regularPrice: 50,
    discountPrice: 0,
    offer: false,
    parking: false,
    furnished: false,
    m2: 0,
    backupPower: false,
    backupWaterSupply: false,
    boreholeWater: false,
  });

  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [agentInfo, setAgentInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const storedAgentInfo = localStorage.getItem('agentInfo');
      const agentToken = localStorage.getItem('agentToken');
      
      if (storedAgentInfo && agentToken) {
        try {
          const parsedAgentInfo = JSON.parse(storedAgentInfo);
          console.log('Parsed agent info:', parsedAgentInfo);
          
          if (!parsedAgentInfo._id) {
            throw new Error('Invalid agent data: missing ID');
          }

          setAgentInfo(parsedAgentInfo);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Agent auth error:', error);
          localStorage.removeItem('agentToken');
          localStorage.removeItem('agentInfo');
          navigate('/sign-in');
        }
      } else if (currentUser) {
        setIsAuthenticated(true);
      } else {
        navigate('/sign-in');
      }
    };

    checkAuth();
  }, [currentUser, navigate]);

  const handleImageSubmit = async (e) => {
    e.preventDefault();
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }

      try {
        const urls = await Promise.all(promises);
        setFormData({
          ...formData,
          imageUrls: formData.imageUrls.concat(urls),
        });
        setImageUploadError(false);
      } catch (err) {
        setImageUploadError('Image upload failed (2 mb max per image)');
      }
      setUploading(false);
    } else {
      setImageUploadError('You can only upload 6 images per listing');
    }
  };

  const storeImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index)
    });
  };

  const handleChange = (e) => {
    const { id, type, checked, value } = e.target;
    if (["sale", "rent"].includes(id)) {
      setFormData({ ...formData, type: id });
    } else if (
      ["parking", "furnished", "offer", "backupPower", "backupWaterSupply", "boreholeWater"].includes(id)
    ) {
      setFormData({ ...formData, [id]: checked });
    } else if (["number", "text", "textarea"].includes(type)) {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form data before submission
      if (formData.imageUrls.length < 1)
        return setError('You must upload at least one image');
      if (+formData.regularPrice < +formData.discountPrice)
        return setError('Discount price must be lower than regular price');

      // Debug log form data
      console.log('Form Data:', {
        ...formData,
        name: formData.title || formData.name // Handle both title and name fields
      });

      // Validate required fields
      const requiredFields = [
        'title', 'description', 'address', 
        'regularPrice', 'bedrooms', 'bathrooms', 'type'
      ];
      
      const missingFields = requiredFields.filter(field => {
        const value = formData[field] || formData[field === 'title' ? 'name' : field];
        return !value && value !== 0;
      });
      
      if (missingFields.length > 0) {
        console.error('Missing Fields:', missingFields);
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      setLoading(true);
      setError(false);

      // Determine user type and token source
      const isAgent = currentUser.isAgent || 
        (currentUser.role === 'agent') || 
        (currentUser.agents && currentUser.agents.length > 0);
      const isRealEstateCompany = currentUser.isRealEstateCompany || 
        (currentUser.role === 'company') || 
        (currentUser.companyName);

      // Token retrieval with multiple fallback methods
      const getToken = () => {
        const tokens = [
          localStorage.getItem('access_token'),
          currentUser?.token,
          isAgent ? localStorage.getItem('agentToken') : null,
          isRealEstateCompany ? localStorage.getItem('realEstateToken') : null,
          document.cookie.split('; ')
            .find(row => row.startsWith('access_token='))
            ?.split('=')[1]
        ];

        return tokens.find(token => token && token.trim() !== '');
      };

      const token = getToken();

      // Determine user model based on user type
      const userModel = 
        isAgent ? 'Agent' : 
        isRealEstateCompany ? 'RealEstateCompany' : 
        'User';

      // Prepare listing data
      const listingData = {
        ...formData,
        title: formData.title || formData.name, // Handle both title and name fields
        userRef: currentUser._id,
        userModel: userModel,
        // Ensure imageUrls is always an array
        imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : []
      };

      // Debug logging
      console.log('Listing Creation Debug:', {
        userType: {
          isAgent,
          isRealEstateCompany
        },
        userModel,
        tokenAvailable: !!token,
        currentUser,
        listingData,
        formData
      });

      // Enhanced fetch with multiple token passing methods
      const res = await fetch('/api/listing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Access-Token': token || '',
          'X-User-Model': userModel
        },
        body: JSON.stringify(listingData),
        credentials: 'include'
      });

      // Detailed error handling
      if (!res.ok) {
        let errorText = '';
        let errorDetails = {};
        
        try {
          errorDetails = await res.json();
          errorText = errorDetails.message || 'Failed to create listing';
          
          // Log the full error response
          console.error('Server Error Response:', {
            status: res.status,
            statusText: res.statusText,
            errorDetails
          });
        } catch {
          errorText = await res.text() || 'Unknown error occurred';
        }

        setError(`Failed to create listing: ${errorText}`);
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Validate successful response
      if (!data.success) {
        console.error('Unsuccessful Response:', data);
        setError(`Failed to create listing: ${data.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      // Check if we have a valid listing ID before navigating
      if (!data.listing || !data.listing._id) {
        console.error('Invalid Listing Response:', data);
        setError('Failed to create listing: No listing ID returned');
        setLoading(false);
        return;
      }

      setLoading(false);
      if (!isAgent && !isRealEstateCompany) {
        // Mark user as a landlord
        localStorage.setItem('isLandlord', 'true');
        navigate('/landlord-profile');
      } else {
        navigate(`/listing/${data.listing._id}`);
      }
    } catch (error) {
      console.error('Listing Creation Error:', error);
      setError(`Unexpected error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      console.log('Files selected:', Array.from(selectedFiles).map(file => ({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      })));
      setFiles(selectedFiles);
      setImageUploadError(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="p-3 max-w-4xl mx-auto">
        <p className="text-center text-2xl">Verifying authentication...</p>
      </main>
    );
  }

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">
        Create a Listing
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col gap-4 flex-1">
          <input
            type="text"
            id="title"
            placeholder="Title"
            maxLength="62"
            minLength="10"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.title}
          />
          <input
            type="text"
            id="name"
            placeholder="Name"
            maxLength="62"
            minLength="10"
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.name}
          />
          <textarea
            id="description"
            placeholder="Description"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.description}
          />
          <input
            type="text"
            id="address"
            placeholder="Address"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.address}
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="sale"
                className="w-5"
                onChange={handleChange}
                checked={formData.type === "sale"}
              />
              <span>Sell</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="rent"
                className="w-5"
                onChange={handleChange}
                checked={formData.type === "rent"}
              />
              <span>Rent</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="parking"
                className="w-5"
                onChange={handleChange}
                checked={formData.parking}
              />
              <span>Parking spot</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="furnished"
                className="w-5"
                onChange={handleChange}
                checked={formData.furnished}
              />
              <span>Furnished</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="offer"
                className="w-5"
                onChange={handleChange}
                checked={formData.offer}
              />
              <span>Offer</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="backupPower"
                className="w-5"
                onChange={handleChange}
                checked={formData.backupPower}
              />
              <span>Backup Power</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="backupWaterSupply"
                className="w-5"
                onChange={handleChange}
                checked={formData.backupWaterSupply}
              />
              <span>Backup Water Supply</span>
            </div>
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="boreholeWater"
                className="w-5"
                onChange={handleChange}
                checked={formData.boreholeWater}
              />
              <span>Borehole Water</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bedrooms"
                min="1"
                max="10"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.bedrooms}
              />
              <p>Beds</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bathrooms"
                min="1"
                max="10"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.bathrooms}
              />
              <p>Baths</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="regularPrice"
                min="50"
                max="10000000"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.regularPrice}
              />
              <p>Regular Price</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="m2"
                min="1"
                placeholder="m²"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.m2}
              />
              <p>m²</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <p className="font-semibold">
            Images:
            <span className="font-normal text-gray-600 ml-2">
              The first image will be the cover (max 6)
            </span>
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <input
                onChange={handleFileSelect}
                className="p-3 border border-gray-300 rounded w-full"
                type="file"
                id="images"
                accept="image/*"
                multiple
              />
              <button
                type="button"
                disabled={uploading}
                onClick={handleImageSubmit}
                className={`p-3 text-green-700 border border-green-700 rounded uppercase hover:shadow-lg disabled:opacity-80 ${
                  uploading ? 'bg-gray-100' : ''
                }`}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            
            {/* Progress Bar */}
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
                <p className="text-sm text-gray-500 text-center mt-1">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}

            {/* Error Message */}
            {imageUploadError && (
              <p className="text-red-700 text-sm">{imageUploadError}</p>
            )}

            {/* Image Previews */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.imageUrls.map((url, index) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt={`Listing ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full 
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            disabled={loading || uploading}
            className="p-3 bg-slate-700 text-white rounded-lg uppercase"
          >
            {loading ? "Creating..." : "Create Listing"}
          </button>
          {error && <p className="text-red-700 text-sm">{error}</p>}
        </div>
      </form>
    </main>
  );
};

export default CreateListing;
