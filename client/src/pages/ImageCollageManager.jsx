import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaImage, FaTrash, FaPlus, FaSave, FaLock, FaTimesCircle, FaListOl } from 'react-icons/fa';
import ImageCollage from '../components/ImageCollage';

const ImageCollageManager = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Authentication handler
  const handleAuthentication = (e) => {
    e.preventDefault();
    setError('');

    // Hardcoded credentials as specified
    if (username === 'admin' && password === 'ishe') {
      setIsAuthenticated(true);
      // Fetch listings after successful authentication
      fetchListings();
    } else {
      setError('Invalid username or password');
    }
  };

  // Fetch listings
  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/listing/get?limit=50');
      const data = await response.json();
      
      if (data.listings) {
        setListings(data.listings);
      } else {
        throw new Error('No listings found');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Normalize listings to ensure consistent structure
  const normalizeListing = (listing) => {
    // If listing is already in new format, return as-is
    if (listing.listing && listing.occurrences) return listing;
    
    // Convert old format to new format
    return {
      listing: listing,
      occurrences: 1
    };
  };

  // Prepare image data for ImageCollage with multiple occurrences
  const prepareImageData = () => {
    let finalImages = [];
    selectedListings.forEach(item => {
      // Normalize item to ensure it has listing property
      const normalizedItem = normalizeListing(item);
      
      // Create multiple instances based on the occurrence count
      for (let i = 0; i < normalizedItem.occurrences; i++) {
        finalImages.push({
          src: normalizedItem.listing.imageUrls[0] || 'https://via.placeholder.com/300',
          alt: `${normalizedItem.listing.name} (${i + 1})`,
          id: `${normalizedItem.listing._id}-${i}`
        });
      }
    });
    return finalImages;
  };

  // Toggle listing selection with occurrence tracking
  const toggleListingSelection = (listing) => {
    setSelectedListings(prev => {
      // Normalize previous selections
      const normalizedPrev = prev.map(normalizeListing);
      
      // Check if listing is already selected
      const existingItemIndex = normalizedPrev.findIndex(
        item => item.listing._id === listing._id
      );

      if (existingItemIndex !== -1) {
        // If already selected, increase occurrences or remove
        const updatedSelections = [...normalizedPrev];
        const currentItem = updatedSelections[existingItemIndex];
        
        if (currentItem.occurrences < 6) {
          // Increase occurrences
          updatedSelections[existingItemIndex] = {
            ...currentItem,
            occurrences: currentItem.occurrences + 1
          };
        } else {
          // Remove if max occurrences reached
          updatedSelections.splice(existingItemIndex, 1);
        }
        
        return updatedSelections;
      } else {
        // Add new listing with initial occurrence
        return [
          ...normalizedPrev, 
          { 
            listing, 
            occurrences: 1 
          }
        ];
      }
    });
  };

  // Reset occurrences for a specific listing
  const resetListingOccurrences = (listingId) => {
    setSelectedListings(prev => 
      prev.filter(item => {
        // Handle both old and new formats
        const id = item.listing ? item.listing._id : item._id;
        return id !== listingId;
      })
    );
  };

  // Save selected listings to local storage
  const saveSelectedListings = () => {
    try {
      localStorage.setItem('imageCollageListings', JSON.stringify(selectedListings));
      alert('Listings saved successfully for Image Collage!');
    } catch (err) {
      console.error('Error saving listings:', err);
      alert('Failed to save listings');
    }
  };

  // Render login form
  const renderLoginForm = () => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center">
              <FaLock className="mr-2 text-[#009688]" /> Image Collage Manager
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAuthentication}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#009688] focus:border-[#009688] focus:z-10 sm:text-sm"
                  placeholder="Username"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#009688] focus:border-[#009688] focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#009688] hover:bg-[#00796b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009688]"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render listing cards with occurrence tracking
  const renderListingCard = (listing) => {
    // Find the current selection for this listing, handling both old and new formats
    const selectedItem = selectedListings.find(
      item => (item.listing ? item.listing._id : item._id) === listing._id
    );
    
    return (
      <div 
        key={listing._id} 
        className={`
          relative border rounded-lg p-4 cursor-pointer transition-all duration-300
          ${selectedItem 
            ? 'border-green-500 bg-green-50 shadow-lg' 
            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
          }
        `}
        onClick={() => toggleListingSelection(listing)}
      >
        <div className="flex items-center space-x-4">
          <img 
            src={listing.imageUrls[0] || 'https://via.placeholder.com/100'} 
            alt={listing.name} 
            className="w-24 h-24 object-cover rounded-md"
          />
          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-slate-700">{listing.name}</h3>
            <p className="text-sm text-slate-500">{listing.address}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${listing.type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
              `}>
                {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
              </span>
              <span className="text-sm font-bold text-slate-700">
                ${listing.regularPrice}
              </span>
            </div>
          </div>
          
          {/* Occurrence Display */}
          {selectedItem && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-600">
                Occurrences: {selectedItem.occurrences || 1}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetListingOccurrences(listing._id);
                }}
                className="text-red-500 hover:text-red-700"
                title="Reset occurrences"
              >
                <FaTimesCircle />
              </button>
            </div>
          )}
        </div>
        
        {selectedItem && (
          <div className="absolute top-2 right-2 text-green-500">
            <FaImage />
          </div>
        )}
      </div>
    );
  };

  // Render current lineup section
  const renderCurrentLineup = () => {
    if (selectedListings.length === 0) return null;

    return (
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-700 flex items-center">
            <FaListOl className="mr-2 text-[#009688]" /> Current Lineup
          </h2>
          <div className="text-sm text-slate-500">
            Total Unique Listings: {selectedListings.length}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedListings.map((item, index) => {
            const normalizedItem = normalizeListing(item);
            const listing = normalizedItem.listing;
            
            return (
              <div 
                key={listing._id} 
                className="border rounded-lg p-4 bg-gray-50 flex items-center space-x-4"
              >
                <img 
                  src={listing.imageUrls[0] || 'https://via.placeholder.com/100'} 
                  alt={listing.name} 
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-slate-700">{listing.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${listing.type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                    `}>
                      {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-[#009688]">
                        Occurrences: {normalizedItem.occurrences}
                      </span>
                      <button 
                        onClick={() => resetListingOccurrences(listing._id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove from lineup"
                      >
                        <FaTimesCircle />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render preview section
  const renderPreview = () => {
    const preparedImages = prepareImageData();
    
    if (preparedImages.length === 0) return null;

    return (
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-700">Image Collage Preview</h2>
          <div className="text-sm text-slate-500">
            Total Images: {preparedImages.length}
          </div>
        </div>
        <ImageCollage images={preparedImages} />
      </div>
    );
  };

  // Main render logic
  if (!isAuthenticated) {
    return renderLoginForm();
  }

  // Render loading or error states
  if (loading) return <div className="text-center py-10">Loading listings...</div>;
  if (error) return <div className="text-center text-red-500 py-10">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Image Collage Manager</h1>
        <div className="flex space-x-4">
          <button 
            onClick={saveSelectedListings}
            className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-600 transition"
          >
            <FaSave /> <span>Save Selections</span>
          </button>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Back to Home
          </button>
          <button 
            onClick={() => {
              setIsAuthenticated(false);
              setUsername('');
              setPassword('');
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map(renderListingCard)}
      </div>

      {renderCurrentLineup()}
      {renderPreview()}

      {selectedListings.length === 0 && (
        <div className="text-center text-slate-500 mt-10">
          Select listings to create an Image Collage
        </div>
      )}
    </div>
  );
};

export default ImageCollageManager;
