import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import SwiperCore from "swiper";
import "swiper/css/bundle";
import ListingItem from "../components/ListingItem";
import { FaInfoCircle } from 'react-icons/fa';
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
    background: #FF0072;
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
    color: #FF0072;
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
  animation: reduceDimAndBlur 2s ease-out forwards;
  z-index: 100;

  @keyframes reduceDimAndBlur {
    0% {
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(20px);
    }
    100% {
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
    }
  }

  .spinner {
    font-size: 28px;
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1em;
  }

  .spinner.center {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
  }

  .spinner .spinner-blade {
    position: absolute;
    left: 0.4629em;
    bottom: 0;
    width: 0.074em;
    height: 0.2777em;
    border-radius: 0.0555em;
    background-color: transparent;
    transform-origin: center -0.2222em;
    animation: spinner-fade9234 1s infinite linear;
  }

  .spinner .spinner-blade:nth-child(1) {
    animation-delay: 0s;
    transform: rotate(0deg);
  }

  .spinner .spinner-blade:nth-child(2) {
    animation-delay: 0.083s;
    transform: rotate(30deg);
  }

  .spinner .spinner-blade:nth-child(3) {
    animation-delay: 0.166s;
    transform: rotate(60deg);
  }

  .spinner .spinner-blade:nth-child(4) {
    animation-delay: 0.249s;
    transform: rotate(90deg);
  }

  .spinner .spinner-blade:nth-child(5) {
    animation-delay: 0.332s;
    transform: rotate(120deg);
  }

  .spinner .spinner-blade:nth-child(6) {
    animation-delay: 0.415s;
    transform: rotate(150deg);
  }

  .spinner .spinner-blade:nth-child(7) {
    animation-delay: 0.498s;
    transform: rotate(180deg);
  }

  .spinner .spinner-blade:nth-child(8) {
    animation-delay: 0.581s;
    transform: rotate(210deg);
  }

  .spinner .spinner-blade:nth-child(9) {
    animation-delay: 0.664s;
    transform: rotate(240deg);
  }

  .spinner .spinner-blade:nth-child(10) {
    animation-delay: 0.747s;
    transform: rotate(270deg);
  }

  .spinner .spinner-blade:nth-child(11) {
    animation-delay: 0.83s;
    transform: rotate(300deg);
  }

  .spinner .spinner-blade:nth-child(12) {
    animation-delay: 0.913s;
    transform: rotate(330deg);
  }

  @keyframes spinner-fade9234 {
    0% {
      background-color: #ffffff;
    }
    100% {
      background-color: transparent;
    }
  }
`;

export default function Home() {
  const [offerListings, setOfferListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [rentListings, setRentListings] = useState([]);
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
      fetchListings("type=sale&limit=6", setSaleListings)
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

  return (
    <div className="relative">
      {loading && (
        <StyledLoader>
          <div className="spinner center">
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
          </div>
        </StyledLoader>
      )}
      
      {/* Hero Section with Fade Transition and Zoom Effect */}
      <div className="absolute top-0 left-0 w-full h-[960px] z-0 overflow-hidden bg-black">
        <AnimatePresence initial={false}>
          {heroImages.map((image, index) => (
            index === currentImageIndex && (
              <motion.div
                key={`hero-${index}`}
                className="absolute inset-0 w-[1920px] h-[960px] mx-auto"
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
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/40" />
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>

      {/* Content Section - Adjusted padding */}
      <div className="relative min-h-screen">
        {/* Hero Content - Increased padding top and bottom */}
        <div className="flex flex-col gap-6 pt-40 pb-32 px-3 max-w-6xl mx-auto text-white relative z-10">
          <h1 className="text-4xl lg:text-6xl font-bold">
            Find your next <span className="text-[#FF0072]">perfect</span>
            <br />place with ease
          </h1>
          <div className="text-lg sm:text-xl">
            DzimbaEstate will help you find your home fast, easy and comfortable.
            <br />
            Our expert support is always available.
          </div>
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
        </div>

        {/* Rest of the content with white background */}
        <div className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-3">
            {/* Your existing listings sections */}
            {rentListings.length > 0 && (
              <div className="mb-20">
                <h2 className="text-2xl font-semibold mb-3">Recently added places for rent</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentListings.map((listing) => (
                    <div 
                      key={listing._id}
                      onClick={() => handleListingClick(listing._id)}
                    >
                      <ListingItem listing={listing} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 relative">
                  <div className="absolute left-1/2 transform -translate-x-1/2 lg:left-[calc(50%_-_1rem)]">
                    <Link 
                      to="/search?type=rent"
                      className="bg-[#FF0072] text-white px-6 py-2.5 rounded-lg hover:bg-[#be0054] transition duration-200 ease-in-out flex items-center justify-center gap-2 text-sm font-semibold w-[276px]"
                    >
                      Show more places for rent
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {saleListings.length > 0 && (
              <div className="mb-20">
                <h2 className="text-2xl font-semibold mb-3">Recently added places for sale</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {saleListings.map((listing) => (
                    <div 
                      key={listing._id}
                      onClick={() => handleListingClick(listing._id)}
                    >
                      <ListingItem listing={listing} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 relative">
                  <div className="absolute left-1/2 transform -translate-x-1/2 lg:left-[calc(50%_-_1rem)]">
                    <Link 
                      to="/search?type=sale"
                      className="bg-[#FF0072] text-white px-6 py-2.5 rounded-lg hover:bg-[#be0054] transition duration-200 ease-in-out flex items-center justify-center gap-2 text-sm font-semibold w-[276px]"
                    >
                      Show more places for sale
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    </Link>
                  </div>
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
                  className="bg-blue-600 text-white py-2 px-4 rounded"
                >
                  Rent
                </button>
                <button
                  onClick={() => handleRentOrBuy("sale")}
                  className="bg-green-600 text-white py-2 px-4 rounded"
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
                  className="mt-6 bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition-colors duration-200"
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
    </div>
  );
}
