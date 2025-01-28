import { useSelector } from 'react-redux';
import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut,
} from '../redux/user/userSlice';
import Loader from '../components/Loader';
import { motion } from "framer-motion";

export default function LandlordProfile() {
  const fileRef = useRef(null);
  const qrRef = useRef(null);
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState(currentUser.phoneNumbers || []); 
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [showListingsError, setShowListingsError] = useState(false);
  const [userListings, setUserListings] = useState([]);
  const [listingsFetched, setListingsFetched] = useState(false);
  const [showShareButton, setShowShareButton] = useState(false);
  const [showListingsSection, setShowListingsSection] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [averageRating, setAverageRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/sign-in');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchLandlordRating = async () => {
      try {
        if (!currentUser?._id) return;

        const res = await fetch(`/api/user/${currentUser._id}`);
        if (!res.ok) throw new Error("Failed to fetch landlord rating.");
        
        const data = await res.json();
        setAverageRating(data.averageRating);
        setRatingLoading(false);
      } catch (err) {
        console.error("Error loading landlord rating:", err);
        setRatingLoading(false);
      }
    };

    fetchLandlordRating();
  }, [currentUser]);

  const handleFileUpload = async (file) => {
    try {
      // Reset states
      setFileUploadError(false);
      setFilePerc(0);

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Start upload progress
      setFilePerc(10);

      // Upload to backend
      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Image upload failed');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;

      // Update form data and user state
      setFormData(prev => ({ ...prev, avatar: imageUrl }));
      dispatch(updateUserSuccess({ ...currentUser, avatar: imageUrl }));

      // Update backend with new avatar
      const updateResponse = await fetch(`/api/user/update/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: imageUrl }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update user avatar');
      }

      // Complete progress
      setFilePerc(100);
    } catch (error) {
      console.error('Error uploading image:', error);
      setFileUploadError(true);
      setFilePerc(0);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handlePhoneNumberChange = (e) => {
    setNewPhoneNumber(e.target.value);
  };

  const handleAddPhoneNumber = () => {
    if (newPhoneNumber && !phoneNumbers.includes(newPhoneNumber)) {
      setPhoneNumbers([...phoneNumbers, newPhoneNumber]);
      setNewPhoneNumber("");
    }
  };

  const handleRemovePhoneNumber = (number) => {
    setPhoneNumbers(phoneNumbers.filter((phone) => phone !== number));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await fetch(`/api/user/update/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, phoneNumbers }),
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

  const handleDeleteUser = async () => {
    try {
      dispatch(deleteUserStart());
      const res = await fetch(`/api/user/delete/${currentUser._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(deleteUserFailure(data.message));
        return;
      }
      dispatch(deleteUserSuccess(data));
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/signout');
      const data = await res.json();
      if (data.success === false) {
        console.log(data.message);
        return;
      }
      dispatch(signOut());
    } catch (error) {
      console.log(error);
    }
  };

  const handleShowListings = async () => {
    if (showListingsSection && userListings.length > 0) {
      // If listings are currently shown, just hide them
      setShowListingsSection(false);
      return;
    }

    try {
      setShowListingsError(false);
      setListingsFetched(false);

      if (!currentUser?._id) {
        console.error('No user ID found');
        setShowListingsError(true);
        return;
      }

      const res = await fetch(`/api/user/listings/${currentUser._id}`);
      
      if (!res.ok) {
        console.error('Response not OK:', res.status);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Listings response:', data);

      if (data.success) {
        setUserListings(data.listings);
        setListingsFetched(true);
        setShowListingsSection(true);
        console.log('Found listings:', data.listings.length);
      } else {
        console.error('Failed to fetch listings:', data.message);
        setShowListingsError(true);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setShowListingsError(true);
    }
  };

  const handleListingDelete = async (listingId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this listing?');
      
      if (!confirmed) {
        return;
      }

      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Add this to include cookies
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete listing');
      }

      setUserListings((prev) => 
        prev.filter((listing) => listing._id !== listingId)
      );

    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing: ' + error.message);
    }
  };

  const getUserAvatar = () => {
    if (currentUser?.avatar) {
      return currentUser.avatar;
    }
    return "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";
  };

  const handleShareQR = async () => {
    try {
      // Get the QR code SVG element
      const svgElement = qrRef.current;
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create a temporary image
      const img = new Image();
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Set up image onload handler
      img.onload = async () => {
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        try {
          // Convert canvas to blob
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          
          // Create file from blob
          const file = new File([blob], 'qr-code.png', { type: 'image/png' });
          
          // Share the file
          if (navigator.share) {
            await navigator.share({
              files: [file],
              title: 'Verification QR Code',
              text: 'Scan this QR code to verify'
            });
          } else {
            // Fallback for browsers that don't support sharing
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        } catch (error) {
          console.error('Error sharing:', error);
        }
        
        // Clean up
        URL.revokeObjectURL(url);
      };
      
      // Set image source to trigger load
      img.src = url;
    } catch (error) {
      console.error('Error preparing QR code for share:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    handleDeleteUser();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        className={`text-lg ${
          i + 1 <= Math.round(rating) ? "text-yellow-500" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full mx-auto px-4 bg-white min-h-screen relative pt-20"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[100px] mb-8"
        >
          <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>LANDLORD</span>
          </h1>
          <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
            Profile
          </h2>
          <div className='text-lg text-slate-500 absolute bottom-0 right-0 z-10 flex items-center'>
            <span className='mr-2'>Your Rating:</span>
            {ratingLoading ? (
              <span className='text-gray-400'>Loading...</span>
            ) : averageRating ? (
              <>
                {renderStars(averageRating)}
                <span className='text-sm text-gray-500 ml-2'>
                  ({averageRating.toFixed(1)})
                </span>
              </>
            ) : (
              <span className='text-gray-400'>Not Rated Yet</span>
            )}
          </div>
        </motion.div>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <input
            onChange={(e) => setFile(e.target.files[0])}
            type='file'
            ref={fileRef}
            hidden
            accept='image/*'
          />
          
          {/* Avatar and QR Code section */}
          <div className='flex justify-center items-center gap-8 mb-4'>
            <div className='flex flex-col items-center'>
              <img
                onClick={() => fileRef.current.click()}
                src={getUserAvatar()}
                alt='profile'
                className='rounded-lg h-32 w-32 object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-md mb-2'
              />
              <p className='text-sm text-gray-500 text-center'>
                Click your profile picture to change it
              </p>
            </div>
            
            <div 
              className='flex flex-col items-center relative group'
              onMouseEnter={() => setShowShareButton(true)}
              onMouseLeave={() => setShowShareButton(false)}
            >
              <div className='relative'>
                <QRCodeSVG
                  ref={qrRef}
                  value={`${window.location.origin}/generated-code`}
                  size={128}
                  level='H'
                  includeMargin={true}
                  className={`shadow-md rounded-lg transition-all duration-500 ease-in-out ${
                    showShareButton ? 'blur-[2px]' : ''
                  }`}
                />
                {showShareButton && (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <button
                      onClick={handleShareQR}
                      className='bg-black bg-opacity-75 text-white px-6 py-2 rounded-lg 
                               transition-all duration-300 ease-in-out hover:bg-opacity-90 
                               text-sm font-medium z-10'
                    >
                      Share QR
                    </button>
                  </div>
                )}
              </div>
              <p className='text-sm text-gray-500 text-center mt-2'>
                Scan to view verification code
              </p>
            </div>
          </div>

          <p className='text-sm self-center'>
            {fileUploadError ? (
              <span className='text-red-700'>
                Error Image upload (image must be less than 2 mb)
              </span>
            ) : filePerc > 0 && filePerc < 100 ? (
              <span className='text-slate-700'>{`Uploading ${filePerc}%`}</span>
            ) : filePerc === 100 ? (
              <span className='text-green-700'>Image successfully uploaded!</span>
            ) : (
              ''
            )}
          </p>
          <div className='flex flex-col gap-2'>
            <label htmlFor='username' className='font-semibold'>
              Username
            </label>
            <input
              type='text'
              placeholder='username'
              defaultValue={currentUser.username}
              id='username'
              className='border p-3 rounded-lg'
              onChange={handleChange}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <label htmlFor='email' className='font-semibold'>
              Email Address
            </label>
            <input
              type='email'
              placeholder='email'
              id='email'
              defaultValue={currentUser.email}
              className='border p-3 rounded-lg'
              onChange={handleChange}
            />
          </div>

          {/* Phone Number Inputs */}
          <div className='flex flex-col gap-3'>
            <h3 className='font-semibold text-slate-700'>Phone Numbers:</h3>
            <div className='space-y-2 bg-slate-50 rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200/70'>
              {phoneNumbers.map((number, index) => (
                <div 
                  key={index} 
                  className='flex justify-between items-center px-4 py-3 hover:bg-white/80 transition-colors first:rounded-t-xl last:rounded-b-xl'
                >
                  <div className='flex items-center gap-3'>
                    <div className='bg-white p-2 rounded-full shadow-sm'>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-green-600" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </div>
                    <span className='text-slate-700 font-medium'>{number}</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleRemovePhoneNumber(number)}
                    className='text-slate-400 hover:text-red-500 p-2 hover:bg-white rounded-full transition-all duration-200'
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </button>
                </div>
              ))}
              {phoneNumbers.length === 0 && (
                <div className='px-4 py-3 text-slate-500 text-sm italic text-center'>
                  No phone numbers added yet
                </div>
              )}
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='newPhoneNumber' className='font-medium text-slate-700'>
                Add New Phone Number
              </label>
              <div className='flex items-center gap-2'>
                <input
                  type='text'
                  id='newPhoneNumber'
                  placeholder='Enter phone number'
                  value={newPhoneNumber}
                  onChange={handlePhoneNumberChange}
                  className='border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
                />
                <button
                  type='button'
                  onClick={handleAddPhoneNumber}
                  className='bg-green-600 text-white p-3 rounded-lg uppercase text-sm font-medium hover:bg-green-700 transition duration-200 flex items-center justify-center'
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <Link
            to='/change-password'
            className='bg-blue-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2 mt-3'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2V6a1 1 0 100-2h3a1 1 0 012 0v2a1 1 0 110 2h3a1 1 0 012 0v2a2 2 0 012 2v5a1 1 0 01-1 1H9a1 1 0 01-1-1v-5a2 2 0 00-2-2H5zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
            Change Password
          </Link>
          
          <button
            disabled={loading}
            className='bg-slate-700 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-slate-800 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-80'
          >
            {loading ? <Loader /> : 'Update'}
          </button>
          
          <Link
            className='bg-green-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-green-700 transition duration-200 flex items-center justify-center gap-2'
            to='/create-listing'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create A Listing
          </Link>
          
          <Link
            className='bg-blue-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2 mt-5'
            to='/analytics'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
            View Analytics
          </Link>
        </form>

        <div className='flex justify-between mt-5'>
          <button
            onClick={handleDeleteClick}
            className='bg-red-600 text-white px-6 py-2 rounded-lg uppercase text-sm font-medium hover:bg-red-700 transition duration-200 flex items-center gap-2'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete Account
          </button>
          <button
            onClick={handleSignOut}
            className='bg-slate-700 text-white px-6 py-2 rounded-lg uppercase text-sm font-medium hover:bg-slate-800 transition duration-200 flex items-center gap-2'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.515a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            </svg>
            Sign Out
          </button>
        </div>

        <p className='text-red-700 mt-5'>{error ? error : ''}</p>
        <p className='text-green-700 mt-5'>
          {updateSuccess ? 'Profile updated successfully!' : ''}
        </p>

        <div className='flex gap-2 mt-5'>
          <button
            onClick={handleShowListings}
            className='w-full bg-purple-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-purple-700 transition duration-200 flex items-center justify-center gap-2'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              {showListingsSection ? (
                // Eye-off icon for hide
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.515a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              ) : (
                // List icon for show
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100 2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              )}
            </svg>
            {showListingsSection ? 'Hide Listings' : 'Show Listings'}
          </button>
        </div>

        {showListingsError && (
          <p className='text-red-700 mt-5'>Error showing listings</p>
        )}

        {listingsFetched && userListings.length === 0 && (
          <p className='text-center text-gray-500 mt-5'>
            No listings found. Create your first listing!
          </p>
        )}

        {showListingsSection && userListings && userListings.length > 0 && (
          <div className='flex flex-col gap-4'>
            <h1 className='text-center mt-7 text-2xl font-semibold'>Your Listings</h1>
            {userListings.map((listing) => (
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
                  className='text-slate-700 font-semibold hover:underline truncate flex-1'
                  to={`/listing/${listing._id}`}
                >
                  <p>{listing.name}</p>
                </Link>

                <div className='flex flex-col item-center gap-2'>
                  <button
                    onClick={() => handleListingDelete(listing._id)}
                    className='bg-red-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-red-700 transition duration-200'
                  >
                    Delete
                  </button>
                  <Link
                    to={`/update-listing/${listing._id}`}
                    className='bg-green-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-green-700 transition duration-200 text-center'
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Account</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action will permanently delete all your data and listings from the site.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Yes, Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
