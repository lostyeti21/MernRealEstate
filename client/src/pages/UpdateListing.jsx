import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Loader from '../components/Loader';

export default function UpdateListing() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const params = useParams();
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
    boreholeWater: false
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

        const res = await fetch(`/api/listing/get/${listingId}`);
        const data = await res.json();

        if (!data.success) {
          console.error('Failed to fetch listing:', data);
          setError(data.message || 'Failed to fetch listing');
          return;
        }

        const listing = data.listing;
        console.log('Fetched listing data:', listing);

        // Ensure all required fields are present with default values
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
      e.target.id === 'boreholeWater'
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
      if (formData.imageUrls.length < 1) {
        setError('You must upload at least one image');
        return;
      }
      
      if (+formData.regularPrice < +formData.discountPrice) {
        setError('Discount price must be lower than regular price');
        return;
      }

      setLoading(true);
      setError(null);

      // Get the original listing to check ownership
      const getListingRes = await fetch(`/api/listing/get/${params.listingId}`);
      const listingData = await getListingRes.json();
      
      if (!listingData.success) {
        setError('Could not verify listing ownership');
        return;
      }

      const listing = listingData.listing;
      
      // Verify ownership - handle both agent and regular user IDs
      const currentUserId = currentUser._id || currentUser.id;
      if (listing.userRef !== currentUserId) {
        setError('You can only update your own listings!');
        return;
      }

      const res = await fetch(`/api/listing/update/${params.listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          ...formData,
          userRef: currentUserId,
          userModel: currentUser.isAgent ? 'Agent' : 'User'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to update listing');
        return;
      }

      navigate(`/listing/${data.listing._id}`);
    } catch (error) {
      setError(error.message || 'Something went wrong updating the listing');
    } finally {
      setLoading(false);
    }
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
                <span>Backup Water Supply</span>
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
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  id='m2'
                  min='20'
                  max='10000'
                  required
                  className='p-3 border border-gray-300 rounded-lg'
                  onChange={handleChange}
                  value={formData.m2}
                />
                <div className='flex flex-col items-center'>
                  <p>Size</p>
                  <span className='text-xs'>(m²)</span>
                </div>
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
              {loading ? 'Updating...' : 'Update listing'}
            </button>
            {error && <p className='text-red-700 text-sm'>{error}</p>}
          </div>
        </form>
      )}
    </main>
  );
}
