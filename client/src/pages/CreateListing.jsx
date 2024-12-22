import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const CreateListing = () => {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
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

  const storeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);

      fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          setImageUploadError(false);
          resolve(data.imageUrl);
        })
        .catch(error => {
          console.error('Upload error:', error);
          setImageUploadError('Image upload failed (2mb max per image)');
          reject(error);
        });
    });
  };

  const handleImageSubmit = (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }

      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
          });
          setImageUploadError(false);
          setUploading(false);
        })
        .catch((err) => {
          setImageUploadError('Image upload failed (2 mb max per image)');
          setUploading(false);
        });
    } else {
      setImageUploadError('You can only upload 6 images per listing');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
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
      const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));
      const isAgent = Boolean(agentInfo && localStorage.getItem('agentToken'));
      
      let userRef;
      let userModel;
      
      if (isAgent && agentInfo?._id) {
        userRef = agentInfo._id;
        userModel = 'Agent';
        console.log('Creating listing as agent:', { 
          agentName: agentInfo.name,
          agentId: userRef 
        });
      } else if (currentUser?._id) {
        userRef = currentUser._id;
        userModel = 'User';
      } else {
        throw new Error('No valid user reference found');
      }

      const listingData = {
        ...formData,
        userRef,
        userModel
      };

      console.log('Submitting listing data:', listingData);

      const headers = {
        'Content-Type': 'application/json'
      };

      if (isAgent) {
        const agentToken = localStorage.getItem('agentToken');
        if (!agentToken) {
          throw new Error('Agent token not found');
        }
        headers['Authorization'] = `Bearer ${agentToken}`;
      }

      const res = await fetch('/api/listing/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(listingData),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create listing');
      }

      navigate(`/listing/${data._id}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      setError(error.message);
    } finally {
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
            id="name"
            placeholder="Name"
            maxLength="62"
            minLength="10"
            required
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
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="p-3 border border-gray-300 rounded w-full"
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
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
                <p className="text-sm text-gray-500 text-center mt-1">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}

            {imageUploadError && (
              <p className="text-red-700 text-sm">{imageUploadError}</p>
            )}

            {formData.imageUrls.length > 0 &&
              formData.imageUrls.map((url, index) => (
                <div
                  key={url}
                  className="flex justify-between p-3 border items-center rounded"
                >
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-3 text-red-700 rounded-lg uppercase hover:opacity-75"
                  >
                    Delete
                  </button>
                </div>
              ))}
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
