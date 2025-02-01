import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from '../firebase';
import axios from 'axios';

export default function AgentCreateListing() {
  const { currentUser, isAgent, realEstateCompany } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
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
  });
  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Determine the correct user for listing creation
  const user = isAgent ? currentUser : null;

  // Persistent agent authentication check
  useEffect(() => {
    // Check both Redux state and localStorage for agent status
    const checkAgentAuthentication = () => {
      const storedUser = localStorage.getItem('currentUser');
      let isAgentAuthenticated = isAgent;

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          isAgentAuthenticated = parsedUser.isAgent === true;
        } catch (error) {
          console.error('Error parsing stored user:', error);
          isAgentAuthenticated = false;
        }
      }

      if (!isAgentAuthenticated) {
        console.error('Agent authentication failed');
        navigate('/real-estate-agent-login');
      }
    };

    checkAgentAuthentication();
  }, [isAgent, navigate]);

  // Redirect if not an agent
  useEffect(() => {
    if (!isAgent) {
      navigate('/sign-in');
    }
  }, [isAgent, navigate]);

  const handleImageSubmit = async (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(uploadImage(files[i]));
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
      } finally {
        setUploading(false);
      }
    } else {
      setImageUploadError('You can only upload 6 images per listing');
    }
  };

  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Log the request details
      console.log('Uploading image:', {
        fileSize: file.size,
        fileType: file.type,
        token: user?.token ? 'Present' : 'Missing'
      });

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload response:', data);

      if (data.success) {
        return data.url;
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Image upload failed');
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

    // Add apartment type handling
    if (e.target.id === 'apartmentType') {
      setFormData({
        ...formData,
        apartmentType: e.target.value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.imageUrls.length < 1)
        return setError('You must upload at least one image');
      if (+formData.regularPrice < +formData.discountPrice)
        return setError('Discount price must be lower than regular price');

      // Validate apartment type
      if (!formData.apartmentType) {
        setError('Please select an apartment type');
        return;
      }

      setLoading(true);
      setError(false);
      
      // Ensure user is an agent before creating listing
      if (!user) {
        setError('User not found. Please log in as an agent.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/listing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...formData,
          userRef: user._id,
          userModel: 'Agent'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (!data.success) {
        setError(data.message);
        return;
      }

      navigate('/agent-dashboard');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <main className='p-3 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>
        Create a Listing
      </h1>
      <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-4'>
        <div className='flex flex-col gap-4 flex-1'>
          <input
            type='text'
            placeholder='Name'
            className='border p-3 rounded-lg'
            id='name'
            maxLength='62'
            minLength='10'
            required
            onChange={handleChange}
            value={formData.name}
          />
          <textarea
            type='text'
            placeholder='Description'
            className='border p-3 rounded-lg'
            id='description'
            required
            onChange={handleChange}
            value={formData.description}
          />
          <input
            type='text'
            placeholder='Address'
            className='border p-3 rounded-lg'
            id='address'
            required
            onChange={handleChange}
            value={formData.address}
          />
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
                id='offer'
                className='w-5'
                onChange={handleChange}
                checked={formData.offer}
              />
              <span>Offer</span>
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
              <span>Borehole Water</span>
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
              <span>Walled or Fenced</span>
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
              <p>Beds</p>
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
              <p>Baths</p>
            </div>
            <div className='flex items-center gap-2'>
              <input
                type='number'
                id='lounges'
                min='1'
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
                min='1'
                required
                className='p-3 border border-gray-300 rounded-lg'
                onChange={handleChange}
                value={formData.m2}
              />
              <p>m²</p>
            </div>
            <div className='flex items-center gap-2'>
              <input
                type='number'
                id='regularPrice'
                min='50'
                required
                className='p-3 border border-gray-300 rounded-lg'
                onChange={handleChange}
                value={formData.regularPrice}
              />
              <div className='flex flex-col items-center'>
                <p>Regular price</p>
                {formData.type === 'rent' && (
                  <span className='text-xs'>($ / month)</span>
                )}
              </div>
            </div>
            {formData.offer && (
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  id='discountPrice'
                  min='0'
                  required
                  className='p-3 border border-gray-300 rounded-lg'
                  onChange={handleChange}
                  value={formData.discountPrice}
                />
                <div className='flex flex-col items-center'>
                  <p>Discounted price</p>
                  {formData.type === 'rent' && (
                    <span className='text-xs'>($ / month)</span>
                  )}
                </div>
              </div>
            )}
            <div className='flex items-center gap-2'>
              <select
                id='apartmentType'
                className='p-3 border border-gray-300 rounded-lg'
                onChange={handleChange}
                value={formData.apartmentType}
              >
                <option value='House'>House</option>
                <option value='Flat/Apartment'>Flat/Apartment</option>
                <option value='Cluster'>Cluster</option>
                <option value='Cottage'>Cottage</option>
                <option value='Garden Flat'>Garden Flat</option>
              </select>
              <p>Apartment Type</p>
            </div>
          </div>
          <div className='flex flex-wrap gap-6'>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='electricFence'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.electricFence}
              />
              <span>Electric Fence</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='walledOrFenced'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.walledOrFenced}
              />
              <span>Walled/Fenced</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='electricGate'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.electricGate}
              />
              <span>Electric Gate</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='builtInCupboards'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.builtInCupboards}
              />
              <span>Built In Cupboards</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='fittedKitchen'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.fittedKitchen}
              />
              <span>Fitted Kitchen</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='solarGeyser'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.solarGeyser}
              />
              <span>Solar Geyser</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='gym'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.gym}
              />
              <span>Gym</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='pool'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.pool}
              />
              <span>Pool</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='garden'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.garden}
              />
              <span>Garden</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='balcony'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.balcony}
              />
              <span>Balcony</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='airConditioning'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.airConditioning}
              />
              <span>Air Conditioning</span>
            </div>
            <div className='flex gap-2 items-center'>
              <input
                type='checkbox'
                id='wifi'
                className='w-5 h-5'
                onChange={handleChange}
                checked={formData.wifi}
              />
              <span>WiFi</span>
            </div>
          </div>
        </div>
        <div className='flex flex-col flex-1 gap-4'>
          <p className='font-semibold'>
            Images:
            <span className='font-normal text-gray-600 ml-2'>
              The first image will be the cover (max 6)
            </span>
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
          <button
            disabled={loading || uploading}
            className='p-3 bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
          >
            {loading ? 'Creating...' : 'Create listing'}
          </button>
          {error && <p className='text-red-700 text-sm'>{error}</p>}
        </div>
      </form>
    </main>
  );
}
