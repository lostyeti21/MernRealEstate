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

  const handleFileUpload = async (file) => {
    setUploading(true);
    setFileUploadError(false);
    setUploadSuccess(false);
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Get the authentication token
      const token = localStorage.getItem('token'); 
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include' 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Determine the update endpoint based on user type
      const updateEndpoint = isRealEstateCompany 
        ? `/api/real-estate/update-avatar`
        : `/api/user/update/${currentUser._id}`;

      // Prepare the request body
      const requestBody = isRealEstateCompany 
        ? { 
            companyId: currentUser._id, 
            avatar: data.url,
            isCloudinary: true
          }
        : { avatar: data.url };

      // Send update request with authentication
      const updateResponse = await fetch(updateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: JSON.stringify(requestBody)
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateData.message || 'Failed to update profile');
      }

      setFormData({ ...formData, avatar: data.url });
      setFilePerc(100);
      setFileUploadError(false);

      // Update Redux state
      if (isRealEstateCompany) {
        dispatch(updateUserSuccess({
          ...currentUser,
          avatar: data.url
        }));
      } else {
        dispatch(updateUserSuccess({
          ...currentUser,
          avatar: data.url
        }));
      }
      setUploadSuccess(true);
    } catch (error) {
      setFileUploadError(true);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
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

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          onChange={(e) => setFile(e.target.files[0])}
          type="file"
          ref={fileRef}
          hidden
          accept="image/*"
          aria-label="Profile Image Upload"
        />
        <div 
          onClick={() => fileRef.current.click()} 
          className="relative w-48 h-48 self-center mt-2 cursor-pointer group"
        >
          <img
            src={formData.avatar || currentUser.avatar}
            alt='profile'
            className='rounded-lg w-full h-full object-cover border-2 border-slate-200 transition duration-300 group-hover:blur-sm'
          />
          {/* Loading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-white mt-2 font-semibold">Uploading...</span>
            </div>
          )}
          {/* Hover Overlay */}
          {!uploading && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
              <span className="text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg font-semibold">
                Change Profile Picture
              </span>
            </div>
          )}
        </div>
        <p className="text-sm self-center">
          {fileUploadError ? (
            <span className="text-red-700">
              Error Image upload (image must be less than 2 mb)
            </span>
          ) : uploading ? (
            <span className="text-slate-700">Uploading image...</span>
          ) : uploadSuccess ? (
            <span className="text-green-700 font-semibold">Image changed successfully!</span>
          ) : (
            <span className="text-slate-700">Click to the profile picture to change it</span>
          )}
        </p>
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
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2V6a1 1 0 100-2h3a1 1 0 012 0v2a1 1 0 110 2h3a1 1 0 012 0v2a2 2 0 012 2v5a1 1 0 01-1 1H9a1 1 0 01-1-1v-5a2 2 0 00-2-2H5zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
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
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 10-2 0zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
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
  );
};

export default Profile;
