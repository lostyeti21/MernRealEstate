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
  FaMoneyBillWave,
  FaBuilding,  // Add for apartment
  FaWarehouse,  // Add for warehouse
  FaCity,       // Add for commercial
  FaTree        // Add for land
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
    propertyType: 'all',  // Add propertyType to initial state
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
    bedrooms: '', 
    baths: '', 
    electricFence: false,
    walledOrFenced: false,
    electricGate: false,
    builtInCupboards: false,
    fittedKitchen: false,
    solarGeyser: false,
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
    parking: null, 
    furnished: null, 
    backupPower: null, 
    backupWaterSupply: null, 
    boreholeWater: null,
    electricFence: null,
    walledOrFenced: null,
    electricGate: null,
    builtInCupboards: null,
    fittedKitchen: null,
    solarGeyser: null,
  };

  const typeIcons = {
    all: <FaGlobe />,
    rent: <FaHome />,
    sale: <FaDollarSign />,
  };

  const propertyTypeIcons = {
    all: null,
    house: null,
    apartment: null,
    cluster: null,
    cottage: null,
    gardenFlat: null,
    commercial: null, // Add commercial
    land: null, // Add land
    warehouse: null, // Add warehouse
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
    const propertyTypeFromUrl = urlParams.get('propertyType');
    const sortFromUrl = urlParams.get('sort');
    const orderFromUrl = urlParams.get('order');
    const bedroomsFromUrl = urlParams.get('bedrooms');
    const bathsFromUrl = urlParams.get('baths');
    const minPriceFromUrl = urlParams.get('minPrice');
    const maxPriceFromUrl = urlParams.get('maxPrice');
    const pageFromUrl = urlParams.get('page');

    // Get amenity values from URL
    const amenities = [
      'parking',
      'furnished',
      'offer',
      'backupPower',
      'backupWaterSupply',
      'boreholeWater',
      'electricFence',
      'walledOrFenced',
      'electricGate',
      'builtInCupboards',
      'fittedKitchen',
      'solarGeyser'
    ];

    const amenityValues = {};
    amenities.forEach(amenity => {
      amenityValues[amenity] = urlParams.get(amenity) === 'true';
    });

    if (
      searchTermFromUrl ||
      typeFromUrl ||
      propertyTypeFromUrl ||
      sortFromUrl ||
      orderFromUrl ||
      bedroomsFromUrl ||
      bathsFromUrl ||
      minPriceFromUrl ||
      maxPriceFromUrl ||
      pageFromUrl ||
      Object.values(amenityValues).some(value => value)
    ) {
      setSidebardata({
        searchTerm: searchTermFromUrl || '',
        type: typeFromUrl || 'all',
        propertyType: propertyTypeFromUrl || 'all',
        sort: sortFromUrl || 'createdAt',
        order: orderFromUrl || 'desc',
        bedrooms: bedroomsFromUrl || '',
        baths: bathsFromUrl || '',
        minPrice: minPriceFromUrl || '',
        maxPrice: maxPriceFromUrl || '',
        ...amenityValues
      });

      // Update current page from URL
      if (pageFromUrl) {
        setCurrentPage(Number(pageFromUrl));
      } else {
        setCurrentPage(1);
      }
    }

    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      
      const urlParams = new URLSearchParams(location.search);
      
      // Ensure required pagination parameters are set
      if (!urlParams.has('listingsPerPage')) {
        urlParams.set('listingsPerPage', listingsPerPage.toString());
      }
      if (!urlParams.has('page')) {
        urlParams.set('page', '1');
      }

      const searchQuery = urlParams.toString();

      try {
        const res = await fetch(`/api/listing/get?${searchQuery}`);
        const data = await res.json();

        if (data.success) {
          setListings(data.listings);
          
          // Use totalPages directly from backend response
          setTotalPages(data.totalPages);
          
          // Use currentPage from backend or URL
          const currentPageFromUrl = Number(urlParams.get('page')) || 1;
          setCurrentPage(currentPageFromUrl);
          
          setLoading(false);

          // Record impressions and search analytics
          recordImpressions(data.listings);
          recordSearchAnalytics(data.listings, urlParams);
        } else {
          setError(data.message);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
        setError('Failed to fetch listings');
        setLoading(false);
      }
    };

    fetchListings();
  }, [location.search]);

  const handleChange = (e) => {
    if (e.target.id === 'searchTerm') {
      setSidebardata({ ...sidebardata, searchTerm: e.target.value });
    }

    if (e.target.id === 'type') {
      setSidebardata({ ...sidebardata, type: e.target.value });
      
      // Update URL and trigger search immediately
      const urlParams = new URLSearchParams(window.location.search);
      if (e.target.value === 'all') {
        urlParams.delete('type');
      } else {
        urlParams.set('type', e.target.value);
      }
      const searchQuery = urlParams.toString();
      navigate(`/search?${searchQuery}`);
    }

    if (e.target.id === 'sort') {
      const sort = e.target.value.split('_')[0] || 'createdAt';
      const order = e.target.value.split('_')[1] || 'desc';

      setSidebardata({
        ...sidebardata,
        sort,
        order,
      });
    }

    if (e.target.id === 'propertyType') {
      setSidebardata({
        ...sidebardata,
        propertyType: e.target.value,
      });
    }

    if (e.target.id === 'parking' || e.target.id === 'furnished' || e.target.id === 'offer' || e.target.id === 'backupPower' || e.target.id === 'backupWaterSupply' || e.target.id === 'boreholeWater' || e.target.id === 'electricFence' || e.target.id === 'walledOrFenced' || e.target.id === 'electricGate' || e.target.id === 'builtInCupboards' || e.target.id === 'fittedKitchen' || e.target.id === 'solarGeyser') {
      setSidebardata({
        ...sidebardata,
        [e.target.id]: e.target.checked,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    
    // Reset page to 1 when applying new filters
    urlParams.set('page', 1);
    urlParams.set('listingsPerPage', listingsPerPage);
    
    // Handle search term
    if (sidebardata.searchTerm) {
      urlParams.set('searchTerm', sidebardata.searchTerm);
    } else {
      urlParams.delete('searchTerm');
    }

    // Handle type
    if (sidebardata.type !== 'all') {
      urlParams.set('type', sidebardata.type);
    } else {
      urlParams.delete('type');
    }

    // Handle property type
    if (sidebardata.propertyType !== 'all') {
      urlParams.set('propertyType', sidebardata.propertyType);
    } else {
      urlParams.delete('propertyType');
    }

    // Handle amenities
    const amenities = [
      'parking',
      'furnished',
      'offer',
      'backupPower',
      'backupWaterSupply',
      'boreholeWater',
      'electricFence',
      'walledOrFenced',
      'electricGate',
      'builtInCupboards',
      'fittedKitchen',
      'solarGeyser'
    ];

    amenities.forEach(amenity => {
      if (sidebardata[amenity]) {
        urlParams.set(amenity, 'true');
      } else {
        urlParams.delete(amenity);
      }
    });

    // Handle sort and order
    if (sidebardata.sort !== 'createdAt') {
      urlParams.set('sort', sidebardata.sort);
      urlParams.set('order', sidebardata.order);
    } else {
      urlParams.delete('sort');
      urlParams.delete('order');
    }

    // Handle bedrooms and baths
    if (sidebardata.bedrooms) {
      urlParams.set('bedrooms', sidebardata.bedrooms);
    } else {
      urlParams.delete('bedrooms');
    }

    if (sidebardata.baths) {
      urlParams.set('baths', sidebardata.baths);
    } else {
      urlParams.delete('baths');
    }

    // Handle price range
    if (sidebardata.minPrice) {
      urlParams.set('minPrice', sidebardata.minPrice);
    } else {
      urlParams.delete('minPrice');
    }

    if (sidebardata.maxPrice) {
      urlParams.set('maxPrice', sidebardata.maxPrice);
    } else {
      urlParams.delete('maxPrice');
    }

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
    if (newPage < 1 || newPage > totalPages || loading) return;

    const urlParams = new URLSearchParams(location.search);
    urlParams.set('page', newPage);
    
    // Preserve listingsPerPage parameter
    if (!urlParams.has('listingsPerPage')) {
      urlParams.set('listingsPerPage', listingsPerPage);
    }

    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };

  const handlePageInput = (e) => {
    const value = e.target.value;
    // Only allow numbers and empty string
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= totalPages)) {
      setInputPage(value);
    }
  };

  const goToPage = () => {
    const pageNumber = parseInt(inputPage);
    if (pageNumber && pageNumber > 0 && pageNumber <= totalPages) {
      handlePageChange(pageNumber);
      setInputPage(''); // Clear input after successful navigation
    } else {
      // Alert user if input is invalid
      alert(`Please enter a valid page number between 1 and ${totalPages}`);
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
        className="absolute bottom-4 left-4 bg-[#009688] text-white p-2 rounded-full shadow-lg hover:bg-[#00796b] transition-all duration-300 opacity-50 hover:opacity-100 z-50"
        aria-label="Scroll to top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row bg-white min-h-screen">
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

          {/* Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold">Type:</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'sale', 'rent'].map((type) => (
                <div 
                  key={type}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    ${sidebardata.type === type 
                      ? 'bg-[#F20505] text-white hover:bg-[#c41212]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => {
                    setSidebardata(prevData => ({
                      ...prevData,
                      type: type
                    }));
                    
                    // Update URL and trigger search
                    const urlParams = new URLSearchParams(window.location.search);
                    if (type === 'all') {
                      urlParams.delete('type');
                    } else {
                      urlParams.set('type', type);
                    }
                    const searchQuery = urlParams.toString();
                    navigate(`/search?${searchQuery}`);
                  }}
                >
                  <span className="text-sm">
                    {type === 'all' ? 'All' : 
                     type === 'sale' ? 'For Sale' : 'For Rent'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Property Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold">Property Type:</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'house', 'apartment', 'cluster', 'cottage', 'gardenFlat'].map((propertyType) => (
                <div 
                  key={propertyType}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    ${sidebardata.propertyType === propertyType 
                      ? 'bg-[#F20505] text-white hover:bg-[#c41212]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => {
                    setSidebardata(prevData => ({
                      ...prevData,
                      propertyType: propertyType
                    }));
                    
                    // Trigger search immediately
                    const urlParams = new URLSearchParams(window.location.search);
                    if (propertyType === 'all') {
                      urlParams.delete('propertyType');
                    } else {
                      urlParams.set('propertyType', propertyType);
                    }
                    const searchQuery = urlParams.toString();
                    navigate(`/search?${searchQuery}`);
                  }}
                >
                  <span className="text-sm">
                    {propertyType === 'all' ? 'All' : 
                     propertyType === 'house' ? 'House' : 
                     propertyType === 'apartment' ? 'Flat/Apartment' : 
                     propertyType === 'cluster' ? 'Cluster' : 
                     propertyType === 'cottage' ? 'Cottage' : 'Garden Flat'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Amenities:</label>
            <div className="grid grid-cols-2 gap-2">
              {['parking', 'furnished', 'backupPower', 'backupWaterSupply', 'boreholeWater', 'electricFence', 'walledOrFenced', 'electricGate', 'builtInCupboards', 'fittedKitchen', 'solarGeyser'].map((amenity) => (
                <div 
                  key={amenity}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    ${sidebardata[amenity] 
                      ? 'bg-[#F20505] text-white hover:bg-[#c41212]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => {
                    // Update sidebardata
                    setSidebardata(prevData => ({
                      ...prevData,
                      [amenity]: !prevData[amenity]
                    }));

                    // Update URL and trigger search
                    const urlParams = new URLSearchParams(window.location.search);
                    if (!sidebardata[amenity]) {
                      urlParams.set(amenity, 'true');
                    } else {
                      urlParams.delete(amenity);
                    }
                    const searchQuery = urlParams.toString();
                    navigate(`/search?${searchQuery}`);
                  }}
                >
                  <span className="text-sm whitespace-nowrap overflow-hidden">
                    {amenity === 'backupWaterSupply' ? 'Backup Water' : 
                     amenity === 'backupPower' ? 'Backup Power' :
                     amenity === 'boreholeWater' ? 'Borehole Water' :
                     amenity === 'electricFence' ? 'Electric Fence' :
                     amenity === 'walledOrFenced' ? 'Walled/Fenced' :
                     amenity === 'electricGate' ? 'Electric Gate' :
                     amenity === 'builtInCupboards' ? 'Built-in Cupboards' :
                     amenity === 'fittedKitchen' ? 'Fitted Kitchen' :
                     amenity === 'solarGeyser' ? 'Solar Geyser' :
                     amenity.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bedrooms Filter */}
          <div className='flex items-center gap-2'>
            <label className='font-semibold'>Bedrooms:</label>
            <select 
              id='bedrooms'
              className='border rounded-lg p-2'
              value={sidebardata.bedrooms}
              onChange={(e) => {
                setSidebardata({
                  ...sidebardata,
                  bedrooms: e.target.value
                });
              }}
            >
              <option value=''>Any</option>
              <option value='1'>1 Bedroom</option>
              <option value='2'>2 Bedrooms</option>
              <option value='3'>3 Bedrooms</option>
              <option value='4'>4+ Bedrooms</option>
            </select>
          </div>

          {/* Baths Filter */}
          <div className='flex items-center gap-2'>
            <label className='font-semibold'>Baths:</label>
            <select 
              id='baths'
              className='border rounded-lg p-2'
              value={sidebardata.baths}
              onChange={(e) => {
                setSidebardata({
                  ...sidebardata,
                  baths: e.target.value
                });
              }}
            >
              <option value=''>Any</option>
              <option value='1'>1 Bathroom</option>
              <option value='2'>2 Bathrooms</option>
              <option value='3'>3 Bathrooms</option>
              <option value='4'>4+ Bathrooms</option>
            </select>
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
              className="border rounded-lg p-2"
              value={sidebardata.sort}
            >
              <option value="createdAt">Latest</option>
              <option value="regularPrice">Price</option>
            </select>
            <select
              id="order"
              onChange={handleChange}
              className="border rounded-lg p-2"
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

      <div className="flex-1 relative bg-white">
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
              <span className="text-lg font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                className={`
                  px-4 py-2 rounded-lg 
                  ${
                    currentPage === totalPages
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }
                  text-white transition-colors duration-300
                `}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    goToPage();
                  }
                }}
                className="border rounded-lg p-2 w-24 text-center"
              />
              <button
                onClick={goToPage}
                disabled={!inputPage || loading || parseInt(inputPage) > totalPages}
                className={`
                  px-4 py-2 rounded-lg bg-blue-500 text-white
                  hover:bg-blue-600 transition-colors duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
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
