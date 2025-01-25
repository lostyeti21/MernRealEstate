import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import SwiperCore from "swiper";
import "swiper/css/bundle";
import ListingItem from "../components/ListingItem";
import ListingCollage from "../components/ListingCollage";
import Loader from '../components/Loader';
import { FaInfoCircle, FaBed, FaBath, FaParking, FaChair, FaBolt, FaWater, FaTint } from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { debounce } from 'lodash';

import backImage1 from "../assets/back1.jpg";
import backImage2 from "../assets/back2.jpg";
import backImage3 from "../assets/back3.jpg";
import backImage4 from "../assets/back4.jpg";
import backImage5 from "../assets/back5.jpg";

const StyledButton = styled.div`
  .cssbuttons-io-button {
    background: #d95734;
    color: white;
    font-family: inherit;
    padding: 0.35em;
    padding-left: 1.2em;
    font-size: 17px;
    font-weight: 500;
    border-radius: 0.9em;
    border: none;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    box-shadow: inset 0 0 1.6em -0.6em #be0054;
    overflow: hidden;
    position: relative;
    height: 2.8em;
    padding-right: 3.3em;
    cursor: pointer;
  }

  .cssbuttons-io-button .icon {
    background: white;
    margin-left: 1em;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.2em;
    width: 2.2em;
    border-radius: 0.7em;
    box-shadow: 0.1em 0.1em 0.6em 0.2em #be0054;
    right: 0.3em;
    transition: all 0.3s;
  }

  .cssbuttons-io-button:hover .icon {
    width: calc(100% - 0.6em);
  }

  .cssbuttons-io-button .icon svg {
    width: 1.1em;
    transition: transform 0.3s;
    color: #d95734;
  }

  .cssbuttons-io-button:hover .icon svg {
    transform: translateX(0.1em);
  }

  .cssbuttons-io-button:active .icon {
    transform: scale(0.95);
  }
`;

const StyledLoader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
  z-index: 100;
`;

export default function Home() {
  const [offerListings, setOfferListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [rentListings, setRentListings] = useState([]);
  const [randomListings, setRandomListings] = useState([]);
  const [collageListing, setCollageListing] = useState(null);
  const [randomListingsError, setRandomListingsError] = useState(null);
  const [isChatbotLoaded, setIsChatbotLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [isRenting, setIsRenting] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  SwiperCore.use([Navigation]);

  const heroImages = [backImage1, backImage2, backImage3, backImage4, backImage5];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchListings = async (query, setter) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listing/get?${query}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setter(data.listings || []);
      } catch (error) {
        console.error("Error fetching listings:", error);
        setError(error);
        setter([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    Promise.all([
      fetchListings("offer=true&limit=3", setOfferListings),
      fetchListings("type=rent&limit=3", setRentListings),
      fetchListings("type=sale&limit=3", setSaleListings)
    ]).catch(error => {
      console.error("Error fetching listings:", error);
    });
  }, []);

  useEffect(() => {
    // Show loader for 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchRandomListings = async () => {
      setIsLoading(true);
      try {
        const randomSeed = Math.random().toString(36).substring(7);
        const res = await fetch(`/api/listing/get?limit=10&random=true&mixedTypes=true&seed=${randomSeed}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        const validListings = Array.isArray(data) 
          ? data 
          : (data.listings && Array.isArray(data.listings) 
            ? data.listings 
            : []);
        
        const processedListings = validListings.filter(listing => 
          listing._id && 
          listing.imageUrls && 
          listing.imageUrls.length > 0 &&
          listing.name &&
          listing.address
        );
        
        // Separate sale and rent listings
        const saleListing = processedListings
          .filter(listing => listing.type === 'sale')
          .sort(() => 0.5 - Math.random());
        
        const rentListing = processedListings
          .filter(listing => listing.type === 'rent')
          .sort(() => 0.5 - Math.random());
        
        // Get one listing for the collage (alternating between sale and rent)
        const collageIndex = Math.random() < 0.5 ? 0 : 1;
        const selectedCollageListing = collageIndex === 0 
          ? saleListing[0] 
          : rentListing[0];
        
        // Remove the collage listing from its array
        if (collageIndex === 0) {
          saleListing.shift();
        } else {
          rentListing.shift();
        }
        
        // Get remaining listings for the grid
        const selectedListings = [
          ...saleListing.slice(0, 2),
          ...rentListing.slice(0, 1)
        ].sort(() => 0.5 - Math.random());
        
        // Ensure we always have exactly 3 listings
        while (selectedListings.length < 3) {
          selectedListings.push({
            _id: `placeholder-${selectedListings.length}`,
            imageUrls: ['https://via.placeholder.com/330x200?text=Coming+Soon'],
            name: 'Coming Soon',
            address: 'Location to be announced',
            description: 'New property listing coming soon',
            type: Math.random() < 0.5 ? 'sale' : 'rent',
            regularPrice: 0,
            bedrooms: 0,
            bathrooms: 0
          });
        }
        
        if (isMounted) {
          if (selectedListings.length === 0) {
            setRandomListingsError('No valid listings found');
          } else {
            setCollageListing(selectedCollageListing);
            setRandomListings(selectedListings);
            setRandomListingsError(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching random listings:', error);
          setRandomListingsError(error.message || 'Failed to fetch random listings');
          setRandomListings([]);
          setCollageListing(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchRandomListings();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const reRandomizeListings = () => {
    setRandomListings([]);
    setCollageListing(null);
    setRandomListingsError(null);
    setIsLoading(true);
  };

  const handleStart = () => {
    setShowPopup(true);
  };

  const handleRentOrBuy = (choice) => {
    setIsRenting(choice);
  };

  const handlePriceSubmit = () => {
    // Reset error state
    setPriceError('');

    if (isRenting === null) {
      alert("Please select whether you want to rent or buy first.");
      return;
    }

    // Validate price inputs
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);

    if (minPrice && maxPrice) {
      if (min >= max) {
        setPriceError('Minimum price must be less than maximum price');
        return;
      }
      if (min < 0 || max < 0) {
        setPriceError('Prices cannot be negative');
        return;
      }
    }

    const searchParams = new URLSearchParams();
    
    // Set the type (rent or sale)
    searchParams.set("type", isRenting === "rent" ? "rent" : "sale");
    
    // Add price parameters if they exist
    if (minPrice) {
      const minPriceValue = parseFloat(minPrice);
      if (!isNaN(minPriceValue) && minPriceValue > 0) {
        searchParams.set("minPrice", minPriceValue.toString());
      }
    }
    
    if (maxPrice) {
      const maxPriceValue = parseFloat(maxPrice);
      if (!isNaN(maxPriceValue) && maxPriceValue > 0) {
        searchParams.set("maxPrice", maxPriceValue.toString());
      }
    }

    // Set default sort to price ascending for search results
    searchParams.set("sort", "price");
    searchParams.set("order", "asc");

    navigate(`/search?${searchParams.toString()}`);
    setShowPopup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams();
    urlParams.set('searchTerm', searchTerm);
    urlParams.set('type', sidebardata.type);
    urlParams.set('parking', sidebardata.parking);
    urlParams.set('furnished', sidebardata.furnished);
    urlParams.set('offer', sidebardata.offer);
    urlParams.set('sort', sidebardata.sort);
    urlParams.set('order', sidebardata.order);
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

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
            body: JSON.stringify({ source: 'home' })
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
    const fetchListings = async () => {
      setLoading(true);
      setShowMore(false);
      const searchQuery = urlParams.toString();
      
      try {
        const res = await fetch(`/api/listing/get?${searchQuery}`);
        const data = await res.json();
        
        if (data.success) {
          if (data.listings.length > 8) {
            setShowMore(true);
          }
          setListings(data.listings);
          
          // Record impressions in batches
          recordImpressions(data.listings);
        }
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    };

    fetchListings();
  }, [location.search]);

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

  if (randomListingsError) {
    return (
      <div className='max-w-6xl mx-auto p-3 flex flex-col gap-8 my-10'>
        <h2 className='text-3xl font-semibold text-slate-600 mb-4'>Just for You</h2>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative' role='alert'>
          <strong className='font-bold'>Error: </strong>
          <span className='block sm:inline'>{randomListingsError}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <StyledLoader>
          <Loader />
        </StyledLoader>
      )}
      
      {/* Hero Section with Fade Transition and Zoom Effect */}
      <div className="absolute top-0 left-0 w-full h-[960px] z-0 overflow-hidden bg-black">
        <AnimatePresence initial={false}>
          {heroImages.map((image, index) => (
            index === currentImageIndex && (
              <motion.div
                key={`hero-${index}`}
                className="absolute inset-0 w-[1920px] h-[960px] mx-auto rounded-lg overflow-hidden"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 2, ease: "easeInOut" },
                  scale: { duration: 14, ease: "linear" }
                }}
              >
                <div className="relative w-full h-full">
                  <img
                    src={image}
                    alt={`Hero ${index}`}
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: 'center'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/60" />
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>

      {/* Content Section - Adjusted padding */}
      <div className="relative min-h-screen">
        {/* Hero Content - Increased padding top and bottom */}
        {!loading && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col gap-6 pt-40 pb-32 px-3 max-w-6xl mx-auto text-white relative z-10"
          >
            <motion.h1 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-4xl lg:text-6xl font-bold"
            >
              Find your next <span className="text-white">perfect</span>
              <br />place with ease
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="text-lg sm:text-xl"
            >
              DzimbaEstate will help you find your home fast, easy and comfortable.
              <br />
              Our expert support is always available.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease: "backOut" }}
            >
              <StyledButton>
                <button className="cssbuttons-io-button" onClick={() => setShowPopup(true)}>
                  Get started
                  <div className="icon">
                    <svg height={24} width={24} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor" />
                    </svg>
                  </div>
                </button>
              </StyledButton>
            </motion.div>
          </motion.div>
        )}
        
        {/* Rest of the content with white background */}
        <div className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-3">
            {/* Featured Property Section */}
            {collageListing && (
              <div className="max-w-6xl mx-auto p-3">
                <div className="relative h-[100px] mb-8">
                  <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
                    FEATURED
                  </h1>
                  <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
                    Property
                  </h2>
                </div>
                <ListingCollage listing={collageListing} />
              </div>
            )}

            {/* Just for You Section */}
            <div className="mb-16">
              <div className="relative h-[100px] mb-8">
                <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
                  SOME LISTINGS
                </h1>
                <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
                  Just For You
                </h2>
              </div>
              {isLoading ? (
                <div className="flex justify-center">
                  <Loader />
                </div>
              ) : (
                <div className='pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                  {Array.isArray(randomListings) && randomListings.map((listing) => (
                    // Format price with proper checks
                    <div 
                      key={listing._id} 
                      className='relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full'
                    >
                      <div
                        className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold ${
                          listing.type === 'sale' ? 'bg-[#009688] text-white' : 'bg-[#C9F2AC] text-[#333333]'
                        }`}
                        style={{ zIndex: 10 }}
                      >
                        {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
                      </div>

                      <Link to={`/listing/${listing._id}`}>
                        <img
                          src={listing.imageUrls?.[0] || 'https://via.placeholder.com/330x200'}
                          alt='listing cover'
                          className='h-[320px] sm:h-[220px] w-full object-cover hover:scale-105 transition-scale duration-300'
                        />
                        <div className='p-3 flex flex-col gap-2 w-full'>
                          <p className='truncate text-lg font-semibold text-slate-700'>
                            {listing.name}
                          </p>
                          <div className='flex items-center gap-1'>
                            <MdLocationOn className='h-4 w-4 text-green-700' />
                            <p className='text-sm text-gray-600 truncate w-full'>
                              {listing.address}
                            </p>
                          </div>
                          <p className='text-sm text-gray-600 line-clamp-2'>
                            {listing.description}
                          </p>
                          <p className='border border-[#333333] bg-white text-[#333333] w-fit px-3 py-1 rounded-full text-sm font-semibold mt-2'>
                            ${listing.offer ? listing.discountPrice : listing.regularPrice}
                            {listing.type === 'rent' && ' / month'}
                          </p>
                          <div className='flex flex-wrap gap-2 mt-3 text-xs font-medium'>
                            <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                              <FaBed /> {listing.bedrooms} {listing.bedrooms > 1 ? 'Beds' : 'Bed'}
                            </div>
                            <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                              <FaBath /> {listing.bathrooms} {listing.bathrooms > 1 ? 'Baths' : 'Bath'}
                            </div>
                            {listing.parking && (
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaParking /> Parking
                              </div>
                            )}
                            {listing.furnished && (
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaChair /> Furnished
                              </div>
                            )}
                            {listing.backupPower && (
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaBolt /> Backup Power
                              </div>
                            )}
                            {listing.backupWaterSupply && (
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaWater /> Backup Water
                              </div>
                            )}
                            {listing.boreholeWater && (
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaTint /> Borehole Water
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your existing listings sections */}
            {rentListings.length > 0 && (
              <div className='my-3'>
                <div className="relative h-[100px] mb-8">
                  <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
                    FOR RENT
                  </h1>
                  <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
                    Recently Added Places
                  </h2>
                </div>
                <div className='pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                  {rentListings &&
                    rentListings.length > 0 &&
                    rentListings.map((listing) => (
                      <div 
                        key={listing._id} 
                        className='relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full'
                      >
                        <div
                          className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold ${
                            listing.type === 'sale' ? 'bg-[#009688] text-white' : 'bg-[#C9F2AC] text-[#333333]'
                          }`}
                          style={{ zIndex: 10 }}
                        >
                          {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
                        </div>

                        <Link to={`/listing/${listing._id}`}>
                          <img
                            src={listing.imageUrls?.[0] || 'https://via.placeholder.com/330x200'}
                            alt='listing cover'
                            className='h-[320px] sm:h-[220px] w-full object-cover hover:scale-105 transition-scale duration-300'
                          />
                          <div className='p-3 flex flex-col gap-2 w-full'>
                            <p className='truncate text-lg font-semibold text-slate-700'>
                              {listing.name}
                            </p>
                            <div className='flex items-center gap-1'>
                              <MdLocationOn className='h-4 w-4 text-green-700' />
                              <p className='text-sm text-gray-600 truncate w-full'>
                                {listing.address}
                              </p>
                            </div>
                            <p className='text-sm text-gray-600 line-clamp-2'>
                              {listing.description}
                            </p>
                            <p className='border border-[#333333] bg-white text-[#333333] w-fit px-3 py-1 rounded-full text-sm font-semibold mt-2'>
                              ${listing.offer ? listing.discountPrice : listing.regularPrice}
                              {listing.type === 'rent' && ' / month'}
                            </p>
                            <div className='flex flex-wrap gap-2 mt-3 text-xs font-medium'>
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaBed /> {listing.bedrooms} {listing.bedrooms > 1 ? 'Beds' : 'Bed'}
                              </div>
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaBath /> {listing.bathrooms} {listing.bathrooms > 1 ? 'Baths' : 'Bath'}
                              </div>
                              {listing.parking && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaParking /> Parking
                                </div>
                              )}
                              {listing.furnished && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaChair /> Furnished
                                </div>
                              )}
                              {listing.backupPower && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaBolt /> Backup Power
                                </div>
                              )}
                              {listing.backupWaterSupply && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaWater /> Backup Water
                                </div>
                              )}
                              {listing.boreholeWater && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaTint /> Borehole Water
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                </div>
                <div className="mt-8 pb-16 flex justify-center">
                  <Link 
                    to="/search?type=rent"
                    className="bg-[#d95734] hover:bg-[#c41212] text-white px-6 py-3 rounded-lg transition duration-200 ease-in-out inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    Show more places for rent
                  </Link>
                </div>
              </div>
            )}

            {saleListings.length > 0 && (
              <div className='my-3'>
                <div className="relative h-[100px] mb-8">
                  <h1 className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left">
                    FOR SALE
                  </h1>
                  <h2 className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'>
                    Recently Added Places
                  </h2>
                </div>
                <div className='pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                  {saleListings &&
                    saleListings.length > 0 &&
                    saleListings.map((listing) => (
                      <div 
                        key={listing._id} 
                        className='relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full'
                      >
                        <div
                          className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold ${
                            listing.type === 'sale' ? 'bg-[#009688] text-white' : 'bg-[#C9F2AC] text-[#333333]'
                          }`}
                          style={{ zIndex: 10 }}
                        >
                          {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
                        </div>

                        <Link to={`/listing/${listing._id}`}>
                          <img
                            src={listing.imageUrls?.[0] || 'https://via.placeholder.com/330x200'}
                            alt='listing cover'
                            className='h-[320px] sm:h-[220px] w-full object-cover hover:scale-105 transition-scale duration-300'
                          />
                          <div className='p-3 flex flex-col gap-2 w-full'>
                            <p className='truncate text-lg font-semibold text-slate-700'>
                              {listing.name}
                            </p>
                            <div className='flex items-center gap-1'>
                              <MdLocationOn className='h-4 w-4 text-green-700' />
                              <p className='text-sm text-gray-600 truncate w-full'>
                                {listing.address}
                              </p>
                            </div>
                            <p className='text-sm text-gray-600 line-clamp-2'>
                              {listing.description}
                            </p>
                            <p className='border border-[#333333] bg-white text-[#333333] w-fit px-3 py-1 rounded-full text-sm font-semibold mt-2'>
                              ${listing.offer ? listing.discountPrice : listing.regularPrice}
                              {listing.type === 'rent' && ' / month'}
                            </p>
                            <div className='flex flex-wrap gap-2 mt-3 text-xs font-medium'>
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaBed /> {listing.bedrooms} {listing.bedrooms > 1 ? 'Beds' : 'Bed'}
                              </div>
                              <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                <FaBath /> {listing.bathrooms} {listing.bathrooms > 1 ? 'Baths' : 'Bath'}
                              </div>
                              {listing.parking && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaParking /> Parking
                                </div>
                              )}
                              {listing.furnished && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaChair /> Furnished
                                </div>
                              )}
                              {listing.backupPower && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaBolt /> Backup Power
                                </div>
                              )}
                              {listing.backupWaterSupply && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaWater /> Backup Water
                                </div>
                              )}
                              {listing.boreholeWater && (
                                <div className='bg-[#d2d1e6] text-[#333333] px-3 py-1 rounded-full flex items-center gap-1'>
                                  <FaTint /> Borehole Water
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                </div>
                <div className="mt-8 pb-16 flex justify-center">
                  <Link 
                    to="/search?type=sale"
                    className="bg-[#d95734] hover:bg-[#c41212] text-white px-6 py-3 rounded-lg transition duration-200 ease-in-out inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    Show more places for sale
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your existing popup and other components */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Let's find your perfect place</h2>
            {isRenting === null && (
              <div className="flex justify-around mb-4">
                <button
                  onClick={() => handleRentOrBuy("rent")}
                  className="bg-[#d95734] hover:bg-[#c41212] text-white py-2 px-4 rounded"
                >
                  Rent
                </button>
                <button
                  onClick={() => handleRentOrBuy("sale")}
                  className="bg-[#d95734] hover:bg-[#c41212] text-white py-2 px-4 rounded"
                >
                  Buy
                </button>
              </div>
            )}

            {isRenting !== null && (
              <>
                <h2 className="text-xl font-bold mb-4">What is your budget?</h2>
                <label className="block mb-2">
                  {isRenting === "rent"
                    ? "Enter your monthly rent budget:"
                    : "Enter your price range for buying:"}
                </label>
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder={`Min ${isRenting === "rent" ? "Rent" : "Price"}`}
                    className="border p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPriceError('');
                    }}
                  />
                  <input
                    type="number"
                    placeholder={`Max ${isRenting === "rent" ? "Rent" : "Price"}`}
                    className="border p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPriceError('');
                    }}
                  />
                </div>
                {priceError && (
                  <p className="text-red-500 text-sm mt-2">{priceError}</p>
                )}
                <button
                  onClick={handlePriceSubmit}
                  className="mt-6 bg-[#d95734] hover:bg-[#c41212] text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition-colors duration-200"
                >
                  Search Listings
                </button>
              </>
            )}
            <button
              onClick={() => setShowPopup(false)}
              className="mt-4 text-red-600 underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Link
        to="/about"
        className="fixed bottom-4 left-4 bg-slate-700 text-white p-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg z-50"
        title="About"
      >
        <FaInfoCircle size={20} />
      </Link>
    </>
  );
}
