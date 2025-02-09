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
  FaBuilding,
  FaWindowRestore,  // Add popup icon
  FaChevronDown
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
  const [showPropertyTypePopup, setShowPropertyTypePopup] = useState(false);
  const [showAmenitiesDropdown, setShowAmenitiesDropdown] = useState(false);

  const initialState = {
    searchTerm: '',
    type: 'all',
    propertyType: 'all',
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
    bedrooms: null,
    bathrooms: null,
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

  const togglePropertyTypePopup = (e) => {
    e.preventDefault();
    setShowPropertyTypePopup(!showPropertyTypePopup);
  };

  const handlePropertyTypeSelect = (propertyType) => {
    setSidebardata(prevState => ({
      ...prevState,
      propertyType: propertyType
    }));
    setShowPropertyTypePopup(false);
  };

  const propertyTypeOptions = [
    { type: 'all', icon: <FaGlobe />, label: 'All Properties' },
    { type: 'house', icon: <FaHome />, label: 'House' },
    { type: 'apartment', icon: <FaBuilding />, label: 'Apartment' },
    { type: 'cluster', icon: <FaHome />, label: 'Cluster' },
    { type: 'cottage', icon: <FaHome />, label: 'Cottage' },
    { type: 'gardenFlat', icon: <FaHome />, label: 'Garden Flat' },
  ];

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
  };

  const amenitiesList = [
    { key: 'parking', label: 'Parking' },
    { key: 'furnished', label: 'Furnished' },
    { key: 'backupPower', label: 'Backup Power' },
    { key: 'backupWaterSupply', label: 'Backup Water Supply' },
    { key: 'boreholeWater', label: 'Borehole Water' },
    { key: 'electricFence', label: 'Electric Fence' },
    { key: 'walledOrFenced', label: 'Walled/Fenced' },
    { key: 'electricGate', label: 'Electric Gate' },
    { key: 'builtInCupboards', label: 'Built-in Cupboards' },
    { key: 'fittedKitchen', label: 'Fitted Kitchen' },
    { key: 'solarGeyser', label: 'Solar Geyser' }
  ];

  const toggleAmenitiesDropdown = (e) => {
    e.preventDefault();
    setShowAmenitiesDropdown(!showAmenitiesDropdown);
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
    const searchTermFromParams = urlParams.get('searchTerm');
    const typeFromParams = urlParams.get('type');
    const propertyTypeFromParams = urlParams.get('propertyType');
    const bedroomsFromParams = urlParams.get('bedrooms');
    const bathroomsFromParams = urlParams.get('bathrooms');

    const amenitiesKeys = [
      'parking', 'furnished', 'backupPower', 'backupWaterSupply', 
      'boreholeWater', 'electricFence', 'walledOrFenced', 
      'electricGate', 'builtInCupboards', 'fittedKitchen', 'solarGeyser'
    ];

    const initialSidebarData = {
      searchTerm: searchTermFromParams || '',
      type: typeFromParams || 'all',
      propertyType: propertyTypeFromParams || 'all',
      bedrooms: bedroomsFromParams ? Number(bedroomsFromParams) : null,
      bathrooms: bathroomsFromParams ? Number(bathroomsFromParams) : null,
    };

    // Add amenities to initialSidebarData
    amenitiesKeys.forEach(key => {
      initialSidebarData[key] = urlParams.get(key) === 'true';
    });

    setSidebardata(initialSidebarData);
    setIsInitialized(true);
  }, [location.search]);

  useEffect(() => {
    if (!isInitialized) return;

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
  }, [isInitialized, location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const popupElement = document.querySelector('.property-type-popup');
      const buttonElement = document.querySelector('.property-type-button');
      
      if (
        showPropertyTypePopup && 
        popupElement && 
        !popupElement.contains(event.target) &&
        buttonElement && 
        !buttonElement.contains(event.target)
      ) {
        setShowPropertyTypePopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPropertyTypePopup]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownElement = document.querySelector('.amenities-dropdown');
      const buttonElement = document.querySelector('.amenities-dropdown-button');
      
      if (
        showAmenitiesDropdown && 
        dropdownElement && 
        !dropdownElement.contains(event.target) &&
        buttonElement && 
        !buttonElement.contains(event.target)
      ) {
        setShowAmenitiesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAmenitiesDropdown]);

  useEffect(() => {
    // Scroll to the top of the page when the component mounts
    window.scrollTo(0, 0);
  }, []);

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

    if (sidebardata.bathrooms) {
      urlParams.set('bathrooms', sidebardata.bathrooms);
    } else {
      urlParams.delete('bathrooms');
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
      
      {showPropertyTypePopup && (
        <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div 
            className="bg-white p-6 rounded-lg shadow-lg w-96 relative property-type-popup 
                       transform origin-top transition-all duration-300 ease-in-out 
                       scale-y-100 opacity-100 
                       animate-dropdown-enter"
          >
            <button
              onClick={togglePropertyTypePopup}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              <FaTimes />
            </button>
            <h2 className="text-lg font-bold mb-4">Select Property Type</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {propertyTypeOptions.map((option) => (
                <div 
                  key={option.type}
                  className={`
                    px-4 py-2 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                    text-sm
                    ${sidebardata.propertyType === option.type 
                      ? 'bg-[#009688] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                  onClick={() => handlePropertyTypeSelect(option.type)}
                >
                  {option.type === 'all' ? 'All Properties' : 
                   option.type === 'house' ? 'House' : 
                   option.type === 'apartment' ? 'Apartment' : 
                   option.type === 'cluster' ? 'Cluster' : 
                   option.type === 'cottage' ? 'Cottage' : 
                   option.type === 'gardenFlat' ? 'Garden Flat' : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="p-7 border-b-2 md:border-r-2 md:min-h-screen md:w-[34%] lg:w-[26%] gap-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="input-container w-[320.76px] relative">
            <input
              type="text"
              id="searchTerm"
              placeholder="Search By City/Suburb"
              className="
                w-full 
                p-3 
                border 
                border-gray-300 
                rounded-none 
                focus:outline-none 
                focus:border-black 
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
            <label className="font-semibold">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['all', 'rent', 'sale'].map((type) => (
                <div 
                  key={type}
                  className={`
                    flex items-center justify-center w-full px-3 py-1 cursor-pointer transition-all duration-300 ease-in-out
                    ${sidebardata.type === type 
                      ? 'bg-[#009688] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                    rounded-none
                  `}
                  onClick={() => {
                    setSidebardata(prevData => ({
                      ...prevData,
                      type: type
                    }));
                    
                    // Trigger search immediately
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
                  <span>
                    {type === 'all' ? 'All' : 
                     type === 'rent' ? 'Rent' : 
                     'Sale'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Property Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold">Property Type</label>
            <div className="flex flex-col items-start gap-1">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  togglePropertyTypePopup(e);
                }}
                className="bg-[#009688] text-white px-4 py-2 transition-all duration-300 ease-in-out 
                           hover:bg-[#00796b] hover:shadow-md cursor-pointer 
                           active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-300
                           w-[320.76px] rounded-none flex items-center justify-between"
              >
                {sidebardata.propertyType === 'all' ? 'All Properties' : 
                 sidebardata.propertyType === 'house' ? 'House' : 
                 sidebardata.propertyType === 'apartment' ? 'Apartment' : 
                 sidebardata.propertyType === 'cluster' ? 'Cluster' : 
                 sidebardata.propertyType === 'cottage' ? 'Cottage' : 
                 sidebardata.propertyType === 'gardenFlat' ? 'Garden Flat' : ''}
                <FaWindowRestore className={`ml-2 transition-transform duration-300 ${showPropertyTypePopup ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bedrooms and Baths Filters */}
          <div className="flex gap-4 w-[320.76px]">
            <div className="flex flex-col gap-2 flex-1 relative">
              <label className="font-semibold">Bedrooms</label>
              <div className="relative">
                <select
                  id="bedrooms"
                  className="w-full px-3 py-2 bg-[#e4e7eb] text-black rounded-none appearance-none pr-8"
                  value={sidebardata.bedrooms || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : Number(e.target.value);
                    setSidebardata(prevData => ({
                      ...prevData,
                      bedrooms: value
                    }));
                  }}
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num === 5 ? '5+' : num}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-black" />
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 relative">
              <label className="font-semibold">Bathrooms</label>
              <div className="relative">
                <select
                  id="bathrooms"
                  className="w-full px-3 py-2 bg-[#e4e7eb] text-black rounded-none appearance-none pr-8"
                  value={sidebardata.bathrooms || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : Number(e.target.value);
                    setSidebardata(prevData => ({
                      ...prevData,
                      bathrooms: value
                    }));
                  }}
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num === 5 ? '5+' : num}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-black" />
              </div>
            </div>
          </div>

          {/* Amenities Dropdown */}
          <div className="flex flex-col gap-2 mt-4">
            <label className="font-semibold">Amenities</label>
            <div className="relative w-[320.76px] amenities-dropdown-button">
              <button 
                onClick={toggleAmenitiesDropdown}
                className="amenities-dropdown-button bg-[#e4e7eb] text-black px-4 py-2 w-full rounded-none transition-all duration-300 ease-in-out 
                           hover:bg-[#d1d5db] hover:shadow-md cursor-pointer 
                           active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-300
                           flex items-center justify-between"
              >
                <span>Select</span>
                <FaChevronDown className={`ml-2 transition-transform duration-300 ${showAmenitiesDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showAmenitiesDropdown && (
                <div 
                  className="amenities-dropdown absolute z-50 w-full bg-white border border-gray-200 shadow-lg 
                             transform origin-top transition-all duration-300 ease-in-out 
                             scale-y-100 opacity-100 
                             animate-dropdown-enter"
                >
                  <div className="flex flex-wrap gap-2 p-4">
                    {amenitiesList.map((amenity) => (
                      <div 
                        key={amenity.key}
                        className={`
                          px-4 py-2 rounded-full cursor-pointer transition-all duration-300 ease-in-out
                          text-sm
                          ${sidebardata[amenity.key] 
                            ? 'bg-[#009688] text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }
                        `}
                        onClick={() => {
                          setSidebardata(prevData => ({
                            ...prevData,
                            [amenity.key]: !prevData[amenity.key]
                          }));
                        }}
                      >
                        {amenity.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="font-semibold whitespace-nowrap">Sort:</label>
            <select
              onChange={(e) => {
                const [sort, order] = e.target.value.split('_');
                setSidebardata(prevData => ({
                  ...prevData,
                  sort,
                  order
                }));
                
                // Trigger search with new sort parameters
                const urlParams = new URLSearchParams(location.search);
                urlParams.set('sort', sort);
                urlParams.set('order', order);
                urlParams.set('page', 1);
                
                navigate(`/search?${urlParams.toString()}`);
              }}
              value={`createdAt_desc`}
              className="w-full px-3 py-2 bg-[#e4e7eb] text-black rounded-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="regularPrice_asc">Price Low to High</option>
              <option value="regularPrice_desc">Price High to Low</option>
              <option value="createdAt_desc">Latest</option>
              <option value="createdAt_asc">Oldest</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Price Range:</label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black pointer-events-none" />
                <input
                  type="number"
                  id="minPrice"
                  placeholder="Min Price"
                  className="w-full pl-8 pr-3 py-2 bg-[#e4e7eb] text-black rounded-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={sidebardata.minPrice}
                  onChange={(e) => {
                    setSidebardata({
                      ...sidebardata,
                      minPrice: e.target.value
                    });
                  }}
                />
              </div>
              <div className="relative w-full">
                <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black pointer-events-none" />
                <input
                  type="number"
                  id="maxPrice"
                  placeholder="Max Price"
                  className="w-full pl-8 pr-3 py-2 bg-[#e4e7eb] text-black rounded-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={sidebardata.maxPrice}
                  onChange={(e) => {
                    setSidebardata({
                      ...sidebardata,
                      maxPrice: e.target.value
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-[#009688] text-white px-4 py-2 rounded-none w-full transition-all duration-300 ease-in-out 
                         hover:bg-[#00796b] hover:shadow-md 
                         active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
               Refine Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-200 text-black px-4 py-2 rounded-none w-full transition-all duration-300 ease-in-out 
                         hover:bg-gray-300 hover:shadow-md 
                         active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Reset Search
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center cursor-pointer" onClick={() => setShowPopup(true)}>
            <FaMapMarkerAlt className="text-red-500 text-xl mr-2" />
            <h2 className="text-lg font-bold hover:text-red-600 transition-colors duration-300">Hot Zones</h2>
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
