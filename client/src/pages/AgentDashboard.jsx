import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBed, FaBath, FaParking, FaMapMarkerAlt, FaStar, FaCamera } from 'react-icons/fa';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { app } from '../firebase';

export default function AgentDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedAgentInfo = localStorage.getItem('agentInfo');
    if (storedAgentInfo) {
      setAgentData(JSON.parse(storedAgentInfo));
    }
  }, []);

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  const handleFileUpload = (file) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + file.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFilePerc(Math.round(progress));
      },
      (error) => {
        setFileUploadError(true);
        console.error('Upload error:', error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          try {
            const token = localStorage.getItem('realEstateToken');
            const res = await fetch('/api/real-estate/update-agent-avatar', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                agentId: agentData._id,
                avatar: downloadURL
              })
            });

            const data = await res.json();
            if (data.success) {
              setAgentData({ ...agentData, avatar: downloadURL });
              localStorage.setItem('agentInfo', JSON.stringify({
                ...agentData,
                avatar: downloadURL
              }));
            }
          } catch (error) {
            console.error('Error updating avatar:', error);
            setFileUploadError(true);
          }
        });
      }
    );
  };

  useEffect(() => {
    const fetchAgentListings = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('realEstateToken');
        const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));

        if (!token || !agentInfo) {
          throw new Error('Authentication required');
        }

        const res = await fetch(`/api/real-estate/agent/${agentInfo._id}/listings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch listings');
        }

        setListings(data.listings || []);
        
        if (data.agent) {
          setAgentData(data.agent);
          localStorage.setItem('agentInfo', JSON.stringify(data.agent));
        }

      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err.message);

        if (err.message.includes('Authentication required')) {
          navigate('/real-estate-agent-login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAgentListings();
  }, [navigate]);

  const handleDelete = async (listingId) => {
    try {
      const token = localStorage.getItem('realEstateToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const confirmed = window.confirm('Are you sure you want to delete this listing?');
      if (!confirmed) return;

      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete listing');
      }

      setListings(listings.filter(listing => listing._id !== listingId));
      
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-8 p-4 bg-red-50 rounded-lg">
        <p className="text-red-600 font-semibold">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Agent Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={agentData?.avatar || '/default-profile.jpg'}
              alt={agentData?.name}
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-profile.jpg';
              }}
            />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              ref={(input) => input && (input.style.display = 'none')}
              accept="image/*"
              id="profilePicInput"
            />
            <label
              htmlFor="profilePicInput"
              className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-600"
            >
              <FaCamera className="text-white" />
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-2">{agentData?.name}</h1>
            <p className="text-gray-600 mb-2">{agentData?.email}</p>
            <p className="text-gray-600 mb-2">{agentData?.contact}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`${
                      star <= (agentData?.averageRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600">
                ({agentData?.averageRating?.toFixed(1) || 'N/A'})
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              Company: {agentData?.companyName}
            </p>
          </div>
        </div>
        {fileUploadError && (
          <p className="text-red-500 mt-2">Error uploading image</p>
        )}
        {filePerc > 0 && filePerc < 100 && (
          <p className="text-green-500 mt-2">Uploading: {filePerc}%</p>
        )}
      </div>

      {/* Listings Section */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">My Listings ({listings.length})</h2>
        <button
          onClick={() => navigate('/create-listing')}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Create New Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No listings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={listing.imageUrls[0] || '/default-house.jpg'}
                alt={listing.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-house.jpg';
                }}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{listing.name}</h3>
                <p className="text-gray-600 mb-2 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-green-600" />
                  {listing.address}
                </p>
                <div className="flex gap-4 mb-2">
                  <span className="flex items-center gap-1">
                    <FaBed className="text-gray-400" />
                    {listing.bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaBath className="text-gray-400" />
                    {listing.bathrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaParking className="text-gray-400" />
                    {listing.parking ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-lg font-semibold text-green-600">
                    ${listing.regularPrice.toLocaleString()}
                    {listing.type === 'rent' && '/month'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/update-listing/${listing._id}`)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(listing._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
