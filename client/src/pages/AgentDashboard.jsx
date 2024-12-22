import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

export default function AgentDashboard() {
  const [listings, setListings] = useState([]);
  const [showListingsError, setShowListingsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [showListingsSection, setShowListingsSection] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const agent = JSON.parse(localStorage.getItem('agentInfo'));
    setAgentInfo(agent);
  }, []);

  const handleImageClick = () => {
    fileRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size should be less than 2MB');
      }

      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('agentToken');
      const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));

      if (!token || !agentInfo) {
        throw new Error('Authentication required');
      }

      // Upload image
      const uploadRes = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.imageUrl) {
        throw new Error('Failed to upload image');
      }

      // Update agent avatar
      const updateRes = await fetch('/api/agent/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar: uploadData.imageUrl,
          agentId: agentInfo._id
        })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.message || 'Failed to update avatar');
      }

      // Update local storage and state with new avatar
      const updatedAgentInfo = { ...agentInfo, avatar: uploadData.imageUrl };
      localStorage.setItem('agentInfo', JSON.stringify(updatedAgentInfo));
      setAgentInfo(updatedAgentInfo);
      setUploadError(null);
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      setUploadError(error.message);
    }
  };

  const handleShowListings = async () => {
    try {
      if (showListingsSection) {
        setShowListingsSection(false);
        return;
      }

      setLoading(true);
      setShowListingsError(false);
      
      const token = localStorage.getItem('agentToken');
      const agentInfo = localStorage.getItem('agentInfo');

      if (!token || !agentInfo) {
        throw new Error('No authentication token or agent info found');
      }

      const parsedAgentInfo = JSON.parse(agentInfo);
      console.log('Searching listings with agent ID:', parsedAgentInfo._id);

      const res = await fetch(`/api/listing/agent-listings/${parsedAgentInfo._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch listings');
      }

      setListings(data.listings || []);
      setShowListingsSection(true);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setShowListingsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleListingDelete = async (listingId) => {
    try {
      // Show confirmation dialog
      const isConfirmed = window.confirm('Are you sure you want to delete this listing?');
      
      if (!isConfirmed) {
        return; // If user clicks Cancel, don't proceed with deletion
      }

      const token = localStorage.getItem('agentToken');
      const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));

      if (!token || !agentInfo) {
        throw new Error('Authentication required');
      }

      console.log('Delete attempt:', {
        listingId,
        agentId: agentInfo._id,
        token
      });

      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Delete response:', data);
        throw new Error(data.message || 'Failed to delete listing');
      }

      // Only remove listing from state if user confirmed and deletion was successful
      setListings((prev) =>
        prev.filter((listing) => listing._id !== listingId)
      );

      // Show success message
      alert('Listing deleted successfully!');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing: ' + error.message);
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>Agent Profile</h1>
      
      <div className="flex flex-col gap-4">
        {agentInfo && (
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group" onClick={handleImageClick}>
              <img
                src={agentInfo.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="profile"
                className="rounded-full h-24 w-24 object-cover transition-opacity group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  Change Avatar
                </span>
              </div>
              <input
                type="file"
                ref={fileRef}
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
            <div>
              <p className="font-semibold">{agentInfo.name}</p>
              <p className="text-gray-600">{agentInfo.email}</p>
              <p className="text-gray-600">{agentInfo.companyName}</p>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="text-red-700 text-sm mt-1">
            {uploadError}
          </p>
        )}

        <Link
          className='bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
          to='/create-listing'
        >
          Create Listing
        </Link>

        <button
          onClick={handleShowListings}
          className='bg-slate-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
          disabled={loading}
        >
          {loading ? 'Loading...' : showListingsSection ? 'Hide Listings' : 'Show Listings'}
        </button>
      </div>

      <p className='text-red-700 mt-5'>
        {showListingsError ? 'Error showing listings' : ''}
      </p>

      {showListingsSection && (
        listings.length > 0 ? (
          <div className='flex flex-col gap-4 mt-4'>
            <h2 className='text-2xl font-semibold'>Your Listings</h2>
            {listings.map((listing) => (
              <div
                key={listing._id}
                className='border rounded-lg p-3 flex justify-between items-center gap-4'
              >
                <Link to={`/listing/${listing._id}`}>
                  <img
                    src={listing.imageUrls[0]}
                    alt='listing cover'
                    className='h-16 w-16 object-cover rounded-lg'
                  />
                </Link>
                <Link
                  className='text-slate-700 font-semibold flex-1 hover:underline truncate'
                  to={`/listing/${listing._id}`}
                >
                  <p>{listing.name}</p>
                </Link>

                <div className='flex flex-col items-center'>
                  <button
                    onClick={() => handleListingDelete(listing._id)}
                    className='text-red-700 uppercase'
                  >
                    Delete
                  </button>
                  <Link to={`/update-listing/${listing._id}`}>
                    <button className='text-green-700 uppercase'>Edit</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-slate-700 text-center mt-4'>
            You haven't created any listings yet.
          </p>
        )
      )}
    </div>
  );
} 