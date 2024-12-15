import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import SwiperCore from "swiper";
import "swiper/css/bundle";
import ListingItem from "../components/ListingItem";
import backImage from "../assets/back.jpg"; // Import the image correctly

export default function Home() {
  const [offerListings, setOfferListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [rentListings, setRentListings] = useState([]);
  const [isChatbotLoaded, setIsChatbotLoaded] = useState(false);

  SwiperCore.use([Navigation]);

  useEffect(() => {
    const fetchOfferListings = async () => {
      try {
        const res = await fetch("/api/listing/get?offer=true&limit=4");
        const data = await res.json();
        setOfferListings(data);
        fetchRentListings();
      } catch (error) {
        console.log(error);
      }
    };

    const fetchRentListings = async () => {
      try {
        const res = await fetch("/api/listing/get?type=rent&limit=4");
        const data = await res.json();
        setRentListings(data);
        fetchSaleListings();
      } catch (error) {
        console.log(error);
      }
    };

    const fetchSaleListings = async () => {
      try {
        const res = await fetch("/api/listing/get?type=sale&limit=4");
        const data = await res.json();
        setSaleListings(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchOfferListings();
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
      {/* Top Hero Section */}
      <div className="relative w-full h-[500px] overflow-hidden">
        <img
          src={backImage}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
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

      {/* Swiper */}
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
        {/* Render listings for offers */}
        {offerListings && offerListings.length > 0 && (
          <div className="w-full">
            <div className="my-3">
              <h2 className="text-2xl font-semibold text-slate-600">
                Recent offers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {offerListings.map((listing) => (
                <ListingItem listing={listing} key={listing._id} />
              ))}
            </div>
            <div className="mt-4">
              <Link
                className="text-sm text-blue-800 hover:underline"
                to={"/search?offer=true"}
              >
                Show more offers
              </Link>
            </div>
          </div>
        )}

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
