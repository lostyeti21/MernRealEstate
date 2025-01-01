import { useSelector } from 'react-redux';
import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from '../firebase';
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut,
} from '../redux/user/userSlice';

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

  const handleFileUpload = (file) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + file.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFilePerc(Math.round(progress));
      },
      (error) => {
        setFileUploadError(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setFormData({ ...formData, avatar: downloadURL });
          dispatch(updateUserSuccess({ ...currentUser, avatar: downloadURL }));
        });
      }
    );
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete listing');
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

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>Landlord Profile</h1>
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
          <h3 className='font-semibold'>Phone Numbers:</h3>
          {phoneNumbers.map((number, index) => (
            <div key={index} className='flex justify-between items-center'>
              <span>{number}</span>
              <button
                type='button'
                className='text-red-500'
                onClick={() => handleRemovePhoneNumber(number)}
              >
                Remove
              </button>
            </div>
          ))}
          <div className='flex flex-col gap-2'>
            <label htmlFor='newPhoneNumber' className='font-semibold'>
              Add New Phone Number
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                id='newPhoneNumber'
                placeholder='Enter phone number'
                value={newPhoneNumber}
                onChange={handlePhoneNumberChange}
                className='border p-3 rounded-lg w-full'
              />
              <button
                type='button'
                onClick={handleAddPhoneNumber}
                className='bg-blue-500 text-white p-3 rounded-lg whitespace-nowrap'
              >
                Add Number
              </button>
            </div>
          </div>
        </div>

        <Link
          to='/change-password'
          className='bg-blue-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95 mt-3'
        >
          Change Password
        </Link>
        
        <button
          disabled={loading}
          className='bg-slate-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
        >
          {loading ? 'Loading...' : 'Update'}
        </button>
        
        <Link
          className='bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
          to='/create-listing'
        >
          Create A Listing
        </Link>
        
        <Link
          className='bg-blue-500 text-white p-3 rounded-lg uppercase text-center hover:opacity-95 mt-5'
          to='/analytics'
        >
          View Analytics
        </Link>
      </form>

      <div className='flex justify-between mt-5'>
        <span
          onClick={handleDeleteUser}
          className='text-red-700 cursor-pointer'
        >
          Delete account
        </span>
        <span onClick={handleSignOut} className='text-red-700 cursor-pointer'>
          Sign out
        </span>
      </div>

      <p className='text-red-700 mt-5'>{error ? error : ''}</p>
      <p className='text-green-700 mt-5'>
        {updateSuccess ? 'Profile updated successfully!' : ''}
      </p>

      <div className='flex gap-2 mt-5'>
        <button onClick={handleShowListings} className='text-green-700 w-full'>
          Show Listings
        </button>
      </div>

      {showListingsError && (
        <p className='text-red-700 mt-5'>
          Error showing listings
        </p>
      )}

      {listingsFetched && userListings.length === 0 && (
        <p className='text-center text-gray-500 mt-5'>
          No listings found. Create your first listing!
        </p>
      )}

      {userListings && userListings.length > 0 && (
        <div className='flex flex-col gap-4'>
          <h1 className='text-center mt-7 text-2xl font-semibold'>
            Your Listings
          </h1>
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

              <div className='flex flex-col item-center'>
                <button
                  onClick={() => handleListingDelete(listing._id)}
                  className='text-red-700 uppercase'
                >
                  Delete
                </button>
                <Link
                  className='text-green-700 uppercase'
                  to={`/update-listing/${listing._id}`}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
