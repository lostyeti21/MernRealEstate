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
  FaTimes,
  FaMoneyBillWave
} from 'react-icons/fa';
import { debounce } from 'lodash';
import LoadingAnimation from '../components/LoadingAnimation';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';

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
  const listingsPerPage = 12;
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
    const pageFromUrl = urlParams.get('page') || 1;

    console.log('URL Parameters:', {
      searchTerm: searchTermFromUrl,
      type: typeFromUrl,
      parking: parkingFromUrl,
      furnished: furnishedFromUrl,
      offer: offerFromUrl,
      sort: sortFromUrl,
      order: orderFromUrl,
      page: pageFromUrl
    });

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
      const urlParams = new URLSearchParams(location.search);
      
      // Ensure required pagination parameters are set
      if (!urlParams.get('listingsPerPage')) {
        urlParams.set('listingsPerPage', listingsPerPage);
      }
      if (!urlParams.get('page')) {
        urlParams.set('page', 1);
      }

      const searchQuery = urlParams.toString();
      const paginatedSearchQuery = searchQuery;

      console.log('Fetching listings with query:', paginatedSearchQuery);

      try {
        const res = await fetch(`/api/listing/get?${paginatedSearchQuery}`);
        const data = await res.json();

        console.log('Fetched data:', data);

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
                      type: urlParams.get('type') || 'all',
                      parking: urlParams.get('parking') === 'true',
                      furnished: urlParams.get('furnished') === 'true',
                      offer: urlParams.get('offer') === 'true'
                    }
                  })
                });
              } catch (error) {
                console.error('Error recording search term:', error);
              }
            });
          }

          console.log('Setting listings:', data.listings);
          console.log('Total pages:', data.totalPages);
          console.log('Current page:', urlParams.get('page') || 1);

          // Ensure new listings are fetched for each page
          setListings(data.listings);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(+urlParams.get('page') || 1);
          setLoading(false);
        } else {
          // Handle case where no listings are found
          console.log('No listings found');
          setListings([]);
          setTotalPages(1);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
        setLoading(false);
      }
    };

    fetchListings();
  }, [location.search]);

  useEffect(() => {
    // No-op
  }, [currentPage]);

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

  const handlePageChange = async (newPage) => {
    if (newPage > 0 && newPage <= totalPages && !loading) {
      const urlParams = new URLSearchParams(location.search);
      urlParams.set('page', newPage);
      
      // Reset listings and set loading state
      setLoading(true);
      setListings([]);
      setCurrentPage(newPage);
      
      // Force scroll to top immediately
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
      
      // Force a re-render by updating the URL
      navigate(`/search?${urlParams.toString()}`, { replace: true });
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

  // Add ScrollToTop button component
  const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled up to given distance
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const scrollToTop = () => {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    // Add scroll event listener
    useEffect(() => {
      window.addEventListener('scroll', toggleVisibility);
      return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    // Only render if scrolled down enough
    if (!isVisible) return null;

    return (
      <button
        onClick={scrollToTop}
        className="absolute bottom-4 left-4 bg-[#F20505] text-white p-2 rounded-full shadow-lg hover:bg-[#c41212] transition-all duration-300 opacity-50 hover:opacity-100 z-50"
        aria-label="Scroll to top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    );
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
      
      <div className="p-7 border-b-2 md:border-r-2 md:min-h-screen md:w-[34%] lg:w-[26%] gap-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="input-container w-[320.76px] relative">
            <input
              type="text"
              id="searchTerm"
              placeholder="SEARCH..."
              className="
                w-full h-10 p-2.5 
                transition-all duration-200 linear 
                border-2.5 border-black 
                text-sm uppercase 
                tracking-[2px]
                focus:outline-none 
                focus:border-0.5 
                focus:shadow-[-5px_-5px_0px_black]
              "
              value={sidebardata.searchTerm}
              onChange={handleChange}
            />
            <span className="
              absolute 
              right-2.5 
              top-1/2 
              -translate-y-1/2
              hover:animate-pulse
            ">
              <svg 
                width="19px" 
                height="19px" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth={0} />
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                <g id="SVGRepo_iconCarrier">
                  <path opacity={1} d="M14 5H20" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path opacity={1} d="M14 8H17" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 6.25 6.25 2 11.5 2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path opacity={1} d="M22 22L20 20" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>
            </span>
          </div>

          {/* Listed By Section Removed */}

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Type:</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'rent', 'sale'].map((type) => (
                <div 
                  key={type}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    ${sidebardata.type === type 
                      ? 'bg-[#F20505] text-white hover:bg-[#c41212]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => handleChange({
                    target: { 
                      id: 'type', 
                      value: type 
                    }
                  })}
                >
                  <span className="text-sm">
                    {type === 'all' ? 'All' : type === 'rent' ? 'For Rent' : 'For Sale'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Amenities:</label>
            <div className="grid grid-cols-2 gap-2">
              {['parking', 'furnished', 'backupPower', 'backupWaterSupply', 'boreholeWater'].map((amenity) => (
                <div 
                  key={amenity}
                  className={`
                    inline-flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    h-10 max-w-full
                    ${sidebardata[amenity] 
                      ? 'bg-[#F20505] text-white hover:bg-[#c41212]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => handleChange({
                    target: { 
                      id: amenity, 
                      type: 'checkbox', 
                      checked: !sidebardata[amenity] 
                    }
                  })}
                >
                  <span className="mr-2">{amenityIcons[amenity]}</span>
                  <span className="text-sm whitespace-nowrap overflow-hidden">
                    {amenity === 'backupWaterSupply' ? 'Backup Water' : 
                     amenity.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Price Range:</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-200 rounded-full px-3 py-2">
                <FaMoneyBillWave className="text-gray-600" />
                <input
                  type="number"
                  id="minPrice"
                  placeholder="Min"
                  className="bg-transparent w-[106px] outline-none"
                  onChange={handleChange}
                  value={sidebardata.minPrice}
                />
              </div>
              <div className="flex items-center gap-2 bg-gray-200 rounded-full px-3 py-2">
                <FaMoneyBillWave className="text-gray-600" />
                <input
                  type="number"
                  id="maxPrice"
                  placeholder="Max"
                  className="bg-transparent w-[106px] outline-none"
                  onChange={handleChange}
                  value={sidebardata.maxPrice}
                />
              </div>
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

      <div className="flex-1 relative">
        {loading && (
          <div className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-90 z-[9999]">
            <Loader />
          </div>
        )}
        
        <h1 className="text-3xl font-semibold border-b p-3 text-slate-700 mt-5">
          Listing results:
        </h1>

        <div className="p-3 flex flex-wrap gap-4 relative min-h-[calc(100vh-200px)]">
          {!loading && listings.length === 0 && (
            <div className="w-full flex justify-center items-center">
              <p className="text-xl text-gray-500">No listings found</p>
            </div>
          )}

          {!loading && listings.length > 0 && listings.map((listing) => (
            <motion.div 
              key={listing._id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => handleListingClick(listing._id)}
            >
              <ListingItem listing={listing} />
            </motion.div>
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
        <ScrollToTop />
      </div>
    </div>
  );
}
