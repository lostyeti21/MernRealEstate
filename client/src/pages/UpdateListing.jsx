import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Loader from '../components/Loader';
import { FaFileContract } from 'react-icons/fa';

export default function UpdateListing() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const params = useParams();
  const [files, setFiles] = useState([]);
  const [leaseAgreementFile, setLeaseAgreementFile] = useState(null);
  const [leaseAgreementError, setLeaseAgreementError] = useState('');
  const [uploadingLeaseAgreement, setUploadingLeaseAgreement] = useState(false);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: '',
    description: '',
    address: '',
    type: 'rent',
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
    apartmentType: 'House',
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

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingId = params.listingId;
        setLoading(true);
        console.log('Fetching listing:', listingId);

        const res = await fetch(`/api/listing/${listingId}`);
        const data = await res.json();

        if (!data.success) {
          console.error('Failed to fetch listing:', data);
          setError(data.message || 'Failed to fetch listing');
          return;
        }

        const listing = data.listing;
        console.log('Fetched listing data:', listing);

        setFormData({
          imageUrls: listing.imageUrls || [],
          name: listing.name || '',
          description: listing.description || '',
          address: listing.address || '',
          type: listing.type || 'rent',
          bedrooms: listing.bedrooms || 1,
          bathrooms: listing.bathrooms || 1,
          regularPrice: listing.regularPrice || 50,
          discountPrice: listing.discountPrice || 0,
          offer: listing.offer || false,
          parking: listing.parking || false,
          furnished: listing.furnished || false,
          m2: listing.m2 || 0,
          backupPower: listing.backupPower || false,
          backupWaterSupply: listing.backupWaterSupply || false,
          boreholeWater: listing.boreholeWater || false,
          apartmentType: listing.apartmentType || 'House',
          lounges: listing.lounges || 1,
          electricFence: listing.electricFence || false,
          walledOrFenced: listing.walledOrFenced || false,
          electricGate: listing.electricGate || false,
          builtInCupboards: listing.builtInCupboards || false,
          fittedKitchen: listing.fittedKitchen || false,
          solarGeyser: listing.solarGeyser || false,
          gym: listing.gym || false,
          pool: listing.pool || false,
          garden: listing.garden || false,
          balcony: listing.balcony || false,
          airConditioning: listing.airConditioning || false,
          wifi: listing.wifi || false,
          leaseAgreementUrl: listing.leaseAgreementUrl || '',
          viewingSchedule: listing.viewingSchedule || {
            monday: { available: false, start: "09:00", end: "17:00" },
            tuesday: { available: false, start: "09:00", end: "17:00" },
            wednesday: { available: false, start: "09:00", end: "17:00" },
            thursday: { available: false, start: "09:00", end: "17:00" },
            friday: { available: false, start: "09:00", end: "17:00" },
            saturday: { available: false, start: "09:00", end: "17:00" },
            sunday: { available: false, start: "09:00", end: "17:00" }
          },
          flexibleViewingTime: listing.flexibleViewingTime || false
        });
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError(error.message || 'Failed to fetch listing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [params.listingId]);

  const handleLeaseAgreementUpload = async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 2 * 1024 * 1024; 

    if (!file) {
      setLeaseAgreementError('');
      setLeaseAgreementFile(null);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setLeaseAgreementError('Only PDF and DOCX files are allowed');
      setLeaseAgreementFile(null);
      return;
    }

    if (file.size > maxSize) {
      setLeaseAgreementError('File must be 2MB or smaller');
      setLeaseAgreementFile(null);
      return;
    }

    try {
      setUploadingLeaseAgreement(true);
      setLeaseAgreementError('');

      const leaseAgreementUrl = await storeLeasePdf(file);
      
      setFormData(prevData => ({
        ...prevData,
        leaseAgreementUrl: leaseAgreementUrl
      }));
      
      setLeaseAgreementFile(null);
    } catch (error) {
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

      console.log('Upload Response:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries())
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await res.text();
        console.error('Non-JSON response:', errorText);
        throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Document upload failed');
      }

      if (!data.url || typeof data.url !== 'string') {
        throw new Error('Invalid URL returned from server');
      }

      return data.url;
    } catch (error) {
      console.error('Lease Agreement upload error:', error);
      
      if (error.name === 'SyntaxError') {
        throw new Error('Received invalid JSON from server. Please check server logs.');
      }
      
      throw error;
    }
  };

  const handleRemoveLeaseAgreement = () => {
    setFormData(prevData => ({
      ...prevData,
      leaseAgreementUrl: ''
    }));
  };

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
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e) => {
    if (e.target.id === 'sale' || e.target.id === 'rent') {
      setFormData({
        ...formData,
        type: e.target.id,
      });
    }

    if (
      e.target.id === 'parking' ||
      e.target.id === 'furnished' ||
      e.target.id === 'offer' ||
      e.target.id === 'backupPower' ||
      e.target.id === 'backupWaterSupply' ||
      e.target.id === 'boreholeWater' ||
      e.target.id === 'electricFence' ||
      e.target.id === 'walledOrFenced' ||
      e.target.id === 'electricGate' ||
      e.target.id === 'builtInCupboards' ||
      e.target.id === 'fittedKitchen' ||
      e.target.id === 'solarGeyser' ||
      e.target.id === 'gym' ||
      e.target.id === 'pool' ||
      e.target.id === 'garden' ||
      e.target.id === 'balcony' ||
      e.target.id === 'airConditioning' ||
      e.target.id === 'wifi'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.checked,
      });
    }

    if (
      e.target.type === 'number' ||
      e.target.type === 'text' ||
      e.target.type === 'textarea'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.imageUrls || formData.imageUrls.length < 1) {
        setError('You must upload at least one image before creating a listing');
        return;
      }

      const requiredFields = [
        'name', 'description', 'address', 'regularPrice', 
        'discountPrice', 'bathrooms', 'bedrooms', 'type', 
        'apartmentType', 'm2', 'lounges'
      ];

      const missingFields = requiredFields.filter(field => {
        const value = formData[field];
        return value === undefined || value === null || value === '';
      });

      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      setLoading(true);
      setError(false);

      const getListingRes = await fetch(`/api/listing/${params.listingId}`);
      const listingData = await getListingRes.json();

      const updateData = {
        ...formData,
        userRef: currentUser._id,
        userModel: 'User', 
        imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : [],
        
        furnished: !!formData.furnished,
        parking: !!formData.parking,
        offer: !!formData.offer,
        backupPower: !!formData.backupPower,
        backupWaterSupply: !!formData.backupWaterSupply,
        boreholeWater: !!formData.boreholeWater,
        electricFence: !!formData.electricFence,
        walledOrFenced: !!formData.walledOrFenced,
        electricGate: !!formData.electricGate,
        builtInCupboards: !!formData.builtInCupboards,
        fittedKitchen: !!formData.fittedKitchen,
        solarGeyser: !!formData.solarGeyser,
        gym: !!formData.gym,
        pool: !!formData.pool,
        garden: !!formData.garden,
        balcony: !!formData.balcony,
        airConditioning: !!formData.airConditioning,
        wifi: !!formData.wifi,
      };

      if (formData.leaseAgreementUrl) {
        updateData.leaseAgreementUrl = formData.leaseAgreementUrl;
      }

      const res = await fetch(`/api/listing/update/${params.listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.message || 'Failed to update listing');
        return;
      }

      // Use the original listing ID if not returned in the response
      const listingId = data._id || params.listingId;
      navigate(`/listing/${listingId}`);
    } catch (error) {
      setError(error.message);
      setLoading(false);
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

  return (
    <main className='p-3 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>
        {loading ? <Loader /> : "Update Listing"}
      </h1>
      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-700 text-center">{error}</p>
      ) : (
        <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-4'>
          <div className='flex flex-col gap-4 flex-1'>
            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Property Details</h2>
              
              <div className='flex flex-col gap-1'>
                <label htmlFor='name' className='text-sm font-medium text-gray-700'>
                  Title
                </label>
                <input
                  type='text'
                  placeholder='Property Title'
                  className='border p-3 rounded-lg'
                  id='name'
                  maxLength='62'
                  minLength='10'
                  required
                  onChange={handleChange}
                  value={formData.name}
                />
              </div>

              <div className='flex flex-col gap-1'>
                <label htmlFor='description' className='text-sm font-medium text-gray-700'>
                  Details
                </label>
                <textarea
                  type='text'
                  placeholder='Property Description'
                  className='border p-3 rounded-lg'
                  id='description'
                  required
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>

              <div className='flex flex-col gap-1'>
                <label htmlFor='address' className='text-sm font-medium text-gray-700'>
                  Address
                </label>
                <input
                  type='text'
                  placeholder='Property Address'
                  className='border p-3 rounded-lg'
                  id='address'
                  required
                  onChange={handleChange}
                  value={formData.address}
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Property Type & Size</h2>
              <div className='flex gap-6 flex-wrap'>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='sale'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.type === 'sale'}
                  />
                  <span>Sell</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='rent'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.type === 'rent'}
                  />
                  <span>Rent</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='offer'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.offer}
                  />
                  <span>Offer</span>
                </div>
              </div>

              <div className='flex flex-wrap gap-6'>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    id='bedrooms'
                    min='1'
                    max='10'
                    required
                    className='p-3 border border-gray-300 rounded-lg'
                    onChange={handleChange}
                    value={formData.bedrooms}
                  />
                  <p>Bedrooms</p>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    id='bathrooms'
                    min='1'
                    max='10'
                    required
                    className='p-3 border border-gray-300 rounded-lg'
                    onChange={handleChange}
                    value={formData.bathrooms}
                  />
                  <p>Bathrooms</p>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    id='lounges'
                    min='0'
                    max='10'
                    required
                    className='p-3 border border-gray-300 rounded-lg'
                    onChange={handleChange}
                    value={formData.lounges}
                  />
                  <p>Lounges</p>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    id='m2'
                    min='0'
                    required
                    className='p-3 border border-gray-300 rounded-lg'
                    onChange={handleChange}
                    value={formData.m2}
                  />
                  <p>Square Meters</p>
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Pricing</h2>
              <div className='flex flex-wrap gap-6'>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    id='regularPrice'
                    min='50'
                    max='10000000'
                    required
                    className='p-3 border border-gray-300 rounded-lg'
                    onChange={handleChange}
                    value={formData.regularPrice}
                  />
                  <div className='flex flex-col items-center'>
                    <p>Regular price</p>
                    <span className='text-xs'>($ / month)</span>
                  </div>
                </div>
                {formData.offer && (
                  <div className='flex items-center gap-2'>
                    <input
                      type='number'
                      id='discountPrice'
                      min='0'
                      max='10000000'
                      required
                      className='p-3 border border-gray-300 rounded-lg'
                      onChange={handleChange}
                      value={formData.discountPrice}
                    />
                    <div className='flex flex-col items-center'>
                      <p>Discounted price</p>
                      <span className='text-xs'>($ / month)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Amenities & Features</h2>
              <div className='flex gap-2 flex-wrap items-center'>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='parking'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.parking}
                  />
                  <span>Parking spot</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='furnished'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.furnished}
                  />
                  <span>Furnished</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='backupPower'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.backupPower}
                  />
                  <span>Backup Power</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='backupWaterSupply'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.backupWaterSupply}
                  />
                  <span>Backup Water</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='boreholeWater'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.boreholeWater}
                  />
                  <span>Borehole</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='electricFence'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.electricFence}
                  />
                  <span>Electric Fence</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='walledOrFenced'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.walledOrFenced}
                  />
                  <span>Walled/Fenced</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='electricGate'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.electricGate}
                  />
                  <span>Electric Gate</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='builtInCupboards'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.builtInCupboards}
                  />
                  <span>Built-in Cupboards</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='fittedKitchen'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.fittedKitchen}
                  />
                  <span>Fitted Kitchen</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='solarGeyser'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.solarGeyser}
                  />
                  <span>Solar Geyser</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='gym'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.gym}
                  />
                  <span>Gym</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='pool'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.pool}
                  />
                  <span>Pool</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='garden'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.garden}
                  />
                  <span>Garden</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='balcony'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.balcony}
                  />
                  <span>Balcony</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='airConditioning'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.airConditioning}
                  />
                  <span>Air Conditioning</span>
                </div>
                <div className='flex gap-2'>
                  <input
                    type='checkbox'
                    id='wifi'
                    className='w-5'
                    onChange={handleChange}
                    checked={formData.wifi}
                  />
                  <span>WiFi</span>
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Lease Agreement</h2>
              <div className='flex items-center gap-4'>
                <input
                  type='file'
                  id='leaseAgreement'
                  accept='.pdf,.docx'
                  onChange={handleLeaseAgreementUpload}
                  className='p-3 border border-gray-300 rounded-lg w-full'
                />
                {uploadingLeaseAgreement && <Loader />}
              </div>
              {leaseAgreementError && (
                <p className='text-red-700 text-sm'>{leaseAgreementError}</p>
              )}
              {formData.leaseAgreementUrl && (
                <div className='flex items-center gap-2 text-green-700'>
                  <FaFileContract className='text-2xl' />
                  <span>Lease agreement uploaded</span>
                </div>
              )}
            </div>

            {renderViewingSchedule()}

            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-semibold text-slate-700'>Property Images</h2>
              <p className='text-gray-600 text-sm'>
                The first image will be the cover (max 6)
              </p>
              <div className='flex gap-4'>
                <input
                  onChange={(e) => setFiles(e.target.files)}
                  className='p-3 border border-gray-300 rounded w-full'
                  type='file'
                  id='images'
                  accept='image/*'
                  multiple
                />
                <button
                  type='button'
                  disabled={uploading}
                  onClick={handleImageSubmit}
                  className='p-3 text-green-700 border border-green-700 rounded uppercase hover:shadow-lg disabled:opacity-80'
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <p className='text-red-700 text-sm'>
                {imageUploadError && imageUploadError}
              </p>
              {formData.imageUrls.length > 0 &&
                formData.imageUrls.map((url, index) => (
                  <div
                    key={url}
                    className='flex justify-between p-3 border items-center'
                  >
                    <img
                      src={url}
                      alt='listing image'
                      className='w-20 h-20 object-contain rounded-lg'
                    />
                    <button
                      type='button'
                      onClick={() => handleRemoveImage(index)}
                      className='p-3 text-red-700 rounded-lg uppercase hover:opacity-75'
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          </div>
          <div className='flex flex-col flex-1 gap-4'>
            <button
              disabled={loading || uploading}
              className='p-3 bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
            >
              {loading ? 'Updating...' : 'Update listing'}
            </button>
            {error && <p className='text-red-700 text-sm'>{error}</p>}
          </div>
        </form>
      )}
    </main>
  );
}
