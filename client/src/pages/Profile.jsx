import { useSelector } from "react-redux";
import { useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut
} from "../redux/user/userSlice.js";
import { motion } from "framer-motion";

const Profile = () => {
  const fileRef = useRef(null);
  const { currentUser, loading, error, isRealEstateCompany, realEstateCompany } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [phoneNumbers, setPhoneNumbers] = useState(currentUser.phoneNumbers || []); // To store multiple phone numbers
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  const [showListingsError, setShowListingsError] = useState(false);
  const [userListings, setUserListings] = useState([]);
  const [listingsFetched, setListingsFetched] = useState(false);
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
    let timeout;
    if (uploadSuccess) {
      timeout = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [uploadSuccess]);

  useEffect(() => {
    // If no user is logged in, redirect to sign in
    if (!currentUser) {
      navigate('/sign-in');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchUserRating = async () => {
      try {
        if (!currentUser?._id) return;

        const res = await fetch(`/api/user/${currentUser._id}`);
        if (!res.ok) throw new Error("Failed to fetch user rating.");
        
        const data = await res.json();
        setAverageRating(data.averageRating);
        setRatingLoading(false);
      } catch (err) {
        console.error("Error loading user rating:", err);
        setRatingLoading(false);
      }
    };

    fetchUserRating();
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        method: "DELETE",
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete listing');
      }

      // Update the listings state after successful deletion
      setUserListings((prev) => 
        prev.filter((listing) => listing._id !== listingId)
      );

    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing: ' + error.message);
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

  // Determine which avatar to use
  const getUserAvatar = () => {
    // For real estate company
    if (isRealEstateCompany && currentUser?.avatar) {
      return currentUser.avatar;
    }
    
    // For regular user
    if (currentUser?.avatar) {
      return currentUser.avatar;
    }

    // Fallback to default
    return "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";
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
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>PROFILE</span>
          </h1>
          <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
            Edit your Account
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
        <div className="p-3 max-w-lg mx-auto">
          <h1 className="text-3xl font-semibold text-center my-7"></h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex justify-center items-center gap-8 mb-4">
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
                {filePerc > 0 && filePerc < 100 && (
                  <div className='w-full bg-gray-200 rounded-full h-2.5 mt-2'>
                    <div 
                      className='bg-green-600 h-2.5 rounded-full' 
                      style={{width: `${filePerc}%`}}
                    ></div>
                  </div>
                )}
                {fileUploadError && (
                  <span className='text-red-700 text-sm'>
                    Error uploading image (file must be less than 2 MB)
                  </span>
                )}
              </div>
            </div>
            <input
              onChange={(e) => handleFileUpload(e.target.files[0])}
              type='file'
              ref={fileRef}
              hidden
              accept='image/*'
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-slate-700 font-semibold">Username</label>
              <input
                type="text"
                placeholder="username"
                id="username"
                defaultValue={currentUser.username}
                className="border p-3 rounded-lg"
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-slate-700 font-semibold">Email</label>
              <input
                type="email"
                placeholder="email"
                id="email"
                defaultValue={currentUser.email}
                className="border p-3 rounded-lg"
                onChange={handleChange}
              />
            </div>
            
            {/* Phone Numbers Section */}
            <div className="flex flex-col gap-2">
              <label htmlFor="newPhoneNumber" className="font-medium text-slate-700">
                Add New Phone Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="newPhoneNumber"
                  placeholder="Enter phone number"
                  value={newPhoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddPhoneNumber}
                  className="bg-green-600 text-white p-3 rounded-lg uppercase text-sm font-medium hover:bg-green-700 transition duration-200 flex items-center justify-center"
                >
                  Add
                </button>
              </div>
            </div>

            <Link
              to='/change-password'
              className='bg-blue-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2 mt-3'
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Change Password
            </Link>

            {/* Current Phone Numbers Display */}
            {phoneNumbers.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-slate-700 font-semibold">Current Phone Numbers</label>
                <div className="flex flex-col gap-2">
                  {phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex justify-between items-center border p-3 rounded-lg">
                      <span>{phone}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoneNumber(phone)}
                        className="text-red-700 hover:opacity-75"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={loading}
              className="bg-slate-700 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-slate-800 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-80 w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Update Profile
                </>
              )}
            </button>
            
            <Link
              className="bg-green-700 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-green-800 transition duration-200 flex items-center justify-center gap-2 mt-5"
              to={"/create-listing"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create A Listing
            </Link>

            {currentUser && currentUser.listings && currentUser.listings.length > 0 && (
              <>
                <Link to="/analytics" className="mt-5">
                  <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 000 2h2a1 1 0 100-2H7v-3a1 1 0 00-1-1H2v3a2 2 0 012-2 4 4 0 012 4v7h14a2 2 0 012 2v-3a1 1 0 100-2h-3v-4a1 1 0 00-1-1h-2V7a1 1 0 100 2h3v4a1 1 0 001 1h3v3a2 2 0 01-2 2H7v-3a1 1 0 00-1-1H2v3z" />
                    </svg>
                    View Analytics
                  </button>
                </Link>

                <Link to="/listings" className="mt-5">
                  <button className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-purple-700 transition duration-200 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    Show Listings
                  </button>
                </Link>
              </>
            )}
          </form>
          <div className='flex justify-between mt-5'>
            <button
              onClick={handleDeleteClick}
              className='bg-red-600 text-white px-6 py-2 rounded-lg uppercase text-sm font-medium hover:bg-red-700 transition duration-200 flex items-center gap-2'
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Delete Account
            </button>
            <button
              onClick={handleSignOut}
              className='bg-slate-700 text-white px-6 py-2 rounded-lg uppercase text-sm font-medium hover:bg-slate-800 transition duration-200 flex items-center gap-2'
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2h2a1 1 0 100-2H7v-3a1 1 0 00-1-1H2v3a2 2 0 012-2 4 4 0 012 4v7h14a2 2 0 012 2v-3a1 1 0 100-2h-3v-4a1 1 0 00-1-1h-2V7a1 1 0 100 2h3v4a1 1 0 001 1h3v3a2 2 0 01-2 2H7v-3a1 1 0 00-1-1H2v3z" />
              </svg>
              Sign Out
            </button>
          </div>

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
          <p className="text-red-700 mt-5">{error ? error : ""}</p>
          <p className="text-green-700 mt-5">
            {updateSuccess ? "Profile updated successfully!" : ""}
          </p>
          <div className="flex gap-2 mt-5">
            <button 
              onClick={handleShowListings} 
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg uppercase text-sm font-medium hover:bg-purple-700 transition duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Show Listings
            </button>
          </div>
          {showListingsError && (
            <p className="text-red-700 mt-5">
              Error showing listings
            </p>
          )}

          {listingsFetched && userListings.length === 0 && (
            <p className="text-center text-gray-500 mt-5">
              No listings found. Create your first listing!
            </p>
          )}

          {userListings && userListings.length > 0 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-center mt-7 text-2xl font-semibold">
                Your Listings ({userListings.length})
              </h1>
              {userListings.map((listing) => (
                <div
                  key={listing._id}
                  className="border rounded-lg p-3 flex justify-between items-center gap-4"
                >
                  <Link to={`/listing/${listing._id}`}>
                    <img
                      src={listing.imageUrls[0]}
                      alt="listing cover"
                      className="h-16 w-16 object-contain"
                    />
                  </Link>
                  <Link
                    className="text-slate-700 font-semibold hover:underline truncate flex-1"
                    to={`/listing/${listing._id}`}
                  >
                    <p>{listing.name}</p>
                  </Link>
                  <div className="flex flex-col item-center">
                    <button
                      onClick={() => handleListingDelete(listing._id)}
                      className="text-red-700 uppercase"
                    >
                      Delete
                    </button>
                    <Link to={`/update-listing/${listing._id}`}>
                      <button className="text-green-700 uppercase">Edit</button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
