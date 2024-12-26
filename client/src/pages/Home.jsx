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
        const res = await fetch(`/api/listing/get?${query}`);
        const data = await res.json();
        setter(data.listings || []);
      } catch (error) {
        console.error("Error fetching listings:", error);
      }
    };

    fetchListings("offer=true&limit=4", setOfferListings);
    fetchListings("type=rent&limit=3", setRentListings);
    fetchListings("type=sale&limit=6", setSaleListings);
  }, []);

  useEffect(() => {
    if (!isChatbotLoaded) {
      const script1 = document.createElement("script");
      script1.src = "https://cdn.botpress.cloud/webchat/v2.2/inject.js";
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src =
        "https://files.bpcontent.cloud/2024/12/11/21/20241211212011-RZ6GS430.js";
      script2.async = true;
      script2.onload = () => {
        window.botpressWebChat.init({
          botId: "your-bot-id-here",
          hostUrl: "https://cdn.botpress.cloud/webchat/v2.2",
          showCloseButton: true,
          enableTranscriptDownload: true,
        });
      };
      document.body.appendChild(script2);

      setIsChatbotLoaded(true);
    }
  }, [isChatbotLoaded]);

  const handleStart = () => {
    setShowPopup(true);
  };

  const handleRentOrBuy = (choice) => {
    setIsRenting(choice);
  };

  const handlePriceSubmit = () => {
    if (isRenting === null) {
      alert("Please select Rent or Buy.");
      return;
    }

    const searchParams = new URLSearchParams();
    searchParams.set("type", isRenting === "rent" ? "rent" : "sale");
    searchParams.set("minPrice", minPrice || 0);
    searchParams.set("maxPrice", maxPrice || 10000000);

    navigate(`/search?${searchParams.toString()}`);
    setShowPopup(false);
  };

  return (
    <div className="relative">
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
              <div className="mb-12">
                <div className="mb-3">
                  <h2 className="text-2xl font-semibold">Recently added places for rent</h2>
                  <Link 
                    to="/search?type=rent"
                    className="text-sm text-blue-800 hover:underline"
                  >
                    Show more places for rent
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentListings.map((listing) => (
                    <ListingItem key={listing._id} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {saleListings.length > 0 && (
              <div>
                <div className="mb-3">
                  <h2 className="text-2xl font-semibold">Recently added places for sale</h2>
                  <Link 
                    to="/search?type=sale"
                    className="text-sm text-blue-800 hover:underline"
                  >
                    Show more places for sale
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {saleListings.map((listing) => (
                    <ListingItem key={listing._id} listing={listing} />
                  ))}
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
                <input
                  type="number"
                  placeholder="Min Price"
                  className="border p-3 w-full mb-4"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  className="border p-3 w-full mb-4"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
                <button
                  onClick={handlePriceSubmit}
                  className="bg-blue-600 text-white py-2 px-4 rounded w-full"
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
