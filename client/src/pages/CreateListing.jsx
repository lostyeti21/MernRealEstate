import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFileContract } from "react-icons/fa";
import axios from 'axios';
import Loader from '../components/Loader';

const CreateListing = () => {
  const [files, setFiles] = useState([]);
  const [leaseAgreementFile, setLeaseAgreementFile] = useState(null);
  const [leaseAgreementError, setLeaseAgreementError] = useState('');
  const [uploadingLeaseAgreement, setUploadingLeaseAgreement] = useState(false);
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
    apartmentType: "House",
    lounges: 1,
    electricFence: false,
    walledOrFenced: false,
    electricGate: false,
    builtInCupboards: false,
    fittedKitchen: false,
    solarGeyser: false,
    gym: false,
    pool: false,
    garden: false,
    balcony: false,
    airConditioning: false,
    wifi: false,
    leaseAgreementUrl: '',
    viewingSchedule: {
      monday: { available: false, start: "09:00", end: "17:00" },
      tuesday: { available: false, start: "09:00", end: "17:00" },
      wednesday: { available: false, start: "09:00", end: "17:00" },
      thursday: { available: false, start: "09:00", end: "17:00" },
      friday: { available: false, start: "09:00", end: "17:00" },
      saturday: { available: false, start: "09:00", end: "17:00" },
      sunday: { available: false, start: "09:00", end: "17:00" }
    },
    flexibleViewingTime: false
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
          if (!parsedAgentInfo._id) {
            setIsAuthenticated(false);
            return;
          }
          setAgentInfo(parsedAgentInfo);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Agent auth error:', error);
          setIsAuthenticated(false);
        }
      } else if (currentUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [currentUser]);

  const handleImageSubmit = async (e) => {
    e.preventDefault();
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      try {
        console.log('Current User:', currentUser);

        if (!currentUser) {
          setImageUploadError('Please sign in to upload images');
          setUploading(false);
          return;
        }

        // Attempt to get token from cookie
        const res = await fetch('/api/auth/check-auth', {
          method: 'GET',
          credentials: 'include'
        });

        console.log('Check Auth Response:', {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries())
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error('Authentication Error Body:', errorBody);
          setImageUploadError('Authentication failed. Please sign in again.');
          setUploading(false);
          return;
        }

        for (let i = 0; i < files.length; i++) {
          promises.push(storeImage(files[i]));
        }

        const urls = (await Promise.all(promises)).filter(url => url !== null);
        
        if (urls.length > 0) {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
          });
          setImageUploadError(false);
          setFiles([]);
        }
      } catch (err) {
        console.error('Image upload error:', err);
        setImageUploadError(err.message || 'Image upload failed (2 mb max per image)');
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
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      setImageUploadError(error.message || 'Failed to upload image');
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
      ["parking", "furnished", "offer", "backupPower", "backupWaterSupply", "boreholeWater", "electricFence", "walledOrFenced", "electricGate", "builtInCupboards", "fittedKitchen", "solarGeyser", "gym", "pool", "garden", "balcony", "airConditioning", "wifi", "flexibleViewingTime"].includes(id)
    ) {
      setFormData({ ...formData, [id]: checked });
    } else if (["number", "text", "textarea"].includes(type)) {
      if (id === 'title') {
        setFormData({ ...formData, title: value, name: value });
      } else {
        setFormData({ ...formData, [id]: value });
      }
    }
    
    if (id === 'apartmentType') {
      setFormData({ ...formData, apartmentType: value });
    }
  };

  const handleViewingScheduleChange = (day, field, value) => {
    setFormData({
      ...formData,
      viewingSchedule: {
        ...formData.viewingSchedule,
        [day]: {
          ...formData.viewingSchedule[day],
          [field]: value
        }
      }
    });
  };

  const handleLeaseAgreementUpload = async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 2 * 1024 * 1024; 
  
    console.log('Lease Agreement Upload - File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
  
    if (!file) {
      console.log('Lease Agreement Upload - No file selected');
      setLeaseAgreementError('');
      setLeaseAgreementFile(null);
      return;
    }
  
    if (!allowedTypes.includes(file.type)) {
      console.log('Lease Agreement Upload - Invalid file type:', file.type);
      setLeaseAgreementError('Only PDF and DOCX files are allowed');
      setLeaseAgreementFile(null);
      return;
    }
  
    if (file.size > maxSize) {
      console.log('Lease Agreement Upload - File too large:', file.size);
      setLeaseAgreementError('File must be 2MB or smaller');
      setLeaseAgreementFile(null);
      return;
    }
  
    try {
      console.log('Lease Agreement Upload - Starting upload process');
      setUploadingLeaseAgreement(true);
      setLeaseAgreementError('');
  
      const leaseAgreementUrl = await storeLeasePdf(file);
      console.log('Lease Agreement Upload - Upload successful:', leaseAgreementUrl);
      
      setFormData(prevData => ({
        ...prevData,
        leaseAgreementUrl: leaseAgreementUrl
      }));
      
      setLeaseAgreementFile(null);
    } catch (error) {
      console.error('Lease Agreement Upload - Upload failed:', error);
      setLeaseAgreementError(error.message || 'Failed to upload lease agreement');
    } finally {
      setUploadingLeaseAgreement(false);
    }
  };

  const storeLeasePdf = async (file) => {
    const formData = new FormData();
    formData.append('document', file);
  
    try {
      const res = await fetch('/api/upload/document', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
  
      if (!res.ok) {
        throw new Error('Failed to upload document');
      }
  
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error('Failed to get document URL from server');
      }
      return data.url;
    } catch (error) {
      console.error('Lease Agreement Upload - Request failed:', error);
      throw error;
    }
  };

  const handleRemoveLeaseAgreement = () => {
    setFormData(prevData => ({
      ...prevData,
      leaseAgreementUrl: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.imageUrls.length < 1) {
        setError('You must upload at least one image');
        return;
      }
      
      setLoading(true);
      setError(false);

      const authRes = await fetch('/api/auth/check-auth', {
        method: 'GET',
        credentials: 'include'
      });

      console.log('Check Auth Response:', {
        status: authRes.status,
        statusText: authRes.statusText,
        headers: Object.fromEntries(authRes.headers.entries())
      });

      if (!authRes.ok) {
        const errorBody = await authRes.text();
        console.error('Authentication Error Body:', errorBody);
        setError('Authentication failed. Please sign in again.');
        setLoading(false);
        return;
      }

      const userId = currentUser?._id || (currentUser?.rest && currentUser.rest._id);
      if (!userId) {
        setError('You must be logged in to create a listing');
        setLoading(false);
        return;
      }

      const listingData = {
        ...formData,
        title: formData.title || formData.name,
        userRef: userId,
        userModel: 'User',
        imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : []
      };

      const res = await fetch('/api/listing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(listingData),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create listing');
        setLoading(false);
        return;
      }

      setLoading(false);
      localStorage.setItem('isLandlord', 'true');
      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message || 'Something went wrong!');
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

  const renderViewingSchedule = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return (
      <div className="flex flex-col gap-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Viewing Schedule</h2>
        <p className="text-sm text-gray-500 mb-2">Set the times when this property is available for viewing</p>
        
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <input
            type="checkbox"
            id="flexibleViewingTime"
            checked={formData.flexibleViewingTime}
            onChange={(e) => setFormData({ ...formData, flexibleViewingTime: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="flexibleViewingTime" className="text-sm font-medium text-gray-700">
            Schedule viewing times dependent on my availability
          </label>
        </div>

        {!formData.flexibleViewingTime && (
          <div className="grid gap-4">
            {days.map((day) => (
              <div key={day} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 min-w-[120px]">
                  <input
                    type="checkbox"
                    id={`${day}-available`}
                    checked={formData.viewingSchedule[day].available}
                    onChange={(e) => handleViewingScheduleChange(day, 'available', e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor={`${day}-available`} className="capitalize font-medium">
                    {day}
                  </label>
                </div>
                
                {formData.viewingSchedule[day].available && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={formData.viewingSchedule[day].start}
                      onChange={(e) => handleViewingScheduleChange(day, 'start', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.viewingSchedule[day].end}
                      onChange={(e) => handleViewingScheduleChange(day, 'end', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <main className="p-3 max-w-4xl mx-auto">
        <p className="text-center text-2xl">Verifying authentication...</p>
      </main>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white min-h-screen"
    >
      <main className="p-3 max-w-4xl mx-auto relative pt-20">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[100px] mb-8"
        >
          <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>CREATE A NEW</span>
          </h1>
          <h2 className="text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10">
            Listing
          </h2>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="font-semibold">Title</label>
              <input
                type="text"
                id="title"
                maxLength="62"
                minLength="10"
                required
                className="border p-3 rounded-lg"
                onChange={handleChange}
                value={formData.title}
              />
            </div>

            <input
              type="hidden"
              id="name"
              value={formData.name}
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="font-semibold">Description</label>
              <textarea
                id="description"
                required
                className="border p-3 rounded-lg"
                onChange={handleChange}
                value={formData.description}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="address" className="font-semibold">Address</label>
              <input
                type="text"
                id="address"
                required
                className="border p-3 rounded-lg"
                onChange={handleChange}
                value={formData.address}
              />
            </div>

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

            <div className="flex flex-col gap-4 mb-4">
              <label className="font-semibold">Lease Agreement (PDF or DOCX, max 2MB)</label>
              <input
                type="file"
                id="leaseAgreement"
                accept=".pdf,.docx"
                onChange={handleLeaseAgreementUpload}
                className="border p-3 rounded-lg"
              />
              {uploadingLeaseAgreement && <Loader />}
              {leaseAgreementError && (
                <p className='text-red-700 text-sm'>{leaseAgreementError}</p>
              )}
              {formData.leaseAgreementUrl && (
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center gap-2 text-green-700'>
                    <FaFileContract className='text-2xl' />
                    <span>Lease agreement uploaded</span>
                  </div>
                  <div className='flex items-center justify-between p-3 border rounded-lg bg-gray-50'>
                    <div className='flex items-center gap-2'>
                      <FaFileContract className='text-gray-600 text-xl' />
                      <span className='text-sm text-gray-600'>
                        {formData.leaseAgreementUrl.split('/').pop()}
                      </span>
                    </div>
                    <div className='flex gap-2'>
                      <a
                        href={formData.leaseAgreementUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 transition'
                      >
                        Preview
                      </a>
                      <button
                        onClick={handleRemoveLeaseAgreement}
                        className='px-3 py-1 text-white bg-red-600 rounded hover:bg-red-700 transition'
                        type='button'
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <object
                    data={formData.leaseAgreementUrl}
                    type="application/pdf"
                    width="100%"
                    height="500px"
                    className="border rounded-lg mt-2"
                  >
                    <p>Unable to display PDF file. <a href={formData.leaseAgreementUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download</a> instead.</p>
                  </object>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="electricFence"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.electricFence}
                />
                <span>Electric Fence</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="walledOrFenced"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.walledOrFenced}
                />
                <span>Walled/Fenced</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="electricGate"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.electricGate}
                />
                <span>Electric Gate</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="builtInCupboards"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.builtInCupboards}
                />
                <span>Built In Cupboards</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="fittedKitchen"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.fittedKitchen}
                />
                <span>Fitted Kitchen</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="solarGeyser"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.solarGeyser}
                />
                <span>Solar Geyser</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="gym"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.gym}
                />
                <span>Gym</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="pool"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.pool}
                />
                <span>Pool</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="garden"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.garden}
                />
                <span>Garden</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="balcony"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.balcony}
                />
                <span>Balcony</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="airConditioning"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.airConditioning}
                />
                <span>Air Conditioning</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="wifi"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.wifi}
                />
                <span>Wifi</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="flexibleViewingTime"
                  className="w-5 h-5"
                  onChange={handleChange}
                  checked={formData.flexibleViewingTime}
                />
                <span>Flexible Viewing Time</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="bedrooms" className="font-semibold">Beds</label>
                <input
                  type="number"
                  id="bedrooms"
                  min="1"
                  max="10"
                  className="p-3 border rounded-lg"
                  onChange={handleChange}
                  value={formData.bedrooms}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="bathrooms" className="font-semibold">Baths</label>
                <input
                  type="number"
                  id="bathrooms"
                  min="1"
                  max="10"
                  className="p-3 border rounded-lg"
                  onChange={handleChange}
                  value={formData.bathrooms}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="lounges" className="font-semibold">Lounges</label>
                <input
                  type="number"
                  id="lounges"
                  min="1"
                  max="10"
                  required
                  className="p-3 border rounded-lg"
                  onChange={handleChange}
                  value={formData.lounges}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="regularPrice" className="font-semibold">Regular Price</label>
                <input
                  type="number"
                  id="regularPrice"
                  min="50"
                  max="10000000"
                  className="p-3 border rounded-lg"
                  onChange={handleChange}
                  value={formData.regularPrice}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="m2" className="font-semibold">m²</label>
                <input
                  type="number"
                  id="m2"
                  min="1"
                  className="p-3 border rounded-lg"
                  onChange={handleChange}
                  value={formData.m2}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="apartmentType" className="font-semibold">Apartment Type</label>
              <select
                id="apartmentType"
                required
                className="border p-3 rounded-lg"
                onChange={handleChange}
                value={formData.apartmentType}
              >
                <option value="House">House</option>
                <option value="Flat/Apartment">Flat/Apartment</option>
                <option value="Cluster">Cluster</option>
                <option value="Cottage">Cottage</option>
                <option value="Garden Flat">Garden Flat</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-4">
            <p className="font-semibold">
              Images:
              <span className="font-normal text-gray-600 ml-2">
                The first image will be the cover (max 6)
              </span>
            </p>

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

            {imageUploadError && (
              <p className="text-red-700 text-sm">{imageUploadError}</p>
            )}

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
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {renderViewingSchedule()}

            <button
              disabled={loading || uploading}
              className="p-3 bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>

            {error && <p className="text-red-700 text-sm">{error}</p>}
          </div>
        </form>
      </main>
    </motion.div>
  );
};

export default CreateListing;
