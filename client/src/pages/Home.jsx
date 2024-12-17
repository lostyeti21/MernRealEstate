import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import SwiperCore from "swiper";
import "swiper/css/bundle";
import ListingItem from "../components/ListingItem";

// Import multiple images for the slideshow
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

  SwiperCore.use([Navigation]);

  // Hero images for slideshow
  const heroImages = [backImage1, backImage2, backImage3, backImage4, backImage5];

  // Cycle through images every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); // 5 seconds interval

    return () => clearInterval(interval);
  }, []);

  // Fetch listings
  useEffect(() => {
    const fetchOfferListings = async () => {
      try {
        const res = await fetch("/api/listing/get?offer=true&limit=4");
        const data = await res.json();
        setOfferListings(data);
      } catch (error) {
        console.log(error);
      }
    };

    const fetchRentListings = async () => {
      try {
        const res = await fetch("/api/listing/get?type=rent&limit=3");
        const data = await res.json();
        setRentListings(data);
      } catch (error) {
        console.log(error);
      }
    };

    const fetchSaleListings = async () => {
      try {
        const res = await fetch("/api/listing/get?type=sale&limit=6");
        const data = await res.json();
        setSaleListings(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchOfferListings();
    fetchRentListings();
    fetchSaleListings();
  }, []);

  // Inject Botpress chatbot script
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
          botId: "your-bot-id-here", // Replace with your Bot ID
          hostUrl: "https://cdn.botpress.cloud/webchat/v2.2",
          showCloseButton: true,
          enableTranscriptDownload: true,
        });
      };
      document.body.appendChild(script2);

      setIsChatbotLoaded(true);
    }
  }, [isChatbotLoaded]);

  return (
    <div>
      {/* Hero Section with Smooth Fade and Continuous Zoom-Out */}
      <div className="relative w-full h-[500px] overflow-hidden animate-heroZoomOut">
        {heroImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Hero ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
              index === currentImageIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-110"
            }`}
          />
        ))}

        {/* Overlay */}
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
            <Link
              to={"/search"}
              className="text-sm md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Let's get started...
            </Link>
          </div>
        </div>
      </div>

      {/* Swiper for Recent Offers */}
      <Swiper navigation>
        {offerListings &&
          offerListings.length > 0 &&
          offerListings.map((listing) => (
            <SwiperSlide key={listing._id}>
              <div
                style={{
                  background: `url(${listing.imageUrls[0]}) center no-repeat`,
                  backgroundSize: "cover",
                }}
                className="h-[500px]"
              ></div>
            </SwiperSlide>
          ))}
      </Swiper>

      {/* Listing Results */}
      <div className="px-10 max-w-[1200px] mx-auto flex flex-col gap-8 my-10">
        {/* Render listings for rent */}
        {rentListings && rentListings.length > 0 && (
          <div className="w-full">
            <div className="my-3">
              <h2 className="text-2xl font-semibold text-slate-600">
                Recent places for rent
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentListings.map((listing) => (
                <ListingItem listing={listing} key={listing._id} />
              ))}
            </div>
            <div className="mt-4 text-left">
              <Link
                className="text-sm text-blue-800 hover:underline"
                to={"/search?type=rent"}
              >
                Show more places for rent
              </Link>
            </div>
          </div>
        )}

        {/* Render listings for sale */}
        {saleListings && saleListings.length > 0 && (
          <div className="w-full">
            <div className="my-3">
              <h2 className="text-2xl font-semibold text-slate-600">
                Recent places for sale
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saleListings.map((listing) => (
                <ListingItem listing={listing} key={listing._id} />
              ))}
            </div>
            <div className="mt-4 text-left">
              <Link
                className="text-sm text-blue-800 hover:underline"
                to={"/search?type=sale"}
              >
                Show more places for sale
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
