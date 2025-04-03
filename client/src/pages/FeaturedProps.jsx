import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FaCheck, FaSearch, FaSpinner } from 'react-icons/fa';

export default function FeaturedProps() {
  const { currentUser } = useSelector((state) => state.user);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [currentFeatured, setCurrentFeatured] = useState(null);
  const [savingFeatured, setSavingFeatured] = useState(false);

  useEffect(() => {
    // Skip authorization check when rendered inside SuperUser dashboard
    const isInSuperUserDashboard = window.location.pathname.includes('/superuser');
    
    // Only check authorization when accessed directly (not through SuperUser dashboard)
    if (!isInSuperUserDashboard) {
      // Check if user is authorized (admin or superuser)
      if (!currentUser || (!currentUser.isAdmin && !currentUser.isSuperUser)) {
        toast.error('You are not authorized to access this page');
        return;
      }
    }

    fetchListings();
    fetchCurrentFeatured();
  }, [currentUser]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3000/api/listing/get?limit=50`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch listings');
      }
      
      const data = await res.json();
      
      const validListings = Array.isArray(data) 
        ? data 
        : (data.listings && Array.isArray(data.listings) 
          ? data.listings 
          : []);
      
      // Filter out listings without required fields
      const processedListings = validListings.filter(listing => 
        listing._id && 
        listing.imageUrls && 
        listing.imageUrls.length > 0 &&
        listing.name &&
        listing.address
      );
      
      setListings(processedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentFeatured = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/featured/get`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        // It's okay if this fails - might not have a featured listing yet
        return;
      }
      
      const data = await res.json();
      
      if (data && data.featuredListing) {
        setCurrentFeatured(data.featuredListing);
      }
    } catch (error) {
      console.error('Error fetching current featured listing:', error);
    }
  };

  const handleSelectListing = (listing) => {
    setSelectedListing(listing);
  };

  const handleSaveFeatured = async () => {
    if (!selectedListing) {
      toast.error('Please select a listing to feature');
      return;
    }

    try {
      setSavingFeatured(true);
      
      // Get the access token from localStorage
      const accessToken = localStorage.getItem('access_token');
      
      const res = await fetch(`http://localhost:3000/api/featured/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-super-user-auth': 'ishe'  // Add the SuperUser auth header
        },
        credentials: 'include',  // Include cookies in the request
        body: JSON.stringify({
          listingId: selectedListing._id
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to set featured listing');
      }
      
      setCurrentFeatured(selectedListing);
      toast.success('Featured listing updated successfully');
    } catch (error) {
      console.error('Error setting featured listing:', error);
      toast.error('Failed to update featured listing');
    } finally {
      setSavingFeatured(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    const name = (listing.name || '').toLowerCase();
    const address = (listing.address || '').toLowerCase();
    
    return name.includes(searchTermLower) || address.includes(searchTermLower);
  });

  return (
    <div className="max-w-6xl mx-auto p-3">
      <h1 className="text-3xl font-bold mb-8 text-center text-slate-700">Manage Featured Property</h1>
      
      {/* Current Featured Property */}
      {currentFeatured && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-600">Current Featured Property</h2>
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
            <img 
              src={currentFeatured.imageUrls[0]} 
              alt={currentFeatured.name} 
              className="w-24 h-24 object-cover rounded-md mr-4"
            />
            <div>
              <h3 className="font-semibold">{currentFeatured.name}</h3>
              <p className="text-gray-600 text-sm">{currentFeatured.address}</p>
              <p className="text-sm mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  currentFeatured.type === 'rent' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentFeatured.type === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
                <span className="ml-2">
                  ${currentFeatured.regularPrice.toLocaleString()}
                  {currentFeatured.type === 'rent' && ' / month'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search listings by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="absolute left-3 top-3 text-gray-400">
            <FaSearch />
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Listings Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-4xl text-slate-700" />
        </div>
      ) : (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No listings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map(listing => (
                <div 
                  key={listing._id} 
                  className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedListing?._id === listing._id ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleSelectListing(listing)}
                >
                  <div className="relative h-48">
                    <img 
                      src={listing.imageUrls[0]} 
                      alt={listing.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold ${
                      listing.type === 'rent' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
                    </div>
                    {selectedListing?._id === listing._id && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full">
                        <FaCheck />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold truncate">{listing.name}</h3>
                    <p className="text-gray-600 text-sm truncate">{listing.address}</p>
                    <p className="mt-2 font-semibold">
                      ${listing.regularPrice.toLocaleString()}
                      {listing.type === 'rent' && ' / month'}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <span>{listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Save Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSaveFeatured}
              disabled={!selectedListing || savingFeatured}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center ${
                !selectedListing || savingFeatured
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {savingFeatured && <FaSpinner className="animate-spin mr-2" />}
              {savingFeatured ? 'Saving...' : 'Set as Featured Property'}
            </button>
          </div>
        </>
      )}
      
      {/* Back Button */}
      <div className="mt-8 text-center">
        <Link to="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
