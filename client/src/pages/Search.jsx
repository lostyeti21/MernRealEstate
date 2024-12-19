import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingItem from '../components/ListingItem';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import { FaParking, FaCouch, FaBolt, FaWater, FaTint, FaHome, FaDollarSign, FaGlobe } from 'react-icons/fa';

export default function Search() {
  const navigate = useNavigate();
  const initialState = {
    searchTerm: '',
    type: 'all',
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

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const urlParams = new URLSearchParams();

      Object.entries(sidebardata).forEach(([key, value]) => {
        if (value !== '' && value !== false) {
          urlParams.set(key, value);
        }
      });

      urlParams.set('page', currentPage);
      urlParams.set('limit', listingsPerPage);

      const searchQuery = urlParams.toString();
      try {
        const res = await fetch(`/api/listing/get?${searchQuery}`);
        const data = await res.json();

        setListings(data.listings || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [sidebardata, currentPage]);

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
    Object.entries(sidebardata).forEach(([key, value]) => {
      if (value !== '' && value !== false) {
        urlParams.set(key, value);
      }
    });
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  const handleReset = () => {
    setSidebardata(initialState);
    setCurrentPage(1);
    navigate('/search');
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);

      // Ensure the page scrolls to the top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50); // Add a slight delay to ensure the state update triggers first
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

  return (
    <div className="flex flex-col md:flex-row">
      <div className="p-7 border-b-2 md:border-r-2 md:min-h-screen md:w-1/3 lg:w-1/4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap font-semibold">Search:</label>
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
            <label className="font-semibold">Type:</label>
            {['all', 'rent', 'sale'].map((type) => (
              <div className="flex items-center gap-2" key={type}>
                <span className="text-lg">{typeIcons[type]}</span> {/* Icon for the type */}
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
                {amenityIcons[amenity]} {/* Icon for the amenity */}
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

        {/* Map Section */}
        <div className="mt-6">
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={13}
            className="w-full h-screen rounded-lg"
            style={{ height: '154vh', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {listings.map((listing) => (
              <Marker
                key={listing._id}
                position={[listing.lat || 0, listing.lng || 0]}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold border-b p-3 text-slate-700 mt-5">
          Listing results:
        </h1>

        <div className="p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
          {!loading && listings.length === 0 && (
            <p className="text-xl text-slate-700">No listing found!</p>
          )}
          {loading && (
            <p className="text-xl text-slate-700 text-center w-full">
              Loading...
            </p>
          )}
          {!loading &&
            listings.map((listing) => (
              <ListingItem key={listing._id} listing={listing} />
            ))}
        </div>

        <div className="flex flex-col items-center mt-6">
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentPage === totalPages}
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
              className="border rounded-lg p-2 w-23"
            />

            <button
              onClick={goToPage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
