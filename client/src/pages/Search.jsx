import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingItem from '../components/ListingItem';

export default function Search() {
  const navigate = useNavigate();
  const initialState = {
    searchTerm: '',
    type: 'all',
    parking: false,
    furnished: false,
    backupPower: false,
    backupWaterSupply: false,
    offer: false,
    sort: 'created_at',
    order: 'desc',
    minPrice: '',
    maxPrice: '',
  };

  const [sidebardata, setSidebardata] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get('searchTerm');
    const typeFromUrl = urlParams.get('type');
    const parkingFromUrl = urlParams.get('parking');
    const furnishedFromUrl = urlParams.get('furnished');
    const backupPowerFromUrl = urlParams.get('backupPower');
    const backupWaterFromUrl = urlParams.get('backupWaterSupply');
    const offerFromUrl = urlParams.get('offer');
    const sortFromUrl = urlParams.get('sort');
    const orderFromUrl = urlParams.get('order');
    const minPriceFromUrl = urlParams.get('minPrice');
    const maxPriceFromUrl = urlParams.get('maxPrice');

    setSidebardata({
      searchTerm: searchTermFromUrl || '',
      type: typeFromUrl || 'all',
      parking: parkingFromUrl === 'true',
      furnished: furnishedFromUrl === 'true',
      backupPower: backupPowerFromUrl === 'true',
      backupWaterSupply: backupWaterFromUrl === 'true',
      offer: offerFromUrl === 'true',
      sort: sortFromUrl || 'created_at',
      order: orderFromUrl || 'desc',
      minPrice: minPriceFromUrl || '',
      maxPrice: maxPriceFromUrl || '',
    });

    const fetchListings = async () => {
      setLoading(true);
      setShowMore(false);
      const searchQuery = urlParams.toString();
      const res = await fetch(`/api/listing/get?${searchQuery}`);
      const data = await res.json();
      if (data.length > 8) {
        setShowMore(true);
      } else {
        setShowMore(false);
      }
      setListings(data);
      setLoading(false);
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
    navigate('/search');
  };

  const onShowMoreClick = async () => {
    const numberOfListings = listings.length;
    const startIndex = numberOfListings;
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('startIndex', startIndex);
    const searchQuery = urlParams.toString();
    const res = await fetch(`/api/listing/get?${searchQuery}`);
    const data = await res.json();
    if (data.length < 9) {
      setShowMore(false);
    }
    setListings((prev) => [...prev, ...data]);
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="p-7 border-b-2 md:border-r-2 md:min-h-screen">
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

          <div className="flex gap-2 flex-wrap items-center">
            <label className="font-semibold">Type:</label>
            {['all', 'rent', 'sale'].map((type) => (
              <div className="flex gap-2" key={type}>
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

          <div className="flex gap-2 flex-wrap items-center">
            <label className="font-semibold">Amenities:</label>
            {['parking', 'furnished', 'backupPower', 'backupWaterSupply'].map((amenity) => (
              <div className="flex gap-2" key={amenity}>
                <input
                  type="checkbox"
                  id={amenity}
                  className="w-5"
                  onChange={handleChange}
                  checked={sidebardata[amenity]}
                />
                <span>{amenity.replace(/([A-Z])/g, ' $1')}</span>
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
              id="sort_order"
              onChange={handleChange}
              className="border rounded-lg p-3"
              value={`${sidebardata.sort}_${sidebardata.order}`}
            >
              <option value="regularPrice_desc">Price high to low</option>
              <option value="regularPrice_asc">Price low to high</option>
              <option value="createdAt_desc">Latest</option>
              <option value="createdAt_asc">Oldest</option>
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
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold border-b p-3 text-slate-700 mt-5">
          Listing results:
        </h1>

        <div className="p-7 flex flex-wrap gap-4">
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

          {showMore && (
            <button
              onClick={onShowMoreClick}
              className="text-green-700 hover:underline p-7 text-center w-full"
            >
              Show more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
