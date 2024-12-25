import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import SwiperCore from "swiper";
import "swiper/css/bundle";
import ListingItem from "../components/ListingItem";

import backImage1 from "../assets/back1.jpg";
import backImage2 from "../assets/back2.jpg";
import backImage3 from "../assets/back3.jpg";
import backImage4 from "../assets/back4.jpg";
import backImage5 from "../assets/back5.jpg";

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
  const navigate = useNavigate();

  SwiperCore.use([Navigation]);

  const heroImages = [backImage1, backImage2, backImage3, backImage4, backImage5];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);
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
    <div>
      <div className="relative w-full h-[500px] overflow-hidden animate-heroZoomOut mb-4">
        {heroImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Hero ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${index === currentImageIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-110"
              }`}
          />
        ))}

        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-center text-white px-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Find your next <span className="text-blue-300">perfect</span>
              <br />
              place with ease
            </h1>
            <p className="text-sm md:text-lg mb-6">
              Sahand Estate is the best place to find your next perfect place to
              live.
              <br />
              We have a wide range of properties for you to choose from.
            </p>
            <button
              onClick={handleStart}
              className="text-sm md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Let's get started...
            </button>
          </div>
        </div>
      </div>

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

      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-6">
          {/* Rent Listings */}
          {rentListings.length > 0 && (
            <div>
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

          {/* Sale Listings */}
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
  );
}
