import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ListingItem from '../components/ListingItem';
import { MapContainer, TileLayer, Circle, Tooltip } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import {
  FaParking,
  FaCouch,
  FaBolt,
  FaWater,
  FaTint,
  FaHome,
  FaDollarSign,
  FaGlobe,
  FaMapMarkerAlt,
  FaQuestionCircle,
  FaTimes
} from 'react-icons/fa';
import LoadingAnimation from '../components/LoadingAnimation';

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPopup, setShowPopup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const initialState = {
    searchTerm: '',
    type: 'all',
    userModel: 'all',
    parking: false,
    furnished: false,
    backupPower: false,
    backupWaterSupply: false,
    boreholeWater: false,
    offer: false,
    sort: 'createdAt',
    order: 'desc',
    minPrice: '',
    maxPrice: '',
  };

  const [sidebardata, setSidebardata] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const listingsPerPage = 8;
  const [inputPage, setInputPage] = useState('');
  const [error, setError] = useState('');

  const amenityIcons = {
    parking: <FaParking />, 
    furnished: <FaCouch />, 
    backupPower: <FaBolt />, 
    backupWaterSupply: <FaWater />, 
    boreholeWater: <FaTint />,
  };

  const typeIcons = {
    all: <FaGlobe />,
    rent: <FaHome />,
    sale: <FaDollarSign />,
  };

  // Add batch processing for impressions
  const recordImpressions = debounce(async (listings) => {
    const batchSize = 5; // Process 5 listings at a time
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      await Promise.all(
        batch.map(listing =>
          fetch(`http://localhost:3000/api/analytics/ctr/impression/${listing._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source: 'search' })
          }).catch(error => console.error('Error recording impression:', error))
        )
      );
      // Add a small delay between batches
      if (i + batchSize < listings.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }, 1000);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get('searchTerm');
    const typeFromUrl = urlParams.get('type');
    const parkingFromUrl = urlParams.get('parking');
    const furnishedFromUrl = urlParams.get('furnished');
    const offerFromUrl = urlParams.get('offer');
    const sortFromUrl = urlParams.get('sort');
    const orderFromUrl = urlParams.get('order');

    if (
      searchTermFromUrl ||
      typeFromUrl ||
      parkingFromUrl ||
      furnishedFromUrl ||
      offerFromUrl ||
      sortFromUrl ||
      orderFromUrl
    ) {
      setSidebardata({
        searchTerm: searchTermFromUrl || '',
        type: typeFromUrl || 'all',
        parking: parkingFromUrl === 'true' ? true : false,
        furnished: furnishedFromUrl === 'true' ? true : false,
        offer: offerFromUrl === 'true' ? true : false,
        sort: sortFromUrl || 'createdAt',
        order: orderFromUrl || 'desc',
      });
    }

    const fetchListings = async () => {
      setLoading(true);
      const searchQuery = urlParams.toString();

      try {
        const res = await fetch(`/api/listing/get?${searchQuery}`);
        const data = await res.json();

        if (data.success) {
          // Record impressions in batches
          recordImpressions(data.listings);
          
          // Record search terms for each listing found
          const searchTerm = urlParams.get('searchTerm');
          if (searchTerm) {
            data.listings.forEach(async (listing) => {
              try {
                await fetch(`http://localhost:3000/api/analytics/search/record/${listing._id}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    searchTerm,
                    // Include additional search criteria
                    filters: {
                      type: typeFromUrl || 'all',
                      parking: parkingFromUrl === 'true',
                      furnished: furnishedFromUrl === 'true',
                      offer: offerFromUrl === 'true'
                    }
                  })
                });
              } catch (error) {
                console.error('Error recording search term:', error);
              }
            });
          }

          setListings(data.listings);
          setTotalPages(data.totalPages || 1);
          setLoading(false);
        }
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };

    fetchListings();
  }, [location.search]);

  const handleChange = (e) => {
    const { id, value, checked, type } = e.target;
    setSidebardata((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    const urlParams = new URLSearchParams();
    
    // Only add parameters that have values and differ from initial state
    Object.entries(sidebardata).forEach(([key, value]) => {
      if (
        value !== '' && 
        value !== false && 
        value !== 'all' &&
        value !== initialState[key]
      ) {
        urlParams.set(key, value);
      }
    });
    
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  const handleReset = () => {
    setSidebardata(initialState);
    setCurrentPage(1);
    setListings([]);
    navigate('/search');
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages && !loading) {
      setCurrentPage(newPage);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handlePageInput = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && +value > 0 && +value <= totalPages)) {
      setInputPage(value);
    }
  };

  const goToPage = () => {
    if (inputPage) {
      handlePageChange(+inputPage);
      setInputPage('');
    }
  };

  const handleListingClick = async (listingId) => {
    try {
      await fetch(`http://localhost:3000/api/analytics/ctr/click/${listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: 'search' })
      });
    } catch (error) {
      console.error('Error recording click:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row">
      {showPopup && (
        <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              <FaTimes />
            </button>
            <h2 className="text-lg font-bold mb-4">Hot Zones Information</h2>
            <p>
              Hot zones are areas with high activity and demand. These locations
              are marked with red circles on the map and include regions like
              Greendale, Borrowdale, and more.
            </p>
          </div>
        </div>
      )}

      <div className="p-7 border-b-2 md:border-r-2 md:min-h-screen md:w-1/3 lg:w-1/4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap font-semibold">Search Term:</label>
            <input
              type="text"
              id="searchTerm"
              placeholder="Search..."
              className="border rounded-lg p-3 w-full"
              value={sidebardata.searchTerm}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Listed By:</label>
            {['all', 'Agent', 'User'].map((model) => (
              <div className="flex items-center gap-2" key={model}>
                <input
                  type="radio"
                  id="userModel"
                  value={model}
                  name="userModel"
                  className="w-5"
                  onChange={handleChange}
                  checked={sidebardata.userModel === model}
                />
                <span>{model === 'all' ? 'All' : `${model}s`}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Type:</label>
            {['all', 'rent', 'sale'].map((type) => (
              <div className="flex items-center gap-2" key={type}>
                <span className="text-lg">{typeIcons[type]}</span>
                <input
                  type="radio"
                  id="type"
                  value={type}
                  name="type"
                  className="w-5"
                  onChange={handleChange}
                  checked={sidebardata.type === type}
                />
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="offer"
                className="w-5"
                onChange={handleChange}
                checked={sidebardata.offer}
              />
              <span>Offer</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Amenities:</label>
            {['parking', 'furnished', 'backupPower', 'backupWaterSupply', 'boreholeWater'].map((amenity) => (
              <div className="flex items-center gap-2" key={amenity}>
                {amenityIcons[amenity]}
                <input
                  type="checkbox"
                  id={amenity}
                  className="w-5"
                  onChange={handleChange}
                  checked={sidebardata[amenity]}
                />
                <span>{amenity.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <label className="font-semibold">Min Price:</label>
              <input
                type="number"
                id="minPrice"
                className="border rounded-lg p-3 w-24"
                value={sidebardata.minPrice}
                onChange={handleChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-semibold">Max Price:</label>
              <input
                type="number"
                id="maxPrice"
                className="border rounded-lg p-3 w-24"
                value={sidebardata.maxPrice}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold">Sort:</label>
            <select
              id="sort"
              onChange={handleChange}
              className="border rounded-lg p-3"
              value={sidebardata.sort}
            >
              <option value="createdAt">Latest</option>
              <option value="regularPrice">Price</option>
            </select>
            <select
              id="order"
              onChange={handleChange}
              className="border rounded-lg p-3"
              value={sidebardata.order}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="border rounded-lg p-3 text-gray-700 uppercase hover:bg-gray-200"
            >
              Reset Search
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center">
            <FaMapMarkerAlt className="text-red-500 text-xl mr-2" />
            <h2 className="text-lg font-bold">Hot Zones</h2>
          </div>
          <FaQuestionCircle
            className="text-gray-500 text-xl cursor-pointer hover:text-gray-700"
            onClick={() => setShowPopup(true)}
          />
        </div>

        <div className="mt-4">
          <MapContainer
            center={[-17.8277, 31.0534]}
            zoom={10}
            className="w-full h-screen rounded-lg"
            style={{ height: '154vh', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <Circle center={[-17.8193, 31.1205]} radius={4000} color="red" fillOpacity={0.4}>
              <Tooltip>Greendale</Tooltip>
            </Circle>
            <Circle center={[-17.7769, 31.1411]} radius={2000} color="red" fillOpacity={0.4}>
              <Tooltip>Mandara</Tooltip>
            </Circle>
            <Circle center={[-17.7463, 31.0916]} radius={4500} color="red" fillOpacity={0.4}>
              <Tooltip>Borrowdale</Tooltip>
            </Circle>
            <Circle center={[-17.7932, 31.1257]} radius={2500} color="red" fillOpacity={0.4}>
              <Tooltip>Chisipite</Tooltip>
            </Circle>
            <Circle center={[-17.7715, 31.1524]} radius={2500} color="red" fillOpacity={0.4}>
              <Tooltip>The Grange</Tooltip>
            </Circle>
            <Circle center={[-17.8049, 31.1005]} radius={3000} color="red" fillOpacity={0.4}>
              <Tooltip>Highlands</Tooltip>
            </Circle>
            <Circle center={[-17.8105, 31.0836]} radius={1500} color="red" fillOpacity={0.4}>
              <Tooltip>Newlands</Tooltip>
            </Circle>
            <Circle center={[-17.7673, 31.0446]} radius={5000} color="red" fillOpacity={0.4}>
              <Tooltip>Mount Pleasant</Tooltip>
            </Circle>
            <Circle center={[-17.7613, 31.1889]} radius={2000} color="red" fillOpacity={0.4}>
              <Tooltip>Chishawasha Hills</Tooltip>
            </Circle>
          </MapContainer>
        </div>
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold border-b p-3 text-slate-700 mt-5">
          Listing results:
        </h1>

        <div className="p-7 flex flex-wrap gap-4">
          {loading && (
            <p className="text-xl text-slate-700 text-center w-full">
              Loading...
            </p>
          )}
          {!loading && listings.length === 0 && (
            <p className="text-xl text-slate-700">No listing found!</p>
          )}
          {!loading &&
            listings.map((listing) => (
              <div 
                key={listing._id}
                onClick={() => handleListingClick(listing._id)}
                className="cursor-pointer"
              >
                <ListingItem listing={listing} />
              </div>
            ))}
        </div>

        {!loading && listings.length > 0 && (
          <div className="flex flex-col items-center mt-6">
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 ${
                  currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </button>
              <span className="text-lg">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 ${
                  currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="text"
                placeholder="Go to page"
                value={inputPage}
                onChange={handlePageInput}
                className="border rounded-lg p-2 w-24"
              />
              <button
                onClick={goToPage}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                Go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
